import {
	type App,
	Component,
	MarkdownRenderer,
	type TFile,
} from 'obsidian';
import type {
	PresentationData,
	PresenterSettings,
} from '../types';
import {
	escapeHtml,
	inlineLocalImages,
	resolveLogoDataUrl,
} from './imageInliner';
import { getExportStyles } from './exportStyles';
import { getExportScript } from './exportScript';

export interface RenderedExportSlide {
	index: number;
	type: string;
	title: string;
	bodyHtml: string;
	notesHtml: string;
}

/**
 * Builds HTML markup for full-screen presentation slide cards.
 */
export function buildSlideCardsHtml(
	renderedSlides: RenderedExportSlide[],
	headerText: string,
	footerText: string,
	inlineLogoHtml: string,
	totalSlides: number
): string {
	return renderedSlides
		.map((slide, idx) => {
			const hasHeader = Boolean(headerText || inlineLogoHtml);
			return `
			<div class="slide-card presenter-slide-${slide.type}${idx === 0 ? ' active' : ''}" id="slide-${idx}">
				${hasHeader ? `
				<div class="presenter-slide-header">
					<div class="presenter-header-title">${escapeHtml(headerText)}</div>
					${inlineLogoHtml}
				</div>` : ''}
				<div class="presenter-slide-body">
					${slide.bodyHtml}
				</div>
				<div class="presenter-slide-footer">
					<div class="presenter-footer-text">${escapeHtml(footerText)}</div>
					<div class="presenter-footer-counter">${idx + 1} / ${totalSlides}</div>
				</div>
			</div>`;
		})
		.join('\n');
}

/**
 * Builds HTML markup for document reading handout cards.
 */
export function buildHandoutItemsHtml(
	renderedSlides: RenderedExportSlide[],
	footerText: string,
	totalSlides: number
): string {
	return renderedSlides
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
		.join('\n');
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

	// Image cache to avoid re-reading and re-encoding repeated images
	const imageCache = new Map<string, string>();

	// Resolve logo as Base64 data URL so it renders in standalone browsers outside Obsidian
	let inlineLogoHtml = '';
	const logoInput = config.logo !== undefined ? config.logo : settings.defaultLogo;
	if (logoInput && logoInput.trim()) {
		const logoDataUrl = await resolveLogoDataUrl(app, logoInput, file.path, imageCache);
		if (logoDataUrl) {
			inlineLogoHtml = `<div class="presenter-header-logo"><img class="presenter-logo-image" src="${escapeHtml(logoDataUrl)}" alt="Logo" /></div>`;
		}
	}

	// Render each slide and note into HTML strings
	const renderedSlides: RenderedExportSlide[] = [];
	const doc = typeof activeDocument !== 'undefined' ? activeDocument : document;
	const tempContainer = doc.body.createDiv({ cls: 'presenter-hidden-export' });

	try {
		for (const slide of presentation.slides) {
			// 1. Render slide markdown
			const slideDiv = tempContainer.createDiv();
			await MarkdownRenderer.render(app, slide.markdown, slideDiv, file.path, component);
			await inlineLocalImages(app, slideDiv, file.path, imageCache);
			const bodyHtml = slideDiv.innerHTML;

			// 2. Render notes markdown
			let notesHtml = '';
			if (slide.notes && slide.notes.trim()) {
				const notesDiv = tempContainer.createDiv();
				await MarkdownRenderer.render(app, slide.notes, notesDiv, file.path, component);
				await inlineLocalImages(app, notesDiv, file.path, imageCache);
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

	const styles = getExportStyles({
		baseColor,
		mainColor,
		accentColor,
		baseWidth,
		baseHeight,
	});

	const script = getExportScript({
		totalSlides,
		baseWidth,
		baseHeight,
		slidesData: renderedSlides.map((s) => ({
			index: s.index,
			notesHtml: s.notesHtml,
		})),
	});

	const slideCardsHtml = buildSlideCardsHtml(
		renderedSlides,
		headerText,
		footerText,
		inlineLogoHtml,
		totalSlides
	);

	const handoutItemsHtml = buildHandoutItemsHtml(
		renderedSlides,
		footerText,
		totalSlides
	);

	return `<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(presentation.title)}</title>
	<style>${styles}
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
${slideCardsHtml}
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
${handoutItemsHtml}
		</div>
	</main>

	<script>${script}
	</script>
</body>
</html>`;
}
