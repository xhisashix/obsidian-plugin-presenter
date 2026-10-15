import { type App, Modal, Setting, TFile, setIcon } from 'obsidian';
import type { SlideOverflowInfo } from '../types';
import { splitSlideAtLine } from '../commands/splitSlide';

export class OverflowReportModal extends Modal {
	private reports: SlideOverflowInfo[];
	private file: TFile | null;
	private onJump: (slideIndex: number) => void;

	constructor(
		app: App,
		reports: SlideOverflowInfo[],
		file: TFile | null,
		onJump: (slideIndex: number) => void
	) {
		super(app);
		this.reports = reports;
		this.file = file;
		this.onJump = onJump;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('presenter-overflow-report-modal');

		const headerEl = contentEl.createDiv({ cls: 'presenter-overflow-report-header' });
		headerEl.createEl('h2', { text: 'Slide overflow inspection' });

		const overflowingSlides = this.reports.filter((r) => r.isOverflowing);

		if (overflowingSlides.length === 0) {
			const emptyEl = contentEl.createDiv({ cls: 'presenter-overflow-all-good' });
			const iconEl = emptyEl.createDiv({ cls: 'presenter-overflow-good-icon' });
			setIcon(iconEl, 'check-circle');
			emptyEl.createEl('p', {
				text: `All ${this.reports.length} slides fit comfortably within the presentation card boundaries!`,
			});
			new Setting(contentEl).addButton((btn) =>
				btn.setButtonText('Close').setCta().onClick(() => this.close())
			);
			return;
		}

		contentEl.createEl('p', {
			cls: 'setting-item-description',
			text: `Found ${overflowingSlides.length} out of ${this.reports.length} slides exceeding card boundaries. Jump to a slide to adjust text or split it by a sub-heading.`,
		});

		const listEl = contentEl.createDiv({ cls: 'presenter-overflow-report-list' });

		for (const item of overflowingSlides) {
			const itemEl = listEl.createDiv({ cls: 'presenter-overflow-item' });

			const infoEl = itemEl.createDiv({ cls: 'presenter-overflow-item-info' });
			const titleRow = infoEl.createDiv({ cls: 'presenter-overflow-item-title-row' });
			titleRow.createSpan({
				cls: 'presenter-overflow-item-title',
				text: `Slide ${item.slideIndex + 1}: ${item.title}`,
			});

			const percentOverflow = Math.round((item.overflowRatio - 1.0) * 100);
			titleRow.createSpan({
				cls: 'presenter-overflow-ratio-badge',
				text: `+${percentOverflow}% overflow`,
			});

			if (item.fittedScale && item.fittedScale < 1.0) {
				const scalePct = Math.round(item.fittedScale * 100);
				titleRow.createSpan({
					cls: 'presenter-autofitted-badge',
					text: item.fittedScale <= 0.70 ? 'Max reduced (70%)' : `Auto-fit: ${scalePct}%`,
				});
			}

			const metaEl = infoEl.createDiv({ cls: 'presenter-overflow-item-meta' });
			if (item.canSplitByHeading && item.splitHeadingTitle) {
				metaEl.setText(`Can split into 2 slides at: "${item.splitHeadingTitle}"`);
			} else {
				metaEl.setText('Consider shortening text or dividing into multiple slides.');
			}

			const actionsEl = itemEl.createDiv({ cls: 'presenter-overflow-item-actions' });

			// Jump button
			const jumpBtn = actionsEl.createEl('button', {
				cls: 'mod-cta',
				text: 'Jump',
			});
			jumpBtn.onclick = () => {
				this.onJump(item.slideIndex);
				this.close();
			};

			// Split button if heading is available
			const lineToSplit = item.absoluteSplitLine ?? item.splitLineOffset;
			if (item.canSplitByHeading && this.file && lineToSplit !== undefined) {
				const splitBtn = actionsEl.createEl('button', {
					text: 'Split slide',
				});
				splitBtn.onclick = async () => {
					if (this.file && lineToSplit !== undefined) {
						await splitSlideAtLine(this.app, this.file, lineToSplit);
						this.close();
					}
				};
			}
		}

		new Setting(contentEl).addButton((btn) =>
			btn.setButtonText('Done').onClick(() => this.close())
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
