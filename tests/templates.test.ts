import test from 'node:test';
import assert from 'node:assert/strict';
import type { App, Editor, EditorPosition, Plugin } from 'obsidian';
import { registerColumnCommands } from '../src/commands/insertColumns';
import { parsePresentation } from '../src/parser/slideParser';
import {
	DESIGN_PRINCIPLES,
	SLIDE_TEMPLATES,
	TEMPLATE_CATEGORIES,
	TEMPLATE_USECASES,
	buildTemplateMarkdown,
	getSlideTemplateById,
	searchSlideTemplates,
} from '../src/templates/slideTemplates';
import {
	insertSlideTemplateIntoEditor,
	resolveSmartInsertMode,
} from '../src/ui/templateNavigatorModal';
import {
	TemplatePickerModal,
	getTemplatePickerItems,
} from '../src/ui/templatePickerModal';
import { renderTemplatePreviewIcon } from '../src/ui/templatePreviewIcon';

function createMockEditor(
	initialDoc: string,
	cursorPos: EditorPosition,
	selectionEnd?: EditorPosition
): { editor: Editor; getDoc: () => string; getCursorPos: () => EditorPosition } {
	let lines = initialDoc.split('\n');
	let from: EditorPosition = { ...cursorPos };
	let to: EditorPosition = selectionEnd ? { ...selectionEnd } : { ...cursorPos };

	const posToIndex = (pos: EditorPosition): number => {
		let idx = 0;
		for (let i = 0; i < pos.line; i++) {
			idx += (lines[i]?.length ?? 0) + 1;
		}
		return idx + pos.ch;
	};

	const editor = {
		getSelection(): string {
			const full = lines.join('\n');
			return full.slice(posToIndex(from), posToIndex(to));
		},
		getCursor(which?: 'from' | 'to' | 'head' | 'anchor'): EditorPosition {
			if (which === 'to') return { ...to };
			return { ...from };
		},
		getLine(line: number): string {
			return lines[line] ?? '';
		},
		replaceRange(replacement: string, start: EditorPosition, end?: EditorPosition): void {
			const full = lines.join('\n');
			const startIdx = posToIndex(start);
			const endIdx = end ? posToIndex(end) : startIdx;
			const updated = full.slice(0, startIdx) + replacement + full.slice(endIdx);
			lines = updated.split('\n');
		},
		setCursor(pos: EditorPosition | number, ch?: number): void {
			if (typeof pos === 'number') {
				from = { line: pos, ch: ch ?? 0 };
			} else {
				from = { ...pos };
			}
			to = { ...from };
		},
	} as unknown as Editor;

	return {
		editor,
		getDoc: () => lines.join('\n'),
		getCursorPos: () => ({ ...from }),
	};
}

interface MockElement {
	tagName: string;
	cls: string;
	text: string;
	children: MockElement[];
	createDiv: (opts?: { cls?: string; text?: string }) => MockElement;
	createSpan: (opts?: { cls?: string; text?: string }) => MockElement;
	createEl: (tag: string, opts?: { cls?: string; text?: string }) => MockElement;
	setText: (val: string) => void;
}

function createMockElement(tagName = 'div', cls = '', text = ''): MockElement {
	const el: MockElement = {
		tagName,
		cls,
		text,
		children: [],
		createDiv(opts) {
			const child = createMockElement('div', opts?.cls ?? '', opts?.text ?? '');
			el.children.push(child);
			return child;
		},
		createSpan(opts) {
			const child = createMockElement('span', opts?.cls ?? '', opts?.text ?? '');
			el.children.push(child);
			return child;
		},
		createEl(tag, opts) {
			const child = createMockElement(tag, opts?.cls ?? '', opts?.text ?? '');
			el.children.push(child);
			return child;
		},
		setText(val: string) {
			el.text = val;
		},
	};
	return el;
}

void test('SLIDE_TEMPLATES defines all 13 professional slide templates across 4 categories', () => {
	assert.equal(SLIDE_TEMPLATES.length, 13);
	assert.equal(TEMPLATE_CATEGORIES.length, 4);

	const ids = new Set<string>();
	const commandIds = new Set<string>();
	for (const tpl of SLIDE_TEMPLATES) {
		assert.ok(tpl.id.length > 0);
		assert.ok(!ids.has(tpl.id), `Duplicate template id: ${tpl.id}`);
		ids.add(tpl.id);

		assert.ok(tpl.commandId.startsWith('insert-template-'));
		assert.ok(!commandIds.has(tpl.commandId), `Duplicate command id: ${tpl.commandId}`);
		commandIds.add(tpl.commandId);
		assert.ok(tpl.commandName.startsWith('Insert design template: '));
		assert.ok(tpl.syntaxHint.length > 0);
		assert.ok(tpl.keywords.length >= 4);

		assert.ok(tpl.name.length > 0);
		assert.ok(TEMPLATE_CATEGORIES.includes(tpl.category));
		assert.ok(tpl.description.length > 0);
		assert.ok(tpl.scene.length > 0);
		assert.ok(tpl.rules.length >= 2);
		assert.ok(tpl.titleTemplate.startsWith('## '));
		assert.ok(tpl.bodySnippet.length > 0);
	}
});

void test('TEMPLATE_USECASES and DESIGN_PRINCIPLES have valid references and content', () => {
	assert.equal(TEMPLATE_USECASES.length, 12);
	for (const uc of TEMPLATE_USECASES) {
		assert.ok(uc.label.length > 0);
		const primary = getSlideTemplateById(uc.primary);
		assert.ok(primary, `Missing primary template for usecase: ${uc.label}`);
		if (uc.secondary !== null) {
			const secondary = getSlideTemplateById(uc.secondary);
			assert.ok(secondary, `Missing secondary template for usecase: ${uc.label}`);
		}
	}

	assert.equal(DESIGN_PRINCIPLES.length, 6);
	for (const p of DESIGN_PRINCIPLES) {
		assert.ok(p.title.length > 0);
		assert.ok(p.icon.length > 0);
		assert.ok(p.content.length > 0);
		assert.ok(p.points.length >= 2);
	}
});

void test('All 13 slide templates parse cleanly into valid presentation slides', () => {
	for (const tpl of SLIDE_TEMPLATES) {
		const markdown = buildTemplateMarkdown(tpl, 'full-slide');
		const presentation = parsePresentation(markdown);

		assert.equal(
			presentation.slides.length,
			1,
			`Template ${tpl.id} should parse as a single slide`
		);
		const slide = presentation.slides[0]!;
		assert.equal(slide.type, 'content');
		assert.equal(slide.title, tpl.titleTemplate.replace(/^##\s+/, ''));

		if (tpl.id === 'horizontal-flow') {
			assert.ok(slide.markdown.includes('presenter-cols-3'));
			assert.ok(slide.markdown.includes('presenter-cols-step'));
		} else if (tpl.id === 'two-column') {
			assert.ok(slide.markdown.includes('presenter-cols-2'));
			assert.ok(slide.markdown.includes('presenter-cols-ratio-1-2'));
		} else if (tpl.id === 'pyramid') {
			assert.ok(slide.markdown.includes('presenter-cols-pyramid'));
			assert.ok(slide.markdown.includes('presenter-tier-shape'));
			assert.ok(slide.markdown.includes('presenter-tier-detail'));
		} else if (tpl.id === 'funnel') {
			assert.ok(slide.markdown.includes('presenter-cols-funnel'));
			assert.ok(slide.markdown.includes('presenter-tier-shape'));
			assert.ok(slide.markdown.includes('presenter-col-highlight'));
		} else if (tpl.id === 'matrix') {
			assert.ok(slide.markdown.includes('presenter-cols-matrix'));
		} else if (tpl.id === 'cycle') {
			assert.ok(slide.markdown.includes('presenter-cols-cycle'));
		} else if (tpl.id === 'chart') {
			assert.ok(slide.markdown.includes('presenter-cols-ratio-2-1'));
			assert.ok(slide.markdown.includes('presenter-chart-bars'));
			assert.ok(slide.markdown.includes('presenter-chart-row-accent'));
		} else if (tpl.id === 'bento') {
			assert.ok(slide.markdown.includes('presenter-cols-ratio-2-1'));
		} else if (tpl.id === 'big-number') {
			assert.ok(slide.markdown.includes('presenter-kpi-value'));
		} else if (tpl.id === 'executive' || tpl.id === 'three-column') {
			assert.ok(slide.markdown.includes('presenter-cols-3'));
		} else if (tpl.id === 'swimlane') {
			assert.ok(slide.markdown.includes('| 担当部門 |'));
			assert.ok(slide.markdown.includes('presenter-badge'));
		}
	}
});

void test('Legacy 2-column pyramid markdown automatically upgrades to pyramid diagram layout', () => {
	const legacyPyramidMd = [
		'## 強固なデータ基盤の上にAI活用を積み上げ、経営の意思決定スピードを革新する',
		'',
		'<!-- columns 2 1:2 card -->',
		'',
		'### 価値創出の3階層ピラミッド',
		'- **▲ Top（頂点・究極価値）**：経営意思決定の即時化',
		'- **■ Middle（中間層・応用）**：部門横断のAI予測・自動化',
		'- **▬ Base（土台・インフラ）**：全社統合データ基盤',
		'',
		'### 各階層の具体像と構築アプローチ',
		'- [Top: 意思決定層] **エグゼクティブ・コックピット**：予実と将来予測を1画面で把握し迅速に資源配分',
		'- [Middle: 業務応用層] **AIインサイト＆自動化**：異常値検知や需要予測を自動化し工数を半減',
		'- [Base: データ基盤層] **マスター標準化とガバナンス**：顧客・取引データを単一スキーマで統合',
		'',
		'<!-- /columns -->',
	].join('\n');

	const parsed = parsePresentation(legacyPyramidMd);
	assert.equal(parsed.slides.length, 1);
	const slide = parsed.slides[0]!;
	assert.ok(slide.markdown.includes('presenter-cols-pyramid'));
	assert.ok(slide.markdown.includes('presenter-tier-1'));
	assert.ok(slide.markdown.includes('presenter-tier-2'));
	assert.ok(slide.markdown.includes('presenter-tier-3'));
});

void test('insertSlideTemplateIntoEditor inserts full-slide and body-only snippets accurately', () => {
	const executive = getSlideTemplateById('executive')!;

	// 1. Insert full-slide on empty line
	const mockEmpty = createMockEditor('# Title\n\n', { line: 2, ch: 0 });
	insertSlideTemplateIntoEditor(mockEmpty.editor, executive, 'full-slide');
	assert.ok(mockEmpty.getDoc().includes(executive.titleTemplate));
	assert.ok(mockEmpty.getDoc().includes('<!-- columns 3 card -->'));
	assert.deepEqual(mockEmpty.getCursorPos(), { line: 2, ch: 0 });

	// 2. Insert body-only below existing heading line
	const mockNonEmpty = createMockEditor('## Existing Heading', { line: 0, ch: 5 });
	insertSlideTemplateIntoEditor(mockNonEmpty.editor, executive, 'body-only');
	assert.ok(!mockNonEmpty.getDoc().includes(executive.titleTemplate));
	assert.ok(mockNonEmpty.getDoc().startsWith('## Existing Heading\n\n> [!important]'));
	assert.deepEqual(mockNonEmpty.getCursorPos(), { line: 2, ch: 0 });

	// 3. Replace selected text
	const mockSelection = createMockEditor(
		'## Old Slide\nReplace me',
		{ line: 0, ch: 0 },
		{ line: 1, ch: 10 }
	);
	insertSlideTemplateIntoEditor(mockSelection.editor, executive, 'full-slide');
	assert.ok(!mockSelection.getDoc().includes('Old Slide'));
	assert.ok(mockSelection.getDoc().startsWith(executive.titleTemplate));
	assert.deepEqual(mockSelection.getCursorPos(), { line: 0, ch: 0 });
});

void test('renderTemplatePreviewIcon builds wireframe DOM for all 13 preview types', () => {
	for (const tpl of SLIDE_TEMPLATES) {
		const container = createMockElement();
		const iconEl = renderTemplatePreviewIcon(
			container as unknown as HTMLElement,
			tpl.previewType
		) as unknown as MockElement;

		assert.ok(iconEl.cls.includes(`presenter-tpl-icon-${tpl.previewType}`));
		assert.ok(
			iconEl.children.length > 0,
			`Preview icon for ${tpl.previewType} should render child wireframe elements`
		);
	}
});

void test('searchSlideTemplates and getTemplatePickerItems filter by English and Japanese keywords', () => {
	const all = searchSlideTemplates('');
	assert.equal(all.length, 13);

	const allPickerItems = getTemplatePickerItems('');
	assert.equal(allPickerItems.length, 14); // 13 templates + 1 visual navigator item

	const matrixMatches = searchSlideTemplates('matrix');
	assert.equal(matrixMatches.length, 1);
	assert.equal(matrixMatches[0]?.id, 'matrix');

	const jpPyramidMatches = searchSlideTemplates('ピラミッド');
	assert.equal(jpPyramidMatches.length, 1);
	assert.equal(jpPyramidMatches[0]?.id, 'pyramid');

	const funnelMatches = searchSlideTemplates('ファネル ボトルネック');
	assert.equal(funnelMatches.length, 1);
	assert.equal(funnelMatches[0]?.id, 'funnel');

	const noMatches = getTemplatePickerItems('nonexistent-template-xyz');
	assert.equal(noMatches.length, 0);
});

void test('resolveSmartInsertMode detects whether current slide already has an H2 heading', () => {
	const pyramid = getSlideTemplateById('pyramid')!;

	// 1. Blank note -> full-slide
	const blankEditor = createMockEditor('', { line: 0, ch: 0 });
	assert.equal(resolveSmartInsertMode(blankEditor.editor), 'full-slide');

	// 2. Right on or below an H2 heading with no body yet -> body-only (avoids duplicate H2)
	const h2OnlyEditor = createMockEditor('## 自社サービスの3階層アーキテクチャ\n', {
		line: 1,
		ch: 0,
	});
	assert.equal(resolveSmartInsertMode(h2OnlyEditor.editor), 'body-only');
	const resolvedMode = insertSlideTemplateIntoEditor(h2OnlyEditor.editor, pyramid, 'auto');
	assert.equal(resolvedMode, 'body-only');
	assert.ok(h2OnlyEditor.getDoc().startsWith('## 自社サービスの3階層アーキテクチャ\n<!-- columns pyramid -->'));
	assert.ok(!h2OnlyEditor.getDoc().includes(pyramid.titleTemplate));

	// 3. After an existing slide that already has body content -> full-slide
	const populatedSlideEditor = createMockEditor(
		'## 既存スライド\n- 箇条書き1\n- 箇条書き2\n\n',
		{ line: 4, ch: 0 }
	);
	assert.equal(resolveSmartInsertMode(populatedSlideEditor.editor), 'full-slide');
	const resolvedFull = insertSlideTemplateIntoEditor(
		populatedSlideEditor.editor,
		pyramid,
		'auto'
	);
	assert.equal(resolvedFull, 'full-slide');
	assert.ok(populatedSlideEditor.getDoc().includes(pyramid.titleTemplate));

	// 4. After a thematic break `---` -> full-slide
	const afterHrEditor = createMockEditor('## Slide 1\n\n---\n\n', { line: 4, ch: 0 });
	assert.equal(resolveSmartInsertMode(afterHrEditor.editor), 'full-slide');

	// 5. After YAML frontmatter -> full-slide
	const afterFmEditor = createMockEditor('---\nheader: "Deck"\n---\n\n', { line: 4, ch: 0 });
	assert.equal(resolveSmartInsertMode(afterFmEditor.editor), 'full-slide');
});

void test('TemplatePickerModal renders suggestions and inserts template with modifier support', () => {
	const mockEd = createMockEditor('## Custom Heading\n', { line: 1, ch: 0 });
	const modal = new TemplatePickerModal({} as unknown as App, mockEd.editor);

	const suggestions = modal.getSuggestions('matrix');
	assert.equal(suggestions.length, 1);
	const matrixItem = suggestions[0]!;
	assert.equal(matrixItem.id, 'matrix');

	// Render suggestion DOM
	const itemEl = createMockElement();
	modal.renderSuggestion(matrixItem, itemEl as unknown as HTMLElement);
	assert.equal(itemEl.children.length, 1);
	assert.equal(itemEl.children[0]?.cls, 'presenter-template-suggestion');

	// Default Enter in an H2-only slide inserts body-only via auto detection
	modal.onChooseSuggestion(matrixItem, {
		shiftKey: false,
		metaKey: false,
		ctrlKey: false,
	} as unknown as KeyboardEvent);
	assert.ok(mockEd.getDoc().includes('<!-- columns matrix -->'));
	assert.ok(!mockEd.getDoc().includes(matrixItem.template!.titleTemplate));

	// Mod+Enter explicitly forces full-slide even under an H2 heading
	const mockEdForceFull = createMockEditor('## Custom Heading\n', { line: 1, ch: 0 });
	const modal2 = new TemplatePickerModal({} as unknown as App, mockEdForceFull.editor);
	modal2.onChooseSuggestion(matrixItem, {
		shiftKey: false,
		metaKey: true,
		ctrlKey: false,
	} as unknown as KeyboardEvent);
	assert.ok(mockEdForceFull.getDoc().includes(matrixItem.template!.titleTemplate));

	// Shift+Enter explicitly forces body-only even on a blank document
	const mockEdForceBody = createMockEditor('', { line: 0, ch: 0 });
	const modal3 = new TemplatePickerModal({} as unknown as App, mockEdForceBody.editor);
	modal3.onChooseSuggestion(matrixItem, {
		shiftKey: true,
		metaKey: false,
		ctrlKey: false,
	} as unknown as KeyboardEvent);
	assert.ok(mockEdForceBody.getDoc().startsWith('<!-- columns matrix -->'));
	assert.ok(!mockEdForceBody.getDoc().includes(matrixItem.template!.titleTemplate));
});

void test('registerColumnCommands registers quick template picker and all 13 direct template commands', () => {
	const registeredCommands: Array<{
		id: string;
		name: string;
		callback?: () => void;
		editorCallback?: (editor: Editor) => void;
	}> = [];

	const mockPlugin = {
		app: {},
		addCommand(cmd: {
			id: string;
			name: string;
			callback?: () => void;
			editorCallback?: (editor: Editor) => void;
		}) {
			registeredCommands.push(cmd);
		},
	} as unknown as Plugin;

	registerColumnCommands(mockPlugin);

	const cmdById = new Map(registeredCommands.map((c) => [c.id, c]));
	assert.ok(cmdById.has('insert-design-template'));
	assert.ok(cmdById.has('open-template-navigator'));

	for (const tpl of SLIDE_TEMPLATES) {
		const cmd = cmdById.get(tpl.commandId);
		assert.ok(cmd, `Missing command registration for ${tpl.commandId}`);
		assert.equal(cmd.name, tpl.commandName);
		assert.equal(typeof cmd.editorCallback, 'function');

		const mockEd = createMockEditor('', { line: 0, ch: 0 });
		cmd.editorCallback!(mockEd.editor);
		assert.ok(
			mockEd.getDoc().includes(tpl.titleTemplate),
			`Direct command ${tpl.commandId} should insert template ${tpl.id}`
		);
	}
});
