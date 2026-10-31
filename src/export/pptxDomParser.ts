import type { ColumnRatio, ColumnStyle, ColumnVariant } from '../types';
import { arrayBufferToBase64 } from './imageInliner';
import type { PptxBlock, PptxListItem, PptxTableCell, PptxTextSpan } from './pptxTypes';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Converts rendered SVG diagrams (e.g., Mermaid diagrams) inside the slide container
 * into inline PNG Base64 `<img>` elements so they can be embedded into PowerPoint slides.
 */
export async function rasterizeSvgElementsToImages(
	container: HTMLElement,
	baseColorHex: string,
	mainColorHex: string
): Promise<void> {
	if (typeof document === 'undefined') return;

	const svgContainers = Array.from(
		container.querySelectorAll<HTMLElement>('.block-language-mermaid, .mermaid')
	);

	for (const block of svgContainers) {
		const svg = block.querySelector('svg');
		if (!svg) continue;

		const pngDataObj = await convertSvgToPngDataUrl(svg, baseColorHex, mainColorHex);
		if (pngDataObj) {
			const parent = block.parentElement;
			if (parent) {
				const img = parent.createEl('img', {
					attr: {
						src: pngDataObj.dataUrl,
						alt: 'Diagram',
						'data-pptx-width': String(pngDataObj.width),
						'data-pptx-height': String(pngDataObj.height),
					},
				});
				block.replaceWith(img);
			}
		}
	}
}

async function convertSvgToPngDataUrl(
	svgEl: SVGSVGElement,
	baseColorHex: string,
	mainColorHex: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
	try {
		const rect = svgEl.getBoundingClientRect();
		const viewBox = svgEl.viewBox?.baseVal;
		const rawW = rect.width || viewBox?.width || Number(svgEl.getAttribute('width')) || 640;
		const rawH = rect.height || viewBox?.height || Number(svgEl.getAttribute('height')) || 360;
		const width = Math.max(100, Math.round(rawW));
		const height = Math.max(60, Math.round(rawH));

		const clone = svgEl.cloneNode(true) as SVGSVGElement;
		clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		clone.setAttribute('width', `${width}`);
		clone.setAttribute('height', `${height}`);
		clone.style.setProperty('--presenter-base-color', `#${baseColorHex}`);
		clone.style.setProperty('--presenter-main-color', `#${mainColorHex}`);

		const xml = new XMLSerializer().serializeToString(clone);
		const svgBase64 = arrayBufferToBase64(new TextEncoder().encode(xml).buffer);
		const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

		return await new Promise((resolve) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				try {
					const scale = 2;
					const canvas = createEl('canvas');
					canvas.width = width * scale;
					canvas.height = height * scale;
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						resolve({ dataUrl: svgDataUrl, width, height });
						return;
					}
					ctx.scale(scale, scale);
					ctx.drawImage(img, 0, 0, width, height);
					const pngUrl = canvas.toDataURL('image/png');
					resolve({ dataUrl: pngUrl, width, height });
				} catch {
					// Fallback to SVG data URL if foreignObject taints canvas
					resolve({ dataUrl: svgDataUrl, width, height });
				}
			};
			img.onerror = () => {
				resolve({ dataUrl: svgDataUrl, width, height });
			};
			img.src = svgDataUrl;
		});
	} catch {
		return null;
	}
}

interface InlineState {
	bold?: boolean;
	italic?: boolean;
	strike?: boolean;
	code?: boolean;
	isBadge?: boolean;
	linkUrl?: string;
}

/**
 * Extracts inline styled spans (`PptxTextSpan[]`) from a DOM element.
 */
export function extractInlineSpans(node: Node, state: InlineState = {}): PptxTextSpan[] {
	if (node.nodeType === TEXT_NODE) {
		const rawText = node.nodeValue ?? '';
		if (!rawText) return [];
		const normalized = state.code ? rawText : rawText.replace(/\s+/g, ' ');
		if (!normalized) return [];
		return [
			{
				text: normalized,
				bold: state.bold,
				italic: state.italic,
				strike: state.strike,
				code: state.code,
				isBadge: state.isBadge,
				linkUrl: state.linkUrl,
			},
		];
	}

	if (node.nodeType !== ELEMENT_NODE) {
		return [];
	}

	const el = node as HTMLElement;
	const tag = el.tagName.toLowerCase();

	if (tag === 'br') {
		return [{ text: '\n', breakLine: true }];
	}

	// Skip nested lists inside <li> when extracting strictly inline text of the <li> itself
	if (tag === 'ul' || tag === 'ol') {
		return [];
	}

	const nextState: InlineState = { ...state };
	if (tag === 'strong' || tag === 'b') nextState.bold = true;
	if (tag === 'em' || tag === 'i') nextState.italic = true;
	if (tag === 'del' || tag === 's') nextState.strike = true;
	if (tag === 'code') nextState.code = true;
	if (el.classList?.contains('presenter-badge')) {
		nextState.isBadge = true;
		nextState.bold = true;
	}
	if (tag === 'a') {
		const href = el.getAttribute('href') || '';
		if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
			nextState.linkUrl = href;
		}
	}

	const spans: PptxTextSpan[] = [];
	const children = Array.from(el.childNodes);
	for (const child of children) {
		spans.push(...extractInlineSpans(child, nextState));
	}

	return mergeAdjacentSpans(spans);
}

function mergeAdjacentSpans(spans: PptxTextSpan[]): PptxTextSpan[] {
	const result: PptxTextSpan[] = [];
	for (const span of spans) {
		const prev = result[result.length - 1];
		if (
			prev &&
			!prev.breakLine &&
			!span.breakLine &&
			prev.bold === span.bold &&
			prev.italic === span.italic &&
			prev.strike === span.strike &&
			prev.code === span.code &&
			prev.isBadge === span.isBadge &&
			prev.linkUrl === span.linkUrl
		) {
			prev.text += span.text;
		} else {
			result.push({ ...span });
		}
	}
	return result;
}

function trimSpans(spans: PptxTextSpan[]): PptxTextSpan[] {
	if (spans.length === 0) return [];
	const cloned = spans.map((s) => ({ ...s }));
	const first = cloned[0];
	if (first && !first.isBadge && !first.code) {
		first.text = first.text.replace(/^\s+/, '');
	}
	const last = cloned[cloned.length - 1];
	if (last && !last.isBadge && !last.code) {
		last.text = last.text.replace(/\s+$/, '');
	}
	return cloned.filter((s) => s.text.length > 0 || s.breakLine);
}

/**
 * Extracts structured `PptxBlock[]` from a rendered slide body DOM element.
 */
export function extractSlideBlocksFromDom(container: HTMLElement): PptxBlock[] {
	const blocks: PptxBlock[] = [];
	const children = Array.from(container.children) as HTMLElement[];

	for (const el of children) {
		const tag = el.tagName.toLowerCase();

		// 1. Multi-column layout (.presenter-cols)
		if (el.classList?.contains('presenter-cols')) {
			blocks.push(parseColumnsElement(el));
			continue;
		}

		// 2. KPI Value (.presenter-kpi-value)
		if (el.classList?.contains('presenter-kpi-value')) {
			const val = (el.textContent || '').trim();
			if (val) {
				blocks.push({ kind: 'kpi', value: val });
			}
			continue;
		}

		// 3. Obsidian Callout (.callout)
		if (el.classList?.contains('callout')) {
			blocks.push(parseCalloutElement(el));
			continue;
		}

		// 4. Headings (h1 - h6)
		if (/^h[1-6]$/.test(tag)) {
			const level = Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6;
			const spans = trimSpans(extractInlineSpans(el));
			const text = (el.textContent || '').trim();
			if (text) {
				blocks.push({ kind: 'heading', level, text, spans });
			}
			continue;
		}

		// 5. Lists (ul / ol)
		if (tag === 'ul' || tag === 'ol') {
			const ordered = tag === 'ol';
			const items = extractListItems(el, 0, ordered);
			if (items.length > 0) {
				blocks.push({ kind: 'list', ordered, items });
			}
			continue;
		}

		// 6. Tables
		if (tag === 'table') {
			const tableBlock = parseTableElement(el);
			if (tableBlock.rows.length > 0) {
				blocks.push(tableBlock);
			}
			continue;
		}

		// 7. Code blocks (pre)
		if (tag === 'pre') {
			const codeEl = el.querySelector('code');
			const codeText = (codeEl ? codeEl.textContent : el.textContent) ?? '';
			const langClass = Array.from(codeEl?.classList ?? []).find((c) =>
				c.startsWith('language-')
			);
			const language = langClass ? langClass.replace(/^language-/, '') : undefined;
			blocks.push({
				kind: 'code',
				code: codeText.replace(/\n$/, ''),
				language,
			});
			continue;
		}

		// 8. Blockquotes
		if (tag === 'blockquote') {
			const spans = trimSpans(extractInlineSpans(el));
			if (spans.length > 0) {
				blocks.push({ kind: 'blockquote', spans });
			}
			continue;
		}

		// 9. Standalone Image
		if (tag === 'img') {
			const imgBlock = parseImageElement(el as HTMLImageElement);
			if (imgBlock) blocks.push(imgBlock);
			continue;
		}

		// 10. Thematic Break (hr)
		if (tag === 'hr') {
			blocks.push({ kind: 'hr' });
			continue;
		}

		// 11. Paragraphs or generic div containers
		if (tag === 'p' || tag === 'div' || tag === 'section') {
			// Check for embedded images inside <p> or <div>
			const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('img'));
			for (const img of imgs) {
				const imgBlock = parseImageElement(img);
				if (imgBlock) {
					blocks.push(imgBlock);
				}
			}

			// If generic div contains block-level children, recurse
			if (
				tag === 'div' &&
				!el.classList?.contains('presenter-kpi-value') &&
				el.children.length > 0 &&
				Array.from(el.children).some((c) =>
					/^(H[1-6]|P|UL|OL|TABLE|PRE|BLOCKQUOTE|DIV)$/.test(c.tagName)
				)
			) {
				blocks.push(...extractSlideBlocksFromDom(el));
				continue;
			}

			const spans = trimSpans(extractInlineSpans(el));
			if (spans.length > 0) {
				blocks.push({ kind: 'paragraph', spans });
			}
		}
	}

	return blocks;
}

function parseColumnsElement(el: HTMLElement): PptxBlock {
	const clsList = Array.from(el.classList ?? []);
	let count = 2;
	for (const c of clsList) {
		const m = c.match(/^presenter-cols-(\d+)$/);
		if (m && m[1]) {
			count = Number(m[1]);
		}
	}

	const style: ColumnStyle = clsList.includes('presenter-cols-plain') ? 'plain' : 'card';
	const variant: ColumnVariant = clsList.includes('presenter-cols-step') ? 'step' : 'normal';

	let ratio: ColumnRatio | undefined;
	if (clsList.includes('presenter-cols-ratio-2-1')) ratio = '2:1';
	else if (clsList.includes('presenter-cols-ratio-1-2')) ratio = '1:2';
	else if (clsList.includes('presenter-cols-ratio-3-1')) ratio = '3:1';
	else if (clsList.includes('presenter-cols-ratio-1-3')) ratio = '1:3';

	const colEls = Array.from(el.children).filter((child) =>
		child.classList?.contains('presenter-col')
	) as HTMLElement[];

	const columns = colEls.map((colEl) => extractSlideBlocksFromDom(colEl));

	return {
		kind: 'columns',
		count: Math.max(1, count),
		style,
		ratio,
		variant,
		columns,
	};
}

function parseCalloutElement(el: HTMLElement): PptxBlock {
	const calloutType = el.getAttribute('data-callout') || 'info';
	const titleInner = el.querySelector('.callout-title-inner');
	const title = (titleInner?.textContent || calloutType.toUpperCase()).trim();
	const contentEl = el.querySelector('.callout-content');

	const spans = contentEl
		? trimSpans(extractInlineSpans(contentEl))
		: [];

	return {
		kind: 'callout',
		calloutType,
		title,
		spans,
	};
}

function extractListItems(
	listEl: HTMLElement,
	level: number,
	ordered: boolean
): PptxListItem[] {
	const items: PptxListItem[] = [];
	const liElements = Array.from(listEl.children).filter(
		(c) => c.tagName.toLowerCase() === 'li'
	) as HTMLElement[];

	liElements.forEach((li, idx) => {
		const checkbox = li.querySelector<HTMLInputElement>('input[type="checkbox"]');
		const checked = checkbox ? checkbox.checked : undefined;
		const spans = trimSpans(extractInlineSpans(li));

		if (spans.length > 0) {
			items.push({
				spans,
				level,
				ordered,
				index: idx + 1,
				checked,
			});
		}

		// Handle nested lists inside this <li>
		const nestedLists = Array.from(li.children).filter((c) => {
			const t = c.tagName.toLowerCase();
			return t === 'ul' || t === 'ol';
		}) as HTMLElement[];

		for (const nested of nestedLists) {
			const nestedOrdered = nested.tagName.toLowerCase() === 'ol';
			items.push(...extractListItems(nested, level + 1, nestedOrdered));
		}
	});

	return items;
}

function parseTableElement(tableEl: HTMLElement): Extract<PptxBlock, { kind: 'table' }> {
	const rows: PptxTableCell[][] = [];
	const trElements = Array.from(tableEl.querySelectorAll('tr'));

	for (const tr of trElements) {
		const cells: PptxTableCell[] = [];
		const cellElements = Array.from(tr.children).filter((c) => {
			const t = c.tagName.toLowerCase();
			return t === 'th' || t === 'td';
		}) as HTMLElement[];

		for (const cellEl of cellElements) {
			const isHeader = cellEl.tagName.toLowerCase() === 'th';
			const alignAttr =
				cellEl.style?.textAlign || cellEl.getAttribute('align') || 'left';
			const align: 'left' | 'center' | 'right' =
				alignAttr === 'center'
					? 'center'
					: alignAttr === 'right'
						? 'right'
						: 'left';
			const spans = trimSpans(extractInlineSpans(cellEl));
			cells.push({
				spans: spans.length > 0 ? spans : [{ text: '' }],
				isHeader,
				align,
			});
		}

		if (cells.length > 0) {
			rows.push(cells);
		}
	}

	return { kind: 'table', rows };
}

function parseImageElement(img: HTMLImageElement): Extract<PptxBlock, { kind: 'image' }> | null {
	const src = img.getAttribute('src') || '';
	if (!src || !src.startsWith('data:image/')) {
		return null;
	}
	const alt = img.getAttribute('alt') || '';
	const customW = Number(img.getAttribute('data-pptx-width')) || img.naturalWidth || Number(img.getAttribute('width')) || undefined;
	const customH = Number(img.getAttribute('data-pptx-height')) || img.naturalHeight || Number(img.getAttribute('height')) || undefined;

	return {
		kind: 'image',
		dataUrl: src,
		alt,
		naturalWidth: customW,
		naturalHeight: customH,
	};
}

/**
 * Converts speaker notes markdown (or rendered HTML) into clean plain text suitable
 * for PowerPoint's native Speaker Notes pane.
 */
export function formatSpeakerNotesForPptx(notesMarkdown?: string): string {
	if (!notesMarkdown || !notesMarkdown.trim()) {
		return '';
	}
	return notesMarkdown
		.replace(/<span class="presenter-badge">(.*?)<\/span>/g, '[$1]')
		.replace(/<[^>]+>/g, '')
		.replace(/^\s*>\s*\[!(?:note|notes|speaker-note)\][+-]?\s*/gim, '')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.trim();
}
