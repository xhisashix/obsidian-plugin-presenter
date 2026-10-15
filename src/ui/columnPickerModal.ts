import { type App, type Editor, SuggestModal } from 'obsidian';
import { insertColumnBlock, insertColumnBreak } from '../commands/insertColumns';

export interface ColumnPreset {
	id: string;
	label: string;
	description: string;
	syntaxPreview: string;
	action: (editor: Editor) => void;
}

export const COLUMN_PRESETS: ColumnPreset[] = [
	{
		id: 'cols-2',
		label: '2 columns (default style)',
		description: 'Two equal columns using the note or plugin default style',
		syntaxPreview: '<!-- columns 2 -->',
		action: (editor) => insertColumnBlock(editor, 2),
	},
	{
		id: 'cols-3',
		label: '3 columns (default style)',
		description: 'Three equal columns using the note or plugin default style',
		syntaxPreview: '<!-- columns 3 -->',
		action: (editor) => insertColumnBlock(editor, 3),
	},
	{
		id: 'cols-4',
		label: '4 columns (default style)',
		description: 'Four equal columns using the note or plugin default style',
		syntaxPreview: '<!-- columns 4 -->',
		action: (editor) => insertColumnBlock(editor, 4),
	},
	{
		id: 'cols-2-card',
		label: '2 columns — card style',
		description: 'Two columns with subtle background and border cards',
		syntaxPreview: '<!-- columns 2 card -->',
		action: (editor) => insertColumnBlock(editor, 2, 'card'),
	},
	{
		id: 'cols-2-plain',
		label: '2 columns — plain style',
		description: 'Two borderless, transparent columns',
		syntaxPreview: '<!-- columns 2 plain -->',
		action: (editor) => insertColumnBlock(editor, 2, 'plain'),
	},
	{
		id: 'cols-3-card',
		label: '3 columns — card style',
		description: 'Three columns with subtle background and border cards',
		syntaxPreview: '<!-- columns 3 card -->',
		action: (editor) => insertColumnBlock(editor, 3, 'card'),
	},
	{
		id: 'cols-3-plain',
		label: '3 columns — plain style',
		description: 'Three borderless, transparent columns',
		syntaxPreview: '<!-- columns 3 plain -->',
		action: (editor) => insertColumnBlock(editor, 3, 'plain'),
	},
	{
		id: 'col-break',
		label: 'Column break',
		description: 'Explicit separator between columns when not splitting by headings',
		syntaxPreview: '<!-- column -->',
		action: (editor) => insertColumnBreak(editor),
	},
];

export class ColumnPickerModal extends SuggestModal<ColumnPreset> {
	private editor: Editor;

	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;
		this.setPlaceholder('Select a column layout to insert (type 2, 3, plain, card, break...)');
		this.setInstructions([
			{ command: '↑↓', purpose: 'to navigate' },
			{ command: '↵', purpose: 'to insert' },
			{ command: 'esc', purpose: 'to dismiss' },
		]);
	}

	getSuggestions(query: string): ColumnPreset[] {
		const normalized = query.trim().toLowerCase();
		if (!normalized) {
			return COLUMN_PRESETS;
		}
		return COLUMN_PRESETS.filter(
			(preset) =>
				preset.label.toLowerCase().includes(normalized) ||
				preset.description.toLowerCase().includes(normalized) ||
				preset.syntaxPreview.toLowerCase().includes(normalized)
		);
	}

	renderSuggestion(preset: ColumnPreset, el: HTMLElement): void {
		const container = el.createDiv({ cls: 'presenter-column-suggestion' });
		const titleRow = container.createDiv({ cls: 'presenter-column-suggestion-title' });
		titleRow.createSpan({ text: preset.label });
		titleRow.createEl('code', {
			text: preset.syntaxPreview,
			cls: 'presenter-column-suggestion-code',
		});
		container.createDiv({
			text: preset.description,
			cls: 'presenter-column-suggestion-desc setting-item-description',
		});
	}

	onChooseSuggestion(preset: ColumnPreset): void {
		preset.action(this.editor);
	}
}
