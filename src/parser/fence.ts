/**
 * Tracks fenced code blocks (``` or ~~~) line by line following CommonMark rules:
 * a fence is closed only by a line using the same character with at least the same length.
 *
 * Leading indentation is tolerated so fences nested in list items are recognised too.
 */
export class FenceTracker {
	private open: { char: string; length: number } | null = null;

	/** Whether the tracker is currently inside a fenced code block. */
	get inFence(): boolean {
		return this.open !== null;
	}

	/**
	 * Feeds the next line. Returns `true` when the line belongs to a fenced code block,
	 * including the opening and closing fence lines themselves.
	 */
	feed(line: string): boolean {
		const match = line.match(/^\s*(`{3,}|~{3,})(.*)$/);

		if (this.open) {
			if (match && match[1] !== undefined && match[2] !== undefined) {
				const fence = match[1];
				if (fence[0] === this.open.char && fence.length >= this.open.length && match[2].trim() === '') {
					this.open = null;
				}
			}
			return true;
		}

		if (match && match[1] !== undefined && match[2] !== undefined) {
			const fence = match[1];
			const char = fence[0] ?? '`';
			// Backtick fences cannot have backticks in their info string (that would be inline code).
			if (char === '`' && match[2].includes('`')) {
				return false;
			}
			this.open = { char, length: fence.length };
			return true;
		}

		return false;
	}
}
