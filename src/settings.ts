import { App, PluginSettingTab, Setting } from 'obsidian';
import type PresenterPlugin from './main';

export class PresenterSettingTab extends PluginSettingTab {
	plugin: PresenterPlugin;

	constructor(app: App, plugin: PresenterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const descEl = containerEl.createEl('p', {
			cls: 'setting-item-description',
		});
		descEl.setText(
			'Configure vault-wide defaults for all presentations. Markdown notes do not require any frontmatter to start presenting. Add frontmatter properties only when overriding defaults for a specific note.'
		);

		new Setting(containerEl).setName('Slide text & branding').setHeading();

		new Setting(containerEl)
			.setName('Default header')
			.setDesc('Header text displayed at the top of slides (override with frontmatter `header`).')
			.addText((text) =>
				text
					.setPlaceholder('Company or presentation title')
					.setValue(this.plugin.settings.defaultHeader)
					.onChange(async (val) => {
						this.plugin.settings.defaultHeader = val;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Default footer')
			.setDesc('Footer text displayed at the bottom of slides (override with frontmatter `footer`).')
			.addText((text) =>
				text
					.setPlaceholder('Confidential - all rights reserved')
					.setValue(this.plugin.settings.defaultFooter)
					.onChange(async (val) => {
						this.plugin.settings.defaultFooter = val;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Default logo')
			.setDesc('Path to logo image within vault or URL (override with frontmatter `logo`).')
			.addText((text) =>
				text
					.setPlaceholder('Attachments/logo.png')
					.setValue(this.plugin.settings.defaultLogo)
					.onChange(async (val) => {
						this.plugin.settings.defaultLogo = val;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName('Color palette').setHeading();

		new Setting(containerEl)
			.setName('Default base color (background)')
			.setDesc('Default background color for slides (override with frontmatter `baseColor`).')
			.addColorPicker((picker) =>
				picker
					.setValue(this.plugin.settings.defaultBaseColor)
					.onChange(async (val) => {
						this.plugin.settings.defaultBaseColor = val;
						await this.plugin.saveSettings();
					})
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.defaultBaseColor)
					.onChange(async (val) => {
						this.plugin.settings.defaultBaseColor = val;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Default main color (text)')
			.setDesc('Default text and heading color for slides (override with frontmatter `mainColor`).')
			.addColorPicker((picker) =>
				picker
					.setValue(this.plugin.settings.defaultMainColor)
					.onChange(async (val) => {
						this.plugin.settings.defaultMainColor = val;
						await this.plugin.saveSettings();
					})
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.defaultMainColor)
					.onChange(async (val) => {
						this.plugin.settings.defaultMainColor = val;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Default accent color')
			.setDesc('Color for highlights, list markers, borders, and emphasis (override with frontmatter `accentColor`).')
			.addColorPicker((picker) =>
				picker
					.setValue(this.plugin.settings.defaultAccentColor)
					.onChange(async (val) => {
						this.plugin.settings.defaultAccentColor = val;
						await this.plugin.saveSettings();
					})
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.defaultAccentColor)
					.onChange(async (val) => {
						this.plugin.settings.defaultAccentColor = val;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName('Layout & grid').setHeading();

		new Setting(containerEl)
			.setName('Aspect ratio')
			.setDesc('Slide aspect ratio: 16:9 widescreen or 4:3 standard (override with frontmatter `aspectRatio`).')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('16:9', '16:9 (widescreen)')
					.addOption('4:3', '4:3 (standard)')
					.setValue(this.plugin.settings.aspectRatio)
					.onChange(async (val) => {
						this.plugin.settings.aspectRatio = val as '16:9' | '4:3';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Default column style')
			.setDesc('Default style for multi-column layouts (override with frontmatter `columnStyle` or block keyword).')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('card', 'Card (background & border)')
					.addOption('plain', 'Plain (transparent & borderless)')
					.setValue(this.plugin.settings.defaultColumnStyle)
					.onChange(async (val) => {
						this.plugin.settings.defaultColumnStyle = val as 'card' | 'plain';
						await this.plugin.saveSettings();
					})
			);
	}
}
