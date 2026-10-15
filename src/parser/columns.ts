import type { ColumnStyle } from '../types';
import { matchAtxHeading } from './blocks';
import { parseDirective, MAX_COLUMNS } from './directives';
import { FenceTracker } from './fence';

/**
 * Preprocesses HTML comment column directives:
 *   <!-- columns [N] [card|plain] -->
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
	let columnLines: string[] = [];

	const flushColumns = () => {
		if (!inColumns) return;
		inColumns = false;

		const rendered = renderColumnRegion(columnLines, currentCount, currentStyle);
		output.push(rendered);
		columnLines = [];
		currentCount = undefined;
		currentStyle = defaultColumnStyle;
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
	style: ColumnStyle
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

	const count = Math.min(
		MAX_COLUMNS,
		Math.max(1, specifiedCount ?? cols.length)
	);

	const styleClass = style === 'plain' ? ' presenter-cols-plain' : ' presenter-cols-card';
	const colDivs = cols
		.map((c) => `<div class="presenter-col">\n\n${c}\n\n</div>`)
		.join('\n');

	return `<div class="presenter-cols presenter-cols-${count}${styleClass}">\n${colDivs}\n</div>`;
}
