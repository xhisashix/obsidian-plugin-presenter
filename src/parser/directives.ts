import type { ColumnRatio, ColumnStyle, ColumnVariant, SlideLayout } from '../types';

/**
 * Presenter directives are written as single-line HTML comments so that they stay
 * invisible in every standard Markdown viewer (GitHub, VS Code, Obsidian reading view...).
 *
 *   <!-- columns [N] [ratio] [card|plain] [step] -->   start a column region
 *   <!-- column -->                                     explicit column break
 *   <!-- /columns -->                                   end a column region
 *   <!-- slide: [section|quote|content|cover] -->       explicit slide layout override
 *
 * A `presenter:` namespace prefix is accepted as an alias, e.g. `<!-- presenter:columns -->`.
 */
export type Directive =
	| {
			kind: 'columns';
			count?: number;
			style?: ColumnStyle;
			ratio?: ColumnRatio;
			variant?: ColumnVariant;
	  }
	| { kind: 'column' }
	| { kind: 'end-columns' }
	| { kind: 'slide'; layout: SlideLayout };

/** Maximum number of grid columns supported by the stylesheet. */
export const MAX_COLUMNS = 4;

const DIRECTIVE_REGEX = /^ {0,3}<!--\s*(\/)?\s*(?:presenter:)?([a-z][a-z-]*):?(?:\s+(.*?))?\s*-->[ \t]*$/i;

/**
 * Parses a line as a Presenter directive. Returns `null` for anything else,
 * including ordinary comments (e.g. `<!-- TODO -->`) which must be left untouched.
 */
export function parseDirective(line: string): Directive | null {
	const match = line.match(DIRECTIVE_REGEX);
	if (!match || match[2] === undefined) return null;

	const closing = match[1] === '/';
	const name = match[2].toLowerCase();
	const args = match[3] ? match[3].trim().toLowerCase().split(/\s+/) : [];

	if (closing) {
		return name === 'columns' && args.length === 0 ? { kind: 'end-columns' } : null;
	}

	if (name === 'column') {
		return args.length === 0 ? { kind: 'column' } : null;
	}

	if (name === 'slide') {
		if (args.length !== 1) return null;
		const target = args[0]!;
		if (target === 'section' || target === 'lead' || target === 'divider') {
			return { kind: 'slide', layout: 'section' };
		}
		if (target === 'quote' || target === 'statement' || target === 'center') {
			return { kind: 'slide', layout: 'quote' };
		}
		if (target === 'content' || target === 'default' || target === 'normal') {
			return { kind: 'slide', layout: 'content' };
		}
		if (target === 'cover') {
			return { kind: 'slide', layout: 'cover' };
		}
		return null;
	}

	if (name === 'columns') {
		const directive: {
			kind: 'columns';
			count?: number;
			style?: ColumnStyle;
			ratio?: ColumnRatio;
			variant?: ColumnVariant;
		} = { kind: 'columns' };

		for (const token of args) {
			if (/^\d+$/.test(token)) {
				const count = Number(token);
				if (count >= 1 && count <= MAX_COLUMNS) directive.count = count;
			} else if (token === 'card' || token === 'plain') {
				directive.style = token;
			} else if (token === '2:1' || token === '1:2' || token === '3:1' || token === '1:3') {
				directive.ratio = token;
				if (!directive.count) directive.count = 2;
			} else if (token === 'step' || token === 'steps') {
				directive.variant = 'step';
			} else {
				// Unknown token: treat as an ordinary comment rather than guessing.
				return null;
			}
		}
		return directive;
	}

	return null;
}
