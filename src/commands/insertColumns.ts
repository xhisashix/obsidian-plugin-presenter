import { type Editor, Notice, type Plugin } from 'obsidian';
import { SLIDE_TEMPLATES } from '../templates/slideTemplates';
import type { ColumnRatio, ColumnStyle, ColumnVariant, SlideLayout } from '../types';
import { ColumnPickerModal } from '../ui/columnPickerModal';
import {
	TemplateNavigatorModal,
	insertSlideTemplateIntoEditor,
} from '../ui/templateNavigatorModal';
import { TemplatePickerModal } from '../ui/templatePickerModal';

/**
 * Formats the opening HTML comment directive for a multi-column region.
 */
export function formatColumnsOpenDirective(
	count: number,
	style?: ColumnStyle,
	ratio?: ColumnRatio,
	variant?: ColumnVariant
): string {
	const parts = ['<!-- columns', String(count)];
	if (ratio) parts.push(ratio);
	if (style) parts.push(style);
	if (variant === 'step') parts.push('step');
	parts.push('-->');
	return parts.join(' ');
}

export const COLUMNS_CLOSE_DIRECTIVE = '<!-- /columns -->';
export const COLUMN_BREAK_DIRECTIVE = '<!-- column -->';

/**
 * Inserts a `<!-- columns N [ratio] [style] [step] --> ... <!-- /columns -->` block into the editor.
 * - If text is selected, wraps the selection with the opening and closing directives.
 * - If no text is selected, inserts the block and positions the cursor on the blank line inside.
 */
export function insertColumnBlock(
	editor: Editor,
	count: number,
	style?: ColumnStyle,
	ratio?: ColumnRatio,
	variant?: ColumnVariant
): void {
	const openTag = formatColumnsOpenDirective(count, style, ratio, variant);
	const closeTag = COLUMNS_CLOSE_DIRECTIVE;
	const selection = editor.getSelection();

	if (selection.length > 0) {
		const from = editor.getCursor('from');
		const to = editor.getCursor('to');
		const trimmedSelection = selection.replace(/^\r?\n+|\r?\n+$/g, '');
		const leadingNewline = from.ch > 0 ? '\n' : '';
		const replacement = `${leadingNewline}${openTag}\n${trimmedSelection}\n${closeTag}`;

		editor.replaceRange(replacement, from, to);

		const lines = replacement.split('\n');
		const endLine = from.line + lines.length - 1;
		const lastLine = lines[lines.length - 1] ?? '';
		const endCh = lines.length === 1 ? from.ch + lastLine.length : lastLine.length;
		editor.setCursor({ line: endLine, ch: endCh });
		return;
	}

	const cursor = editor.getCursor();
	const currentLineText = editor.getLine(cursor.line);

	if (currentLineText.trim().length === 0) {
		const snippet = `${openTag}\n\n${closeTag}`;
		editor.replaceRange(
			snippet,
			{ line: cursor.line, ch: 0 },
			{ line: cursor.line, ch: currentLineText.length }
		);
		editor.setCursor({ line: cursor.line + 1, ch: 0 });
	} else {
		const snippet = `\n${openTag}\n\n${closeTag}`;
		editor.replaceRange(snippet, {
			line: cursor.line,
			ch: currentLineText.length,
		});
		editor.setCursor({ line: cursor.line + 2, ch: 0 });
	}
}

/**
 * Inserts an explicit slide layout directive (e.g. `<!-- slide: section -->`).
 */
export function insertSlideDirective(editor: Editor, layout: SlideLayout): void {
	const directive = `<!-- slide: ${layout} -->`;
	const cursor = editor.getCursor();
	const currentLineText = editor.getLine(cursor.line);

	if (currentLineText.trim().length === 0) {
		editor.replaceRange(
			`${directive}\n`,
			{ line: cursor.line, ch: 0 },
			{ line: cursor.line, ch: currentLineText.length }
		);
		editor.setCursor({ line: cursor.line + 1, ch: 0 });
	} else {
		editor.replaceRange(`\n${directive}\n`, {
			line: cursor.line,
			ch: currentLineText.length,
		});
		editor.setCursor({ line: cursor.line + 2, ch: 0 });
	}
}

/**
 * Inserts an explicit `<!-- column -->` break directive and moves the cursor to the next line.
 */
export function insertColumnBreak(editor: Editor): void {
	const cursor = editor.getCursor();
	const currentLineText = editor.getLine(cursor.line);

	if (currentLineText.trim().length === 0) {
		editor.replaceRange(
			`${COLUMN_BREAK_DIRECTIVE}\n`,
			{ line: cursor.line, ch: 0 },
			{ line: cursor.line, ch: currentLineText.length }
		);
		editor.setCursor({ line: cursor.line + 1, ch: 0 });
	} else {
		editor.replaceRange(`\n${COLUMN_BREAK_DIRECTIVE}\n`, {
			line: cursor.line,
			ch: currentLineText.length,
		});
		editor.setCursor({ line: cursor.line + 2, ch: 0 });
	}
}

/**
 * Registers all template and column insertion commands so users can trigger them from the command palette
 * or bind custom hotkeys in Settings → Hotkeys.
 */
export function registerColumnCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: 'insert-design-template',
		name: 'Insert slide design template...',
		editorCallback: (editor: Editor) => {
			new TemplatePickerModal(plugin.app, editor).open();
		},
	});

	plugin.addCommand({
		id: 'open-template-navigator',
		name: 'Open slide template navigator...',
		callback: () => {
			new TemplateNavigatorModal(plugin.app).open();
		},
	});

	for (const template of SLIDE_TEMPLATES) {
		plugin.addCommand({
			id: template.commandId,
			name: template.commandName,
			editorCallback: (editor: Editor) => {
				const resolvedMode = insertSlideTemplateIntoEditor(editor, template, 'auto');
				new Notice(
					resolvedMode === 'body-only'
						? `Inserted layout: ${template.name}`
						: `Inserted slide template: ${template.name}`
				);
			},
		});
	}

	plugin.addCommand({
		id: 'insert-columns',
		name: 'Insert column layout...',
		editorCallback: (editor: Editor) => {
			new ColumnPickerModal(plugin.app, editor).open();
		},
	});

	plugin.addCommand({
		id: 'insert-columns-2',
		name: 'Insert 2-column layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 2);
		},
	});

	plugin.addCommand({
		id: 'insert-columns-2-ratio-2-1',
		name: 'Insert 2-column (2:1 wide left) layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 2, undefined, '2:1');
		},
	});

	plugin.addCommand({
		id: 'insert-columns-2-ratio-1-2',
		name: 'Insert 2-column (1:2 wide right) layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 2, undefined, '1:2');
		},
	});

	plugin.addCommand({
		id: 'insert-columns-3',
		name: 'Insert 3-column layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 3);
		},
	});

	plugin.addCommand({
		id: 'insert-columns-3-step',
		name: 'Insert 3-column step flow layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 3, undefined, undefined, 'step');
		},
	});

	plugin.addCommand({
		id: 'insert-columns-4',
		name: 'Insert 4-column layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 4);
		},
	});

	plugin.addCommand({
		id: 'insert-columns-2-card',
		name: 'Insert 2-column card layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 2, 'card');
		},
	});

	plugin.addCommand({
		id: 'insert-columns-2-plain',
		name: 'Insert 2-column plain layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 2, 'plain');
		},
	});

	plugin.addCommand({
		id: 'insert-columns-3-card',
		name: 'Insert 3-column card layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 3, 'card');
		},
	});

	plugin.addCommand({
		id: 'insert-columns-3-plain',
		name: 'Insert 3-column plain layout',
		editorCallback: (editor: Editor) => {
			insertColumnBlock(editor, 3, 'plain');
		},
	});

	plugin.addCommand({
		id: 'insert-column-break',
		name: 'Insert column break',
		editorCallback: (editor: Editor) => {
			insertColumnBreak(editor);
		},
	});
}
