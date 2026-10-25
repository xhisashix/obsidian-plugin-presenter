import type { SlideLayout, SlideType } from '../types';
import { matchAtxHeading } from './blocks';
import { parseDirective } from './directives';
import { FenceTracker } from './fence';

/**
 * Checks slide lines for explicit slide layout directives:
 *   <!-- slide: section -->
 *   <!-- slide: quote -->
 *   <!-- slide: content -->
 *   <!-- slide: cover -->
 */
export function findExplicitSlideLayout(lines: string[]): SlideLayout | null {
	const fence = new FenceTracker();
	for (const line of lines) {
		if (fence.feed(line)) continue;
		const directive = parseDirective(line);
		if (directive && directive.kind === 'slide') {
			return directive.layout;
		}
	}
	return null;
}

/**
 * Determines the layout of a slide using a 3-tier priority hierarchy:
 * 1. Explicit HTML comment directive (e.g. <!-- slide: section -->) -> Always wins.
 * 2. Auto-inference when enabled:
 *    - Section divider: H2 heading only, or H2 + single short subtitle (<= 100 chars).
 *    - Quote / Big Statement: H2 + single blockquote (> ...), or single blockquote without heading.
 * 3. Fallback: Base slide type ('cover' | 'content').
 */
export function inferSlideLayout(
	lines: string[],
	baseType: SlideType,
	enableSmartLayouts: boolean = true
): SlideLayout {
	// 1. Explicit directive has highest priority
	const explicit = findExplicitSlideLayout(lines);
	if (explicit) {
		return explicit;
	}

	// 2. If smart layouts are disabled or slide is a cover slide, return base type
	if (!enableSmartLayouts || baseType === 'cover') {
		return baseType;
	}

	// 3. Inspect body content lines (filtering out heading, comments, notes callouts, and blank lines)
	const fence = new FenceTracker();
	const contentLines: string[] = [];
	let hasHeading = false;

	for (const rawLine of lines) {
		const isCode = fence.feed(rawLine);
		const trimmed = rawLine.trim();

		if (isCode) {
			contentLines.push(trimmed);
			continue;
		}

		// Skip comments and directives
		if (parseDirective(rawLine) !== null || (trimmed.startsWith('<!--') && trimmed.endsWith('-->'))) {
			continue;
		}

		// Check for H2 heading
		const heading = matchAtxHeading(rawLine);
		if (heading && heading.level === 2 && !hasHeading) {
			hasHeading = true;
			continue;
		}

		// Skip speaker notes
		if (/^>\s*\[!(note|notes|speaker-note)\]/i.test(trimmed)) {
			continue;
		}

		if (trimmed.length > 0) {
			contentLines.push(trimmed);
		}
	}

	// Auto-infer: Section Divider
	// Condition: Has H2 heading and 0 body content lines (pure section divider)
	if (hasHeading && contentLines.length === 0) {
		return 'section';
	}

	// Auto-infer: Quote / Big Statement
	// Condition: Content lines consist exclusively of blockquote lines (> ...)
	if (contentLines.length > 0 && contentLines.every((l) => l.startsWith('>'))) {
		// Ensure it's not a callout like > [!important]
		const isCallout = contentLines.some((l) => /^>\s*\[![a-z0-9_-]+\]/i.test(l));
		if (!isCallout) {
			return 'quote';
		}
	}

	return 'content';
}

const KPI_REGEX = /^\s*\*\*([+-]?[$¥€£]?\s*[\d,.]+\s*(?:%|倍|社|人|円|万|億|k|m|b|ms|s|fps|pt|pts|x|件|点)?|[¥$€£][\d,.]+[a-zA-Z万億]?)\*\*\s*$/i;

/**
 * Preprocesses KPI metrics: transforms standalone bold numeric metric lines
 * into styled KPI metric blocks.
 */
export function preprocessKpi(markdown: string, enableSmartLayouts: boolean = true): string {
	const lines = markdown.split(/\r?\n/);
	const fence = new FenceTracker();
	const output: string[] = [];
	let inExplicitKpi = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const isCode = fence.feed(line);

		if (isCode) {
			output.push(line);
			continue;
		}

		const trimmed = line.trim();

		// Check explicit KPI comment directives
		if (/^ {0,3}<!--\s*(?:presenter:)?kpi\s*-->[ \t]*$/i.test(trimmed)) {
			inExplicitKpi = true;
			continue;
		}
		if (/^ {0,3}<!--\s*\/\s*(?:presenter:)?kpi\s*-->[ \t]*$/i.test(trimmed)) {
			inExplicitKpi = false;
			continue;
		}

		if (inExplicitKpi) {
			const boldMatch = trimmed.match(/^\*\*(.*?)\*\*$/);
			const value = boldMatch && boldMatch[1] ? boldMatch[1] : trimmed;
			output.push(`<div class="presenter-kpi-value">${value}</div>`);
			continue;
		}

		if (enableSmartLayouts) {
			const match = line.match(KPI_REGEX);
			if (match && match[1]) {
				const value = match[1].trim();
				// Ensure not a plain short number in a numbered list
				if (!/^\d+\.$/.test(value)) {
					output.push(`<div class="presenter-kpi-value">${value}</div>`);
					continue;
				}
			}
		}

		output.push(line);
	}

	return output.join('\n');
}
