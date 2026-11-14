import type { ColumnStyle } from '../types';
import { matchAtxHeading } from './blocks';
import { FenceTracker } from './fence';
import { KPI_REGEX } from './layoutInference';

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
const BOLD_LABEL_BULLET_REGEX =
	/^[-*+]\s+\*\*([^*]+?)\*\*\s*[:：—-]\s*(.+)$/;

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
 * Extracts a leading number or step prefix (e.g. `01. 視認性`, `ステップ 1: 記述`, `POINT 01 一貫性`)
 * from `### H3` card headings into a separate eyebrow badge span above the dark slate heading title.
 */
export function formatCardHeadingEyebrow(colMarkdown: string): string {
	const lines = colMarkdown.split(/\r?\n/);
	const fence = new FenceTracker();
	let formattedFirstHeading = false;

	const outLines = lines.map((line) => {
		if (fence.feed(line) || formattedFirstHeading) {
			return line;
		}
		const heading = matchAtxHeading(line);
		if (!heading || heading.level !== 3) {
			return line;
		}

		const rawTitle = heading.text.trim();
		if (!rawTitle || rawTitle.includes('presenter-card-eyebrow')) {
			return line;
		}

		// Pattern A: STEP / POINT / PHASE / PART / ステップ / ポイント + number + title
		const keywordMatch = rawTitle.match(
			/^(STEP|POINT|PHASE|PART|ステップ|ポイント)\s*0*(\d+)\s*(?:[:：.．-]\s*|\s+)(.+)$/i
		);
		if (keywordMatch && keywordMatch[1] && keywordMatch[2] && keywordMatch[3]) {
			const rawKeyword = keywordMatch[1];
			let normalizedKeyword = rawKeyword.toUpperCase();
			if (rawKeyword === 'ステップ') normalizedKeyword = 'STEP';
			else if (rawKeyword === 'ポイント') normalizedKeyword = 'POINT';

			const paddedNum = String(Number(keywordMatch[2])).padStart(2, '0');
			const cleanTitle = keywordMatch[3].trim();
			formattedFirstHeading = true;
			return `### <span class="presenter-card-eyebrow">${normalizedKeyword} ${paddedNum}</span> <span class="presenter-card-title">${cleanTitle}</span>`;
		}

		// Pattern B: Leading zero-padded or delimited number (e.g. `01. Title`, `1: Title`, `01 Title`)
		const numDelimMatch = rawTitle.match(
			/^(0?\d{1,2})(?:[.．]\s*|\s*[:：—-]\s+)(.+)$/
		);
		if (numDelimMatch && numDelimMatch[1] && numDelimMatch[2]) {
			const paddedNum = String(Number(numDelimMatch[1])).padStart(2, '0');
			const cleanTitle = numDelimMatch[2].trim();
			formattedFirstHeading = true;
			return `### <span class="presenter-card-eyebrow">${paddedNum}</span> <span class="presenter-card-title">${cleanTitle}</span>`;
		}

		const zeroPaddedSpaceMatch = rawTitle.match(/^(0\d)\s+(.+)$/);
		if (zeroPaddedSpaceMatch && zeroPaddedSpaceMatch[1] && zeroPaddedSpaceMatch[2]) {
			formattedFirstHeading = true;
			return `### <span class="presenter-card-eyebrow">${zeroPaddedSpaceMatch[1]}</span> <span class="presenter-card-title">${zeroPaddedSpaceMatch[2].trim()}</span>`;
		}

		return line;
	});

	return outLines.join('\n');
}

function extractTrailingBlockquote(
	lines: string[],
	minBoundaryIdx: number
): { effectiveEndIdx: number; trailingLines: string[] } {
	let scanIdx = lines.length - 1;
	while (scanIdx > minBoundaryIdx && lines[scanIdx]!.trim() === '') {
		scanIdx--;
	}
	if (scanIdx > minBoundaryIdx && lines[scanIdx]!.trim().startsWith('>')) {
		let quoteStart = scanIdx;
		while (quoteStart > minBoundaryIdx && lines[quoteStart]!.trim().startsWith('>')) {
			quoteStart--;
		}
		if (quoteStart + 1 <= scanIdx && lines[quoteStart + 1]!.trim().startsWith('>')) {
			return {
				effectiveEndIdx: quoteStart + 1,
				trailingLines: lines.slice(quoteStart + 1),
			};
		}
	}
	return { effectiveEndIdx: lines.length, trailingLines: [] };
}

/**
 * Automatically applies "Tsutawaru Design" multi-column layouts to standard Markdown slides
 * when `enableSmartLayouts` is active and no explicit `<!-- columns -->` directive is present:
 * - 2 or 3 concise `### H3` sections -> 2 or 3 card columns
 * - 4 concise `### H3` sections -> 2x2 grid (`presenter-cols-2 presenter-cols-grid`)
 * - 2 to 4 `- **Title**: Description` bullets -> card columns / 2x2 grid
 * - Single Hero KPI metric + caption -> centered hero KPI card (`presenter-cols-hero-kpi`)
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

	// Try 2-4 bold-label bullets (`- **Title**: Description`) auto-card layout
	const boldListCards = tryInferBoldLabelListCards(markdown, defaultColumnStyle);
	if (boldListCards) return boldListCards;

	// Try single Hero KPI card layout
	const heroKpi = tryInferHeroKpiCard(markdown);
	if (heroKpi) return heroKpi;

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

function renderAutoCardGrid(
	sections: string[],
	defaultColumnStyle: ColumnStyle,
	prefix: string,
	suffix: string,
	extraColsClass: string = ''
): string {
	const styleClass =
		defaultColumnStyle === 'plain' ? ' presenter-cols-plain' : ' presenter-cols-card';
	const isGrid2x2 = sections.length === 4;
	const colCount = isGrid2x2 ? 2 : sections.length;
	const gridClass = isGrid2x2 ? ' presenter-cols-grid' : '';
	const extraClass = extraColsClass ? ` ${extraColsClass}` : '';

	const colDivs = sections
		.map((sec) => `<div class="presenter-col">\n\n${formatCardHeadingEyebrow(sec)}\n\n</div>`)
		.join('\n');

	const parts: string[] = [];
	if (prefix) parts.push(prefix);
	parts.push(
		`<div class="presenter-cols presenter-cols-${colCount}${styleClass}${gridClass}${extraClass}">\n${colDivs}\n</div>`
	);
	if (suffix) parts.push(suffix);

	return parts.join('\n\n');
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
	const { effectiveEndIdx, trailingLines } = extractTrailingBlockquote(
		lines,
		h3Indices[h3Indices.length - 1]!
	);

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

	return renderAutoCardGrid(
		sections,
		defaultColumnStyle,
		prefixLines.join('\n').trim(),
		trailingLines.join('\n').trim()
	);
}

function tryInferBoldLabelListCards(
	markdown: string,
	defaultColumnStyle: ColumnStyle
): string | null {
	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();
	let firstBulletIdx = -1;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (fence.feed(line)) return null; // Has code fence
		const trimmed = line.trim();
		if (trimmed.startsWith('|') && trimmed.endsWith('|')) return null; // Has table
		if (KPI_REGEX.test(line) || /^ {0,3}<!--\s*(?:presenter:)?kpi\s*-->/i.test(trimmed)) {
			return null;
		}
		const heading = matchAtxHeading(line);
		if (heading && heading.level >= 3) {
			return null; // H3+ slides are handled by tryInferH3AutoColumns or kept vertical
		}
		if (firstBulletIdx === -1 && /^[-*+]\s+/.test(line.trimStart())) {
			firstBulletIdx = i;
		}
	}

	if (firstBulletIdx === -1) return null;

	const { effectiveEndIdx, trailingLines } = extractTrailingBlockquote(lines, firstBulletIdx);
	const items: { title: string; desc: string }[] = [];

	for (let i = firstBulletIdx; i < effectiveEndIdx; i++) {
		const rawLine = lines[i]!;
		const trimmed = rawLine.trim();
		if (trimmed === '') continue;

		// Disqualify indented sub-lists or stray non-matching content after the list begins
		if (/^\s{2,}/.test(rawLine)) {
			return null;
		}
		const match = trimmed.match(BOLD_LABEL_BULLET_REGEX);
		if (!match || !match[1] || !match[2]) {
			return null;
		}
		items.push({
			title: match[1].trim(),
			desc: match[2].trim(),
		});
	}

	if (items.length < 2 || items.length > 4) {
		return null;
	}

	const sections = items.map((item) => `### ${item.title}\n\n${item.desc}`);
	const prefix = lines.slice(0, firstBulletIdx).join('\n').trim();
	const suffix = trailingLines.join('\n').trim();

	return renderAutoCardGrid(sections, defaultColumnStyle, prefix, suffix);
}

function tryInferHeroKpiCard(markdown: string): string | null {
	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();

	let h2Idx = -1;
	const h3Indices: number[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (fence.feed(line)) return null;
		const trimmed = line.trim();
		if (trimmed.startsWith('|') && trimmed.endsWith('|')) return null;

		const heading = matchAtxHeading(line);
		if (heading) {
			if (heading.level <= 2 && h2Idx === -1 && h3Indices.length === 0) {
				h2Idx = i;
			} else if (heading.level === 3) {
				h3Indices.push(i);
			} else if (heading.level > 3) {
				return null;
			}
		}
	}

	if (h3Indices.length > 1) return null;

	const minBoundaryIdx = h3Indices.length === 1 ? h3Indices[0]! : Math.max(0, h2Idx);
	const { effectiveEndIdx, trailingLines } = extractTrailingBlockquote(lines, minBoundaryIdx);

	const splitIdx = h3Indices.length === 1 ? h3Indices[0]! : h2Idx + 1;
	const prefixLines = lines.slice(0, splitIdx);
	const kpiLines = lines.slice(splitIdx, effectiveEndIdx);

	// Validate kpiLines: must contain 1 KPI (explicit block or KPI_REGEX), no lists/images, <= 3 captions
	let explicitKpiBlocks = 0;
	let autoKpiCount = 0;
	let inExplicitKpi = false;
	let linesBeforeKpi = 0;
	let linesAfterKpi = 0;
	let seenKpi = false;

	for (const rawLine of kpiLines) {
		const trimmed = rawLine.trim();
		if (!trimmed) continue;

		if (/^ {0,3}<!--\s*(?:presenter:)?kpi\s*-->[ \t]*$/i.test(trimmed)) {
			if (inExplicitKpi) return null;
			inExplicitKpi = true;
			explicitKpiBlocks++;
			seenKpi = true;
			continue;
		}
		if (/^ {0,3}<!--\s*\/\s*(?:presenter:)?kpi\s*-->[ \t]*$/i.test(trimmed)) {
			inExplicitKpi = false;
			continue;
		}
		if (inExplicitKpi) continue;

		if (
			trimmed.startsWith('<!--') ||
			/^(?:[-*+]|\d+\.)\s+/.test(trimmed) ||
			STANDALONE_IMAGE_REGEX.test(trimmed) ||
			trimmed.startsWith('>')
		) {
			return null;
		}

		const heading = matchAtxHeading(rawLine);
		if (heading && heading.level === 3) {
			if (seenKpi) return null;
			continue;
		}

		if (KPI_REGEX.test(rawLine)) {
			autoKpiCount++;
			seenKpi = true;
			continue;
		}

		if (!seenKpi) {
			linesBeforeKpi++;
		} else {
			linesAfterKpi++;
		}
	}

	const totalKpis = explicitKpiBlocks + autoKpiCount;
	if (totalKpis !== 1 || linesBeforeKpi > 1 || linesAfterKpi > 3) {
		return null;
	}

	const cardContent = formatCardHeadingEyebrow(kpiLines.join('\n').trim());
	if (!cardContent) return null;

	const prefix = prefixLines.join('\n').trim();
	const suffix = trailingLines.join('\n').trim();

	const parts: string[] = [];
	if (prefix) parts.push(prefix);
	parts.push(
		`<div class="presenter-cols presenter-cols-1 presenter-cols-card presenter-cols-hero-kpi">\n<div class="presenter-col">\n\n${cardContent}\n\n</div>\n</div>`
	);
	if (suffix) parts.push(suffix);

	return parts.join('\n\n');
}
