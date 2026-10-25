import {
	Component,
	ItemView,
	MarkdownView,
	type TFile,
	type WorkspaceLeaf,
	setIcon,
} from 'obsidian';
import { getSlideIndexAtLine, parsePresentation } from '../parser/slideParser';
import {
	type PresentationData,
	type SlideOverflowInfo,
	VIEW_TYPE_PRESENTER_PREVIEW,
} from '../types';
import { renderSlide } from './slideRenderer';
import {
	type SlideOverflowCache,
	checkPresentationOverflow,
} from './overflow';
import {
	applyStageScale,
	createToolbarNavControls,
	openSlideJumpModal,
	openSlideOverflowModal,
	updateOverflowButton,
} from './stageHelpers';
import type PresenterPlugin from '../main';

export class PresenterPreviewView extends ItemView {
	private plugin: PresenterPlugin;
	private presentation: PresentationData | null = null;
	private currentFile: TFile | null = null;
	private currentIndex = 0;
	private followCursor = true;
	private cachedRawMarkdown = '';

	private stageEl!: HTMLElement;
	private counterButtonEl!: HTMLElement;
	private pinButtonEl!: HTMLElement;
	private emptyMessageEl!: HTMLElement;
	private stageWrapperEl!: HTMLElement;
	private overflowBtn!: HTMLElement;
	private overflowReports: SlideOverflowInfo[] = [];
	private overflowCache: SlideOverflowCache = new Map();

	private resizeObserver!: ResizeObserver;
	private component: Component;
	private debounceTimer: number | null = null;
	private cursorCheckTimer: number | null = null;
	private overflowCheckTimer: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: PresenterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.component = new Component();
	}

	getViewType(): string {
		return VIEW_TYPE_PRESENTER_PREVIEW;
	}

	getDisplayText(): string {
		return 'Presenter preview';
	}

	getIcon(): string {
		return 'presentation';
	}

	async onOpen(): Promise<void> {
		this.component.load();

		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('presenter-preview-container');

		// 1. Build Preview Toolbar
		this.buildToolbar(contentEl);

		// 2. Stage wrapper and Stage
		this.stageWrapperEl = contentEl.createDiv({ cls: 'presenter-preview-stage-wrapper' });
		this.stageEl = this.stageWrapperEl.createDiv({ cls: 'presenter-stage presenter-preview-stage' });

		// 3. Empty placeholder message
		this.emptyMessageEl = this.stageWrapperEl.createDiv({
			cls: 'presenter-preview-empty',
			text: 'Open a Markdown note to preview presentation slides.',
		});

		// 4. Setup responsive scaling
		this.setupResponsiveScaling();

		// 5. Register workspace and DOM events
		this.setupEventListeners();

		// 6. Initial render from active file
		await this.syncFromActiveView();
	}

	private buildToolbar(parentEl: HTMLElement) {
		const toolbarEl = parentEl.createDiv({ cls: 'presenter-preview-toolbar' });

		const { counterButtonEl, overflowBtn } = createToolbarNavControls(toolbarEl, {
			initialCounterText: '0 / 0',
			onPrev: () => {
				void this.prevSlide();
			},
			onNext: () => {
				void this.nextSlide();
			},
			onJump: () => this.promptJump(),
			onOverflowClick: () => this.openOverflowReport(),
		});
		this.counterButtonEl = counterButtonEl;
		this.overflowBtn = overflowBtn;

		// Pin / Follow cursor toggle
		this.pinButtonEl = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn presenter-pin-btn',
		});
		setIcon(this.pinButtonEl, 'locate');
		this.pinButtonEl.onclick = () => this.toggleFollowCursor();
		this.updateFollowCursorUi();

		// Start fullscreen presentation
		const playBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn presenter-btn-start',
			attr: { 'aria-label': 'Start presentation (fullscreen)' },
		});
		setIcon(playBtn, 'presentation');
		playBtn.onclick = () => {
			if (this.currentFile) {
				void this.plugin.startPresentationForFile(this.currentFile, this.currentIndex);
			}
		};
	}

	private updateFollowCursorUi() {
		if (this.followCursor) {
			this.pinButtonEl.addClass('is-active');
			this.pinButtonEl.setAttribute(
				'aria-label',
				'Cursor tracking: enabled (click to lock)'
			);
		} else {
			this.pinButtonEl.removeClass('is-active');
			this.pinButtonEl.setAttribute(
				'aria-label',
				'Cursor tracking: locked (click to enable)'
			);
		}
	}

	private toggleFollowCursor() {
		this.followCursor = !this.followCursor;
		this.updateFollowCursorUi();
		if (this.followCursor) {
			this.checkCursorSync();
		}
	}

	private setupResponsiveScaling() {
		this.resizeObserver = new ResizeObserver(() => {
			this.applySlideScale();
		});
		this.resizeObserver.observe(this.stageWrapperEl);
	}

	private applySlideScale() {
		applyStageScale(this.stageEl, this.stageWrapperEl, {
			aspectRatio: this.presentation?.frontmatter.aspectRatio || this.plugin.settings.aspectRatio,
			padding: 24,
			minScale: 0.05,
		});
	}

	private setupEventListeners() {
		// Active file change
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file && file.extension === 'md') {
					void this.loadFile(file);
				}
			})
		);

		// Active leaf change
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf?.view instanceof MarkdownView && leaf.view.file) {
					void this.loadFile(leaf.view.file);
				}
			})
		);

		// Editor typing / content modifications
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor, info) => {
				const activeFile = info?.file || this.app.workspace.getActiveFile();
				if (!activeFile || activeFile.extension !== 'md') return;

				if (this.currentFile?.path !== activeFile.path) {
					this.currentFile = activeFile;
				}

				const cursorLine = editor.getCursor().line;
				this.debouncedUpdate(editor.getValue(), cursorLine);
			})
		);

		// Cursor movement inside editor (without text changes)
		this.registerDomEvent(document, 'selectionchange', () => {
			this.debouncedCursorCheck();
		});
	}

	private debouncedCursorCheck() {
		if (!this.followCursor) return;
		if (this.cursorCheckTimer !== null) {
			window.clearTimeout(this.cursorCheckTimer);
		}
		this.cursorCheckTimer = window.setTimeout(() => {
			this.cursorCheckTimer = null;
			this.checkCursorSync();
		}, 60);
	}

	private checkCursorSync() {
		if (!this.followCursor || !this.presentation || this.presentation.slides.length === 0) return;

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || !activeView.file || activeView.file.path !== this.currentFile?.path) return;

		const cursorLine = activeView.editor.getCursor().line;
		const targetSlideIndex = getSlideIndexAtLine(this.presentation.slides, cursorLine);

		if (targetSlideIndex !== this.currentIndex) {
			void this.showSlide(targetSlideIndex);
		}
	}

	private debouncedUpdate(rawMarkdown: string, cursorLine?: number) {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			this.debounceTimer = null;
			this.updatePresentation(rawMarkdown, cursorLine);
		}, 250);
	}

	private async syncFromActiveView() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView && activeView.file) {
			await this.loadFile(activeView.file);
		} else {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile && activeFile.extension === 'md') {
				await this.loadFile(activeFile);
			} else {
				this.showEmptyState();
			}
		}
	}

	public async loadFile(file: TFile) {
		if (file.extension !== 'md') return;
		const fileChanged = this.currentFile?.path !== file.path;
		this.currentFile = file;
		if (fileChanged) {
			this.cachedRawMarkdown = '';
			this.overflowCache.clear();
		}

		try {
			// Check if active view is editing this file for unsaved content
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			let content = '';
			let cursorLine: number | undefined;

			if (activeView && activeView.file?.path === file.path) {
				content = activeView.editor.getValue();
				cursorLine = activeView.editor.getCursor().line;
			} else {
				content = await this.app.vault.read(file);
			}

			this.updatePresentation(content, cursorLine);
		} catch (err) {
			console.error('Failed to load presentation preview file:', err);
			this.showEmptyState();
		}
	}

	private updatePresentation(content: string, cursorLine?: number) {
		if (!this.currentFile) {
			this.showEmptyState();
			return;
		}

		// Skip expensive re-parsing and re-rendering if raw markdown content has not changed
		if (this.cachedRawMarkdown === content && this.presentation) {
			if (this.followCursor && cursorLine !== undefined) {
				const targetIndex = getSlideIndexAtLine(this.presentation.slides, cursorLine);
				if (targetIndex !== this.currentIndex) {
					void this.showSlide(targetIndex);
				}
			}
			return;
		}

		this.cachedRawMarkdown = content;
		this.presentation = parsePresentation(content, {
			defaultColumnStyle: this.plugin.settings.defaultColumnStyle,
			enableBadges: this.plugin.settings.enableBadges,
			enableSmartLayouts: this.plugin.settings.enableSmartLayouts,
			inheritSlideHeadings: this.plugin.settings.inheritSlideHeadings,
			headingContinuationSuffix: this.plugin.settings.headingContinuationSuffix,
		});

		if (this.presentation.slides.length === 0) {
			this.showEmptyState();
			return;
		}

		this.emptyMessageEl.addClass('is-hidden');
		this.stageEl.removeClass('is-hidden');

		let targetIndex = this.currentIndex;
		if (this.followCursor && cursorLine !== undefined) {
			targetIndex = getSlideIndexAtLine(this.presentation.slides, cursorLine);
		} else if (targetIndex >= this.presentation.slides.length) {
			targetIndex = this.presentation.slides.length - 1;
		}

		void this.showSlide(targetIndex);
		this.scheduleOverflowCheck();
	}

	private showEmptyState() {
		this.presentation = null;
		this.cachedRawMarkdown = '';
		this.overflowCache.clear();
		this.stageEl.empty();
		this.stageEl.addClass('is-hidden');
		this.emptyMessageEl.removeClass('is-hidden');
		this.counterButtonEl.setText('0 / 0');
		this.overflowReports = [];
		updateOverflowButton(this.overflowBtn, []);
	}

	public async showSlide(index: number) {
		if (!this.presentation || this.presentation.slides.length === 0) {
			this.showEmptyState();
			return;
		}

		const total = this.presentation.slides.length;
		const boundedIndex = Math.max(0, Math.min(index, total - 1));
		this.currentIndex = boundedIndex;

		this.counterButtonEl.setText(`${boundedIndex + 1} / ${total}`);

		this.stageEl.empty();
		const slide = this.presentation.slides[boundedIndex];
		if (!slide || !this.currentFile) return;

		await renderSlide(this.stageEl, {
			app: this.app,
			slide,
			totalSlides: total,
			config: this.presentation.frontmatter,
			settings: this.plugin.settings,
			sourcePath: this.currentFile.path,
			component: this.component,
		});

		this.applySlideScale();
	}

	private async nextSlide() {
		if (!this.presentation) return;
		if (this.currentIndex < this.presentation.slides.length - 1) {
			// Manual navigation temporarily suspends cursor lock if desired, or allows manual exploration
			await this.showSlide(this.currentIndex + 1);
		}
	}

	private async prevSlide() {
		if (!this.presentation) return;
		if (this.currentIndex > 0) {
			await this.showSlide(this.currentIndex - 1);
		}
	}

	private promptJump() {
		if (!this.presentation || this.presentation.slides.length === 0) return;
		openSlideJumpModal(
			this.app,
			this.presentation.slides.length,
			this.overflowReports,
			(index) => {
				void this.showSlide(index);
			}
		);
	}

	private scheduleOverflowCheck() {
		if (this.overflowCheckTimer !== null) {
			window.clearTimeout(this.overflowCheckTimer);
		}
		this.overflowCheckTimer = window.setTimeout(() => {
			this.overflowCheckTimer = null;
			void this.runOverflowCheck();
		}, 300);
	}

	private async runOverflowCheck() {
		if (!this.presentation || !this.currentFile) {
			updateOverflowButton(this.overflowBtn, []);
			return;
		}

		try {
			const reports = await checkPresentationOverflow(
				this.app,
				this.presentation,
				this.plugin.settings,
				this.currentFile.path,
				this.component,
				this.overflowCache
			);
			this.overflowReports = reports;
			updateOverflowButton(this.overflowBtn, reports);
		} catch (err) {
			console.error('Failed to check slide overflow:', err);
		}
	}

	private openOverflowReport() {
		if (!this.presentation) return;
		openSlideOverflowModal(
			this.app,
			this.overflowReports,
			this.currentFile,
			(slideIndex) => {
				void this.showSlide(slideIndex);
			}
		);
	}

	async onClose(): Promise<void> {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}
		if (this.cursorCheckTimer !== null) {
			window.clearTimeout(this.cursorCheckTimer);
		}
		if (this.overflowCheckTimer !== null) {
			window.clearTimeout(this.overflowCheckTimer);
		}
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
		this.overflowCache.clear();
		this.component.unload();
		this.contentEl.empty();
	}
}
