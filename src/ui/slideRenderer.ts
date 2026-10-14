import {
	type App,
	type Component,
	MarkdownRenderer,
	TFile,
} from 'obsidian';
import type {
	PresenterSettings,
	SlideData,
	SlideFrontmatter,
} from '../types';
import {
	applyContentScale,
	calculateOverflow,
	isAutoFitEnabled,
} from './overflow';

export interface RenderSlideOptions {
	app: App;
	slide: SlideData;
	totalSlides: number;
	config: SlideFrontmatter;
	settings: PresenterSettings;
	sourcePath: string;
	component: Component;
}

/**
 * Resolves a logo string to a usable resource path or URL.
 */
export function resolveLogoUrl(app: App, logoStr: string, sourcePath: string): string | null {
	if (!logoStr || !logoStr.trim()) return null;
	const trimmed = logoStr.trim();

	// Check if already an absolute URL or data URI
	if (
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('data:')
	) {
		return trimmed;
	}

	// Try resolving via Obsidian vault file
	// Case 1: Exact vault path
	const file = app.vault.getAbstractFileByPath(trimmed);
	if (file instanceof TFile) {
		return app.vault.adapter.getResourcePath(file.path);
	}

	// Case 2: Link path destination (e.g. "logo.png" or "[[logo.png]]")
	const cleanLink = trimmed.replace(/^\[\[/, '').replace(/\]\]$/, '');
	const destFile = app.metadataCache.getFirstLinkpathDest(cleanLink, sourcePath);
	if (destFile instanceof TFile) {
		return app.vault.adapter.getResourcePath(destFile.path);
	}

	return null;
}

/**
 * Renders an individual slide into the target container element.
 */
export async function renderSlide(
	targetEl: HTMLElement,
	options: RenderSlideOptions
): Promise<HTMLElement> {
	const { app, slide, totalSlides, config, settings, sourcePath, component } = options;

	// Resolve styling colors
	const baseColor = config.baseColor || settings.defaultBaseColor || '#ffffff';
	const mainColor = config.mainColor || settings.defaultMainColor || '#1e293b';
	const accentColor = config.accentColor || settings.defaultAccentColor || '#2563eb';
	const headerText = config.header !== undefined ? config.header : settings.defaultHeader;
	const footerText = config.footer !== undefined ? config.footer : settings.defaultFooter;
	const logoInput = config.logo !== undefined ? config.logo : settings.defaultLogo;
	const logoUrl = resolveLogoUrl(app, logoInput, sourcePath);

	const aspectRatio = config.aspectRatio || settings.aspectRatio || '16:9';
	const targetRatio = aspectRatio === '4:3' ? 4 / 3 : 16 / 9;
	const baseWidth = 1280;
	const baseHeight = baseWidth / targetRatio;

	const slideCardEl = targetEl.createDiv({
		cls: `presenter-slide-card presenter-slide-${slide.type}`,
	});

	slideCardEl.style.width = `${baseWidth}px`;
	slideCardEl.style.height = `${baseHeight}px`;

	// Apply CSS custom properties dynamically to this slide
	slideCardEl.style.setProperty('--presenter-base-color', baseColor);
	slideCardEl.style.setProperty('--presenter-main-color', mainColor);
	slideCardEl.style.setProperty('--presenter-accent-color', accentColor);

	// 1. Header (Logo & Header Text)
	const headerEl = slideCardEl.createDiv({ cls: 'presenter-slide-header' });
	const headerTitleEl = headerEl.createDiv({ cls: 'presenter-header-title' });
	if (headerText) {
		headerTitleEl.setText(headerText);
	}

	if (logoUrl) {
		const logoContainer = headerEl.createDiv({ cls: 'presenter-header-logo' });
		const logoImg = logoContainer.createEl('img', {
			cls: 'presenter-logo-image',
			attr: { alt: 'Presentation Logo' },
		});
		logoImg.src = logoUrl;
	}

	// 2. Body / Content Area (Rendered via Obsidian MarkdownRenderer)
	const bodyEl = slideCardEl.createDiv({
		cls: 'presenter-slide-body markdown-rendered',
	});

	// Render Markdown using Obsidian's native parser
	await MarkdownRenderer.render(
		app,
		slide.markdown,
		bodyEl,
		sourcePath,
		component
	);

	// Check and apply auto-fit if enabled
	if (isAutoFitEnabled(config, settings)) {
		const { isOverflowing, optimalScale } = calculateOverflow(bodyEl);
		if (isOverflowing && optimalScale < 0.999) {
			applyContentScale(bodyEl, optimalScale);
		}
	}

	// 3. Footer (Footer Text & Slide Counter)
	const footerEl = slideCardEl.createDiv({ cls: 'presenter-slide-footer' });
	const footerTextEl = footerEl.createDiv({ cls: 'presenter-footer-text' });
	if (footerText) {
		footerTextEl.setText(footerText);
	}

	const footerCounterEl = footerEl.createDiv({ cls: 'presenter-footer-counter' });
	// Cover slide often hides counter or shows '1 / N'
	footerCounterEl.setText(`${slide.index + 1} / ${totalSlides}`);

	return slideCardEl;
}

/**
 * Renders slide notes into the target container element using Obsidian's MarkdownRenderer.
 */
export async function renderSlideNotes(
	targetEl: HTMLElement,
	options: {
		app: App;
		markdown: string;
		sourcePath: string;
		component: Component;
	}
): Promise<HTMLElement> {
	const { app, markdown, sourcePath, component } = options;
	const notesEl = targetEl.createDiv({ cls: 'presenter-notes-rendered markdown-rendered' });
	await MarkdownRenderer.render(app, markdown, notesEl, sourcePath, component);
	return notesEl;
}
