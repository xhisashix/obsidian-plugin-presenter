import type { SlideFrontmatter } from '../types';

/**
 * Parses simple YAML frontmatter from the beginning of markdown content.
 */
export function extractFrontmatter(content: string): {
	frontmatter: SlideFrontmatter;
	body: string;
	frontmatterLines: number;
} {
	const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
	const match = content.match(frontmatterRegex);

	if (!match || match[1] === undefined) {
		return { frontmatter: {}, body: content, frontmatterLines: 0 };
	}

	const yamlBlock = match[1];
	const frontmatterLines = match[0].split(/\r?\n/).length - 1;
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
			case 'columnStyle':
				if (val === 'card' || val === 'plain') {
					frontmatter.columnStyle = val;
				}
				break;
			case 'fit':
			case 'presenter-fit':
				if (val === 'auto' || val === 'none') {
					frontmatter.fit = val;
				} else if (val === 'true') {
					frontmatter.fit = true;
				} else if (val === 'false') {
					frontmatter.fit = false;
				}
				break;
		}
	}

	return { frontmatter, body, frontmatterLines };
}
