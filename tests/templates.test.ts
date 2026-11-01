import test from 'node:test';
import assert from 'node:assert/strict';
import type { Editor, EditorPosition } from 'obsidian';
import { parsePresentation } from '../src/parser/slideParser';
import {
	DESIGN_PRINCIPLES,
	SLIDE_TEMPLATES,
	TEMPLATE_CATEGORIES,
	TEMPLATE_USECASES,
	buildTemplateMarkdown,
	getSlideTemplateById,
} from '../src/templates/slideTemplates';
import { insertSlideTemplateIntoEditor } from '../src/ui/templateNavigatorModal';
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
	for (const tpl of SLIDE_TEMPLATES) {
		assert.ok(tpl.id.length > 0);
		assert.ok(!ids.has(tpl.id), `Duplicate template id: ${tpl.id}`);
		ids.add(tpl.id);

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
