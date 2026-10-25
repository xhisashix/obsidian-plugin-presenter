import {
	type App,
	Component,
	Menu,
	Modal,
	Notice,
	TFile,
	setIcon,
} from 'obsidian';
import type {
	PresentationData,
	PresenterSettings,
	SlideOverflowInfo,
} from '../types';
import { renderSlide, renderSlideNotes } from './slideRenderer';
import { checkPresentationOverflow } from './overflow';
import { attachLightboxListeners, LightboxOverlay } from './lightbox';
import { OverviewGridModal } from './overviewGridModal';
import {
	applyStageScale,
	createToolbarNavControls,
	openSlideJumpModal,
	openSlideOverflowModal,
	updateOverflowButton,
} from './stageHelpers';

export class PresenterModal extends Modal {
	presentation: PresentationData;
	settings: PresenterSettings;
	sourcePath: string;
	currentIndex = 0;

	private stageEl!: HTMLElement;
	private progressBarEl!: HTMLElement;
	private counterButtonEl!: HTMLElement;
	private overflowBtn!: HTMLElement;
	private overflowReports: SlideOverflowInfo[] = [];
	private notesBtn!: HTMLButtonElement;
	private notesDrawerEl!: HTMLElement;
	private notesContentEl!: HTMLElement;
	private printContainerEl!: HTMLElement;
	private isNotesOpen: boolean;
	private keyHandler!: (e: KeyboardEvent) => void;
	private resizeObserver!: ResizeObserver;
	private component: Component;
	private lightbox = new LightboxOverlay();

	constructor(
		app: App,
		presentation: PresentationData,
		settings: PresenterSettings,
		sourcePath: string,
		initialIndex = 0
	) {
		super(app);
		this.presentation = presentation;
		this.settings = settings;
		this.sourcePath = sourcePath;
		this.currentIndex =
			initialIndex >= 0 && initialIndex < presentation.slides.length ? initialIndex : 0;
		this.isNotesOpen = settings.showNotes;
		this.component = new Component();
	}

	async onOpen() {
		this.component.load();

		// Configure modal layout
		this.containerEl.addClass('presenter-modal-container');
		this.modalEl.addClass('presenter-modal-fullscreen');

		// Clear default close button styling if needed
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('presenter-main-content');

		// 1. Top Progress Bar
		this.progressBarEl = contentEl.createDiv({ cls: 'presenter-progress-bar' });

		// 2. Active Slide Stage
		this.stageEl = contentEl.createDiv({ cls: 'presenter-stage' });

		// 3. Speaker Notes Drawer
		this.buildNotesDrawer(contentEl);

		// 4. Floating Navigation Toolbar
		this.buildToolbar(contentEl);

		// 5. Hidden Container for Multi-Page PDF Printing
		this.printContainerEl = contentEl.createDiv({ cls: 'presenter-print-container' });
		void this.preparePrintSlides('slides');

		// 6. Setup Keyboard Navigation
		this.setupKeyEvents();

		// 7. Setup Responsive Scaling
		this.setupResponsiveScaling();

		// Render Initial Slide
		await this.showSlide(this.currentIndex);

		// Run background overflow inspection across slides
		void this.runOverflowCheck();
	}

	private buildNotesDrawer(parentEl: HTMLElement) {
		this.notesDrawerEl = parentEl.createDiv({ cls: 'presenter-notes-drawer' });
		if (!this.isNotesOpen) {
			this.notesDrawerEl.addClass('is-hidden');
		}

		const headerEl = this.notesDrawerEl.createDiv({ cls: 'presenter-notes-drawer-header' });
		const titleEl = headerEl.createDiv({ cls: 'presenter-notes-drawer-title' });
		setIcon(titleEl, 'file-text');
		titleEl.createSpan({ text: 'Speaker notes & details' });

		const closeBtn = headerEl.createEl('button', {
			cls: 'presenter-notes-drawer-close',
			attr: { 'aria-label': 'Hide notes (n)' },
		});
		setIcon(closeBtn, 'chevron-down');
		closeBtn.onclick = () => this.toggleNotes();

		this.notesContentEl = this.notesDrawerEl.createDiv({ cls: 'presenter-notes-drawer-body' });
	}

	private buildToolbar(parentEl: HTMLElement) {
		const toolbarEl = parentEl.createDiv({ cls: 'presenter-toolbar' });

		const { counterButtonEl, overflowBtn } = createToolbarNavControls(toolbarEl, {
			initialCounterText: `1 / ${this.presentation.slides.length}`,
			prevLabel: 'Previous slide (left arrow)',
			nextLabel: 'Next slide (right arrow / space)',
			counterLabel: 'Slide index',
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

		// Speaker Notes Toggle
		this.notesBtn = toolbarEl.createEl('button', {
			cls: `presenter-toolbar-btn presenter-btn-notes${this.isNotesOpen ? ' is-active' : ''}`,
			attr: { 'aria-label': 'Toggle speaker notes (n)' },
		});
		setIcon(this.notesBtn, 'file-text');
		this.notesBtn.onclick = () => this.toggleNotes();

		// Slide Overview Grid (Slide Sorter)
		const overviewBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Slide overview grid (g)' },
		});
		setIcon(overviewBtn, 'layout-grid');
		overviewBtn.onclick = () => this.openOverviewGrid();

		// Fullscreen Toggle
		const fsBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Toggle fullscreen (f)' },
		});
		setIcon(fsBtn, 'expand');
		fsBtn.onclick = () => this.toggleFullscreen();

		// Print / Export PDF Button (with Handout option)
		const printBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Print or export PDF (p)' },
		});
		setIcon(printBtn, 'printer');
		printBtn.onclick = (e: MouseEvent) => {
			const menu = new Menu();
			menu.addItem((item) => {
				item
					.setTitle('Print slides only (1 slide per page)')
					.setIcon('presentation')
					.onClick(() => {
						void this.printPresentation('slides');
					});
			});
			menu.addItem((item) => {
				item
					.setTitle('Print handout with notes (for distribution)')
					.setIcon('book-open')
					.onClick(() => {
						void this.printPresentation('handout');
					});
			});
			menu.showAtMouseEvent(e);
		};

		// Close Button
		const closeBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn presenter-btn-close',
			attr: { 'aria-label': 'Close presentation (esc)' },
		});
		setIcon(closeBtn, 'x');
		closeBtn.onclick = () => this.close();
	}

	private async showSlide(index: number) {
		const total = this.presentation.slides.length;
		if (index < 0 || index >= total) return;

		this.currentIndex = index;

		// Update Progress Bar
		const progressPercent = total > 1 ? ((index + 1) / total) * 100 : 100;
		this.progressBarEl.style.width = `${progressPercent}%`;

		// Update Counter
		this.counterButtonEl.setText(`${index + 1} / ${total}`);

		// Clear and render active slide
		this.stageEl.empty();
		const slide = this.presentation.slides[index];
		if (!slide) return;

		await renderSlide(this.stageEl, {
			app: this.app,
			slide,
			totalSlides: total,
			config: this.presentation.frontmatter,
			settings: this.settings,
			sourcePath: this.sourcePath,
			component: this.component,
		});

		attachLightboxListeners(this.stageEl, this.lightbox);

		// Update Speaker Notes
		await this.updateNotesContent(slide);

		this.applySlideScale();
	}

	private async updateNotesContent(slide: { notes?: string }) {
		this.notesContentEl.empty();
		if (slide.notes && slide.notes.trim()) {
			this.notesBtn.addClass('has-notes');
			await renderSlideNotes(this.notesContentEl, {
				app: this.app,
				markdown: slide.notes,
				sourcePath: this.sourcePath,
				component: this.component,
			});
		} else {
			this.notesBtn.removeClass('has-notes');
			this.notesContentEl.createDiv({
				cls: 'presenter-notes-empty',
				text: 'No speaker notes for this slide.',
			});
		}
	}

	private toggleNotes() {
		this.isNotesOpen = !this.isNotesOpen;
		if (this.isNotesOpen) {
			this.notesDrawerEl.removeClass('is-hidden');
			this.notesBtn.addClass('is-active');
		} else {
			this.notesDrawerEl.addClass('is-hidden');
			this.notesBtn.removeClass('is-active');
		}
		// Recalculate scaling since available stage height changed
		window.setTimeout(() => {
			this.applySlideScale();
		}, 50);
	}

	private async printPresentation(mode: 'slides' | 'handout') {
		new Notice(`Preparing ${mode === 'handout' ? 'handouts with notes' : 'slides'} for printing...`);
		await this.preparePrintSlides(mode);
		window.print();
	}

	private async preparePrintSlides(mode: 'slides' | 'handout' = 'slides') {
		this.printContainerEl.empty();
		if (mode === 'handout') {
			this.printContainerEl.addClass('presenter-print-handout');
		} else {
			this.printContainerEl.removeClass('presenter-print-handout');
		}

		for (const slide of this.presentation.slides) {
			const wrapperEl = this.printContainerEl.createDiv({
				cls: 'presenter-print-slide-wrapper',
			});

			await renderSlide(wrapperEl, {
				app: this.app,
				slide,
				totalSlides: this.presentation.slides.length,
				config: this.presentation.frontmatter,
				settings: this.settings,
				sourcePath: this.sourcePath,
				component: this.component,
			});

			if (mode === 'handout') {
				const notesSection = wrapperEl.createDiv({ cls: 'presenter-print-notes-section' });
				notesSection.createDiv({
					cls: 'presenter-print-notes-heading',
					text: 'Detailed notes & context',
				});
				if (slide.notes && slide.notes.trim()) {
					await renderSlideNotes(notesSection, {
						app: this.app,
						markdown: slide.notes,
						sourcePath: this.sourcePath,
						component: this.component,
					});
				} else {
					notesSection.createDiv({
						cls: 'presenter-print-notes-empty',
						text: 'No additional notes provided.',
					});
				}
			}
		}
	}

	private setupKeyEvents() {
		this.keyHandler = (e: KeyboardEvent) => {
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (e.key) {
				case 'ArrowRight':
				case 'ArrowDown':
				case ' ':
				case 'PageDown':
				case 'l':
				case 'j':
					e.preventDefault();
					void this.nextSlide();
					break;
				case 'ArrowLeft':
				case 'ArrowUp':
				case 'PageUp':
				case 'h':
				case 'k':
					e.preventDefault();
					void this.prevSlide();
					break;
				case 'Home':
					e.preventDefault();
					void this.showSlide(0);
					break;
				case 'End':
					e.preventDefault();
					void this.showSlide(this.presentation.slides.length - 1);
					break;
				case 'f':
				case 'F':
					e.preventDefault();
					this.toggleFullscreen();
					break;
				case 'g':
				case 'G':
				case 'o':
				case 'O':
					e.preventDefault();
					this.openOverviewGrid();
					break;
				case 'n':
				case 'N':
					e.preventDefault();
					this.toggleNotes();
					break;
				case 'p':
				case 'P':
					if (!e.metaKey && !e.ctrlKey) {
						e.preventDefault();
						void this.printPresentation('slides');
					}
					break;
			}
		};

		window.addEventListener('keydown', this.keyHandler);
	}

	private setupResponsiveScaling() {
		this.resizeObserver = new ResizeObserver(() => {
			this.applySlideScale();
		});
		this.resizeObserver.observe(this.stageEl);
	}

	private applySlideScale() {
		applyStageScale(this.stageEl, this.stageEl, {
			aspectRatio: this.presentation.frontmatter.aspectRatio || this.settings.aspectRatio,
			padding: 40,
			minScale: 0.2,
		});
	}

	private async nextSlide() {
		if (this.currentIndex < this.presentation.slides.length - 1) {
			await this.showSlide(this.currentIndex + 1);
		}
	}

	private async prevSlide() {
		if (this.currentIndex > 0) {
			await this.showSlide(this.currentIndex - 1);
		}
	}

	private promptJump() {
		openSlideJumpModal(
			this.app,
			this.presentation.slides.length,
			this.overflowReports,
			(index) => {
				void this.showSlide(index);
			}
		);
	}

	private async runOverflowCheck() {
		try {
			const reports = await checkPresentationOverflow(
				this.app,
				this.presentation,
				this.settings,
				this.sourcePath,
				this.component
			);
			this.overflowReports = reports;
			updateOverflowButton(this.overflowBtn, reports);
		} catch (err) {
			console.error('Failed to check slide overflow:', err);
		}
	}

	private openOverflowReport() {
		const file = this.app.vault.getAbstractFileByPath(this.sourcePath);
		openSlideOverflowModal(
			this.app,
			this.overflowReports,
			file instanceof TFile ? file : null,
			(slideIndex) => {
				void this.showSlide(slideIndex);
			}
		);
	}

	private toggleFullscreen() {
		if (!document.fullscreenElement) {
			this.modalEl.requestFullscreen().catch((err) => {
				console.error('Failed to enter fullscreen:', err);
			});
		} else {
			document.exitFullscreen().catch((err) => {
				console.error('Failed to exit fullscreen:', err);
			});
		}
	}

	private openOverviewGrid() {
		new OverviewGridModal(
			this.presentation.slides,
			this.currentIndex,
			(index) => {
				void this.showSlide(index);
			}
		).open();
	}

	onClose() {
		this.lightbox.close();
		window.removeEventListener('keydown', this.keyHandler);
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
		this.component.unload();
		this.contentEl.empty();
	}
}
