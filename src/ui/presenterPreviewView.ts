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
	VIEW_TYPE_PRESENTER_PREVIEW,
} from '../types';
import { JumpToSlideModal } from './jumpModal';
import { renderSlide } from './slideRenderer';
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

	private resizeObserver!: ResizeObserver;
	private component: Component;
	private debounceTimer: number | null = null;
	private cursorCheckTimer: number | null = null;

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

		// Prev Button
		const prevBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Previous slide' },
		});
		setIcon(prevBtn, 'chevron-left');
		prevBtn.onclick = () => {
			void this.prevSlide();
		};

		// Slide Counter / Jump
		this.counterButtonEl = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-counter',
			text: '0 / 0',
			attr: { 'aria-label': 'Jump to slide' },
		});
		this.counterButtonEl.onclick = () => this.promptJump();

		// Next Button
		const nextBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Next slide' },
		});
		setIcon(nextBtn, 'chevron-right');
		nextBtn.onclick = () => {
			void this.nextSlide();
		};

		// Separator
		toolbarEl.createDiv({ cls: 'presenter-toolbar-sep' });

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
		const cardEl = this.stageEl.querySelector<HTMLElement>('.presenter-slide-card');
		if (!cardEl) return;

		const stageWidth = this.stageWrapperEl.clientWidth - 24;
		const stageHeight = this.stageWrapperEl.clientHeight - 24;

		if (stageWidth <= 0 || stageHeight <= 0) return;

		const aspectRatio =
			this.presentation?.frontmatter.aspectRatio || this.plugin.settings.aspectRatio || '16:9';
		const targetRatio = aspectRatio === '4:3' ? 4 / 3 : 16 / 9;

		const baseWidth = 1280;
		const baseHeight = baseWidth / targetRatio;

		const scaleX = stageWidth / baseWidth;
		const scaleY = stageHeight / baseHeight;
		const scale = Math.min(scaleX, scaleY, 1.5);

		cardEl.style.width = `${baseWidth}px`;
		cardEl.style.height = `${baseHeight}px`;
		cardEl.style.transform = `scale(${Math.max(scale, 0.05)})`;
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
		this.currentFile = file;

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

		this.cachedRawMarkdown = content;
		this.presentation = parsePresentation(content);

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
	}

	private showEmptyState() {
		this.presentation = null;
		this.stageEl.empty();
		this.stageEl.addClass('is-hidden');
		this.emptyMessageEl.removeClass('is-hidden');
		this.counterButtonEl.setText('0 / 0');
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
		new JumpToSlideModal(this.app, this.presentation.slides.length, (index) => {
			void this.showSlide(index);
		}).open();
	}

	async onClose(): Promise<void> {
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
		}
		if (this.cursorCheckTimer !== null) {
			window.clearTimeout(this.cursorCheckTimer);
		}
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
		this.component.unload();
		this.contentEl.empty();
	}
}
