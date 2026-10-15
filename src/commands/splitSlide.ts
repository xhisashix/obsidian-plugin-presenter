import { type App, MarkdownView, Notice, TFile } from 'obsidian';

/**
 * Splits a slide by inserting a `---` horizontal break right before the specified target line.
 * Uses the active editor if the file is currently open to make the change cleanly undoable (Cmd+Z).
 */
export async function splitSlideAtLine(
	app: App,
	file: TFile,
	absoluteLineNumber: number
): Promise<boolean> {
	try {
		const activeView = app.workspace.getActiveViewOfType(MarkdownView);

		if (activeView && activeView.file?.path === file.path) {
			const editor = activeView.editor;
			// Insert a clean '---' separator with blank lines before the target line
			editor.replaceRange('\n---\n\n', { line: absoluteLineNumber, ch: 0 });
			new Notice('Slide split successfully!');
			return true;
		}

		// Fallback for background file modification
		await app.vault.process(file, (data) => {
			const lines = data.split(/\r?\n/);
			if (absoluteLineNumber >= 0 && absoluteLineNumber <= lines.length) {
				lines.splice(absoluteLineNumber, 0, '', '---', '');
				return lines.join('\n');
			}
			return data;
		});

		new Notice('Slide split successfully!');
		return true;
	} catch (err) {
		console.error('Failed to split slide:', err);
		new Notice('Failed to split slide. Check console for details.');
		return false;
	}
}
