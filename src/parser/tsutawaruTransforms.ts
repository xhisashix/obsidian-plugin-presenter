import type { ColumnStyle } from '../types';
import { matchAtxHeading } from './blocks';
import { FenceTracker } from './fence';

const STANDALONE_IMAGE_REGEX =
	/^(?:!\[[^\]]*\]\([^)]+\)|!\[\[[^\]]+\]\])$/;
const QA_QUESTION_REGEX =
	/^(?:[-*+]\s+)?(?:\*\*)?Q[.:：]\s*(?:\*\*)?\s*(.+)$/i;
const QA_ANSWER_REGEX =
	/^(?:[-*+]\s+)?(?:\*\*)?A[.:：]\s*(?:\*\*)?\s*(.+)$/i;
const TABLE_HIGHLIGHT_DIRECTIVE_REGEX =
	/^ {0,3}<!--\s*(?:presenter:)?table:?\s+highlight\s+(\d+)\s*-->[ \t]*$/i;
const RECOMMENDED_HEADER_REGEX =
	/\[(?:推奨|おすすめ|Recommended|Best|最適)\]|★|🎯/i;

function formatInlineMarkdown(text: string): string {
	return text
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Transforms consecutive Q. / A. lines into aligned FAQ / Q&A blocks with hanging indents.
 * Q. uses Main Blue (--presenter-accent-color) and A. uses Pop Orange (--presenter-pop-color).
 */
export function preprocessQaBlocks(
	markdown: string,
	enableSmartLayouts: boolean = true
): string {
	if (!enableSmartLayouts) return markdown;

	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();
	const output: string[] = [];
	let qaItems: string[] = [];
	let currentPair: string[] = [];

	const flushPair = () => {
		if (currentPair.length > 0) {
			qaItems.push(
				`<div class="presenter-qa-card">\n${currentPair.join('\n')}\n</div>`
			);
			currentPair = [];
		}
	};

	const flushQaList = () => {
		flushPair();
		if (qaItems.length > 0) {
			output.push(
				`<div class="presenter-qa-list">\n${qaItems.join('\n')}\n</div>`
			);
			qaItems = [];
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (fence.feed(line)) {
			flushQaList();
			output.push(line);
			continue;
		}

		const trimmed = line.trim();
		const qMatch = trimmed.match(QA_QUESTION_REGEX);
		if (qMatch && qMatch[1]) {
			if (currentPair.length > 0) {
				flushPair();
			}
			const qText = formatInlineMarkdown(qMatch[1].trim());
			currentPair.push(
				`<div class="presenter-qa-row presenter-qa-question"><span class="presenter-qa-marker presenter-qa-marker-q">Q.</span><span class="presenter-qa-text">${qText}</span></div>`
			);
			continue;
		}

		const aMatch = trimmed.match(QA_ANSWER_REGEX);
		if (aMatch && aMatch[1] && (currentPair.length > 0 || qaItems.length > 0)) {
			const aText = formatInlineMarkdown(aMatch[1].trim());
			currentPair.push(
				`<div class="presenter-qa-row presenter-qa-answer"><span class="presenter-qa-marker presenter-qa-marker-a">A.</span><span class="presenter-qa-text">${aText}</span></div>`
			);
			flushPair();
			continue;
		}

		if (trimmed === '' && (currentPair.length > 0 || qaItems.length > 0)) {
			// Look ahead to see if another Q/A line follows after blank lines
			let nextIdx = i + 1;
			while (nextIdx < lines.length && lines[nextIdx]!.trim() === '') {
				nextIdx++;
			}
			const nextTrimmed = lines[nextIdx]?.trim() ?? '';
			if (
				QA_QUESTION_REGEX.test(nextTrimmed) ||
				QA_ANSWER_REGEX.test(nextTrimmed)
			) {
				continue;
			}
		}

		flushQaList();
		output.push(line);
	}

	flushQaList();
	return output.join('\n');
}

/**
 * Wraps Markdown comparison tables to support highlighted/recommended columns
 * via `<!-- table: highlight N -->` or automatic detection of `[推奨]` / `★` / bold column headers.
 */
export function preprocessTableHighlights(
	markdown: string,
	enableSmartLayouts: boolean = true
): string {
	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();
	const output: string[] = [];
	let pendingHighlightCol: number | null = null;

	let i = 0;
	while (i < lines.length) {
		const line = lines[i]!;
		if (fence.feed(line)) {
			output.push(line);
			i++;
			continue;
		}

		const dirMatch = line.match(TABLE_HIGHLIGHT_DIRECTIVE_REGEX);
		if (dirMatch && dirMatch[1]) {
			const colNum = Number(dirMatch[1]);
			if (colNum >= 1 && colNum <= 6) {
				pendingHighlightCol = colNum;
			}
			i++;
			continue;
		}

		// Detect start of a GFM table (header row + separator row)
		const trimmed = line.trim();
		const nextTrimmed = lines[i + 1]?.trim() ?? '';
		if (
			trimmed.startsWith('|') &&
			trimmed.endsWith('|') &&
			/^\|(?:\s*:?-{2,}:?\s*\|)+$/.test(nextTrimmed)
		) {
			const tableLines: string[] = [];
			while (i < lines.length) {
				const tLine = lines[i]!;
				const tTrim = tLine.trim();
				if (tTrim.startsWith('|') && tTrim.endsWith('|')) {
					tableLines.push(tLine);
					i++;
				} else {
					break;
				}
			}

			let highlightCol = pendingHighlightCol;
			pendingHighlightCol = null;

			if (highlightCol === null && enableSmartLayouts && tableLines.length >= 2) {
				highlightCol = detectRecommendedColumnIndex(tableLines[0]!);
			}

			if (highlightCol !== null && highlightCol >= 1 && highlightCol <= 6) {
				output.push(
					`<div class="presenter-table-wrapper presenter-table-highlight-col-${highlightCol}">`,
					'',
					...tableLines,
					'',
					'</div>'
				);
			} else {
				output.push(...tableLines);
			}
			continue;
		}

		if (trimmed !== '') {
			pendingHighlightCol = null;
		}
		output.push(line);
		i++;
	}

	return output.join('\n');
}

function detectRecommendedColumnIndex(headerLine: string): number | null {
	const rawCells = headerLine
		.trim()
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((c) => c.trim());

	if (rawCells.length < 2) return null;

	// 1. Explicit recommendation marker in header cell ([推奨], ★, 🎯, Recommended)
	for (let idx = 0; idx < rawCells.length; idx++) {
		if (RECOMMENDED_HEADER_REGEX.test(rawCells[idx]!)) {
			return idx + 1;
		}
	}

	// 2. Exactly one non-first column header wrapped in **bold**
	const boldIndices: number[] = [];
	for (let idx = 0; idx < rawCells.length; idx++) {
		if (/^\*\*[^*]+\*\*$/.test(rawCells[idx]!)) {
			boldIndices.push(idx + 1);
		}
	}
	if (boldIndices.length === 1 && boldIndices[0]! >= 2 && boldIndices[0]! <= 6) {
		return boldIndices[0]!;
	}

	return null;
}

/**
 * Automatically applies "Tsutawaru Design" multi-column layouts to standard Markdown slides
 * when `enableSmartLayouts` is active and no explicit `<!-- columns -->` directive is present:
 * - 2 or 3 concise `### H3` sections -> 2 or 3 card columns
 * - 4 concise `### H3` sections -> 2x2 grid (`presenter-cols-2 presenter-cols-grid`)
 * - Standalone image + bullet/H3 points -> 6:4 golden ratio split (`presenter-cols-ratio-3-2`)
 * - Single code block + explanatory bullets/H3 -> 2-column code split (`presenter-cols-code-split`)
 */
export function preprocessAutoLayouts(
	markdown: string,
	defaultColumnStyle: ColumnStyle = 'card',
	enableSmartLayouts: boolean = true
): string {
	if (!enableSmartLayouts) return markdown;
	if (markdown.includes('presenter-cols')) return markdown;

	// Try Image + Text 6:4 split first
	const imageSplit = tryInferImageTextSplit(markdown);
	if (imageSplit) return imageSplit;

	// Try Code + Explanation split
	const codeSplit = tryInferCodeExplanationSplit(markdown);
	if (codeSplit) return codeSplit;

	// Try 2-4 H3 sections auto-column / 2x2 grid
	const h3Split = tryInferH3AutoColumns(markdown, defaultColumnStyle);
	if (h3Split) return h3Split;

	return markdown;
}

function tryInferImageTextSplit(markdown: string): string | null {
	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();

	const headerLines: string[] = [];
	const bodyLines: string[] = [];
	let seenH2 = false;

	for (const line of lines) {
		const isCode = fence.feed(line);
		if (isCode) return null; // Has code fence -> not a simple image+text slide

		const trimmed = line.trim();
		if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
			return null; // Has table
		}

		const heading = matchAtxHeading(line);
		if (heading && heading.level <= 2 && !seenH2 && bodyLines.every((l) => l.trim() === '')) {
			seenH2 = true;
			headerLines.push(line);
			continue;
		}

		bodyLines.push(line);
	}

	const nonEmptyBody = bodyLines.filter((l) => l.trim().length > 0);
	if (nonEmptyBody.length < 3) return null;

	const imageLineIndices: number[] = [];
	let bulletOrH3Count = 0;

	bodyLines.forEach((line, idx) => {
		const trimmed = line.trim();
		if (STANDALONE_IMAGE_REGEX.test(trimmed)) {
			imageLineIndices.push(idx);
		} else if (/^(?:[-*+]|\d+\.)\s+/.test(trimmed) || /^###\s+/.test(trimmed)) {
			bulletOrH3Count++;
		}
	});

	if (imageLineIndices.length !== 1 || bulletOrH3Count < 2) {
		return null;
	}

	const imgIdx = imageLineIndices[0]!;
	const imgLine = bodyLines[imgIdx]!.trim();

	// Ensure image is either the first non-empty body line or the last non-empty body line
	const firstNonEmptyIdx = bodyLines.findIndex((l) => l.trim().length > 0);
	let lastNonEmptyIdx = -1;
	for (let k = bodyLines.length - 1; k >= 0; k--) {
		if (bodyLines[k]!.trim().length > 0) {
			lastNonEmptyIdx = k;
			break;
		}
	}

	if (imgIdx !== firstNonEmptyIdx && imgIdx !== lastNonEmptyIdx) {
		return null;
	}

	const textLines = bodyLines.filter((_, idx) => idx !== imgIdx).join('\n').trim();
	if (!textLines) return null;

	const isImageFirst = imgIdx === firstNonEmptyIdx;
	const ratioClass = isImageFirst ? 'presenter-cols-ratio-3-2' : 'presenter-cols-ratio-2-3';
	const firstCol = isImageFirst ? imgLine : textLines;
	const secondCol = isImageFirst ? textLines : imgLine;

	const prefix = headerLines.length > 0 ? `${headerLines.join('\n')}\n\n` : '';
	return `${prefix}<div class="presenter-cols presenter-cols-2 presenter-cols-plain ${ratioClass} presenter-cols-media-split">\n<div class="presenter-col">\n\n${firstCol}\n\n</div>\n<div class="presenter-col">\n\n${secondCol}\n\n</div>\n</div>`;
}

function tryInferCodeExplanationSplit(markdown: string): string | null {
	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();

	let fenceBlockCount = 0;
	let fenceStartIdx = -1;
	let fenceEndIdx = -1;
	let isMermaid = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const wasInFence = fence.inFence;
		fence.feed(line);
		const nowInFence = fence.inFence;

		if (!wasInFence && nowInFence) {
			fenceBlockCount++;
			fenceStartIdx = i;
			if (/^ {0,3}(?:`{3,}|~{3,})\s*mermaid\b/i.test(line)) {
				isMermaid = true;
			}
		} else if (wasInFence && !nowInFence) {
			fenceEndIdx = i;
		} else if (!nowInFence) {
			const trimmed = line.trim();
			if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
				return null; // Do not auto-split if slide also contains a table
			}
		}
	}

	if (fenceBlockCount !== 1 || isMermaid || fenceStartIdx === -1 || fenceEndIdx === -1) {
		return null;
	}

	const codeLineCount = fenceEndIdx - fenceStartIdx - 1;
	if (codeLineCount < 2 || codeLineCount > 18) {
		return null;
	}

	const headerLines: string[] = [];
	const beforeCodeLines: string[] = [];
	const afterCodeLines: string[] = [];
	let seenH2 = false;

	for (let i = 0; i < lines.length; i++) {
		if (i >= fenceStartIdx && i <= fenceEndIdx) continue;
		const line = lines[i]!;
		const heading = matchAtxHeading(line);
		if (
			heading &&
			heading.level <= 2 &&
			!seenH2 &&
			beforeCodeLines.every((l) => l.trim() === '') &&
			i < fenceStartIdx
		) {
			seenH2 = true;
			headerLines.push(line);
			continue;
		}
		if (i < fenceStartIdx) {
			beforeCodeLines.push(line);
		} else {
			afterCodeLines.push(line);
		}
	}

	const otherLines = [...beforeCodeLines, ...afterCodeLines];
	const bulletOrH3Count = otherLines.filter((l) => {
		const t = l.trim();
		return /^(?:[-*+]|\d+\.)\s+/.test(t) || /^###\s+/.test(t);
	}).length;

	if (bulletOrH3Count < 2) {
		return null;
	}

	const codeBlock = lines.slice(fenceStartIdx, fenceEndIdx + 1).join('\n');
	const explanationBlock = otherLines.join('\n').trim();
	const prefix = headerLines.length > 0 ? `${headerLines.join('\n')}\n\n` : '';

	return `${prefix}<div class="presenter-cols presenter-cols-2 presenter-cols-plain presenter-cols-ratio-3-2 presenter-cols-code-split">\n<div class="presenter-col">\n\n${codeBlock}\n\n</div>\n<div class="presenter-col">\n\n${explanationBlock}\n\n</div>\n</div>`;
}

function tryInferH3AutoColumns(
	markdown: string,
	defaultColumnStyle: ColumnStyle
): string | null {
	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();

	const h3Indices: number[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (fence.feed(line)) return null; // Never auto-columnize slides with code blocks here
		const trimmed = line.trim();
		if (trimmed.startsWith('|') && trimmed.endsWith('|')) return null; // Has table

		const heading = matchAtxHeading(line);
		if (heading) {
			if (heading.level === 3) {
				h3Indices.push(i);
			} else if (heading.level > 3) {
				return null; // Has H4-H6 hierarchy -> keep vertical
			}
		}
	}

	if (h3Indices.length < 2 || h3Indices.length > 4) {
		return null;
	}

	const firstH3Idx = h3Indices[0]!;
	const prefixLines = lines.slice(0, firstH3Idx);
	const trailingCalloutLines: string[] = [];

	// Check if there are trailing callout lines (> [!important] etc.) at the end of the slide
	let effectiveEndIdx = lines.length;
	let scanIdx = lines.length - 1;
	while (scanIdx > h3Indices[h3Indices.length - 1]! && lines[scanIdx]!.trim() === '') {
		scanIdx--;
	}
	if (scanIdx > h3Indices[h3Indices.length - 1]!) {
		let calloutStart = scanIdx;
		while (
			calloutStart > h3Indices[h3Indices.length - 1]! &&
			lines[calloutStart]!.trim().startsWith('>')
		) {
			calloutStart--;
		}
		const firstQuoteLine = lines[calloutStart + 1]?.trim() ?? '';
		if (/^>\s*\[![a-z0-9_-]+\]/i.test(firstQuoteLine)) {
			trailingCalloutLines.push(...lines.slice(calloutStart + 1));
			effectiveEndIdx = calloutStart + 1;
		}
	}

	const sections: string[] = [];
	for (let s = 0; s < h3Indices.length; s++) {
		const start = h3Indices[s]!;
		const end = s + 1 < h3Indices.length ? h3Indices[s + 1]! : effectiveEndIdx;
		const sectionLines = lines.slice(start, end);
		const nonEmptyBody = sectionLines.slice(1).filter((l) => l.trim().length > 0);

		// Guardrail: each H3 card must have between 1 and 6 content lines and no blockquotes
		if (
			nonEmptyBody.length === 0 ||
			nonEmptyBody.length > 6 ||
			nonEmptyBody.some((l) => l.trim().startsWith('>'))
		) {
			return null;
		}

		sections.push(sectionLines.join('\n').trim());
	}

	const styleClass =
		defaultColumnStyle === 'plain' ? ' presenter-cols-plain' : ' presenter-cols-card';
	const isGrid2x2 = sections.length === 4;
	const colCount = isGrid2x2 ? 2 : sections.length;
	const gridClass = isGrid2x2 ? ' presenter-cols-grid' : '';

	const colDivs = sections
		.map((sec) => `<div class="presenter-col">\n\n${sec}\n\n</div>`)
		.join('\n');

	const prefix = prefixLines.join('\n').trim();
	const suffix = trailingCalloutLines.join('\n').trim();

	const parts: string[] = [];
	if (prefix) parts.push(prefix);
	parts.push(
		`<div class="presenter-cols presenter-cols-${colCount}${styleClass}${gridClass}">\n${colDivs}\n</div>`
	);
	if (suffix) parts.push(suffix);

	return parts.join('\n\n');
}
