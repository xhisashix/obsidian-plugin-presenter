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
	extractFrontmatter,
	preprocessAutoLayouts,
	preprocessQaBlocks,
	preprocessTableHighlights,
	formatCardHeadingEyebrow,
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

void test('parsePresentation inherits H2 heading with 1-1, 1-2, 1-N numbering on multi-slide sections', () => {
	const markdown = `
# Main Presentation

## プロジェクトの進捗状況
前半のサマリーです。
- 実績 1
- 実績 2

---

後半の課題とネクストアクションです。
- 課題 1
- 課題 2

---

### 追加考察
- 考察 1

## 次のステップ
- スケジュール

## 課題と対応方針
内容 1

---

内容 2
`.trim();

	const presentation = parsePresentation(markdown);
	assert.equal(presentation.slides.length, 7);

	// Slide 0: Cover
	assert.equal(presentation.slides[0]?.type, 'cover');
	assert.equal(presentation.slides[0]?.title, 'Main Presentation');

	// Slide 1: 1st slide of 1st section -> 1-1
	assert.equal(presentation.slides[1]?.title, 'プロジェクトの進捗状況 1-1');
	assert.ok(presentation.slides[1]?.markdown.includes('## プロジェクトの進捗状況 1-1'));

	// Slide 2: 2nd slide of 1st section -> 1-2
	assert.equal(presentation.slides[2]?.title, 'プロジェクトの進捗状況 1-2');
	assert.ok(presentation.slides[2]?.markdown.startsWith('## プロジェクトの進捗状況 1-2'));

	// Slide 3: 3rd slide of 1st section -> 1-3
	assert.equal(presentation.slides[3]?.title, 'プロジェクトの進捗状況 1-3');
	assert.ok(presentation.slides[3]?.markdown.startsWith('## プロジェクトの進捗状況 1-3'));

	// Slide 4: Single-slide section (no continuation -> no 1-N numbering)
	assert.equal(presentation.slides[4]?.title, '次のステップ');
	assert.ok(presentation.slides[4]?.markdown.includes('## 次のステップ'));

	// Slide 5: 1st slide of 3rd section (multi-slide) -> 3-1
	assert.equal(presentation.slides[5]?.title, '課題と対応方針 3-1');
	assert.ok(presentation.slides[5]?.markdown.includes('## 課題と対応方針 3-1'));

	// Slide 6: 2nd slide of 3rd section (multi-slide) -> 3-2
	assert.equal(presentation.slides[6]?.title, '課題と対応方針 3-2');
	assert.ok(presentation.slides[6]?.markdown.startsWith('## 課題と対応方針 3-2'));
});

void test('parsePresentation allows disabling continuation heading numbering', () => {
	// Case 1: Disabled via options
	const md1 = `
# Cover

## Section A

Part 1

---

Part 2
`.trim();
	const pres1 = parsePresentation(md1, { inheritSlideHeadings: false });
	assert.equal(pres1.slides[1]?.title, 'Section A');
	assert.equal(pres1.slides[2]?.title, 'Slide 3');
	assert.ok(!pres1.slides[2]?.markdown.includes('Section A'));

	// Case 2: Disabled via frontmatter
	const md2 = `
---
inheritHeadings: false
---

# Cover

## Section B

Part 1

---

Part 2
`.trim();
	const pres2 = parsePresentation(md2);
	assert.equal(pres2.slides[1]?.title, 'Section B');
	assert.equal(pres2.slides[2]?.title, 'Slide 3');
});

void test('parsePresentation does not inherit heading onto quotes or section dividers', () => {
	const markdown = `
# Cover

## Section A
Intro content

---

> This is a standalone big quote.
> — Famous Person
`.trim();

	const presentation = parsePresentation(markdown);
	//Slide 2: quotes
	assert.equal(presentation.slides.length, 3);
	assert.equal(presentation.slides[2]?.type, 'quote');
	assert.ok(!presentation.slides[2]?.markdown.includes('Section A'));
});

void test('extractFrontmatter parses popColor and aliases', () => {
	assert.equal(extractFrontmatter('---\npopColor: "#ff5500"\n---').frontmatter.popColor, '#ff5500');
	assert.equal(extractFrontmatter('---\npop-color: "#ea580c"\n---').frontmatter.popColor, '#ea580c');
	assert.equal(extractFrontmatter('---\nhighlightColor: "#f97316"\n---').frontmatter.popColor, '#f97316');
});

void test('parseDirective supports 6:4 / 3:2 ratios and 2x2 grid variant', () => {
	assert.deepEqual(parseDirective('<!-- columns 6:4 plain -->'), {
		kind: 'columns',
		count: 2,
		ratio: '3:2',
		style: 'plain',
	});
	assert.deepEqual(parseDirective('<!-- columns 4:6 card -->'), {
		kind: 'columns',
		count: 2,
		ratio: '2:3',
		style: 'card',
	});
	assert.deepEqual(parseDirective('<!-- columns 4 grid -->'), {
		kind: 'columns',
		count: 4,
		variant: 'grid',
	});
});

void test('preprocessAutoLayouts automatically converts 2, 3, and 4 H3 sections into columns and 2x2 grid', () => {
	const fourH3Markdown = `
## 4つの評価基準

### 01. 視認性
- 18px以上の文字サイズ保証
- 明快なジャンプ率

### 02. 配色ルール
- 70:25:5の黄金比
- オレンジは5%の最重要箇所のみ

### 03. 余白と整列
- 枠線を排したカードチャンク
- 左揃えの徹底

### 04. 図解とグラフ
- 2x2グリッドへの自動折り返し
- ノイズレスな横棒グラフ

> [!important] 結論
> 聴衆が3秒で構造を理解できるスライドを標準化します。
`.trim();

	const output = preprocessAutoLayouts(fourH3Markdown, 'card', true);
	assert.ok(output.includes('presenter-cols presenter-cols-2 presenter-cols-card presenter-cols-grid'));
	assert.equal(output.match(/class="presenter-col"/g)?.length, 4);
	// Trailing callout stays outside the column grid
	assert.ok(output.endsWith('聴衆が3秒で構造を理解できるスライドを標準化します。'));
});

void test('preprocessAutoLayouts converts standalone image + bullets into 6:4 split and code + bullets into code split', () => {
	const imageSlide = `
## ビジュアルとテキストの黄金比

![プロダクト画面](https://example.com/screen.png)

- 画面キャプチャを60%の幅で大きく配置
- 右側40%に重要ポイントを3点以内で整理
- 視線が左の画像から右の結論へ自然に移動
`.trim();

	const imgOut = preprocessAutoLayouts(imageSlide, 'card', true);
	assert.ok(imgOut.includes('presenter-cols-ratio-3-2 presenter-cols-media-split'));

	const codeSlide = `
## プラグイン起動の仕組み

\`\`\`typescript
const file = activeView.file;
const content = await this.app.vault.read(file);
const presentation = parsePresentation(content);
\`\`\`

- Vault内のMarkdownファイルを非破壊で読み込み
- 表示時にメモリ上でのみスライド構造へ変換
`.trim();

	const codeOut = preprocessAutoLayouts(codeSlide, 'card', true);
	assert.ok(codeOut.includes('presenter-cols-ratio-3-2 presenter-cols-code-split'));
});

void test('preprocessTableHighlights wraps comparison tables with recommended column highlight', () => {
	const tableMd = `
| 比較項目 | 従来ツール | **Obsidian Presenter [推奨]** | 手動作成 |
| :--- | :--- | :--- | :--- |
| 学習コスト | 高い | **ゼロ（標準MD）** | 低い |
| 保守性 | 低い | **Git完全対応** | 困難 |
`.trim();

	const out = preprocessTableHighlights(tableMd, true);
	assert.ok(out.includes('presenter-table-highlight-col-3'));

	const explicitMd = `
<!-- table: highlight 2 -->
| 項目 | プランA | プランB |
| :--- | :--- | :--- |
| 価格 | 1,000円 | 2,000円 |
`.trim();

	const explicitOut = preprocessTableHighlights(explicitMd, true);
	assert.ok(explicitOut.includes('presenter-table-highlight-col-2'));
});

void test('preprocessQaBlocks formats Q. and A. pairs into aligned Q&A cards', () => {
	const qaMd = `
## よくあるご質問（FAQ）

Q. 既存のMarkdownノートを書き換える必要はありますか？
A. いいえ。見出し（H1/H2）と箇条書きがあれば、そのままスライドとして表示されます。

Q. 他のエディタやGitHubで開いたときに表示は崩れませんか？
A. 標準のCommonMark/GFM記法に完全準拠しているため、通常のドキュメントとして美しく読めます。
`.trim();

	const out = preprocessQaBlocks(qaMd, true);
	assert.ok(out.includes('presenter-qa-list'));
	assert.ok(out.includes('presenter-qa-marker-q'));
	assert.ok(out.includes('presenter-qa-marker-a'));
	assert.equal(out.match(/class="presenter-qa-card"/g)?.length, 2);
});

void test('preprocessKpi chart bars distinguish pop highlight and secondary main bars', () => {
	const chartMd = `
<!-- chart -->
- **クラウド事業 [牽引]** | **+42%** | 92%
- エンタープライズ [比較] | +24% | 65%
- レガシー保守 | +5% | 25%
<!-- /chart -->
`.trim();

	const out = preprocessKpi(chartMd, true);
	assert.ok(out.includes('presenter-chart-row-pop'));
	assert.ok(out.includes('presenter-chart-row-main'));
});

void test('preprocessKpi adds blank lines around KPI div so following captions remain Markdown paragraphs', () => {
	const autoKpi = [
		'### 資料作成スピード',
		'**3.5x**',
		'Markdownによる圧倒的時短',
	].join('\n');
	const autoOut = preprocessKpi(autoKpi, true);
	assert.ok(
		autoOut.includes('\n\n<div class="presenter-kpi-value">3.5x</div>\n\nMarkdownによる圧倒的時短'),
		`Unexpected auto KPI output:\n${autoOut}`,
	);

	const explicitKpi = [
		'<!-- kpi -->',
		'**-40% 削減**',
		'<!-- /kpi -->',
		'導入3ヶ月目の実測値',
	].join('\n');
	const explicitOut = preprocessKpi(explicitKpi, false);
	assert.ok(
		explicitOut.includes('<div class="presenter-kpi-value">-40% 削減</div>\n\n導入3ヶ月目の実測値'),
		`Unexpected explicit KPI output:\n${explicitOut}`,
	);
});

void test('preprocessAutoLayouts converts 4-item bold-label lists into a 2x2 card grid while keeping lead text and trailing blockquote', () => {
	const md = [
		'## プラグインのコンセプト',
		'シンプルさと表現力を両立するための設計方針です。',
		'',
		'- **標準Markdown互換**: 独自の複雑記法を強制しない',
		'- **自動レイアウト**: 構造に合わせて最適配置',
		'- **マルチエクスポート**: HTML・PDF・PPTXへ展開',
		'- **ライブプレビュー**: 書きながら仕上がりを確認',
		'',
		'> 思考の速度でスライドを作成し、そのままプレゼンへ。',
	].join('\n');

	const out = preprocessAutoLayouts(md, 'card', true);
	assert.ok(out.includes('シンプルさと表現力を両立するための設計方針です。'));
	assert.ok(out.includes('class="presenter-cols presenter-cols-2 presenter-cols-card presenter-cols-grid"'));
	assert.ok(out.includes('### 標準Markdown互換'));
	assert.ok(out.includes('### ライブプレビュー'));
	assert.ok(out.includes('> 思考の速度でスライドを作成し、そのままプレゼンへ。'));
});

void test('preprocessAutoLayouts wraps standalone Hero KPI blocks in presenter-cols-hero-kpi', () => {
	const md = [
		'## KPI数値と重要サマリー',
		'単独行の太字数値を自動検知してKPIカード化します。',
		'',
		'### 資料作成スピード',
		'**3.5x**',
		'Markdownによる圧倒的時短',
		'',
		'> [!TIP] 導入効果',
		'> チーム全体の会議準備時間を大幅削減。',
	].join('\n');

	const out = preprocessAutoLayouts(md, 'card', true);
	assert.ok(out.includes('presenter-cols-hero-kpi'));
	assert.ok(out.includes('### 資料作成スピード'));
	assert.ok(out.includes('**3.5x**'));
	assert.ok(out.includes('> [!TIP] 導入効果'));
});

void test('formatCardHeadingEyebrow extracts eyebrow badges cleanly without false positives', () => {
	const numbered = formatCardHeadingEyebrow('### 01. 課題の特定\n詳細説明');
	assert.ok(numbered.includes('presenter-card-eyebrow'));
	assert.ok(numbered.includes('01'));
	assert.ok(numbered.includes('課題の特定'));

	const step = formatCardHeadingEyebrow('### STEP 2: 検証と改善\n詳細説明');
	assert.ok(step.includes('presenter-card-eyebrow'));
	assert.ok(step.includes('STEP 02') || step.includes('STEP 2'));
	assert.ok(step.includes('検証と改善'));

	const ratio = '### 16:9 ワイド画面に対応\n詳細説明';
	assert.equal(formatCardHeadingEyebrow(ratio), ratio);

	const bareStep = '### Step 1\n詳細説明';
	assert.equal(formatCardHeadingEyebrow(bareStep), bareStep);
});


