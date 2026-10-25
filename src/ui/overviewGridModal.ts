import type { SlideData } from '../types';

export class OverviewGridModal {
	private overlayEl: HTMLElement | null = null;
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

	constructor(
		private slides: SlideData[],
		private currentIndex: number,
		private onSelectSlide: (index: number) => void
	) {}

	open(): void {
		this.close();

		const overlay = document.body.createDiv({ cls: 'presenter-overview-overlay' });
		this.overlayEl = overlay;

		// Header
		const header = overlay.createDiv({ cls: 'presenter-overview-header' });
		const titleEl = header.createDiv({ cls: 'presenter-overview-title' });
		titleEl.createSpan({ text: '📑 Slide Overview' });
		titleEl.createSpan({
			cls: 'presenter-overview-thumb-badge presenter-overview-count',
			text: `${this.slides.length} slides`,
		});

		const closeBtn = header.createDiv({ cls: 'presenter-lightbox-close presenter-overview-close-btn' });
		closeBtn.setText('✕');
		closeBtn.addEventListener('click', () => this.close());

		// Grid Container
		const grid = overlay.createDiv({ cls: 'presenter-overview-grid' });

		this.slides.forEach((slide, idx) => {
			const isCurrent = idx === this.currentIndex;
			const isSection = slide.layout === 'section' || slide.type === 'section';

			const thumb = grid.createDiv({
				cls: `presenter-overview-thumb${isCurrent ? ' is-active' : ''}${isSection ? ' is-section' : ''}`,
			});

			const badgeRow = thumb.createDiv({ cls: 'presenter-overview-thumb-badge' });
			const typeLabel =
				slide.type === 'cover'
					? 'TITLE'
					: isSection
						? 'SECTION'
						: slide.type === 'quote'
							? 'QUOTE'
							: `SLIDE ${idx + 1}`;
			badgeRow.setText(typeLabel);

			const slideTitle = thumb.createDiv({ cls: 'presenter-overview-thumb-title' });
			slideTitle.setText(slide.title || `Slide ${idx + 1}`);

			thumb.addEventListener('click', () => {
				this.close();
				this.onSelectSlide(idx);
			});
		});

		// Close on Escape or G
		this.keydownHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape' || e.key === 'g' || e.key === 'G') {
				e.preventDefault();
				e.stopPropagation();
				this.close();
			}
		};
		window.addEventListener('keydown', this.keydownHandler, true);

		// Dismiss on overlay background click
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				this.close();
			}
		});
	}

	close(): void {
		if (this.keydownHandler) {
			window.removeEventListener('keydown', this.keydownHandler, true);
			this.keydownHandler = null;
		}
		if (this.overlayEl) {
			this.overlayEl.remove();
			this.overlayEl = null;
		}
	}
}
