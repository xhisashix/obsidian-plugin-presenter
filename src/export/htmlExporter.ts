import {
	type App,
	Component,
	MarkdownRenderer,
	TFile,
} from 'obsidian';
import type {
	PresentationData,
	PresenterSettings,
} from '../types';
import { resolveLogoUrl } from '../ui/slideRenderer';

/**
 * Escapes HTML characters for safe injection.
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Converts Obsidian vault local images in an element to inline base64 data URLs.
 */
async function inlineLocalImages(app: App, container: HTMLElement, sourcePath: string): Promise<void> {
	const imgs = container.querySelectorAll<HTMLImageElement>('img');
	for (let i = 0; i < imgs.length; i++) {
		const img = imgs[i];
		if (!img) continue;
		const src = img.getAttribute('src');
		if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
			continue;
		}

		// Try resolving via Obsidian resource path or link
		try {
			const cleanSrc = decodeURIComponent(src).replace(/^app:\/\/local\//, '').replace(/^app:\/\/obsidian\.md\//, '');
			let file = app.vault.getAbstractFileByPath(cleanSrc);
			if (!(file instanceof TFile)) {
				file = app.metadataCache.getFirstLinkpathDest(cleanSrc, sourcePath);
			}

			if (file instanceof TFile) {
				const ext = file.extension.toLowerCase();
				const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
				const buffer = await app.vault.adapter.readBinary(file.path);
				const base64 = arrayBufferToBase64(buffer);
				img.src = `data:${mime};base64,${base64}`;
			}
		} catch (e) {
			console.warn('Failed to inline image for export:', src, e);
		}
	}
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i] as number);
	}
	return window.btoa(binary);
}

/**
 * Exports a presentation to a standalone, portable HTML file that can be opened
 * by anyone in any web browser without Obsidian. Includes both full-screen presentation
 * mode and reading handout mode.
 */
export async function exportPresentationToHtml(
	app: App,
	file: TFile,
	presentation: PresentationData,
	settings: PresenterSettings
): Promise<string> {
	const component = new Component();
	component.load();

	const totalSlides = presentation.slides.length;
	const config = presentation.frontmatter;

	const baseColor = config.baseColor || settings.defaultBaseColor || '#ffffff';
	const mainColor = config.mainColor || settings.defaultMainColor || '#1e293b';
	const accentColor = config.accentColor || settings.defaultAccentColor || '#2563eb';
	const headerText = config.header !== undefined ? config.header : settings.defaultHeader;
	const footerText = config.footer !== undefined ? config.footer : settings.defaultFooter;
	const aspectRatio = config.aspectRatio || settings.aspectRatio || '16:9';
	const targetRatio = aspectRatio === '4:3' ? 4 / 3 : 16 / 9;
	const baseWidth = 1280;
	const baseHeight = Math.round(baseWidth / targetRatio);

	// Resolve logo
	let inlineLogoHtml = '';
	const logoInput = config.logo !== undefined ? config.logo : settings.defaultLogo;
	if (logoInput && logoInput.trim()) {
		const logoUrl = resolveLogoUrl(app, logoInput, file.path);
		if (logoUrl) {
			inlineLogoHtml = `<div class="presenter-header-logo"><img class="presenter-logo-image" src="${escapeHtml(logoUrl)}" alt="Logo" /></div>`;
		}
	}

	// Render each slide and note into HTML strings
	const renderedSlides: Array<{
		index: number;
		type: string;
		title: string;
		bodyHtml: string;
		notesHtml: string;
	}> = [];

	const tempContainer = activeDocument.body.createDiv({ cls: 'presenter-hidden-export' });

	try {
		for (const slide of presentation.slides) {
			// 1. Render slide markdown
			const slideDiv = tempContainer.createDiv();
			await MarkdownRenderer.render(app, slide.markdown, slideDiv, file.path, component);
			// Wait for any async Mermaid diagram rendering
			const mermaidEls = slideDiv.querySelectorAll('.mermaid');
			if (mermaidEls.length > 0) {
				await Promise.race([
					new Promise((resolve) => window.setTimeout(resolve, 300)),
					new Promise<void>((resolve) => {
						const check = () => {
							const svgs = slideDiv.querySelectorAll('.mermaid svg');
							if (svgs.length === mermaidEls.length) {
								resolve();
							} else {
								window.requestAnimationFrame(check);
							}
						};
						check();
					}),
				]);
			}
			await inlineLocalImages(app, slideDiv, file.path);
			const bodyHtml = slideDiv.innerHTML;

			// 2. Render notes markdown
			let notesHtml = '';
			if (slide.notes && slide.notes.trim()) {
				const notesDiv = tempContainer.createDiv();
				await MarkdownRenderer.render(app, slide.notes, notesDiv, file.path, component);
				await inlineLocalImages(app, notesDiv, file.path);
				notesHtml = notesDiv.innerHTML;
			}

			renderedSlides.push({
				index: slide.index,
				type: slide.type,
				title: slide.title,
				bodyHtml,
				notesHtml,
			});

			tempContainer.empty();
		}
	} finally {
		component.unload();
		tempContainer.remove();
	}

	// Build standalone HTML string
	const html = `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(presentation.title)}</title>
	<style>
		:root {
			--presenter-base-color: ${baseColor};
			--presenter-main-color: ${mainColor};
			--presenter-accent-color: ${accentColor};
			--slide-width: ${baseWidth}px;
			--slide-height: ${baseHeight}px;
		}

		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background: #090d16;
			color: #e2e8f0;
			overflow: hidden;
			height: 100vh;
			display: flex;
			flex-direction: column;
		}

		/* Top Navigation Bar */
		.navbar {
			height: 52px;
			background: rgba(15, 23, 42, 0.95);
			backdrop-filter: blur(10px);
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 20px;
			z-index: 100;
			flex-shrink: 0;
		}

		.nav-left {
			display: flex;
			align-items: center;
			gap: 14px;
			font-size: 14px;
			font-weight: 600;
			color: #f8fafc;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.nav-badge {
			background: rgba(56, 189, 248, 0.15);
			color: #38bdf8;
			border: 1px solid rgba(56, 189, 248, 0.3);
			border-radius: 4px;
			padding: 2px 8px;
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
		}

		.nav-right {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		/* Mode Switcher Buttons */
		.view-switch {
			display: flex;
			background: rgba(0, 0, 0, 0.35);
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 6px;
			padding: 2px;
		}

		.view-switch-btn {
			background: transparent;
			border: none;
			color: #94a3b8;
			padding: 6px 14px;
			font-size: 12px;
			font-weight: 600;
			border-radius: 4px;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: all 0.15s ease;
		}

		.view-switch-btn:hover {
			color: #ffffff;
		}

		.view-switch-btn.active {
			background: var(--presenter-accent-color);
			color: #ffffff;
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		}

		.btn-tool {
			background: rgba(255, 255, 255, 0.08);
			border: 1px solid rgba(255, 255, 255, 0.12);
			color: #cbd5e1;
			padding: 6px 12px;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: all 0.15s ease;
		}

		.btn-tool:hover {
			background: rgba(255, 255, 255, 0.16);
			color: #ffffff;
		}

		.btn-tool.active {
			background: rgba(56, 189, 248, 0.25);
			color: #38bdf8;
			border-color: rgba(56, 189, 248, 0.4);
		}

		/* Progress Bar */
		.progress-bar {
			height: 3px;
			background: var(--presenter-accent-color);
			width: 0%;
			transition: width 0.2s ease;
			flex-shrink: 0;
		}

		/* Presentation View Container */
		#presentation-mode {
			flex: 1;
			display: flex;
			flex-direction: column;
			position: relative;
			overflow: hidden;
		}

		.stage-container {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			position: relative;
			padding: 20px;
		}

		/* Slide Card */
		.slide-card {
			width: var(--slide-width);
			height: var(--slide-height);
			background-color: var(--presenter-base-color);
			color: var(--presenter-main-color);
			box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
			border-radius: 12px;
			padding: 44px 64px;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			position: absolute;
			opacity: 0;
			pointer-events: none;
			transform-origin: center center;
			transition: opacity 0.2s ease;
		}

		.slide-card.active {
			opacity: 1;
			pointer-events: auto;
		}

		.presenter-slide-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			min-height: 36px;
			margin-bottom: 24px;
			flex-shrink: 0;
		}

		.presenter-header-title {
			font-size: 15px;
			font-weight: 600;
			letter-spacing: 0.05em;
			text-transform: uppercase;
			color: var(--presenter-main-color);
			opacity: 0.65;
		}

		.presenter-logo-image {
			max-height: 36px;
			max-width: 150px;
			object-fit: contain;
		}

		.presenter-slide-body {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			font-size: 20px;
			line-height: 1.6;
		}

		.presenter-slide-cover .presenter-slide-body {
			justify-content: center;
			align-items: center;
			text-align: center;
		}

		.presenter-slide-cover h1 {
			font-size: 46px;
			font-weight: 800;
			margin-bottom: 20px;
			line-height: 1.25;
			color: var(--presenter-main-color);
		}

		.presenter-slide-content h2 {
			font-size: 34px;
			font-weight: 700;
			margin-bottom: 24px;
			color: var(--presenter-main-color);
			border-bottom: 2px solid var(--presenter-accent-color);
			padding-bottom: 8px;
		}

		/* Section Divider Slide */
		.presenter-slide-section {
			justify-content: center;
			text-align: center;
		}

		.presenter-slide-section .presenter-slide-body {
			justify-content: center;
			align-items: center;
			text-align: center;
		}

		.presenter-slide-section h2 {
			font-size: 44px;
			font-weight: 800;
			margin-bottom: 16px;
			color: var(--presenter-accent-color);
			border-bottom: none;
			padding-bottom: 0;
		}

		.presenter-slide-section p {
			font-size: 22px;
			opacity: 0.85;
			max-width: 800px;
			margin: 0 auto;
		}

		/* Quote Slide */
		.presenter-slide-quote {
			justify-content: center;
			text-align: center;
		}

		.presenter-slide-quote .presenter-slide-body {
			justify-content: center;
			align-items: center;
		}

		.presenter-slide-quote blockquote {
			border-left: none;
			background: transparent;
			padding: 0 40px;
			font-size: 28px;
			font-style: italic;
			line-height: 1.5;
			position: relative;
			color: var(--presenter-main-color);
		}

		.presenter-slide-quote blockquote::before {
			content: "“";
			font-size: 72px;
			line-height: 1;
			color: var(--presenter-accent-color);
			opacity: 0.4;
			display: block;
			margin-bottom: -24px;
			font-family: Georgia, serif;
		}

		/* KPI Metric */
		.presenter-kpi-value {
			font-size: 44px;
			font-weight: 800;
			color: var(--presenter-accent-color);
			line-height: 1.1;
			margin: 12px 0;
			letter-spacing: -0.02em;
			text-align: center;
		}

		/* Callouts */
		.presenter-slide-body .callout {
			margin: 14px 0;
			border-radius: 8px;
			border-left: 4px solid var(--presenter-accent-color);
			padding: 12px 16px;
			background: rgba(0, 0, 0, 0.04);
		}

		.presenter-slide-body .callout-title {
			font-weight: 700;
			font-size: 16px;
			margin-bottom: 4px;
		}

		.presenter-slide-body .callout-content {
			font-size: 15px;
		}

		.presenter-slide-content h3 {
			font-size: 24px;
			font-weight: 600;
			margin: 16px 0 10px 0;
			color: var(--presenter-main-color);
		}

		.presenter-slide-body p {
			margin-bottom: 14px;
		}

		.presenter-slide-body ul, .presenter-slide-body ol {
			margin-left: 28px;
			margin-bottom: 16px;
		}

		.presenter-slide-body li {
			margin-bottom: 10px;
		}

		.presenter-slide-body pre {
			background: rgba(0, 0, 0, 0.06);
			padding: 16px;
			border-radius: 8px;
			overflow-x: auto;
			font-size: 15px;
			font-family: monospace;
			margin-bottom: 16px;
		}

		.presenter-slide-body code {
			background: rgba(0, 0, 0, 0.05);
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 0.9em;
		}

		.presenter-slide-body table {
			width: 100%;
			border-collapse: separate;
			border-spacing: 0;
			margin-bottom: 16px;
			border-radius: 8px;
			overflow: hidden;
			border: 1px solid color-mix(in srgb, var(--presenter-main-color) 16%, transparent);
			box-shadow: 0 2px 8px color-mix(in srgb, var(--presenter-main-color) 4%, transparent);
		}

		.presenter-slide-body th, .presenter-slide-body td {
			padding: 10px 16px;
			text-align: left;
		}

		.presenter-slide-body th {
			background: color-mix(in srgb, var(--presenter-accent-color) 12%, transparent);
			color: var(--presenter-main-color);
			font-weight: 700;
			border-bottom: 2px solid var(--presenter-accent-color);
			border-right: 1px solid color-mix(in srgb, var(--presenter-main-color) 12%, transparent);
		}

		.presenter-slide-body th:last-child {
			border-right: none;
		}

		.presenter-slide-body td {
			border-bottom: 1px solid color-mix(in srgb, var(--presenter-main-color) 10%, transparent);
			border-right: 1px solid color-mix(in srgb, var(--presenter-main-color) 10%, transparent);
			color: var(--presenter-main-color);
		}

		.presenter-slide-body td:last-child {
			border-right: none;
		}

		.presenter-slide-body tr:last-child td {
			border-bottom: none;
		}

		.presenter-slide-body tbody tr:nth-child(even) {
			background: color-mix(in srgb, var(--presenter-main-color) 3.5%, transparent);
		}

		.presenter-slide-body tbody tr:hover {
			background: color-mix(in srgb, var(--presenter-accent-color) 6%, transparent);
			transition: background-color 0.15s ease;
		}

		/* Badge */
		.presenter-badge {
			display: inline-block;
			background: var(--presenter-accent-color);
			color: #ffffff;
			font-size: 13px;
			font-weight: 700;
			padding: 3px 10px;
			border-radius: 4px;
			margin-right: 8px;
			vertical-align: middle;
		}

		/* Multi-column grid */
		.presenter-cols {
			display: grid;
			gap: 20px;
			width: 100%;
			margin: 16px 0;
			align-items: stretch;
		}

		.presenter-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.presenter-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
		.presenter-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

		.presenter-cols.presenter-cols-ratio-2-1 { grid-template-columns: 2fr 1fr; }
		.presenter-cols.presenter-cols-ratio-1-2 { grid-template-columns: 1fr 2fr; }
		.presenter-cols.presenter-cols-ratio-3-1 { grid-template-columns: 3fr 1fr; }
		.presenter-cols.presenter-cols-ratio-1-3 { grid-template-columns: 1fr 3fr; }

		.presenter-col {
			display: flex;
			flex-direction: column;
			min-width: 0;
		}

		.presenter-cols-card .presenter-col {
			background: rgba(0, 0, 0, 0.03);
			border: 1px solid rgba(0, 0, 0, 0.08);
			border-radius: 8px;
			padding: 20px;
		}

		.presenter-cols.presenter-cols-step {
			counter-reset: presenter-step-counter;
			position: relative;
		}

		.presenter-cols.presenter-cols-step .presenter-col {
			counter-increment: presenter-step-counter;
			position: relative;
			padding-top: 36px;
		}

		.presenter-cols.presenter-cols-step .presenter-col::before {
			content: "STEP " counter(presenter-step-counter, decimal-leading-zero);
			position: absolute;
			top: 10px;
			left: 18px;
			font-size: 11px;
			font-weight: 800;
			letter-spacing: 0.08em;
			color: var(--presenter-accent-color);
			background: rgba(0, 0, 0, 0.06);
			padding: 2px 8px;
			border-radius: 4px;
		}

		/* Lightbox & Overview */
		.presenter-slide-body img, .presenter-slide-body .mermaid {
			cursor: zoom-in;
			transition: transform 0.15s ease;
		}
		.presenter-slide-body img:hover, .presenter-slide-body .mermaid:hover {
			transform: scale(1.015);
		}

		.presenter-lightbox-overlay {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(8, 12, 20, 0.92);
			backdrop-filter: blur(12px);
			z-index: 2000;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: zoom-out;
		}

		.presenter-lightbox-content {
			max-width: 90vw;
			max-height: 90vh;
			object-fit: contain;
			box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
			border-radius: 8px;
			cursor: default;
			background: #ffffff;
			padding: 12px;
			box-sizing: border-box;
		}

		.presenter-lightbox-close {
			position: absolute;
			top: 24px;
			right: 24px;
			color: #ffffff;
			font-size: 24px;
			cursor: pointer;
			opacity: 0.75;
			transition: opacity 0.15s;
			width: 44px;
			height: 44px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.12);
			border: none;
		}

		.presenter-overview-overlay {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(9, 13, 22, 0.96);
			backdrop-filter: blur(16px);
			z-index: 1500;
			display: flex;
			flex-direction: column;
			padding: 36px 48px;
			box-sizing: border-box;
			overflow-y: auto;
		}

		.presenter-overview-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 28px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.12);
			padding-bottom: 16px;
		}

		.presenter-overview-title {
			color: #ffffff;
			font-size: 20px;
			font-weight: 700;
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.presenter-overview-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
			gap: 20px;
			width: 100%;
		}

		.presenter-overview-thumb {
			background: #1e293b;
			border: 2px solid transparent;
			border-radius: 8px;
			padding: 16px;
			cursor: pointer;
			transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
			display: flex;
			flex-direction: column;
			min-height: 140px;
			position: relative;
			box-sizing: border-box;
		}

		.presenter-overview-thumb:hover {
			transform: translateY(-3px);
			border-color: var(--presenter-accent-color);
			box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
		}

		.presenter-overview-thumb.is-active {
			border-color: var(--presenter-accent-color);
			box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
		}

		.presenter-overview-thumb-badge {
			font-size: 11px;
			font-weight: 700;
			color: #94a3b8;
			margin-bottom: 8px;
		}

		.presenter-overview-thumb-title {
			color: #f1f5f9;
			font-size: 14px;
			font-weight: 600;
			line-height: 1.4;
			flex: 1;
		}

		.presenter-overview-thumb.is-section {
			background: rgba(56, 189, 248, 0.1);
			border: 1px dashed rgba(56, 189, 248, 0.4);
		}

		.presenter-overview-thumb.is-section .presenter-overview-thumb-title {
			color: var(--presenter-accent-color);
			text-align: center;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.presenter-slide-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-top: 24px;
			min-height: 28px;
			font-size: 13px;
			opacity: 0.6;
			flex-shrink: 0;
		}

		/* Bottom Control Floating Bar */
		.floating-controls {
			position: absolute;
			bottom: 24px;
			left: 50%;
			transform: translateX(-50%);
			background: rgba(15, 23, 42, 0.85);
			backdrop-filter: blur(8px);
			border: 1px solid rgba(255, 255, 255, 0.15);
			border-radius: 30px;
			padding: 6px 16px;
			display: flex;
			align-items: center;
			gap: 12px;
			z-index: 90;
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
		}

		.nav-btn {
			background: transparent;
			border: none;
			color: #cbd5e1;
			width: 32px;
			height: 32px;
			border-radius: 50%;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 14px;
		}

		.nav-btn:hover {
			background: rgba(255, 255, 255, 0.1);
			color: #ffffff;
		}

		.counter-label {
			font-size: 13px;
			font-weight: 600;
			color: #cbd5e1;
			min-width: 60px;
			text-align: center;
		}

		/* Speaker Notes Drawer in Web View */
		.notes-drawer {
			height: 220px;
			background: rgba(15, 23, 42, 0.96);
			border-top: 1px solid rgba(255, 255, 255, 0.12);
			display: flex;
			flex-direction: column;
			z-index: 95;
			flex-shrink: 0;
			transition: all 0.2s ease;
		}

		.notes-drawer.hidden {
			display: none;
		}

		.notes-header {
			padding: 8px 24px;
			background: rgba(0, 0, 0, 0.3);
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
			font-size: 12px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: #94a3b8;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.notes-body {
			flex: 1;
			overflow-y: auto;
			padding: 16px 28px;
			font-size: 14px;
			line-height: 1.6;
			color: #e2e8f0;
		}

		.notes-empty {
			color: #64748b;
			font-style: italic;
		}

		/* Handout (Document Reading) Mode Container */
		#handout-mode {
			flex: 1;
			overflow-y: auto;
			background: #f1f5f9;
			color: #1e293b;
			padding: 40px 20px;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		#handout-mode.hidden {
			display: none;
		}

		.handout-wrapper {
			width: 100%;
			max-width: 900px;
			display: flex;
			flex-direction: column;
			gap: 36px;
		}

		.handout-header-card {
			background: #ffffff;
			border-radius: 12px;
			padding: 32px 40px;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
			border: 1px solid #e2e8f0;
			text-align: center;
		}

		.handout-header-card h1 {
			font-size: 32px;
			color: #0f172a;
			margin-bottom: 8px;
		}

		.handout-meta {
			font-size: 14px;
			color: #64748b;
		}

		.handout-item {
			background: #ffffff;
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
			border: 1px solid #e2e8f0;
			display: flex;
			flex-direction: column;
		}

		.handout-slide-preview {
			padding: 32px 44px;
			background-color: var(--presenter-base-color);
			color: var(--presenter-main-color);
			border-bottom: 1px solid #e2e8f0;
		}

		.handout-slide-preview .presenter-slide-body {
			font-size: 17px;
		}

		.handout-slide-preview h2 {
			font-size: 26px;
			margin-bottom: 16px;
			border-bottom: 2px solid var(--presenter-accent-color);
			padding-bottom: 6px;
		}

		.handout-notes-box {
			padding: 24px 36px;
			background: #f8fafc;
		}

		.handout-notes-badge {
			display: inline-block;
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: #2563eb;
			background: #eff6ff;
			border: 1px solid #bfdbfe;
			padding: 3px 8px;
			border-radius: 4px;
			margin-bottom: 10px;
		}

		.handout-notes-content {
			font-size: 14px;
			line-height: 1.7;
			color: #334155;
		}

		/* Print Styling */
		@media print {
			body {
				background: #ffffff !important;
				color: #000000 !important;
				overflow: visible !important;
				height: auto !important;
			}

			.navbar, .progress-bar, .floating-controls, .notes-drawer {
				display: none !important;
			}

			#presentation-mode {
				display: none !important;
			}

			#handout-mode {
				display: block !important;
				background: #ffffff !important;
				padding: 0 !important;
				overflow: visible !important;
			}

			.handout-item {
				box-shadow: none !important;
				border: 1px solid #cbd5e1 !important;
				page-break-after: always !important;
				break-after: page !important;
				margin-bottom: 20px !important;
			}
		}
	</style>
</head>
<body>
	<!-- Top Navigation Bar -->
	<header class="navbar">
		<div class="nav-left">
			<span class="nav-badge">Presentation</span>
			<span>${escapeHtml(presentation.title)}</span>
		</div>
		<div class="nav-right">
			<div class="view-switch">
				<button id="btn-mode-presentation" class="view-switch-btn active" title="Switch to slide presentation mode">
					🖥 スライド表示
				</button>
				<button id="btn-mode-handout" class="view-switch-btn" title="Switch to reading handout mode">
					📄 配布資料（詳細解説）
				</button>
			</div>
			<button id="btn-overview" class="btn-tool" title="Slide overview grid (G)">
				📑 一覧 / 目次
			</button>
			<button id="btn-toggle-notes" class="btn-tool" title="Toggle speaker notes drawer (N)">
				📝 ノート
			</button>
			<button id="btn-print" class="btn-tool" title="Print document or export as PDF">
				🖨 印刷 / PDF
			</button>
		</div>
	</header>

	<div id="progress-bar" class="progress-bar"></div>

	<!-- Mode 1: Slide Presentation Mode -->
	<main id="presentation-mode">
		<div class="stage-container" id="stage-container">
			${renderedSlides
				.map((slide, idx) => {
					return `
			<div class="slide-card presenter-slide-${slide.type}${idx === 0 ? ' active' : ''}" id="slide-${idx}">
				<div class="presenter-slide-header">
					<div class="presenter-header-title">${escapeHtml(headerText)}</div>
					${inlineLogoHtml}
				</div>
				<div class="presenter-slide-body">
					${slide.bodyHtml}
				</div>
				<div class="presenter-slide-footer">
					<div class="presenter-footer-text">${escapeHtml(footerText)}</div>
					<div class="presenter-footer-counter">${idx + 1} / ${totalSlides}</div>
				</div>
			</div>`;
				})
				.join('\n')}
		</div>

		<!-- Floating Navigation Bar -->
		<div class="floating-controls">
			<button id="btn-prev" class="nav-btn" title="Previous slide (Left Arrow)">◀</button>
			<span id="slide-counter" class="counter-label">1 / ${totalSlides}</span>
			<button id="btn-next" class="nav-btn" title="Next slide (Right Arrow)">▶</button>
			<button id="btn-fullscreen" class="nav-btn" title="Fullscreen (F)">⛶</button>
		</div>

		<!-- Bottom Speaker Notes Drawer -->
		<div id="notes-drawer" class="notes-drawer hidden">
			<div class="notes-header">
				<span>Speaker notes & details</span>
				<span style="font-size: 11px; opacity: 0.7;">Press [N] to toggle</span>
			</div>
			<div id="notes-content" class="notes-body">
				${renderedSlides[0]?.notesHtml || '<span class="notes-empty">No notes for this slide.</span>'}
			</div>
		</div>
	</main>

	<!-- Mode 2: Handout (Reading Document) Mode -->
	<main id="handout-mode" class="hidden">
		<div class="handout-wrapper">
			<div class="handout-header-card">
				<h1>${escapeHtml(presentation.title)}</h1>
				<div class="handout-meta">
					Total: ${totalSlides} Slides &bull; ${escapeHtml(headerText ? headerText + ' &bull; ' : '')} Generated with Obsidian Presenter
				</div>
			</div>

			${renderedSlides
				.map((slide, idx) => {
					return `
			<article class="handout-item">
				<div class="handout-slide-preview">
					<div class="presenter-slide-body">
						${slide.bodyHtml}
					</div>
					<div class="presenter-slide-footer">
						<div class="presenter-footer-text">${escapeHtml(footerText)}</div>
						<div class="presenter-footer-counter">Slide ${idx + 1} of ${totalSlides}</div>
					</div>
				</div>
				<div class="handout-notes-box">
					<div class="handout-notes-badge">💡 解説・背景メモ</div>
					<div class="handout-notes-content">
						${slide.notesHtml || '<span class="notes-empty">特記事項はありません。</span>'}
					</div>
				</div>
			</article>`;
				})
				.join('\n')}
		</div>
	</main>

	<!-- Overview Grid Overlay -->
	<div id="overview-overlay" class="presenter-overview-overlay" style="display: none;">
		<div class="presenter-overview-header">
			<div class="presenter-overview-title">
				<span>📑 目次・スライド一覧</span>
				<span class="presenter-overview-thumb-badge" style="font-size: 13px;">${totalSlides} slides</span>
			</div>
			<button id="btn-close-overview" class="presenter-lightbox-close">✕</button>
		</div>
		<div class="presenter-overview-grid">
			${renderedSlides
				.map((slide, idx) => {
					const isSec = slide.type === 'section';
					const typeLabel =
						slide.type === 'cover'
							? 'TITLE'
							: isSec
								? 'SECTION'
								: slide.type === 'quote'
									? 'QUOTE'
									: `SLIDE ${idx + 1}`;
					return `
			<div class="presenter-overview-thumb${idx === 0 ? ' is-active' : ''}${isSec ? ' is-section' : ''}" data-index="${idx}">
				<div class="presenter-overview-thumb-badge">${typeLabel}</div>
				<div class="presenter-overview-thumb-title">${escapeHtml(slide.title || `Slide ${idx + 1}`)}</div>
			</div>`;
				})
				.join('\n')}
		</div>
	</div>

	<!-- Lightbox Overlay -->
	<div id="lightbox-overlay" class="presenter-lightbox-overlay" style="display: none;">
		<button id="btn-close-lightbox" class="presenter-lightbox-close">✕</button>
		<div id="lightbox-container"></div>
	</div>

	<script>
		(function() {
			const total = ${totalSlides};
			let currentIndex = 0;
			let isNotesOpen = false;

			const slidesData = ${JSON.stringify(
				renderedSlides.map((s) => ({
					index: s.index,
					notesHtml: s.notesHtml,
				}))
			)};

			// DOM Elements
			const presentationMode = document.getElementById('presentation-mode');
			const handoutMode = document.getElementById('handout-mode');
			const btnModePresentation = document.getElementById('btn-mode-presentation');
			const btnModeHandout = document.getElementById('btn-mode-handout');
			const btnToggleNotes = document.getElementById('btn-toggle-notes');
			const btnOverview = document.getElementById('btn-overview');
			const btnPrint = document.getElementById('btn-print');
			const btnPrev = document.getElementById('btn-prev');
			const btnNext = document.getElementById('btn-next');
			const btnFullscreen = document.getElementById('btn-fullscreen');
			const counterEl = document.getElementById('slide-counter');
			const progressBar = document.getElementById('progress-bar');
			const notesDrawer = document.getElementById('notes-drawer');
			const notesContent = document.getElementById('notes-content');
			const stageContainer = document.getElementById('stage-container');

			const overviewOverlay = document.getElementById('overview-overlay');
			const btnCloseOverview = document.getElementById('btn-close-overview');
			const lightboxOverlay = document.getElementById('lightbox-overlay');
			const btnCloseLightbox = document.getElementById('btn-close-lightbox');
			const lightboxContainer = document.getElementById('lightbox-container');

			function getHashIndex() {
				const m = window.location.hash.match(/#slide-(\\d+)/);
				return m ? Math.max(0, Math.min(total - 1, parseInt(m[1], 10) - 1)) : 0;
			}

			function showSlide(index, updateHash = true) {
				if (index < 0 || index >= total) return;
				currentIndex = index;

				// Update active slide
				for (let i = 0; i < total; i++) {
					const card = document.getElementById('slide-' + i);
					if (card) {
						if (i === index) {
							card.classList.add('active');
						} else {
							card.classList.remove('active');
						}
					}
				}

				// Update URL hash
				if (updateHash) {
					history.replaceState(null, '', '#slide-' + (index + 1));
				}

				// Update counter & progress
				counterEl.textContent = (index + 1) + ' / ' + total;
				const progress = total > 1 ? ((index + 1) / total) * 100 : 100;
				progressBar.style.width = progress + '%';

				// Update notes content
				const noteData = slidesData[index];
				if (noteData && noteData.notesHtml && noteData.notesHtml.trim()) {
					notesContent.innerHTML = noteData.notesHtml;
					btnToggleNotes.style.color = '#38bdf8';
				} else {
					notesContent.innerHTML = '<span class="notes-empty">No notes for this slide.</span>';
					btnToggleNotes.style.color = '';
				}

				// Update overview thumb active state
				document.querySelectorAll('.presenter-overview-thumb').forEach((el) => {
					const idx = parseInt(el.getAttribute('data-index'), 10);
					if (idx === index) {
						el.classList.add('is-active');
					} else {
						el.classList.remove('is-active');
					}
				});

				applyScale();
			}

			function nextSlide() {
				if (currentIndex < total - 1) showSlide(currentIndex + 1);
			}

			function prevSlide() {
				if (currentIndex > 0) showSlide(currentIndex - 1);
			}

			function toggleNotes() {
				isNotesOpen = !isNotesOpen;
				if (isNotesOpen) {
					notesDrawer.classList.remove('hidden');
					btnToggleNotes.classList.add('active');
				} else {
					notesDrawer.classList.add('hidden');
					btnToggleNotes.classList.remove('active');
				}
				setTimeout(applyScale, 50);
			}

			function toggleOverview() {
				if (overviewOverlay.style.display === 'none') {
					overviewOverlay.style.display = 'flex';
				} else {
					overviewOverlay.style.display = 'none';
				}
			}

			function closeOverview() {
				overviewOverlay.style.display = 'none';
			}

			function openLightbox(element) {
				lightboxContainer.innerHTML = '';
				if (element.tagName.toLowerCase() === 'img') {
					const img = document.createElement('img');
					img.src = element.src;
					img.alt = element.alt || 'Zoomed diagram';
					img.className = 'presenter-lightbox-content';
					lightboxContainer.appendChild(img);
				} else {
					const wrapper = document.createElement('div');
					wrapper.className = 'presenter-lightbox-content';
					wrapper.innerHTML = element.outerHTML;
					const svg = wrapper.querySelector('svg');
					if (svg) {
						svg.style.maxWidth = '85vw';
						svg.style.maxHeight = '85vh';
						svg.style.width = 'auto';
						svg.style.height = 'auto';
					}
					lightboxContainer.appendChild(wrapper);
				}
				lightboxOverlay.style.display = 'flex';
			}

			function closeLightbox() {
				lightboxOverlay.style.display = 'none';
				lightboxContainer.innerHTML = '';
			}

			function setViewMode(mode) {
				if (mode === 'presentation') {
					presentationMode.style.display = 'flex';
					handoutMode.classList.add('hidden');
					btnModePresentation.classList.add('active');
					btnModeHandout.classList.remove('active');
					btnToggleNotes.style.display = '';
					if (btnOverview) btnOverview.style.display = '';
					applyScale();
				} else {
					presentationMode.style.display = 'none';
					handoutMode.classList.remove('hidden');
					btnModePresentation.classList.remove('active');
					btnModeHandout.classList.add('active');
					btnToggleNotes.style.display = 'none';
					if (btnOverview) btnOverview.style.display = 'none';
				}
			}

			function toggleFullscreen() {
				if (!document.fullscreenElement) {
					document.documentElement.requestFullscreen().catch(() => {});
				} else {
					document.exitFullscreen().catch(() => {});
				}
			}

			function applyScale() {
				const activeCard = document.querySelector('.slide-card.active');
				if (!activeCard || !stageContainer) return;

				const stageW = stageContainer.clientWidth - 40;
				const stageH = stageContainer.clientHeight - 40;
				const baseW = ${baseWidth};
				const baseH = ${baseHeight};

				const scaleX = stageW / baseW;
				const scaleY = stageH / baseH;
				const scale = Math.min(scaleX, scaleY, 1.5);

				activeCard.style.transform = 'scale(' + Math.max(scale, 0.2) + ')';
			}

			// Event Listeners
			btnPrev.addEventListener('click', prevSlide);
			btnNext.addEventListener('click', nextSlide);
			btnToggleNotes.addEventListener('click', toggleNotes);
			if (btnOverview) btnOverview.addEventListener('click', toggleOverview);
			if (btnCloseOverview) btnCloseOverview.addEventListener('click', closeOverview);
			if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', closeLightbox);

			overviewOverlay.addEventListener('click', (e) => {
				if (e.target === overviewOverlay) closeOverview();
			});

			lightboxOverlay.addEventListener('click', (e) => {
				if (e.target === lightboxOverlay) closeLightbox();
			});

			document.querySelectorAll('.presenter-overview-thumb').forEach((thumb) => {
				thumb.addEventListener('click', () => {
					const idx = parseInt(thumb.getAttribute('data-index'), 10);
					closeOverview();
					showSlide(idx);
				});
			});

			// Image & Mermaid diagram click-to-zoom
			document.querySelectorAll('.presenter-slide-body').forEach((body) => {
				body.addEventListener('click', (e) => {
					const target = e.target;
					if (!target) return;
					if (target.tagName.toLowerCase() === 'img') {
						e.stopPropagation();
						openLightbox(target);
						return;
					}
					const mermaid = target.closest('.mermaid');
					if (mermaid) {
						const svg = mermaid.querySelector('svg');
						if (svg) {
							e.stopPropagation();
							openLightbox(svg);
						}
					}
				});
			});

			btnModePresentation.addEventListener('click', () => setViewMode('presentation'));
			btnModeHandout.addEventListener('click', () => setViewMode('handout'));
			btnFullscreen.addEventListener('click', toggleFullscreen);
			btnPrint.addEventListener('click', () => window.print());

			window.addEventListener('resize', applyScale);
			window.addEventListener('hashchange', () => {
				showSlide(getHashIndex(), false);
			});

			window.addEventListener('keydown', (e) => {
				if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

				if (e.key === 'Escape') {
					if (lightboxOverlay.style.display !== 'none') {
						closeLightbox();
						return;
					}
					if (overviewOverlay.style.display !== 'none') {
						closeOverview();
						return;
					}
				}

				switch(e.key) {
					case 'ArrowRight':
					case 'ArrowDown':
					case ' ':
					case 'PageDown':
					case 'l':
					case 'j':
						e.preventDefault();
						nextSlide();
						break;
					case 'ArrowLeft':
					case 'ArrowUp':
					case 'PageUp':
					case 'h':
					case 'k':
						e.preventDefault();
						prevSlide();
						break;
					case 'Home':
						e.preventDefault();
						showSlide(0);
						break;
					case 'End':
						e.preventDefault();
						showSlide(total - 1);
						break;
					case 'f':
					case 'F':
						e.preventDefault();
						toggleFullscreen();
						break;
					case 'g':
					case 'G':
					case 'o':
					case 'O':
						e.preventDefault();
						toggleOverview();
						break;
					case 'n':
					case 'N':
						e.preventDefault();
						toggleNotes();
						break;
					case 'p':
					case 'P':
						if (!e.metaKey && !e.ctrlKey) {
							e.preventDefault();
							window.print();
						}
						break;
				}
			});

			// Initial Setup
			showSlide(getHashIndex(), false);
		})();
	</script>
</body>
</html>`;

	return html;
}
