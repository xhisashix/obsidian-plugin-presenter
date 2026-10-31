import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_SETTINGS, type PresentationData } from '../src/types';
import {
	blendHexColors,
	buildPptxTheme,
	isDarkColor,
	normalizeHexColor,
	resolveCalloutColor,
} from '../src/export/pptxTheme';
import {
	extractSlideBlocksFromDom,
	formatSpeakerNotesForPptx,
} from '../src/export/pptxDomParser';
import {
	computeColumnWidths,
	estimateBlocksHeight,
	spansToTextProps,
} from '../src/export/pptxLayoutRenderer';
import { buildPptxFromExtractedSlides } from '../src/export/pptxExporter';
import type { ExtractedSlideContent, PptxBlock } from '../src/export/pptxTypes';

interface MockElementInit {
	tagName: string;
	classList?: string[];
	attributes?: Record<string, string>;
	textContent?: string;
	children?: MockElement[];
	childNodes?: MockNode[];
	checked?: boolean;
}

type MockNode =
	| { nodeType: 3; nodeValue: string }
	| MockElement;

interface MockElement {
	nodeType: 1;
	tagName: string;
	classList: {
		contains: (cls: string) => boolean;
		[Symbol.iterator]: () => Iterator<string>;
	};
	textContent: string;
	children: MockElement[];
	childNodes: MockNode[];
	checked?: boolean;
	style?: Record<string, string>;
	getAttribute: (name: string) => string | null;
	querySelector: (selector: string) => MockElement | null;
	querySelectorAll: (selector: string) => MockElement[];
}

function createTextNode(text: string): MockNode {
	return { nodeType: 3, nodeValue: text };
}

function createEl(init: MockElementInit): MockElement {
	const classes = init.classList ?? [];
	const attrs = init.attributes ?? {};
	const children = init.children ?? [];
	const childNodes: MockNode[] =
		init.childNodes ??
		(children.length > 0
			? children
			: init.textContent !== undefined
				? [createTextNode(init.textContent)]
				: []);

	const computedText =
		init.textContent ??
		childNodes
			.map((n) => (n.nodeType === 3 ? n.nodeValue : n.textContent))
			.join('');

	const el: MockElement = {
		nodeType: 1,
		tagName: init.tagName.toUpperCase(),
		classList: {
			contains: (c: string) => classes.includes(c),
			[Symbol.iterator]: function* () {
				yield* classes;
			},
		},
		textContent: computedText,
		children,
		childNodes,
		checked: init.checked,
		style: {},
		getAttribute: (name: string) => attrs[name] ?? null,
		querySelector: (selector: string) => {
			const all = el.querySelectorAll(selector);
			return all[0] ?? null;
		},
		querySelectorAll: (selector: string) => {
			const results: MockElement[] = [];
			const matchSelector = (target: MockElement): boolean => {
				if (selector.startsWith('.')) {
					return target.classList.contains(selector.slice(1));
				}
				if (selector === 'input[type="checkbox"]') {
					return (
						target.tagName === 'INPUT' &&
						target.getAttribute('type') === 'checkbox'
					);
				}
				return target.tagName.toLowerCase() === selector.toLowerCase();
			};
			const walk = (node: MockElement) => {
				for (const child of node.children) {
					if (matchSelector(child)) {
						results.push(child);
					}
					walk(child);
				}
			};
			walk(el);
			return results;
		},
	};

	return el;
}

void test('normalizeHexColor handles 3-digit, 6-digit, named, and rgb colors', () => {
	assert.equal(normalizeHexColor('#2563eb'), '2563EB');
	assert.equal(normalizeHexColor('#fff'), 'FFFFFF');
	assert.equal(normalizeHexColor('navy'), '1E3A8A');
	assert.equal(normalizeHexColor('rgb(255, 0, 128)'), 'FF0080');
	assert.equal(normalizeHexColor('', '#123456'), '123456');
});

void test('isDarkColor and blendHexColors compute luminance and color mixing', () => {
	assert.equal(isDarkColor('0F172A'), true);
	assert.equal(isDarkColor('FFFFFF'), false);
	assert.equal(blendHexColors('000000', 'FFFFFF', 0.5), '808080');
	assert.equal(resolveCalloutColor('warning', '2563EB'), 'F59E0B');
	assert.equal(resolveCalloutColor('tip', '2563EB'), '10B981');
});

void test('buildPptxTheme resolves frontmatter overrides and dimensions', () => {
	const theme = buildPptxTheme(
		{
			baseColor: '#0f172a',
			mainColor: '#f8fafc',
			accentColor: '#38bdf8',
			aspectRatio: '4:3',
			header: 'Confidential',
			footer: '© 2026',
		},
		DEFAULT_SETTINGS,
		'data:image/png;base64,iVBORw0KGgo='
	);

	assert.equal(theme.baseColor, '0F172A');
	assert.equal(theme.mainColor, 'F8FAFC');
	assert.equal(theme.accentColor, '38BDF8');
	assert.equal(theme.isDark, true);
	assert.equal(theme.aspectRatio, '4:3');
	assert.equal(theme.width, 10.0);
	assert.equal(theme.height, 7.5);
	assert.equal(theme.headerText, 'Confidential');
	assert.equal(theme.footerText, '© 2026');
});

void test('extractSlideBlocksFromDom extracts headings, badges, KPI, lists, tables, and columns', () => {
	const mockContainer = createEl({
		tagName: 'div',
		children: [
			createEl({
				tagName: 'h2',
				textContent: 'Quarterly Overview',
			}),
			createEl({
				tagName: 'div',
				classList: ['presenter-kpi-value'],
				textContent: '+142%',
			}),
			createEl({
				tagName: 'p',
				childNodes: [
					createEl({
						tagName: 'span',
						classList: ['presenter-badge'],
						textContent: '重要',
					}),
					createTextNode(' Key metric achieved'),
				],
			}),
			createEl({
				tagName: 'div',
				classList: ['presenter-cols', 'presenter-cols-2', 'presenter-cols-card', 'presenter-cols-ratio-2-1', 'presenter-cols-step'],
				children: [
					createEl({
						tagName: 'div',
						classList: ['presenter-col'],
						children: [
							createEl({ tagName: 'h3', textContent: 'Left Column' }),
							createEl({
								tagName: 'ul',
								children: [
									createEl({ tagName: 'li', textContent: 'Bullet 1' }),
									createEl({ tagName: 'li', textContent: 'Bullet 2' }),
								],
							}),
						],
					}),
					createEl({
						tagName: 'div',
						classList: ['presenter-col'],
						children: [
							createEl({ tagName: 'h3', textContent: 'Right Column' }),
							createEl({ tagName: 'p', textContent: 'Details' }),
						],
					}),
				],
			}),
			createEl({
				tagName: 'table',
				children: [
					createEl({
						tagName: 'tr',
						children: [
							createEl({ tagName: 'th', textContent: 'Metric' }),
							createEl({ tagName: 'th', textContent: 'Value' }),
						],
					}),
					createEl({
						tagName: 'tr',
						children: [
							createEl({ tagName: 'td', textContent: 'Revenue' }),
							createEl({ tagName: 'td', textContent: '$1.2M' }),
						],
					}),
				],
			}),
		],
	});

	const blocks = extractSlideBlocksFromDom(mockContainer as unknown as HTMLElement);
	assert.equal(blocks.length, 5);
	assert.equal(blocks[0]?.kind, 'heading');
	assert.equal(blocks[1]?.kind, 'kpi');
	if (blocks[1]?.kind === 'kpi') {
		assert.equal(blocks[1].value, '+142%');
	}

	assert.equal(blocks[2]?.kind, 'paragraph');
	if (blocks[2]?.kind === 'paragraph') {
		assert.equal(blocks[2].spans[0]?.isBadge, true);
		assert.equal(blocks[2].spans[0]?.text, '重要');
	}

	assert.equal(blocks[3]?.kind, 'columns');
	if (blocks[3]?.kind === 'columns') {
		assert.equal(blocks[3].count, 2);
		assert.equal(blocks[3].style, 'card');
		assert.equal(blocks[3].ratio, '2:1');
		assert.equal(blocks[3].variant, 'step');
		assert.equal(blocks[3].columns.length, 2);
	}

	assert.equal(blocks[4]?.kind, 'table');
	if (blocks[4]?.kind === 'table') {
		assert.equal(blocks[4].rows.length, 2);
		assert.equal(blocks[4].rows[0]?.[0]?.isHeader, true);
	}
});

void test('computeColumnWidths and spansToTextProps calculate layout and text runs', () => {
	const widths = computeColumnWidths(9.2, 2, 0.2, '2:1');
	assert.equal(widths.length, 2);
	assert.ok(Math.abs((widths[0] ?? 0) - 6.0) < 0.01);
	assert.ok(Math.abs((widths[1] ?? 0) - 3.0) < 0.01);

	const theme = buildPptxTheme({}, DEFAULT_SETTINGS);
	const props = spansToTextProps(
		[
			{ text: 'URGENT', isBadge: true },
			{ text: 'Check this', bold: true },
		],
		theme
	);
	assert.ok(props.length >= 2);
	assert.equal(props[0]?.options?.highlight, theme.accentColor);
});

void test('formatSpeakerNotesForPptx cleans callout headers and badges', () => {
	const raw = '> [!note]\n> <span class="presenter-badge">POINT</span> Speak **slowly** here.';
	const cleaned = formatSpeakerNotesForPptx(raw);
	assert.equal(cleaned, '> [POINT] Speak slowly here.');
});

void test('buildPptxFromExtractedSlides produces a valid PPTX ZIP ArrayBuffer', async () => {
	const presentation: PresentationData = {
		title: 'Product Roadmap',
		frontmatter: {
			aspectRatio: '16:9',
			header: 'Roadmap 2026',
			footer: 'Internal Use Only',
		},
		slides: [
			{
				index: 0,
				type: 'cover',
				layout: 'cover',
				title: 'Product Roadmap',
				markdown: '# Product Roadmap\nSubtitle here',
				notes: 'Welcome everyone to the presentation.',
			},
			{
				index: 1,
				type: 'section',
				layout: 'section',
				title: 'Phase 1: Foundation',
				markdown: '## Phase 1: Foundation',
			},
			{
				index: 2,
				type: 'content',
				layout: 'content',
				title: 'Key Deliverables',
				markdown: '## Key Deliverables',
				notes: 'Emphasize Q3 milestones.',
			},
		],
	};

	const sampleBlocks: PptxBlock[] = [
		{
			kind: 'heading',
			level: 2,
			text: 'Key Deliverables',
			spans: [{ text: 'Key Deliverables' }],
		},
		{
			kind: 'columns',
			count: 2,
			style: 'card',
			ratio: '2:1',
			variant: 'step',
			columns: [
				[
					{
						kind: 'heading',
						level: 3,
						text: 'Architecture',
						spans: [{ text: 'Architecture' }],
					},
					{
						kind: 'list',
						ordered: false,
						items: [
							{
								level: 0,
								ordered: false,
								spans: [
									{ text: 'CORE', isBadge: true },
									{ text: 'Modular PPTX engine' },
								],
							},
						],
					},
				],
				[
					{
						kind: 'kpi',
						value: '+99.9%',
					},
					{
						kind: 'callout',
						calloutType: 'tip',
						title: 'Pro Tip',
						spans: [{ text: 'Editable native shapes in PowerPoint.' }],
					},
				],
			],
		},
	];

	const extractedSlides: ExtractedSlideContent[] = [
		{
			index: 0,
			layout: 'cover',
			title: 'Product Roadmap',
			blocks: [
				{
					kind: 'heading',
					level: 1,
					text: 'Product Roadmap',
					spans: [{ text: 'Product Roadmap' }],
				},
				{
					kind: 'paragraph',
					spans: [{ text: 'Subtitle here' }],
				},
			],
			notesText: 'Welcome everyone to the presentation.',
		},
		{
			index: 1,
			layout: 'section',
			title: 'Phase 1: Foundation',
			blocks: [
				{
					kind: 'heading',
					level: 2,
					text: 'Phase 1: Foundation',
					spans: [{ text: 'Phase 1: Foundation' }],
				},
			],
		},
		{
			index: 2,
			layout: 'content',
			title: 'Key Deliverables',
			blocks: sampleBlocks,
			notesText: 'Emphasize Q3 milestones.',
		},
	];

	const theme = buildPptxTheme(presentation.frontmatter, DEFAULT_SETTINGS);
	assert.ok(estimateBlocksHeight(sampleBlocks, 10) > 1.0);

	const buffer = await buildPptxFromExtractedSlides(presentation, extractedSlides, theme);
	assert.ok(buffer instanceof ArrayBuffer);
	assert.ok(buffer.byteLength > 1000);

	// Verify ZIP local file header magic bytes (PK\x03\x04)
	const view = new Uint8Array(buffer);
	assert.equal(view[0], 0x50); // 'P'
	assert.equal(view[1], 0x4b); // 'K'
	assert.equal(view[2], 0x03);
	assert.equal(view[3], 0x04);
});

void test('PPTX bundle does not include dynamic script element creation or new Function polyfills', () => {
	const bundleCode = readFileSync('tests/.bundle.test.mjs', 'utf8');
	const scriptTagPattern = new RegExp(
		'createElement\\s*\\(\\s*[\'"]' + 'script' + '[\'"]\\s*\\)'
	);
	const newFunctionPattern = new RegExp('new\\s+' + 'Function\\s*\\(');

	assert.equal(
		scriptTagPattern.test(bundleCode),
		false,
		'Bundle must not dynamically create script elements'
	);
	assert.equal(
		newFunctionPattern.test(bundleCode),
		false,
		'Bundle must not construct dynamic functions'
	);
});
