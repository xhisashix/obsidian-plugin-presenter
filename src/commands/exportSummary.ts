import { Notice } from 'obsidian';
import type PresenterPlugin from '../main';
import { parsePresentation } from '../parser/slideParser';
import type { PresentationData } from '../types';

/**
 * Extracts an executive summary from a presentation for quick sharing
 * in Slack, Teams, email, or meeting notes.
 */
export function extractPresentationSummary(presentation: PresentationData): string {
	const lines: string[] = [];
	lines.push(`# ${presentation.title}`);
	lines.push('');
	lines.push('## 📋 Slide Outline');

	presentation.slides.forEach((slide, idx) => {
		const num = idx + 1;
		const isSection = slide.layout === 'section' || slide.type === 'section';
		const badge =
			slide.type === 'cover'
				? '【Cover】'
				: isSection
					? '【Section】'
					: slide.type === 'quote'
						? '【Quote】'
						: '';

		lines.push(`${num}. ${badge ? badge + ' ' : ''}${slide.title}`);
	});

	// Extract Key Takeaways & Callouts
	const highlights: string[] = [];

	presentation.slides.forEach((slide, idx) => {
		const slideLines = slide.markdown.split(/\r?\n/);
		const slideNum = idx + 1;

		for (const line of slideLines) {
			const trimmed = line.trim();
			// Match callouts like > [!important] or > [!tip] or > [!summary]
			const calloutMatch = trimmed.match(/^>\s*\[!(important|tip|summary|warning|check|info)\]\s*(.*)$/i);
			if (calloutMatch && calloutMatch[2]) {
				highlights.push(`- **p.${slideNum} ${slide.title}**: ${calloutMatch[2].trim()}`);
			}

			// Match badges like [重要] or <span class="presenter-badge">重要</span>
			const badgeMatch = trimmed.match(/^[-*]\s*(?:\[(.*?)]|<span class="presenter-badge">(.*?)<\/span>)\s*(.*)$/);
			if (badgeMatch) {
				const label = (badgeMatch[1] || badgeMatch[2] || '').trim();
				const text = (badgeMatch[3] || '').trim();
				if (label === '重要' || label === 'IMPORTANT' || label === 'POINT' || label === 'TASK' || label === '課題') {
					highlights.push(`- **p.${slideNum} [${label}]**: ${text}`);
				}
			}
		}
	});

	if (highlights.length > 0) {
		lines.push('');
		lines.push('## 💡 Key Highlights & Takeaways');
		lines.push(...highlights);
	}

	return lines.join('\n');
}

/**
 * Registers the summary export command.
 */
export function registerSummaryCommand(plugin: PresenterPlugin): void {
	plugin.addCommand({
		id: 'copy-presentation-summary',
		name: 'Copy summary for sharing',
		callback: async () => {
			const activeFile = plugin.app.workspace.getActiveFile();
			if (!activeFile) {
				new Notice('Please open a presentation note first.');
				return;
			}

			try {
				const content = await plugin.app.vault.read(activeFile);
				const settings = plugin.settings;
				const presentation = parsePresentation(content, {
					defaultColumnStyle: settings.defaultColumnStyle,
					enableBadges: settings.enableBadges,
					enableSmartLayouts: settings.enableSmartLayouts,
				});

				const summary = extractPresentationSummary(presentation);
				await navigator.clipboard.writeText(summary);
				new Notice('Presentation summary copied to clipboard!');
			} catch (err) {
				console.error('Failed to copy presentation summary:', err);
				new Notice('Failed to copy presentation summary.');
			}
		},
	});
}
