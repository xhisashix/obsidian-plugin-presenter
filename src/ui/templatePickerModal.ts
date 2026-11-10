import { type App, type Editor, Notice, SuggestModal } from 'obsidian';
import {
	type SlideTemplateDefinition,
	type TemplateInsertMode,
	searchSlideTemplates,
} from '../templates/slideTemplates';
import {
	TemplateNavigatorModal,
	insertSlideTemplateIntoEditor,
} from './templateNavigatorModal';
import { renderTemplatePreviewIcon } from './templatePreviewIcon';

export interface TemplatePickerItem {
	kind: 'template' | 'navigator';
	id: string;
	label: string;
	category: string;
	description: string;
	syntaxPreview: string;
	template?: SlideTemplateDefinition;
}

const NAVIGATOR_PICKER_ITEM: TemplatePickerItem = {
	kind: 'navigator',
	id: 'open-visual-template-navigator',
	label: 'Open visual template navigator (目的別ガイド・デザイン原則を表示...)',
	category: 'ガイド・デザイン6原則',
	description: '12種類の伝達目的から最適な型を探し、トップファームの厳格ルールを確認して挿入します。',
	syntaxPreview: '3 tabs / 13 templates',
};

/**
 * Builds the list of picker items from the 13 slide design templates plus the visual navigator entry.
 */
export function getTemplatePickerItems(query = ''): TemplatePickerItem[] {
	const matchedTemplates = searchSlideTemplates(query).map(
		(tpl): TemplatePickerItem => ({
			kind: 'template',
			id: tpl.id,
			label: tpl.name,
			category: tpl.category,
			description: tpl.scene,
			syntaxPreview: tpl.syntaxHint,
			template: tpl,
		})
	);

	const normalized = query.trim().toLowerCase();
	if (
		!normalized ||
		'navigator'.includes(normalized) ||
		'guide'.includes(normalized) ||
		'principles'.includes(normalized) ||
		'目的'.includes(normalized) ||
		'原則'.includes(normalized) ||
		'ナビゲーター'.includes(normalized)
	) {
		return [...matchedTemplates, NAVIGATOR_PICKER_ITEM];
	}

	return matchedTemplates;
}

/**
 * Command-palette style quick SuggestModal for searching and inserting any of the 13
 * professional slide design templates directly with the keyboard.
 */
export class TemplatePickerModal extends SuggestModal<TemplatePickerItem> {
	private editor: Editor;
	private explicitInsertMode: TemplateInsertMode | null = null;

	constructor(app: App, editor: Editor) {
		super(app);
		this.editor = editor;
		this.setPlaceholder(
			'Select a slide design template to insert (type pyramid, matrix, funnel, chart, bento, executive, マトリクス...)'
		);
		this.setInstructions([
			{ command: '↑↓', purpose: 'to navigate' },
			{ command: '↵', purpose: 'smart insert (auto)' },
			{ command: 'shift ↵', purpose: 'layout body only' },
			{ command: 'mod ↵', purpose: 'full slide with title' },
			{ command: 'esc', purpose: 'to dismiss' },
		]);

		if (this.scope && typeof this.scope.register === 'function') {
			this.scope.register(['Shift'], 'Enter', (evt: KeyboardEvent) => {
				this.explicitInsertMode = 'body-only';
				this.selectActiveSuggestion(evt);
				return false;
			});
			this.scope.register(['Mod'], 'Enter', (evt: KeyboardEvent) => {
				this.explicitInsertMode = 'full-slide';
				this.selectActiveSuggestion(evt);
				return false;
			});
		}
	}

	getSuggestions(query: string): TemplatePickerItem[] {
		return getTemplatePickerItems(query);
	}

	renderSuggestion(item: TemplatePickerItem, el: HTMLElement): void {
		const row = el.createDiv({ cls: 'presenter-template-suggestion' });

		if (item.template) {
			const thumbWrap = row.createDiv({ cls: 'presenter-template-suggestion-thumb' });
			const thumbCanvas = thumbWrap.createDiv({
				cls: 'presenter-template-suggestion-canvas',
			});
			renderTemplatePreviewIcon(thumbCanvas, item.template.previewType);
		} else {
			const iconWrap = row.createDiv({
				cls: 'presenter-template-suggestion-thumb is-navigator',
			});
			iconWrap.createSpan({
				cls: 'presenter-template-suggestion-nav-icon',
				text: '🧭',
			});
		}

		const mainCol = row.createDiv({ cls: 'presenter-template-suggestion-main' });

		const titleRow = mainCol.createDiv({ cls: 'presenter-template-suggestion-title' });
		titleRow.createSpan({
			cls: 'presenter-template-suggestion-name',
			text: item.label,
		});
		titleRow.createEl('code', {
			cls: 'presenter-column-suggestion-code',
			text: item.syntaxPreview,
		});

		const metaRow = mainCol.createDiv({ cls: 'presenter-template-suggestion-meta' });
		metaRow.createSpan({
			cls: 'presenter-template-suggestion-cat',
			text: item.category,
		});
		metaRow.createSpan({
			cls: 'presenter-template-suggestion-desc setting-item-description',
			text: item.description,
		});
	}

	onChooseSuggestion(item: TemplatePickerItem, evt: MouseEvent | KeyboardEvent): void {
		if (item.kind === 'navigator') {
			new TemplateNavigatorModal(this.app, { editor: this.editor }).open();
			return;
		}

		if (!item.template) {
			return;
		}

		let mode: TemplateInsertMode = this.explicitInsertMode ?? 'auto';
		this.explicitInsertMode = null;

		if (mode === 'auto' && evt) {
			if (evt.shiftKey) {
				mode = 'body-only';
			} else if (evt.metaKey || evt.ctrlKey) {
				mode = 'full-slide';
			}
		}

		const resolvedMode = insertSlideTemplateIntoEditor(this.editor, item.template, mode);
		new Notice(
			resolvedMode === 'body-only'
				? `Inserted layout: ${item.template.name}`
				: `Inserted slide template: ${item.template.name}`
		);
	}
}
