import { FenceTracker } from './fence';

/**
 * Extracts note callouts (e.g. `> [!note] ...`, `> [!notes] ...`, or `> [!speaker-note] ...`)
 * from slide lines so they can be separated from the main slide content into presenter notes / handouts.
 */
export function extractSlideNotes(lines: string[]): {
	bodyLines: string[];
	notesMarkdown?: string;
} {
	const bodyLines: string[] = [];
	const notesLines: string[] = [];
	let inNoteCallout = false;
	const fenceTracker = new FenceTracker();

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;
		const trimmed = line.trim();

		const isFence = fenceTracker.feed(line);

		if (!isFence) {
			const calloutStartMatch = trimmed.match(/^>\s*\[!(note|notes|speaker-note)\](.*)$/i);
			if (calloutStartMatch) {
				inNoteCallout = true;
				notesLines.push(line);
				continue;
			}

			if (inNoteCallout) {
				if (trimmed.startsWith('>')) {
					notesLines.push(line);
					continue;
				} else if (trimmed === '') {
					// Check if subsequent lines continue the blockquote
					const nextLine = lines[i + 1]?.trim();
					if (nextLine && nextLine.startsWith('>')) {
						notesLines.push(line);
						continue;
					}
					inNoteCallout = false;
				} else {
					inNoteCallout = false;
				}
			}
		}

		bodyLines.push(line);
	}

	return {
		bodyLines,
		notesMarkdown: notesLines.length > 0 ? notesLines.join('\n') : undefined,
	};
}
