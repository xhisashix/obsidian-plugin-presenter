import type { PresentationData, SlideData, SlideFrontmatter, SlideType } from '../types';

/**
 * Parses simple YAML frontmatter from the beginning of markdown content.
 */
export function extractFrontmatter(content: string): {
	frontmatter: SlideFrontmatter;
	body: string;
} {
	const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
	const match = content.match(frontmatterRegex);

	if (!match || match[1] === undefined) {
		return { frontmatter: {}, body: content };
	}

	const yamlBlock = match[1];
	const body = content.slice(match[0].length);
	const frontmatter: SlideFrontmatter = {};

	const lines = yamlBlock.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const colonIdx = trimmed.indexOf(':');
		if (colonIdx === -1) continue;

		const key = trimmed.slice(0, colonIdx).trim();
		let val = trimmed.slice(colonIdx + 1).trim();

		// Remove surrounding single or double quotes
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}

		switch (key) {
			case 'baseColor':
			case 'background':
				frontmatter.baseColor = val;
				break;
			case 'mainColor':
			case 'color':
				frontmatter.mainColor = val;
				break;
			case 'accentColor':
				frontmatter.accentColor = val;
				break;
			case 'header':
				frontmatter.header = val;
				break;
			case 'footer':
				frontmatter.footer = val;
				break;
			case 'logo':
				frontmatter.logo = val;
				break;
			case 'aspectRatio':
				if (val === '16:9' || val === '4:3') {
					frontmatter.aspectRatio = val;
				}
				break;
			case 'theme':
				frontmatter.theme = val;
				break;
		}
	}

	return { frontmatter, body };
}

/**
 * Preprocesses custom column syntax (e.g. ::: cols-2 ... ::: or ::: columns ... :::)
 * into standard HTML divs with CSS classes that MarkdownRenderer and flex/grid can handle.
 */
export function preprocessColumns(markdown: string): string {
	// Pattern 1: ::: cols-2 or ::: cols-3 with +++ separator
	const colsWithPlusRegex = /:::\s*cols-(\d+)\r?\n([\s\S]*?)\r?\n:::/g;
	let processed = markdown.replace(
		colsWithPlusRegex,
		(_match: string, colsCount: string, body: string): string => {
			const cols: string[] = body.split(/\r?\n\+\+\+\r?\n/);
			const colDivs: string = cols
				.map((c: string) => `<div class="presenter-col">\n\n${c.trim()}\n\n</div>`)
				.join('\n');
			return `<div class="presenter-cols presenter-cols-${colsCount}">\n${colDivs}\n</div>`;
		}
	);

	// Pattern 2: ::: columns ... ::: column ... ::: ... :::
	const containerRegex = /:::\s*columns(?:\s+(\d+))?\r?\n([\s\S]*?)\r?\n:::/g;
	processed = processed.replace(
		containerRegex,
		(_match: string, colsCount: string | undefined, body: string): string => {
			const count = colsCount || '2';
			const colRegex = /:::\s*column\r?\n([\s\S]*?)\r?\n:::/g;
			let colMatches = 0;
			const colDivs: string = body.replace(
				colRegex,
				(_colMatch: string, colContent: string): string => {
					colMatches++;
					return `<div class="presenter-col">\n\n${colContent.trim()}\n\n</div>`;
				}
			);

			if (colMatches > 0) {
				const finalCols = colsCount || String(colMatches);
				return `<div class="presenter-cols presenter-cols-${finalCols}">\n${colDivs.trim()}\n</div>`;
			}

			// Fallback: if no ::: column inside, split by +++
			const cols: string[] = body.split(/\r?\n\+\+\+\r?\n/);
			const fallbackDivs: string = cols
				.map((c: string) => `<div class="presenter-col">\n\n${c.trim()}\n\n</div>`)
				.join('\n');
			return `<div class="presenter-cols presenter-cols-${count}">\n${fallbackDivs}\n</div>`;
		}
	);

	return processed;
}

/**
 * Preprocesses label/badge syntax like `[xxx] testtest` into `<span class="presenter-badge">xxx</span> testtest`.
 * Accurately preserves Markdown links [text](url), Wikilinks [[wikilink]], checkboxes [ ] / [x],
 * footnote references [^1], link definitions [id]: url, and fenced/inline code.
 */
export function preprocessBadges(markdown: string): string {
	const lines = markdown.split(/\r?\n/);
	let inCodeBlock = false;

	const processedLines = lines.map((line: string) => {
		const trimmed = line.trim();

		// Toggle fenced code block
		if (/^(`{3,}|~{3,})/.test(trimmed)) {
			inCodeBlock = !inCodeBlock;
			return line;
		}

		if (inCodeBlock) {
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

					return `${prefix}<span class="presenter-badge">${trimmedLabel}</span>`;
				}
			);
		});

		return convertedSegments.join('');
	});

	return processedLines.join('\n');
}

/**
 * Splits markdown content into slides based on H1 (Cover), H2 (Slide title/boundary),
 * or explicit --- dividers. Code blocks are ignored during boundary detection.
 */
export function parsePresentation(rawMarkdown: string): PresentationData {
	const { frontmatter, body } = extractFrontmatter(rawMarkdown);
	const lines = body.split(/\r?\n/);

	interface RawSlide {
		type: SlideType;
		title: string;
		lines: string[];
	}

	const rawSlides: RawSlide[] = [];
	let currentSlide: RawSlide | null = null;
	let inCodeBlock = false;
	let title = 'Presentation';

	for (const line of lines) {
		const trimmed = line.trim();

		// Track code blocks (``` or ~~~)
		if (/^(`{3,}|~{3,})/.test(trimmed)) {
			inCodeBlock = !inCodeBlock;
		}

		if (!inCodeBlock) {
			// Check for explicit divider --- (at least 3 dashes, nothing else)
			if (/^---{1,}$/.test(trimmed)) {
				if (currentSlide && (currentSlide.lines.length > 0 || currentSlide.title)) {
					rawSlides.push(currentSlide);
				}
				currentSlide = {
					type: 'content',
					title: '',
					lines: [],
				};
				continue;
			}

			// Check for H1 (# Title)
			const h1Match = line.match(/^#\s+(.+)$/);
			if (h1Match && h1Match[1] !== undefined) {
				if (currentSlide && (currentSlide.lines.length > 0 || currentSlide.title)) {
					rawSlides.push(currentSlide);
				}
				const h1Title = h1Match[1].trim();
				if (!title || title === 'Presentation') {
					title = h1Title;
				}
				currentSlide = {
					type: 'cover',
					title: h1Title,
					lines: [line],
				};
				continue;
			}

			// Check for H2 (## Slide Title)
			const h2Match = line.match(/^##\s+(.+)$/);
			if (h2Match && h2Match[1] !== undefined) {
				if (currentSlide && (currentSlide.lines.length > 0 || currentSlide.title)) {
					rawSlides.push(currentSlide);
				}
				const h2Title = h2Match[1].trim();
				currentSlide = {
					type: 'content',
					title: h2Title,
					lines: [line],
				};
				continue;
			}
		}

		// Accumulate lines for current slide
		if (!currentSlide) {
			// Content before any header
			if (trimmed.length > 0) {
				currentSlide = {
					type: 'cover',
					title: '',
					lines: [line],
				};
			}
		} else {
			currentSlide.lines.push(line);
		}
	}

	if (currentSlide && (currentSlide.lines.length > 0 || currentSlide.title)) {
		rawSlides.push(currentSlide);
	}

	// If no slides were produced (e.g. empty file), create a placeholder slide
	if (rawSlides.length === 0) {
		rawSlides.push({
			type: 'cover',
			title: 'Empty Slide',
			lines: ['# Empty Slide', '', 'No content found in this note.'],
		});
	}

	// Map to SlideData and preprocess multi-column blocks
	const slides: SlideData[] = rawSlides.map((s, idx) => ({
		index: idx,
		type: s.type,
		title: s.title || (s.type === 'cover' ? 'Title' : `Slide ${idx + 1}`),
		markdown: preprocessBadges(preprocessColumns(s.lines.join('\n'))),
	}));

	return {
		title,
		frontmatter,
		slides,
	};
}
