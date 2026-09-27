import {
	type App,
	Component,
	Modal,
	Notice,
	setIcon,
} from 'obsidian';
import type {
	PresentationData,
	PresenterSettings,
} from '../types';
import { JumpToSlideModal } from './jumpModal';
import { renderSlide } from './slideRenderer';

export class PresenterModal extends Modal {
	presentation: PresentationData;
	settings: PresenterSettings;
	sourcePath: string;
	currentIndex = 0;

	private stageEl!: HTMLElement;
	private progressBarEl!: HTMLElement;
	private counterButtonEl!: HTMLElement;
	private printContainerEl!: HTMLElement;
	private keyHandler!: (e: KeyboardEvent) => void;
	private resizeObserver!: ResizeObserver;
	private component: Component;

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

		// 3. Floating Navigation Toolbar
		this.buildToolbar(contentEl);

		// 4. Hidden Container for Multi-Page PDF Printing
		this.printContainerEl = contentEl.createDiv({ cls: 'presenter-print-container' });
		void this.preparePrintSlides();

		// 5. Setup Keyboard Navigation
		this.setupKeyEvents();

		// 6. Setup Responsive Scaling
		this.setupResponsiveScaling();

		// Render Initial Slide
		await this.showSlide(this.currentIndex);
	}


	private buildToolbar(parentEl: HTMLElement) {
		const toolbarEl = parentEl.createDiv({ cls: 'presenter-toolbar' });

		// Prev Button
		const prevBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Previous slide (left arrow)' },
		});
		setIcon(prevBtn, 'chevron-left');
		prevBtn.onclick = () => {
			void this.prevSlide();
		};

		// Slide Counter / Jump
		this.counterButtonEl = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-counter',
			text: `1 / ${this.presentation.slides.length}`,
			attr: { 'aria-label': 'Slide index' },
		});
		this.counterButtonEl.onclick = () => this.promptJump();

		// Next Button
		const nextBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Next slide (right arrow / space)' },
		});
		setIcon(nextBtn, 'chevron-right');
		nextBtn.onclick = () => {
			void this.nextSlide();
		};

		// Separator
		toolbarEl.createDiv({ cls: 'presenter-toolbar-sep' });

		// Fullscreen Toggle
		const fsBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Toggle fullscreen (f)' },
		});
		setIcon(fsBtn, 'expand');
		fsBtn.onclick = () => this.toggleFullscreen();

		// Print / Export PDF Button
		const printBtn = toolbarEl.createEl('button', {
			cls: 'presenter-toolbar-btn',
			attr: { 'aria-label': 'Print or export PDF (p)' },
		});
		setIcon(printBtn, 'printer');
		printBtn.onclick = () => {
			new Notice('Preparing slides for printing/PDF export...');
			window.print();
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

		this.applySlideScale();
	}

	private async preparePrintSlides() {
		// Asynchronously populate the print container with all slides for @media print
		for (const slide of this.presentation.slides) {
			await renderSlide(this.printContainerEl, {
				app: this.app,
				slide,
				totalSlides: this.presentation.slides.length,
				config: this.presentation.frontmatter,
				settings: this.settings,
				sourcePath: this.sourcePath,
				component: this.component,
			});
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
				case 'p':
				case 'P':
					if (!e.metaKey && !e.ctrlKey) {
						e.preventDefault();
						window.print();
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
		const cardEl = this.stageEl.querySelector<HTMLElement>('.presenter-slide-card');
		if (!cardEl) return;

		const stageWidth = this.stageEl.clientWidth - 40; // padding
		const stageHeight = this.stageEl.clientHeight - 40;

		const aspectRatio =
			this.presentation.frontmatter.aspectRatio || this.settings.aspectRatio || '16:9';
		const targetRatio = aspectRatio === '4:3' ? 4 / 3 : 16 / 9;

		const baseWidth = 1280;
		const baseHeight = baseWidth / targetRatio;

		const scaleX = stageWidth / baseWidth;
		const scaleY = stageHeight / baseHeight;
		const scale = Math.min(scaleX, scaleY, 1.5); // cap at 1.5x

		cardEl.style.width = `${baseWidth}px`;
		cardEl.style.height = `${baseHeight}px`;
		cardEl.style.transform = `scale(${Math.max(scale, 0.2)})`;
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
		new JumpToSlideModal(this.app, this.presentation.slides.length, (index) => {
			void this.showSlide(index);
		}).open();
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

	onClose() {
		window.removeEventListener('keydown', this.keyHandler);
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
		this.component.unload();
		this.contentEl.empty();
	}
}
