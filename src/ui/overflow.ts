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
 * Checks a slide for overflow after rendering and creates a SlideOverflowInfo summary.
 */
export function assessSlideOverflow(
	slide: { index: number; title: string; markdown: string; startLine?: number },
	bodyEl: HTMLElement,
	autoFit: boolean
): SlideOverflowInfo {
	// First measure without scale applied (or reset scale to measure intrinsic overflow)
	applyContentScale(bodyEl, 1.0);
	const { isOverflowing, overflowRatio, optimalScale } = calculateOverflow(bodyEl);
	const { canSplit, splitHeadingTitle, splitLineOffset } = findSplitHeadingInSlide(slide.markdown);

	let effectiveOverflowing = isOverflowing;
	let appliedScale = 1.0;

	if (isOverflowing && autoFit) {
		applyContentScale(bodyEl, optimalScale);
		// Re-check after applying optimal scale: if optimalScale reached minimum (0.70), it might still overflow
		const recheck = calculateOverflow(bodyEl);
		effectiveOverflowing = recheck.isOverflowing;
		appliedScale = optimalScale;
	}

	const absoluteSplitLine =
		canSplit && splitLineOffset !== undefined
			? (slide.startLine ?? 0) + splitLineOffset
			: undefined;

	return {
		slideIndex: slide.index,
		title: slide.title,
		isOverflowing: effectiveOverflowing,
		overflowRatio,
		fittedScale: appliedScale,
		canSplitByHeading: canSplit,
		splitHeadingTitle,
		splitLineOffset,
		absoluteSplitLine,
	};
}

/**
 * Renders and measures all slides of a presentation in an off-screen measurement container.
 * Returns an array of overflow assessment results for each slide.
 */
export async function checkPresentationOverflow(
	app: App,
	presentation: PresentationData,
	settings: PresenterSettings,
	sourcePath: string,
	component: Component
): Promise<SlideOverflowInfo[]> {
	if (!presentation || presentation.slides.length === 0) {
		return [];
	}

	const doc = typeof activeDocument !== 'undefined' ? activeDocument : document;
	const measureContainer = doc.body.createDiv({
		cls: 'presenter-measure-container',
	});

	const autoFit = isAutoFitEnabled(presentation.frontmatter, settings);
	const results: SlideOverflowInfo[] = [];

	try {
		for (const slide of presentation.slides) {
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
				const info = assessSlideOverflow(slide, bodyEl, autoFit);
				results.push(info);
			}
		}
	} finally {
		measureContainer.remove();
	}

	return results;
}
