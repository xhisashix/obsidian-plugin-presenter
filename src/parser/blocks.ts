/**
 * Line-level block classification helpers aligned with CommonMark semantics.
 */

export interface AtxHeading {
	level: number;
	text: string;
}

/** Matches an ATX heading (`## Title`, optionally with a closing `##` sequence). */
export function matchAtxHeading(line: string): AtxHeading | null {
	const match = line.match(/^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/);
	if (!match || match[1] === undefined || match[2] === undefined) return null;
	const text = match[2].trim();
	if (!text) return null;
	return { level: match[1].length, text };
}

/** Thematic break: three or more `-`, `*` or `_` (optionally separated by spaces). */
export function isThematicBreak(line: string): boolean {
	return /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line);
}

/**
 * Returns the setext heading level the line would produce if it followed a paragraph
 * (`===` → 1, `---` → 2), or `null` if it is not a setext underline.
 */
export function setextUnderlineLevel(line: string): 1 | 2 | null {
	if (/^ {0,3}=+[ \t]*$/.test(line)) return 1;
	if (/^ {0,3}-+[ \t]*$/.test(line)) return 2;
	return null;
}

/** A complete single-line HTML comment such as `<!-- columns 2 -->`. */
export function isSingleLineComment(line: string): boolean {
	return /^ {0,3}<!--.*-->[ \t]*$/.test(line);
}

/**
 * Whether the line starts a block that is not a plain paragraph
 * (list item, blockquote, table row, HTML block or indented code).
 * A `---` following such a block is a thematic break, not a setext heading.
 */
export function startsNonParagraphBlock(line: string): boolean {
	if (/^(?: {4,}|\t)/.test(line)) return true;
	const trimmed = line.trimStart();
	return /^(?:[-*+][ \t]|\d{1,9}[.)][ \t]|>|\||<)/.test(trimmed) || /^[-*+]$/.test(trimmed);
}
