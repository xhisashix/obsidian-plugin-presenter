import { FenceTracker } from './fence';

/**
 * Preprocesses label/badge syntax like `[xxx] testtest` into `<span class="presenter-badge">xxx</span> testtest`.
 * Accurately preserves Markdown links [text](url), Wikilinks [[wikilink]], checkboxes [ ] / [x],
 * footnote references [^1], link definition lines [id]: url, and labels that have a matching link definition in the document.
 */
export function preprocessBadges(markdown: string, enableBadges = true): string {
	if (!enableBadges) {
		return markdown;
	}

	const lines = markdown.split(/\r?\n/);
	const fenceTrackerForDefinitions = new FenceTracker();
	const definedLinkLabels = new Set<string>();

	// First pass: collect link definition labels: `^[label]: url`
	for (const line of lines) {
		if (fenceTrackerForDefinitions.feed(line)) continue;
		const match = line.match(/^ {0,3}\[([^\]]+)\]:[ \t]*.+$/);
		if (match && match[1]) {
			definedLinkLabels.add(normalizeLabel(match[1]));
		}
	}

	const fenceTracker = new FenceTracker();
	const processedLines = lines.map((line: string) => {
		if (fenceTracker.feed(line)) {
			return line;
		}

		// Skip link definition lines themselves
		if (/^ {0,3}\[[^\]]+\]:[ \t]*.+$/.test(line)) {
			return line;
		}

		// Split line into inline code segments vs normal segments
		const segments = line.split(/(`[^`]*`)/);
		const convertedSegments = segments.map((seg: string, idx: number) => {
			// Odd indices are inside inline code `...`
			if (idx % 2 === 1) {
				return seg;
			}

			// In normal text, find [xxx] that are not links, images, wikilinks, or checkboxes
			return seg.replace(
				/(^|[^![])\[([^^\]\r\n]+)\](?![[(:\]])/g,
				(fullMatch: string, prefix: string, label: string): string => {
					const trimmedLabel = label.trim();
					// Skip empty
					if (!trimmedLabel) return fullMatch;
					// Skip if contains [ or ]
					if (label.includes('[') || label.includes(']')) return fullMatch;
					// Skip task list checkboxes: [ ], [x], [X]
					if (/^[\s\txX]$/.test(label)) return fullMatch;
					// Skip footnote reference: starts with ^
					if (label.startsWith('^')) return fullMatch;
					// Skip Callout tags: starts with !
					if (label.startsWith('!')) return fullMatch;
					// Skip if this label matches an existing link definition in the document
					if (definedLinkLabels.has(normalizeLabel(trimmedLabel))) return fullMatch;

					return `${prefix}<span class="presenter-badge">${trimmedLabel}</span>`;
				}
			);
		});

		return convertedSegments.join('');
	});

	return processedLines.join('\n');
}

function normalizeLabel(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
