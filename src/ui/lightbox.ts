/**
 * Lightbox modal helper for zooming images and Mermaid diagrams
 * during presentations and preview.
 */
export class LightboxOverlay {
	private overlayEl: HTMLElement | null = null;
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

	open(target: HTMLImageElement | SVGElement): void {
		this.close();

		const overlay = document.body.createDiv({ cls: 'presenter-lightbox-overlay' });
		this.overlayEl = overlay;

		const closeBtn = overlay.createDiv({ cls: 'presenter-lightbox-close' });
		closeBtn.setText('✕');
		closeBtn.setAttribute('aria-label', 'Close lightbox');

		let contentEl: HTMLElement;

		if (target instanceof HTMLImageElement) {
			const img = overlay.createEl('img', { cls: 'presenter-lightbox-content' });
			img.src = target.src;
			img.alt = target.alt || 'Enlarged diagram';
			contentEl = img;
		} else {
			// SVG Element (e.g. Mermaid)
			const wrapper = overlay.createDiv({ cls: 'presenter-lightbox-content presenter-lightbox-svg-wrapper' });
			wrapper.appendChild(target.cloneNode(true));
			contentEl = wrapper;
		}

		// Dismiss on backdrop click
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay || e.target === closeBtn) {
				this.close();
			}
		});

		// Prevent clicks on content from dismissing
		contentEl.addEventListener('click', (e) => {
			e.stopPropagation();
		});

		this.keydownHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				this.close();
			}
		};
		window.addEventListener('keydown', this.keydownHandler, true);
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

/**
 * Attaches click-to-zoom listeners to images and Mermaid diagrams inside a slide body.
 */
export function attachLightboxListeners(
	containerEl: HTMLElement,
	lightbox: LightboxOverlay
): void {
	containerEl.addEventListener('click', (e) => {
		const target = e.target as HTMLElement | null;
		if (!target) return;

		// Check if image
		if (target.tagName.toLowerCase() === 'img') {
			e.stopPropagation();
			lightbox.open(target as HTMLImageElement);
			return;
		}

		// Check if inside Mermaid diagram
		const mermaidContainer = target.closest('.mermaid');
		if (mermaidContainer) {
			const svg = mermaidContainer.querySelector('svg');
			if (svg) {
				e.stopPropagation();
				lightbox.open(svg);
			}
		}
	});
}
