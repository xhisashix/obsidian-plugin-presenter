import type { ColumnStyle } from '../types';

/**
 * Presenter directives are written as single-line HTML comments so that they stay
 * invisible in every standard Markdown viewer (GitHub, VS Code, Obsidian reading view...).
 *
 *   <!-- columns [N] [card|plain] -->   start a column region
 *   <!-- column -->                     explicit column break
 *   <!-- /columns -->                   end a column region
 *
 * A `presenter:` namespace prefix is accepted as an alias, e.g. `<!-- presenter:columns -->`.
 */
export type Directive =
	| { kind: 'columns'; count?: number; style?: ColumnStyle }
	| { kind: 'column' }
	| { kind: 'end-columns' };

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

	if (name === 'columns') {
		const directive: { kind: 'columns'; count?: number; style?: ColumnStyle } = { kind: 'columns' };
		for (const token of args) {
			if (/^\d+$/.test(token)) {
				const count = Number(token);
				if (count >= 1 && count <= MAX_COLUMNS) directive.count = count;
			} else if (token === 'card' || token === 'plain') {
				directive.style = token;
			} else {
				// Unknown token: treat as an ordinary comment rather than guessing.
				return null;
			}
		}
		return directive;
	}

	return null;
}
