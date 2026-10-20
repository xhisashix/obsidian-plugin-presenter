import { type App, type TFile, setIcon } from 'obsidian';
import type { SlideOverflowInfo } from '../types';
import { JumpToSlideModal } from './jumpModal';
import { OverflowReportModal } from './overflowReportModal';

export const SLIDE_BASE_WIDTH = 1280;
export const DEFAULT_MAX_SCALE = 1.5;

export interface SlideDimensions {
	width: number;
	height: number;
}

/**
 * Calculates the intrinsic pixel dimensions of a slide card based on the aspect ratio.
 */
export function getSlideDimensions(aspectRatio: '16:9' | '4:3' = '16:9'): SlideDimensions {
	const targetRatio = aspectRatio === '4:3' ? 4 / 3 : 16 / 9;
	return {
		width: SLIDE_BASE_WIDTH,
		height: SLIDE_BASE_WIDTH / targetRatio,
	};
}

export interface StageScaleOptions {
	aspectRatio?: '16:9' | '4:3';
	padding: number;
	minScale: number;
	maxScale?: number;
}

/**
 * Scales the rendered `.presenter-slide-card` inside `stageEl` to fit within `measureEl`.
 */
export function applyStageScale(
	stageEl: HTMLElement,
	measureEl: HTMLElement,
	options: StageScaleOptions
): void {
	const cardEl = stageEl.querySelector<HTMLElement>('.presenter-slide-card');
	if (!cardEl) return;

	const availableWidth = measureEl.clientWidth - options.padding;
	const availableHeight = measureEl.clientHeight - options.padding;

	if (availableWidth <= 0 || availableHeight <= 0) return;

	const { width: baseWidth, height: baseHeight } = getSlideDimensions(
		options.aspectRatio || '16:9'
	);

	const scaleX = availableWidth / baseWidth;
	const scaleY = availableHeight / baseHeight;
	const maxScale = options.maxScale ?? DEFAULT_MAX_SCALE;
	const scale = Math.min(scaleX, scaleY, maxScale);

	cardEl.style.width = `${baseWidth}px`;
	cardEl.style.height = `${baseHeight}px`;
	cardEl.style.transform = `scale(${Math.max(scale, options.minScale)})`;
}

export interface ToolbarNavCallbacks {
	initialCounterText: string;
	prevLabel?: string;
	nextLabel?: string;
	counterLabel?: string;
	onPrev: () => void;
	onNext: () => void;
	onJump: () => void;
	onOverflowClick: () => void;
}

export interface ToolbarNavElements {
	counterButtonEl: HTMLButtonElement;
	overflowBtn: HTMLButtonElement;
}

/**
 * Builds the shared navigation controls (Previous, Slide Counter, Next, Overflow Alert, and Separator)
 * used in both the fullscreen presentation toolbar and the live preview toolbar.
 */
export function createToolbarNavControls(
	toolbarEl: HTMLElement,
	callbacks: ToolbarNavCallbacks
): ToolbarNavElements {
	// Prev Button
	const prevBtn = toolbarEl.createEl('button', {
		cls: 'presenter-toolbar-btn',
		attr: { 'aria-label': callbacks.prevLabel ?? 'Previous slide' },
	});
	setIcon(prevBtn, 'chevron-left');
	prevBtn.onclick = callbacks.onPrev;

	// Slide Counter / Jump
	const counterButtonEl = toolbarEl.createEl('button', {
		cls: 'presenter-toolbar-counter',
		text: callbacks.initialCounterText,
		attr: { 'aria-label': callbacks.counterLabel ?? 'Jump to slide' },
	});
	counterButtonEl.onclick = callbacks.onJump;

	// Next Button
	const nextBtn = toolbarEl.createEl('button', {
		cls: 'presenter-toolbar-btn',
		attr: { 'aria-label': callbacks.nextLabel ?? 'Next slide' },
	});
	setIcon(nextBtn, 'chevron-right');
	nextBtn.onclick = callbacks.onNext;

	// Slide overflow inspection button
	const overflowBtn = toolbarEl.createEl('button', {
		cls: 'presenter-toolbar-overflow-btn is-hidden',
		attr: { 'aria-label': 'Slide overflow inspection' },
	});
	setIcon(overflowBtn, 'alert-triangle');
	overflowBtn.createSpan({ cls: 'presenter-toolbar-overflow-count', text: '0' });
	overflowBtn.onclick = callbacks.onOverflowClick;

	// Separator
	toolbarEl.createDiv({ cls: 'presenter-toolbar-sep' });

	return { counterButtonEl, overflowBtn };
}

/**
 * Updates the visibility, badge count, and accessibility label of the overflow alert button.
 */
export function updateOverflowButton(
	overflowBtn: HTMLElement,
	reports: SlideOverflowInfo[]
): void {
	const overflowing = reports.filter((r) => r.isOverflowing);
	if (overflowing.length > 0) {
		overflowBtn.removeClass('is-hidden');
		const countSpan = overflowBtn.querySelector('.presenter-toolbar-overflow-count');
		if (countSpan) {
			countSpan.setText(String(overflowing.length));
		}
		overflowBtn.setAttribute(
			'aria-label',
			`${overflowing.length} slide(s) overflow card boundaries. Click to inspect.`
		);
	} else {
		overflowBtn.addClass('is-hidden');
	}
}

/**
 * Opens the JumpToSlideModal pre-populated with overflowing slide indices.
 */
export function openSlideJumpModal(
	app: App,
	totalSlides: number,
	reports: SlideOverflowInfo[],
	onSelect: (index: number) => void
): void {
	if (totalSlides <= 0) return;
	const overflowingIndices = new Set(
		reports.filter((r) => r.isOverflowing).map((r) => r.slideIndex)
	);
	new JumpToSlideModal(app, totalSlides, onSelect, overflowingIndices).open();
}

/**
 * Opens the OverflowReportModal for inspecting and splitting overflowing slides.
 */
export function openSlideOverflowModal(
	app: App,
	reports: SlideOverflowInfo[],
	file: TFile | null,
	onJump: (slideIndex: number) => void
): void {
	new OverflowReportModal(app, reports, file, onJump).open();
}
