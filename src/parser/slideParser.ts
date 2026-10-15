import type { ColumnStyle, ParseOptions, PresentationData, SlideData, SlideType } from '../types';
import { isThematicBreak, matchAtxHeading, setextUnderlineLevel, startsNonParagraphBlock } from './blocks';
import { preprocessBadges } from './badges';
import { preprocessColumns } from './columns';
import { FenceTracker } from './fence';
import { extractFrontmatter } from './frontmatter';
import { extractSlideNotes } from './notes';

export { extractFrontmatter } from './frontmatter';
export { preprocessColumns } from './columns';
export { preprocessBadges } from './badges';
export { extractSlideNotes } from './notes';

interface RawSlide {
	type: SlideType;
	title: string;
	lines: string[];
	startLine: number;
	endLine: number;
}

/**
 * Splits markdown content into slides adhering to CommonMark rules:
 * - H1 (# or ===): Cover slide
 * - H2 (## or --- after paragraph): Content slide
 * - Thematic break (---, ***, ___ after empty/list/quote): Content slide break
 * Code blocks and fences are strictly respected.
 */
export function parsePresentation(
	rawMarkdown: string,
	optionsOrStyle?: ColumnStyle | ParseOptions
): PresentationData {
	const options: ParseOptions =
		typeof optionsOrStyle === 'string'
			? { defaultColumnStyle: optionsOrStyle }
			: optionsOrStyle || {};

	const defaultStyle: ColumnStyle = options.defaultColumnStyle || 'card';
	const enableBadges: boolean = options.enableBadges ?? true;

	const { frontmatter, body, frontmatterLines } = extractFrontmatter(rawMarkdown);
	const resolvedDefaultStyle: ColumnStyle = frontmatter.columnStyle || defaultStyle;
	const lines = body.split(/\r?\n/);

	const rawSlides: RawSlide[] = [];
	let currentSlide: RawSlide | null = null;
	let explicitBreak = false;
	const fenceTracker = new FenceTracker();
	let presentationTitle = 'Presentation';

	const pushCurrentSlide = (endLine: number) => {
		if (currentSlide && (currentSlide.lines.length > 0 || currentSlide.title)) {
			// Only push if slide has a title or non-empty content lines
			const hasContent = currentSlide.lines.some((l) => l.trim().length > 0);
			if (currentSlide.title || hasContent) {
				currentSlide.endLine = endLine;
				rawSlides.push(currentSlide);
			}
		}
		currentSlide = null;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const docLine = frontmatterLines + i;
		const isFence = fenceTracker.feed(line);

		if (!isFence) {
			// Check for Setext heading underline
			const setextLevel = setextUnderlineLevel(line);
			if (setextLevel !== null) {
				// To be a Setext heading, the preceding line in the current slide must be paragraph text
				const prevLineInSlide = currentSlide?.lines[currentSlide.lines.length - 1];
				const prevTrimmed = prevLineInSlide?.trim() ?? '';

				if (
					prevTrimmed.length > 0 &&
					!startsNonParagraphBlock(prevTrimmed) &&
					!isThematicBreak(prevTrimmed)
				) {
					// This is a Setext heading!
					// Pop the title lines from current slide
					const titleLines: string[] = [];
					while (currentSlide && currentSlide.lines.length > 0) {
						const last = currentSlide.lines[currentSlide.lines.length - 1]!;
						if (last.trim() === '') break;
						titleLines.unshift(currentSlide.lines.pop()!);
					}

					// Close previous slide before this Setext heading
					pushCurrentSlide(docLine - titleLines.length - 1);

					const setextTitle = titleLines.join(' ').trim();
					const slideType: SlideType = setextLevel === 1 ? 'cover' : 'content';

					if (setextLevel === 1 && (!presentationTitle || presentationTitle === 'Presentation')) {
						presentationTitle = setextTitle;
					}

					currentSlide = {
						type: slideType,
						title: setextTitle,
						lines: [...titleLines, line],
						startLine: docLine - titleLines.length,
						endLine: docLine,
					};
					explicitBreak = false;
					continue;
				}
			}

			// Check for Thematic break (explicit slide boundary)
			if (isThematicBreak(line)) {
				pushCurrentSlide(docLine - 1);
				explicitBreak = true;
				continue;
			}

			// Check for ATX heading (#, ##, ...)
			const atx = matchAtxHeading(line);
			if (atx) {
				if (atx.level === 1) {
					// H1 -> Cover slide
					pushCurrentSlide(docLine - 1);
					if (!presentationTitle || presentationTitle === 'Presentation') {
						presentationTitle = atx.text;
					}
					currentSlide = {
						type: 'cover',
						title: atx.text,
						lines: [line],
						startLine: docLine,
						endLine: docLine,
					};
					explicitBreak = false;
					continue;
				} else if (atx.level === 2) {
					// H2 -> Content slide
					pushCurrentSlide(docLine - 1);
					currentSlide = {
						type: 'content',
						title: atx.text,
						lines: [line],
						startLine: docLine,
						endLine: docLine,
					};
					explicitBreak = false;
					continue;
				}
			}
		}

		// Accumulate lines for current slide
		if (!currentSlide) {
			if (line.trim().length > 0) {
				currentSlide = {
					type: explicitBreak ? 'content' : 'cover',
					title: '',
					lines: [line],
					startLine: docLine,
					endLine: docLine,
				};
				explicitBreak = false;
			}
		} else {
			currentSlide.lines.push(line);
			currentSlide.endLine = docLine;
		}
	}

	pushCurrentSlide(frontmatterLines + lines.length - 1);

	// If no slides were produced (e.g. empty file), create a placeholder slide
	if (rawSlides.length === 0) {
		rawSlides.push({
			type: 'cover',
			title: 'Empty Slide',
			lines: ['# Empty Slide', '', 'No content found in this note.'],
			startLine: 0,
			endLine: 0,
		});
	}

	// Map to SlideData, extract notes, preprocess columns and badges
	const slides: SlideData[] = rawSlides.map((s, idx) => {
		const { bodyLines, notesMarkdown } = extractSlideNotes(s.lines);
		const columnProcessed = preprocessColumns(bodyLines.join('\n'), resolvedDefaultStyle);
		const badgeProcessed = preprocessBadges(columnProcessed, enableBadges);

		return {
			index: idx,
			type: s.type,
			title: s.title || (s.type === 'cover' ? 'Title' : `Slide ${idx + 1}`),
			markdown: badgeProcessed,
			notes: notesMarkdown ? preprocessBadges(notesMarkdown, enableBadges) : undefined,
			startLine: s.startLine,
			endLine: s.endLine,
		};
	});

	return {
		title: presentationTitle,
		frontmatter,
		slides,
	};
}

/**
 * Determines which slide index corresponds to a given line number in the source markdown.
 */
export function getSlideIndexAtLine(slides: SlideData[], lineNumber: number): number {
	if (slides.length === 0) return 0;
	const firstSlide = slides[0];
	if (!firstSlide || lineNumber <= (firstSlide.startLine ?? 0)) return 0;

	for (let i = 0; i < slides.length; i++) {
		const s = slides[i];
		if (!s) continue;
		const start = s.startLine ?? 0;
		const end = s.endLine ?? Number.MAX_SAFE_INTEGER;
		if (lineNumber >= start && lineNumber <= end) {
			return i;
		}
		if (i < slides.length - 1) {
			const nextSlide = slides[i + 1];
			const nextStart = nextSlide?.startLine ?? Number.MAX_SAFE_INTEGER;
			if (lineNumber > end && lineNumber < nextStart) {
				return i;
			}
		}
	}
	return slides.length - 1;
}
