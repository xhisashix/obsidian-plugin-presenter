import {
	MarkdownView,
	Notice,
	Plugin,
	TFile,
} from 'obsidian';
import { parsePresentation } from './parser/slideParser';
import { PresenterSettingTab } from './settings';
import { DEFAULT_SETTINGS, type PresenterSettings } from './types';
import { PresenterModal } from './ui/presenterModal';

export default class PresenterPlugin extends Plugin {
	settings!: PresenterSettings;

	async onload() {
		await this.loadSettings();

		// Add Ribbon icon to quickly launch presentation from the active note
		this.addRibbonIcon('presentation', 'Start presentation', () => {
			void this.startPresentationForActiveFile();
		});

		// Add command to start presentation
		this.addCommand({
			id: 'start-presentation',
			name: 'Start presentation',
			checkCallback: (checking: boolean) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView && activeView.file instanceof TFile) {
					if (!checking) {
						void this.startPresentationForActiveFile();
					}
					return true;
				}
				return false;
			},
		});

		// Register plugin settings tab
		this.addSettingTab(new PresenterSettingTab(this.app, this));
	}

	onunload() {
		// All modal listeners and intervals are managed via Component lifecycle
	}

	/**
	 * Starts presentation modal for the currently active markdown note.
	 */
	async startPresentationForActiveFile() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView || !(activeView.file instanceof TFile)) {
			new Notice('Please open a Markdown note to start the presentation.');
			return;
		}

		try {
			const file = activeView.file;
			const content = await this.app.vault.read(file);
			const presentation = parsePresentation(content);

			if (presentation.slides.length === 0) {
				new Notice('No slide content found in this note.');
				return;
			}

			new PresenterModal(
				this.app,
				presentation,
				this.settings,
				file.path
			).open();
		} catch (err) {
			console.error('Failed to start presentation:', err);
			new Notice('Failed to start presentation. Check console for details.');
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PresenterSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
