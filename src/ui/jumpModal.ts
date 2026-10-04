import { type App, Modal, Setting } from 'obsidian';

export class JumpToSlideModal extends Modal {
	private totalSlides: number;
	private onSelect: (slideIndex: number) => void;

	constructor(app: App, totalSlides: number, onSelect: (slideIndex: number) => void) {
		super(app);
		this.totalSlides = totalSlides;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h3', { text: 'Jump to slide' });

		let target = 1;
		new Setting(contentEl)
			.setName(`Slide number (1 - ${this.totalSlides})`)
			.addText((text) => {
				text.inputEl.type = 'number';
				text.inputEl.min = '1';
				text.inputEl.max = String(this.totalSlides);
				text.setValue('1');
				text.onChange((val) => {
					target = parseInt(val, 10);
				});
				text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						if (!isNaN(target) && target >= 1 && target <= this.totalSlides) {
							this.onSelect(target - 1);
							this.close();
						}
					}
				});
			})
			.addButton((btn) =>
				btn
					.setButtonText('Go')
					.setCta()
					.onClick(() => {
						if (!isNaN(target) && target >= 1 && target <= this.totalSlides) {
							this.onSelect(target - 1);
							this.close();
						}
					})
			);
	}

	onClose() {
		this.contentEl.empty();
	}
}
