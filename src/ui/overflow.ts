import type { App, Component } from 'obsidian';
import type {
	PresentationData,
	PresenterSettings,
	SlideFrontmatter,
	SlideOverflowInfo,
} from '../types';
import { matchAtxHeading } from '../parser/blocks';
import { FenceTracker } from '../parser/fence';
import { renderSlide } from './slideRenderer';

export const MIN_BODY_SCALE = 0.70;
export const OVERFLOW_TOLERANCE_PX = 4;

export interface SlideOverflowMeasurement {
	isOverflowing: boolean;
	overflowRatio: number;
	optimalScale: number;
	fittedScale: number;
	canSplit: boolean;
	splitHeadingTitle?: string;
	splitLineOffset?: number;
}

export type SlideOverflowCache = Map<string, SlideOverflowMeasurement>;

/**
 * Determines whether auto-fitting is enabled based on note frontmatter or plugin settings.
 * Priority: frontmatter `fit` > plugin setting `autoFitOverflow`.
 */
export function isAutoFitEnabled(
	frontmatter?: SlideFrontmatter,
	settings?: PresenterSettings
): boolean {
	if (frontmatter?.fit !== undefined) {
		if (frontmatter.fit === 'auto' || frontmatter.fit === true) return true;
		if (frontmatter.fit === 'none' || frontmatter.fit === false) return false;
	}
	return settings?.autoFitOverflow ?? false;
}

/**
 * Calculates whether the slide body element has content overflowing its visible container.
 */
export function calculateOverflow(bodyEl: HTMLElement): {
	isOverflowing: boolean;
	overflowRatio: number;
	optimalScale: number;
} {
	const scrollH = bodyEl.scrollHeight;
	const clientH = bodyEl.clientHeight;

	if (clientH <= 0) {
		return { isOverflowing: false, overflowRatio: 1.0, optimalScale: 1.0 };
	}

	if (scrollH > clientH + OVERFLOW_TOLERANCE_PX) {
		const overflowRatio = scrollH / clientH;
		// e.g. 1 / 1.15 = 0.869... clamped to [MIN_BODY_SCALE, 1.0]
		const rawScale = 1.0 / overflowRatio;
		const optimalScale = Math.max(MIN_BODY_SCALE, Math.min(1.0, Math.floor(rawScale * 100) / 100));
		return {
			isOverflowing: true,
			overflowRatio: Math.round(overflowRatio * 100) / 100,
			optimalScale,
		};
	}

	return { isOverflowing: false, overflowRatio: 1.0, optimalScale: 1.0 };
}

/**
 * Sets the `--presenter-body-scale` CSS variable on the slide body element.
 */
export function applyContentScale(bodyEl: HTMLElement, scale: number): void {
	if (scale < 0.999) {
		bodyEl.style.setProperty('--presenter-body-scale', String(scale));
		bodyEl.addClass('is-autofitted');
	} else {
		bodyEl.style.removeProperty('--presenter-body-scale');
		bodyEl.removeClass('is-autofitted');
	}
}

/**
 * Inspects a slide's markdown content to find a candidate H3 heading to split the slide at.
 * Returns the second H3 heading if multiple H3s exist, allowing the user to cleanly split into 2 slides.
 */
export function findSplitHeadingInSlide(markdown: string): {
	canSplit: boolean;
	splitHeadingTitle?: string;
	splitLineOffset?: number;
} {
	const lines = markdown.split(/\r?\n/);
	const fenceTracker = new FenceTracker();
	let h3Count = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (fenceTracker.feed(line)) continue;

		const heading = matchAtxHeading(line);
		if (heading && heading.level === 3) {
			h3Count++;
			if (h3Count === 2) {
				return {
					canSplit: true,
					splitHeadingTitle: heading.text,
					splitLineOffset: i,
				};
			}
		}
	}

	return { canSplit: false };
}

/**
 * Measures an individual slide's body element for overflow and returns raw measurement metrics.
 */
export function measureSlideOverflow(
	markdown: string,
	bodyEl: HTMLElement,
	autoFit: boolean
): SlideOverflowMeasurement {
	// First measure without scale applied (or reset scale to measure intrinsic overflow)
	applyContentScale(bodyEl, 1.0);
	const { isOverflowing, overflowRatio, optimalScale } = calculateOverflow(bodyEl);
	const { canSplit, splitHeadingTitle, splitLineOffset } = findSplitHeadingInSlide(markdown);

	let effectiveOverflowing = isOverflowing;
	let appliedScale = 1.0;

	if (isOverflowing && autoFit) {
		applyContentScale(bodyEl, optimalScale);
		// Re-check after applying optimal scale: if optimalScale reached minimum (0.70), it might still overflow
		const recheck = calculateOverflow(bodyEl);
		effectiveOverflowing = recheck.isOverflowing;
		appliedScale = optimalScale;
	}

	return {
		isOverflowing: effectiveOverflowing,
		overflowRatio,
		optimalScale,
		fittedScale: appliedScale,
		canSplit,
		splitHeadingTitle,
		splitLineOffset,
	};
}

/**
 * Creates a SlideOverflowInfo result by combining a slide's positional metadata with measured metrics.
 */
export function createSlideOverflowInfo(
	slide: { index: number; title: string; startLine?: number },
	measurement: SlideOverflowMeasurement
): SlideOverflowInfo {
	const absoluteSplitLine =
		measurement.canSplit && measurement.splitLineOffset !== undefined
			? (slide.startLine ?? 0) + measurement.splitLineOffset
			: undefined;

	return {
		slideIndex: slide.index,
		title: slide.title,
		isOverflowing: measurement.isOverflowing,
		overflowRatio: measurement.overflowRatio,
		fittedScale: measurement.fittedScale,
		canSplitByHeading: measurement.canSplit,
		splitHeadingTitle: measurement.splitHeadingTitle,
		splitLineOffset: measurement.splitLineOffset,
		absoluteSplitLine,
	};
}

/**
 * Checks a slide for overflow after rendering and creates a SlideOverflowInfo summary.
 */
export function assessSlideOverflow(
	slide: { index: number; title: string; markdown: string; startLine?: number },
	bodyEl: HTMLElement,
	autoFit: boolean
): SlideOverflowInfo {
	const measurement = measureSlideOverflow(slide.markdown, bodyEl, autoFit);
	return createSlideOverflowInfo(slide, measurement);
}

/**
 * Computes a unique cache key for a slide based on its content, per-slide frontmatter, and configuration.
 */
export function getSlideOverflowCacheKey(
	slide: { markdown: string; frontmatter?: SlideFrontmatter },
	configKey: string
): string {
	const fmKey = slide.frontmatter ? JSON.stringify(slide.frontmatter) : '';
	return `${configKey}::${fmKey}::${slide.markdown}`;
}

/**
 * Computes a configuration key reflecting presentation frontmatter and settings that affect layout and sizing.
 */
export function getPresentationConfigKey(
	frontmatter?: SlideFrontmatter,
	settings?: PresenterSettings,
	sourcePath?: string
): string {
	const fit = isAutoFitEnabled(frontmatter, settings);
	const theme = frontmatter?.theme ?? 'default';
	const aspect = frontmatter?.aspectRatio ?? settings?.aspectRatio ?? '16:9';
	const baseColor = frontmatter?.baseColor ?? settings?.defaultBaseColor ?? '';
	const mainColor = frontmatter?.mainColor ?? settings?.defaultMainColor ?? '';
	const accentColor = frontmatter?.accentColor ?? settings?.defaultAccentColor ?? '';
	return `${theme}|${aspect}|${baseColor}|${mainColor}|${accentColor}|${fit ? 'fit' : 'nofit'}|${sourcePath ?? ''}`;
}

const MAX_OVERFLOW_CACHE_ENTRIES = 300;

/**
 * Renders and measures slides of a presentation in an off-screen measurement container.
 * Supports differential caching to skip re-rendering slides whose content and configuration haven't changed.
 * Returns an array of overflow assessment results for each slide.
 */
export async function checkPresentationOverflow(
	app: App,
	presentation: PresentationData,
	settings: PresenterSettings,
	sourcePath: string,
	component: Component,
	cache?: SlideOverflowCache
): Promise<SlideOverflowInfo[]> {
	if (!presentation || presentation.slides.length === 0) {
		return [];
	}

	const configKey = getPresentationConfigKey(
		presentation.frontmatter,
		settings,
		sourcePath
	);
	const autoFit = isAutoFitEnabled(presentation.frontmatter, settings);
	const results: SlideOverflowInfo[] = [];

	let measureContainer: HTMLElement | null = null;

	try {
		for (const slide of presentation.slides) {
			const cacheKey = cache ? getSlideOverflowCacheKey(slide, configKey) : null;
			let measurement = cacheKey && cache ? cache.get(cacheKey) : undefined;

			if (!measurement) {
				if (!measureContainer) {
					const doc = typeof activeDocument !== 'undefined' ? activeDocument : document;
					measureContainer = doc.body.createDiv({
						cls: 'presenter-measure-container',
					});
				}
				measureContainer.empty();
				const cardEl = await renderSlide(measureContainer, {
					app,
					slide,
					totalSlides: presentation.slides.length,
					config: presentation.frontmatter,
					settings,
					sourcePath,
					component,
				});

				const bodyEl = cardEl.querySelector<HTMLElement>('.presenter-slide-body');
				if (bodyEl) {
					measurement = measureSlideOverflow(slide.markdown, bodyEl, autoFit);
					if (cacheKey && cache) {
						if (cache.size >= MAX_OVERFLOW_CACHE_ENTRIES) {
							const oldestKey = cache.keys().next().value;
							if (oldestKey !== undefined) {
								cache.delete(oldestKey);
							}
						}
						cache.set(cacheKey, measurement);
					}
				}
			}

			if (measurement) {
				results.push(createSlideOverflowInfo(slide, measurement));
			}
		}
	} finally {
		if (measureContainer) {
			measureContainer.remove();
		}
	}

	return results;
}
