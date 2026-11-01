import type { ColumnRatio, ColumnStyle, ColumnVariant } from '../types';
import { matchAtxHeading } from './blocks';
import { parseDirective, MAX_COLUMNS } from './directives';
import { FenceTracker } from './fence';

/**
 * Preprocesses HTML comment column directives:
 *   <!-- columns [N] [ratio] [card|plain] [step] -->
 *   ...
 *   <!-- column --> (optional)
 *   ...
 *   <!-- /columns --> (optional)
 *
 * If no explicit <!-- column --> directive is present in the block,
 * columns are automatically partitioned by headings matching the level
 * of the first heading found in the columns region.
 */
export function preprocessColumns(markdown: string, defaultColumnStyle: ColumnStyle = 'card'): string {
	const lines = markdown.split(/\r?\n/);
	const fenceTracker = new FenceTracker();
	const output: string[] = [];

	let inColumns = false;
	let currentCount: number | undefined;
	let currentStyle: ColumnStyle = defaultColumnStyle;
	let currentRatio: ColumnRatio | undefined;
	let currentVariant: ColumnVariant | undefined;
	let columnLines: string[] = [];

	const flushColumns = () => {
		if (!inColumns) return;
		inColumns = false;

		const rendered = renderColumnRegion(
			columnLines,
			currentCount,
			currentStyle,
			currentRatio,
			currentVariant
		);
		output.push(rendered);
		columnLines = [];
		currentCount = undefined;
		currentStyle = defaultColumnStyle;
		currentRatio = undefined;
		currentVariant = undefined;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const isFence = fenceTracker.feed(line);

		if (isFence) {
			if (inColumns) {
				columnLines.push(line);
			} else {
				output.push(line);
			}
			continue;
		}

		const directive = parseDirective(line);
		if (directive) {
			if (directive.kind === 'columns') {
				if (inColumns) {
					// Implicitly close existing region if a new start is encountered
					flushColumns();
				}
				inColumns = true;
				currentCount = directive.count;
				currentStyle = directive.style || defaultColumnStyle;
				currentRatio = directive.ratio;
				currentVariant = directive.variant;
				continue;
			} else if (directive.kind === 'end-columns') {
				if (inColumns) {
					flushColumns();
				} else {
					// Unmatched closing tag outside columns region is kept untouched or ignored
					output.push(line);
				}
				continue;
			} else if (directive.kind === 'column') {
				if (inColumns) {
					// Store as marker for explicit partitioning
					columnLines.push('<!-- presenter:column_break -->');
					continue;
				} else {
					// Stray column directive outside columns region
					output.push(line);
					continue;
				}
			}
		}

		if (inColumns) {
			columnLines.push(line);
		} else {
			output.push(line);
		}
	}

	if (inColumns) {
		flushColumns();
	}

	return output.join('\n');
}

/**
 * Splits lines within a column region into separate columns and wraps in HTML divs.
 */
function renderColumnRegion(
	lines: string[],
	specifiedCount: number | undefined,
	style: ColumnStyle,
	ratio?: ColumnRatio,
	variant?: ColumnVariant
): string {
	const hasExplicitBreaks = lines.some((l) => l === '<!-- presenter:column_break -->');
	let cols: string[] = [];

	if (hasExplicitBreaks) {
		const currentCol: string[] = [];
		for (const line of lines) {
			if (line === '<!-- presenter:column_break -->') {
				// If first break is at the very beginning with only whitespace before it, discard leading empty column
				if (cols.length === 0 && currentCol.every((l) => l.trim() === '')) {
					currentCol.length = 0;
					continue;
				}
				cols.push(currentCol.join('\n').trim());
				currentCol.length = 0;
			} else {
				currentCol.push(line);
			}
		}
		if (currentCol.length > 0 || cols.length === 0) {
			cols.push(currentCol.join('\n').trim());
		}
	} else {
		// Heading-based partitioning
		// Detect the level of the first heading
		let targetLevel: number | null = null;
		const fence = new FenceTracker();

		for (const line of lines) {
			if (fence.feed(line)) continue;
			const heading = matchAtxHeading(line);
			if (heading) {
				targetLevel = heading.level;
				break;
			}
		}

		if (targetLevel !== null) {
			const fence2 = new FenceTracker();
			const currentCol: string[] = [];
			for (const line of lines) {
				const isCode = fence2.feed(line);
				if (!isCode) {
					const heading = matchAtxHeading(line);
					if (heading && heading.level === targetLevel) {
						if (currentCol.length > 0 && currentCol.some((l) => l.trim() !== '')) {
							cols.push(currentCol.join('\n').trim());
							currentCol.length = 0;
						}
					}
				}
				currentCol.push(line);
			}
			if (currentCol.length > 0) {
				cols.push(currentCol.join('\n').trim());
			}
		} else {
			// No headings and no explicit breaks: single column
			cols = [lines.join('\n').trim()];
		}
	}

	// Filter out completely empty columns if multiple exist
	cols = cols.filter((c) => c.length > 0);
	if (cols.length === 0) {
		cols = [''];
	}

	let effectiveVariant = variant;

	// Auto-upgrade legacy 2-column pyramid snippet (left column with ▲ / ■ / ▬ bullets + right column with detail bullets)
	if (
		(!effectiveVariant || effectiveVariant === 'normal') &&
		cols.length === 2 &&
		cols[0]!.includes('▲') &&
		cols[0]!.includes('■') &&
		cols[0]!.includes('▬')
	) {
		const upgraded = tryUpgradeLegacyPyramidCols(cols[0]!, cols[1]!);
		if (upgraded) {
			cols = upgraded;
			effectiveVariant = 'pyramid';
		}
	}

	if (effectiveVariant === 'pyramid' || effectiveVariant === 'funnel') {
		const variantForRows = effectiveVariant;
		const styleClass = style === 'plain' ? ' presenter-cols-plain' : ' presenter-cols-card';
		const variantClass = ` presenter-cols-${variantForRows}`;
		const rowDivs = cols
			.map((c, idx) => renderDiagramTierRow(c, idx, variantForRows))
			.join('\n');
		return `<div class="presenter-cols presenter-cols-1${styleClass}${variantClass}">\n${rowDivs}\n</div>`;
	}

	const defaultCountForVariant =
		effectiveVariant === 'matrix' || effectiveVariant === 'cycle' ? 2 : cols.length;
	const count = Math.min(
		MAX_COLUMNS,
		Math.max(1, specifiedCount ?? defaultCountForVariant)
	);

	const styleClass = style === 'plain' ? ' presenter-cols-plain' : ' presenter-cols-card';
	const ratioClass = ratio ? ` presenter-cols-ratio-${ratio.replace(':', '-')}` : '';
	const variantClass =
		effectiveVariant && effectiveVariant !== 'normal'
			? ` presenter-cols-${effectiveVariant}`
			: '';
	const colDivs = cols
		.map((c) => {
			const isHighlight = HIGHLIGHT_MARKER_REGEX.test(c);
			const hiClass = isHighlight ? ' presenter-col-highlight' : '';
			return `<div class="presenter-col${hiClass}">\n\n${c}\n\n</div>`;
		})
		.join('\n');

	return `<div class="presenter-cols presenter-cols-${count}${styleClass}${ratioClass}${variantClass}">\n${colDivs}\n</div>`;
}

const HIGHLIGHT_MARKER_REGEX = /\[(?:ボトルネック|重要|強調|課題|最優先|決裁|決裁事項)\]|🎯/;

function renderDiagramTierRow(
	colMarkdown: string,
	idx: number,
	variant: 'pyramid' | 'funnel'
): string {
	const lines = colMarkdown.split(/\r?\n/);
	let headingLine = '';
	const bodyLines: string[] = [];

	for (const line of lines) {
		if (!headingLine) {
			const h = matchAtxHeading(line);
			if (h) {
				headingLine = `### ${h.text}`;
				continue;
			}
		}
		bodyLines.push(line);
	}

	if (!headingLine) {
		const firstNonEmptyIdx = bodyLines.findIndex((l) => l.trim().length > 0);
		if (firstNonEmptyIdx >= 0) {
			const firstLine = bodyLines.splice(firstNonEmptyIdx, 1)[0]!.replace(/^[-*+]\s+/, '');
			headingLine = `### ${firstLine}`;
		} else {
			headingLine = `### Tier ${idx + 1}`;
		}
	}

	const bodyText = bodyLines.join('\n').trim();
	const isHighlight =
		HIGHLIGHT_MARKER_REGEX.test(colMarkdown) || (variant === 'pyramid' && idx === 0);
	const hiClass = isHighlight ? ' presenter-col-highlight' : '';
	const tierNum = Math.min(4, idx + 1);

	return `<div class="presenter-col presenter-diagram-row presenter-tier-${tierNum}${hiClass}">\n<div class="presenter-tier-shape">\n\n${headingLine}\n\n</div>\n<div class="presenter-tier-detail">\n\n${bodyText}\n\n</div>\n</div>`;
}

function tryUpgradeLegacyPyramidCols(leftCol: string, rightCol: string): string[] | null {
	const extractBullets = (text: string): string[] => {
		const lines = text.split(/\r?\n/);
		const items: string[] = [];
		for (const line of lines) {
			const trimmed = line.trim();
			if (matchAtxHeading(trimmed)) continue;
			if (/^[-*+]\s+/.test(trimmed)) {
				items.push(trimmed.replace(/^[-*+]\s+/, '').trim());
			} else if (trimmed.length > 0 && items.length > 0) {
				items[items.length - 1] += ` ${trimmed}`;
			}
		}
		return items;
	};

	const leftItems = extractBullets(leftCol);
	const rightItems = extractBullets(rightCol);
	if (leftItems.length < 2 || leftItems.length !== rightItems.length) {
		return null;
	}

	return leftItems.map((leftItem, i) => {
		const cleanLeft = leftItem.replace(/\*\*/g, '');
		const rightItem = rightItems[i]!;
		return `### ${cleanLeft}\n- ${rightItem}`;
	});
}
