import {
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	type WorkspaceLeaf,
} from 'obsidian';
import { parsePresentation } from './parser/slideParser';
import { PresenterSettingTab } from './settings';
import {
	DEFAULT_SETTINGS,
	type PresenterSettings,
	VIEW_TYPE_PRESENTER_PREVIEW,
} from './types';
import { PresenterModal } from './ui/presenterModal';
import { PresenterPreviewView } from './ui/presenterPreviewView';

export default class PresenterPlugin extends Plugin {
	settings!: PresenterSettings;

	async onload() {
		await this.loadSettings();

		// Register Preview ItemView
		this.registerView(
			VIEW_TYPE_PRESENTER_PREVIEW,
			(leaf) => new PresenterPreviewView(leaf, this)
		);

		// Add Ribbon icon to quickly launch presentation from the active note
		this.addRibbonIcon('presentation', 'Presenter: Start presentation', () => {
			void this.startPresentationForActiveFile();
		});

		// Add Ribbon icon to toggle slide preview
		this.addRibbonIcon('tv', 'Presenter: Toggle slide preview', () => {
			void this.togglePreview();
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

		// Add command to open slide preview
		this.addCommand({
			id: 'open-preview',
			name: 'Open slide preview',
			callback: () => {
				void this.openPreview(true);
			},
		});

		// Add command to toggle slide preview
		this.addCommand({
			id: 'toggle-preview',
			name: 'Toggle slide preview',
			callback: () => {
				void this.togglePreview();
			},
		});

		// Register editor tab header action button
		this.registerViewActions();

		// Register plugin settings tab
		this.addSettingTab(new PresenterSettingTab(this.app, this));
	}

	onunload() {
		document.querySelectorAll('.presenter-preview-action').forEach((el) => el.remove());
	}

	/**
	 * Registers the preview action button in the tab header of Markdown views.
	 */
	private registerViewActions() {
		const addActionToLeaf = (leaf: WorkspaceLeaf) => {
			if (leaf.view instanceof MarkdownView) {
				const container = leaf.view.containerEl;
				if (!container.querySelector('.presenter-preview-action')) {
					const actionBtn = leaf.view.addAction('tv', 'Presenter: Open slide preview', () => {
						void this.openPreview(true);
					});
					actionBtn.addClass('presenter-preview-action');
				}
			}
		};

		this.app.workspace.iterateAllLeaves(addActionToLeaf);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.app.workspace.iterateAllLeaves(addActionToLeaf);
			})
		);
	}

	/**
	 * Opens or focuses the slide preview view.
	 * If split is true, opens as a vertical split pane next to the active editor.
	 */
	async openPreview(split = true): Promise<PresenterPreviewView | null> {
		const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_PRESENTER_PREVIEW)[0];
		if (existingLeaf) {
			await this.app.workspace.revealLeaf(existingLeaf);
			const view = existingLeaf.view as PresenterPreviewView;
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile && activeFile.extension === 'md') {
				void view.loadFile(activeFile);
			}
			return view;
		}

		let leaf: WorkspaceLeaf | null = null;
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;

		if (split && activeLeaf) {
			leaf = this.app.workspace.createLeafBySplit(activeLeaf, 'vertical');
		} else {
			leaf = this.app.workspace.getRightLeaf(false);
		}

		if (!leaf) {
			leaf = this.app.workspace.getLeaf(true);
		}

		await leaf.setViewState({
			type: VIEW_TYPE_PRESENTER_PREVIEW,
			active: true,
		});

		await this.app.workspace.revealLeaf(leaf);
		return leaf.view as PresenterPreviewView;
	}

	/**
	 * Toggles the slide preview view between open and closed.
	 */
	async togglePreview(): Promise<void> {
		const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_PRESENTER_PREVIEW)[0];
		if (existingLeaf) {
			existingLeaf.detach();
		} else {
			await this.openPreview(true);
		}
	}

	/**
	 * Starts presentation modal for the specified file and initial slide index.
	 */
	async startPresentationForFile(file: TFile, initialIndex = 0) {
		try {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			let content = '';

			if (activeView && activeView.file?.path === file.path) {
				content = activeView.editor.getValue();
			} else {
				content = await this.app.vault.read(file);
			}

			const presentation = parsePresentation(content, this.settings.defaultColumnStyle);

			if (presentation.slides.length === 0) {
				new Notice('No slide content found in this note.');
				return;
			}

			new PresenterModal(
				this.app,
				presentation,
				this.settings,
				file.path,
				initialIndex
			).open();
		} catch (err) {
			console.error('Failed to start presentation:', err);
			new Notice('Failed to start presentation. Check console for details.');
		}
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

		await this.startPresentationForFile(activeView.file, 0);
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

