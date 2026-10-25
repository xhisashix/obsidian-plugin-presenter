import test from 'node:test';
import assert from 'node:assert/strict';
import type { Editor, EditorPosition } from 'obsidian';
import {
	formatColumnsOpenDirective,
	insertColumnBlock,
	insertColumnBreak,
} from '../src/commands/insertColumns';
import { extractPresentationSummary } from '../src/commands/exportSummary';
import { FenceTracker } from '../src/parser/fence';
import { parseDirective } from '../src/parser/directives';
import { preprocessColumns } from '../src/parser/columns';
import { preprocessBadges } from '../src/parser/badges';
import { extractSlideNotes } from '../src/parser/notes';
import {
	parsePresentation,
	getSlideIndexAtLine,
	inferSlideLayout,
	preprocessKpi,
} from '../src/parser/slideParser';

void test('FenceTracker tracks 3-backtick, 4-backtick, and tilde fences accurately', () => {
	const tracker = new FenceTracker();

	assert.equal(tracker.feed('# Title'), false);
	assert.equal(tracker.inFence, false);

	// Open 3-backtick fence
	assert.equal(tracker.feed('```typescript'), true);
	assert.equal(tracker.inFence, true);

	// Inside fence: ~~~ should not close it
	assert.equal(tracker.feed('~~~'), true);
	assert.equal(tracker.inFence, true);

	// Inside fence: `` should not close it
	assert.equal(tracker.feed('``'), true);
	assert.equal(tracker.inFence, true);

	// Close 3-backtick fence
	assert.equal(tracker.feed('```'), true);
	assert.equal(tracker.inFence, false);

	// Open 4-tilde fence
	assert.equal(tracker.feed('~~~~'), true);
	assert.equal(tracker.inFence, true);

	// 3-tilde is not enough to close 4-tilde
	assert.equal(tracker.feed('~~~'), true);
	assert.equal(tracker.inFence, true);

	// 4-tilde closes it
	assert.equal(tracker.feed('~~~~'), true);
	assert.equal(tracker.inFence, false);
});

void test('parseDirective handles columns, column, end-columns, ratios, steps, and slide layouts', () => {
	assert.deepEqual(parseDirective('<!-- columns 2 card -->'), {
		kind: 'columns',
		count: 2,
		style: 'card',
	});

	assert.deepEqual(parseDirective('<!-- columns plain 3 -->'), {
		kind: 'columns',
		count: 3,
		style: 'plain',
	});

	assert.deepEqual(parseDirective('<!-- columns 2:1 plain -->'), {
		kind: 'columns',
		count: 2,
		ratio: '2:1',
		style: 'plain',
	});

	assert.deepEqual(parseDirective('<!-- columns 3 step card -->'), {
		kind: 'columns',
		count: 3,
		variant: 'step',
		style: 'card',
	});

	assert.deepEqual(parseDirective('<!-- slide: section -->'), {
		kind: 'slide',
		layout: 'section',
	});

	assert.deepEqual(parseDirective('<!-- slide: quote -->'), {
		kind: 'slide',
		layout: 'quote',
	});

	assert.deepEqual(parseDirective('<!-- slide: content -->'), {
		kind: 'slide',
		layout: 'content',
	});

	assert.deepEqual(parseDirective('<!-- slide lead -->'), {
		kind: 'slide',
		layout: 'section',
	});

	assert.deepEqual(parseDirective('<!-- presenter:columns -->'), {
		kind: 'columns',
	});

	assert.deepEqual(parseDirective('<!-- column -->'), {
		kind: 'column',
	});

	assert.deepEqual(parseDirective('<!-- presenter:column -->'), {
		kind: 'column',
	});

	assert.deepEqual(parseDirective('<!-- /columns -->'), {
		kind: 'end-columns',
	});

	assert.deepEqual(parseDirective('<!-- /presenter:columns -->'), {
		kind: 'end-columns',
	});

	// Unknown comments are untouched
	assert.equal(parseDirective('<!-- TODO: check this -->'), null);
	assert.equal(parseDirective('<!-- regular html comment -->'), null);
});

void test('preprocessColumns converts directives to standard html grid divs', () => {
	const markdown = `
<!-- columns 2 card -->

### Column A
- Item 1

### Column B
- Item 2

<!-- /columns -->
`.trim();

	const output = preprocessColumns(markdown, 'card');
	assert.ok(output.includes('<div class="presenter-cols presenter-cols-2 presenter-cols-card">'));
	assert.ok(output.includes('### Column A'));
	assert.ok(output.includes('### Column B'));
	assert.equal(output.match(/class="presenter-col"/g)?.length, 2);
});

void test('preprocessColumns partitions by explicit <!-- column --> breaks', () => {
	const markdown = `
<!-- columns plain -->
First text without heading
<!-- column -->
Second text without heading
<!-- /columns -->
`.trim();

	const output = preprocessColumns(markdown, 'card');
	assert.ok(output.includes('<div class="presenter-cols presenter-cols-2 presenter-cols-plain">'));
	assert.ok(output.includes('First text without heading'));
	assert.ok(output.includes('Second text without heading'));
});

void test('preprocessColumns supports ratio and step variants', () => {
	const markdown = `
<!-- columns 2:1 plain -->
### Left Wide
Big diagram
### Right Narrow
Explanation
<!-- /columns -->

<!-- columns 3 step card -->
### Step 1
Start
### Step 2
Process
### Step 3
Finish
<!-- /columns -->
`.trim();

	const output = preprocessColumns(markdown, 'card');
	assert.ok(output.includes('presenter-cols-2 presenter-cols-plain presenter-cols-ratio-2-1'));
	assert.ok(output.includes('presenter-cols-3 presenter-cols-card presenter-cols-step'));
});

void test('inferSlideLayout correctly identifies section dividers, quotes, and respects overrides', () => {
	// 1. Section divider: H2 only
	const sectionLines = ['## Section 1: Overview'];
	assert.equal(inferSlideLayout(sectionLines, 'content', true), 'section');

	// 2. Explicit section directive
	const sectionExplicit = ['<!-- slide: section -->', '## Section 2: Architecture', 'Core architectural concepts.'];
	assert.equal(inferSlideLayout(sectionExplicit, 'content', true), 'section');

	// 3. Normal content: H2 + bullet points
	const contentLines = ['## Features', '- Feature A', '- Feature B'];
	assert.equal(inferSlideLayout(contentLines, 'content', true), 'content');

	// 4. Quote slide: H2 + blockquote
	const quoteLines = ['## Mission', '> To accelerate knowledge sharing across all teams.'];
	assert.equal(inferSlideLayout(quoteLines, 'content', true), 'quote');

	// 5. Explicit directive override
	const explicitLines = ['<!-- slide: content -->', '## Section Only Title'];
	assert.equal(inferSlideLayout(explicitLines, 'content', true), 'content');

	const explicitQuote = ['<!-- slide: quote -->', '## Regular Heading', 'Some regular text'];
	assert.equal(inferSlideLayout(explicitQuote, 'content', true), 'quote');

	// 6. When smartLayouts is disabled, fallback to content
	assert.equal(inferSlideLayout(sectionLines, 'content', false), 'content');
});

void test('preprocessKpi transforms bold metric lines into styled kpi blocks', () => {
	const md = `
## Metrics

**+142%**
YoY Revenue Growth

**3.5x**
Performance gain
`.trim();

	const output = preprocessKpi(md, true);
	assert.ok(output.includes('<div class="presenter-kpi-value">+142%</div>'));
	assert.ok(output.includes('<div class="presenter-kpi-value">3.5x</div>'));
	assert.ok(output.includes('YoY Revenue Growth'));

	// When disabled, raw text is untouched unless explicit <!-- kpi --> is used
	const outputDisabled = preprocessKpi(md, false);
	assert.ok(outputDisabled.includes('**+142%**'));
});

void test('preprocessColumns ignores legacy ::: syntax (does not convert them)', () => {
	const legacyMarkdown = `
::: cols-2
Left
+++
Right
:::
`.trim();

	const output = preprocessColumns(legacyMarkdown, 'card');
	// Must stay raw text since legacy syntax is completely deleted
	assert.ok(output.includes('::: cols-2'));
	assert.ok(output.includes('+++'));
	assert.ok(output.includes(':::'));
	assert.ok(!output.includes('presenter-cols'));
});

void test('preprocessBadges replaces [label] with span badges and preserves standard markdown links and link definitions', () => {
	const markdown = `
- [重要] これは重要です
- [POINT] ポイントです
- [Markdown Link](https://example.com)
- [[Obsidian Link]]
- - [ ] Task checkbox
- - [x] Done checkbox
- Inline \`[Not A Badge]\` code
- Reference link [Ref Link] in paragraph

[Ref Link]: https://example.com/reference
`.trim();

	const converted = preprocessBadges(markdown, true);

	assert.ok(converted.includes('<span class="presenter-badge">重要</span> これは重要です'));
	assert.ok(converted.includes('<span class="presenter-badge">POINT</span> ポイントです'));
	assert.ok(converted.includes('[Markdown Link](https://example.com)'));
	assert.ok(converted.includes('[[Obsidian Link]]'));
	assert.ok(converted.includes('- [ ] Task checkbox'));
	assert.ok(converted.includes('- [x] Done checkbox'));
	assert.ok(converted.includes('`[Not A Badge]`'));
	// Label with link definition must NOT be converted to badge
	assert.ok(converted.includes('[Ref Link]'));
	assert.ok(!converted.includes('<span class="presenter-badge">Ref Link</span>'));

	// When disabled, badges are not converted
	const disabled = preprocessBadges(markdown, false);
	assert.equal(disabled, markdown);
});

void test('extractSlideNotes extracts > [!note] and removes it from slide body', () => {
	const lines = [
		'## Slide 1',
		'',
		'Content here',
		'',
		'> [!note] Speaker Note',
		'> This is a secret hint',
		'> Continued note',
		'',
		'More content',
	];

	const { bodyLines, notesMarkdown } = extractSlideNotes(lines);

	assert.ok(!bodyLines.some((l) => l.includes('[!note]')));
	assert.ok(bodyLines.includes('Content here'));
	assert.ok(bodyLines.includes('More content'));
	assert.ok(notesMarkdown !== undefined);
	assert.ok(notesMarkdown.includes('> [!note] Speaker Note'));
	assert.ok(notesMarkdown.includes('> This is a secret hint'));
});

void test('parsePresentation parses CommonMark ATX headings, Setext headings, and thematic breaks', () => {
	const markdown = `
---
header: "Test Demo"
---

Presentation Main Title
===

## ATX Slide 2
Slide 2 content

Paragraph for Slide 3
---
Slide 3 content

* * *

## ATX Slide 4
Slide 4 content
`.trim();

	const presentation = parsePresentation(markdown);

	assert.equal(presentation.title, 'Presentation Main Title');
	assert.equal(presentation.slides.length, 4);

	// Slide 0: Setext H1 Cover
	assert.equal(presentation.slides[0]?.type, 'cover');
	assert.equal(presentation.slides[0]?.title, 'Presentation Main Title');

	// Slide 1: ATX H2
	assert.equal(presentation.slides[1]?.type, 'content');
	assert.equal(presentation.slides[1]?.title, 'ATX Slide 2');

	// Slide 2: Setext H2
	assert.equal(presentation.slides[2]?.type, 'content');
	assert.equal(presentation.slides[2]?.title, 'Paragraph for Slide 3');

	// Slide 3: ATX Slide 4 (separated by * * *)
	assert.equal(presentation.slides[3]?.type, 'content');
	assert.equal(presentation.slides[3]?.title, 'ATX Slide 4');
});

void test('parsePresentation handles frontmatter columnStyle override and presenter namespace aliases', () => {
	const markdown = `---
columnStyle: plain
---

# Title

<!-- presenter:columns 2 -->

### Left
Left content

### Right
Right content

<!-- /presenter:columns -->
`.trim();

	const presentation = parsePresentation(markdown);
	assert.equal(presentation.slides.length, 1);
	const slideMarkdown = presentation.slides[0]?.markdown ?? '';
	assert.ok(slideMarkdown.includes('presenter-cols-2 presenter-cols-plain'));
	assert.ok(slideMarkdown.includes('### Left'));
	assert.ok(slideMarkdown.includes('### Right'));
});

void test('sample-presentation.md parses correctly with all slides and columns intact', async () => {
	const { readFileSync } = await import('node:fs');
	const content = readFileSync('examples/sample-presentation.md', 'utf-8');
	const presentation = parsePresentation(content);

	assert.equal(presentation.title, 'Obsidian Presenter');
	assert.equal(presentation.slides.length, 11);
	assert.equal(presentation.slides[0]?.type, 'cover');

	// Verify columns in slide 2
	const col2Slide = presentation.slides.find((s) => s.title === 'グリッドレイアウト（2カラム）');
	assert.ok(col2Slide);
	assert.ok(col2Slide.markdown.includes('presenter-cols presenter-cols-2 presenter-cols-card'));

	// Verify columns in slide 3
	const col3Slide = presentation.slides.find((s) => s.title === '3カラムレイアウト比較');
	assert.ok(col3Slide);
	assert.ok(col3Slide.markdown.includes('presenter-cols presenter-cols-3 presenter-cols-card'));

	// Verify plain columns in slide 4
	const plainSlide = presentation.slides.find((s) => s.title === 'プレーンスタイル（背景色なし）のマルチカラム');
	assert.ok(plainSlide);
	assert.ok(plainSlide.markdown.includes('presenter-cols presenter-cols-2 presenter-cols-plain'));

	// Verify 2:1 ratio and step in slide 7
	const ratioSlide = presentation.slides.find((s) => s.title === '非均等カラム比率とステップフロー');
	assert.ok(ratioSlide);
	assert.ok(ratioSlide.markdown.includes('presenter-cols-ratio-2-1'));
	assert.ok(ratioSlide.markdown.includes('presenter-cols-step'));

	// Verify KPI in slide 8
	const kpiSlide = presentation.slides.find((s) => s.title === 'KPI数値と重要サマリー');
	assert.ok(kpiSlide);
	assert.ok(kpiSlide.markdown.includes('presenter-kpi-value'));
});

void test('getSlideIndexAtLine maps line numbers correctly', () => {
	const markdown = `
# Slide 1
Line 1
Line 2

## Slide 2
Line 5
Line 6
`.trim();

	const presentation = parsePresentation(markdown);
	assert.equal(getSlideIndexAtLine(presentation.slides, 1), 0);
	assert.equal(getSlideIndexAtLine(presentation.slides, 4), 1);
});

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

void test('insertColumnBlock inserts directives on empty line and places cursor in the middle', () => {
	assert.equal(formatColumnsOpenDirective(2), '<!-- columns 2 -->');
	assert.equal(formatColumnsOpenDirective(3, 'plain'), '<!-- columns 3 plain -->');

	const mock = createMockEditor('## Slide Title\n\n', { line: 1, ch: 0 });
	insertColumnBlock(mock.editor, 2);

	assert.equal(
		mock.getDoc(),
		'## Slide Title\n<!-- columns 2 -->\n\n<!-- /columns -->\n'
	);
	assert.deepEqual(mock.getCursorPos(), { line: 2, ch: 0 });
});

void test('insertColumnBlock appends below non-empty line without splitting line text', () => {
	const mock = createMockEditor('## Slide Title', { line: 0, ch: 5 });
	insertColumnBlock(mock.editor, 3, 'plain');

	assert.equal(
		mock.getDoc(),
		'## Slide Title\n<!-- columns 3 plain -->\n\n<!-- /columns -->'
	);
	assert.deepEqual(mock.getCursorPos(), { line: 2, ch: 0 });
});

void test('insertColumnBlock wraps selected text with opening and closing directives', () => {
	const initial = '## Slide\n### Left\n- A\n\n### Right\n- B';
	const mock = createMockEditor(
		initial,
		{ line: 1, ch: 0 },
		{ line: 5, ch: 3 }
	);
	insertColumnBlock(mock.editor, 2, 'card');

	assert.equal(
		mock.getDoc(),
		'## Slide\n<!-- columns 2 card -->\n### Left\n- A\n\n### Right\n- B\n<!-- /columns -->'
	);
	assert.deepEqual(mock.getCursorPos(), { line: 7, ch: '<!-- /columns -->'.length });
});

void test('insertColumnBreak inserts <!-- column --> and advances cursor to next line', () => {
	const mockEmpty = createMockEditor('### Left\n\n### Right', { line: 1, ch: 0 });
	insertColumnBreak(mockEmpty.editor);
	assert.equal(mockEmpty.getDoc(), '### Left\n<!-- column -->\n\n### Right');
	assert.deepEqual(mockEmpty.getCursorPos(), { line: 2, ch: 0 });

	const mockNonEmpty = createMockEditor('Left paragraph', { line: 0, ch: 4 });
	insertColumnBreak(mockNonEmpty.editor);
	assert.equal(mockNonEmpty.getDoc(), 'Left paragraph\n<!-- column -->\n');
	assert.deepEqual(mockNonEmpty.getCursorPos(), { line: 2, ch: 0 });
});

void test('formatColumnsOpenDirective formats count, style, ratio, and step variant', () => {
	assert.equal(formatColumnsOpenDirective(2), '<!-- columns 2 -->');
	assert.equal(formatColumnsOpenDirective(2, 'card'), '<!-- columns 2 card -->');
	assert.equal(formatColumnsOpenDirective(2, 'plain', '2:1'), '<!-- columns 2 2:1 plain -->');
	assert.equal(formatColumnsOpenDirective(3, 'card', undefined, 'step'), '<!-- columns 3 card step -->');
});

void test('extractPresentationSummary produces structured outline with takeaways', () => {
	const md = `
# Q4 Strategy Pitch

## Agenda
Section overview

## Section 1: Growth
<!-- slide: section -->

## Performance
- Point 1
> [!important] 30% reduction in lead time

## Metrics
- [重要] 締切は来週水曜日まで
`.trim();

	const presentation = parsePresentation(md);
	const summary = extractPresentationSummary(presentation);

	assert.ok(summary.includes('# Q4 Strategy Pitch'));
	assert.ok(summary.includes('1. 【Cover】 Q4 Strategy Pitch'));
	assert.ok(summary.includes('2. Agenda'));
	assert.ok(summary.includes('3. 【Section】 Section 1: Growth'));
	assert.ok(summary.includes('4. Performance'));
	assert.ok(summary.includes('5. Metrics'));
	assert.ok(summary.includes('30% reduction in lead time'));
	assert.ok(summary.includes('[重要]**: 締切は来週水曜日まで'));
});

