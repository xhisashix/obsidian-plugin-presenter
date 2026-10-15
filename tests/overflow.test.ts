import test from 'node:test';
import assert from 'node:assert/strict';
import {
	MIN_BODY_SCALE,
	OVERFLOW_TOLERANCE_PX,
	applyContentScale,
	assessSlideOverflow,
	calculateOverflow,
	findSplitHeadingInSlide,
	isAutoFitEnabled,
} from '../src/ui/overflow';
import { extractFrontmatter } from '../src/parser/frontmatter';
import { DEFAULT_SETTINGS, type PresenterSettings } from '../src/types';

void test('isAutoFitEnabled respects frontmatter precedence over settings', () => {
	const settingsOff: PresenterSettings = { ...DEFAULT_SETTINGS, autoFitOverflow: false };
	const settingsOn: PresenterSettings = { ...DEFAULT_SETTINGS, autoFitOverflow: true };

	// Settings default when frontmatter not specified
	assert.equal(isAutoFitEnabled(undefined, settingsOff), false);
	assert.equal(isAutoFitEnabled(undefined, settingsOn), true);
	assert.equal(isAutoFitEnabled({}, settingsOff), false);
	assert.equal(isAutoFitEnabled({}, settingsOn), true);

	// Frontmatter overrides settings
	assert.equal(isAutoFitEnabled({ fit: 'auto' }, settingsOff), true);
	assert.equal(isAutoFitEnabled({ fit: true }, settingsOff), true);
	assert.equal(isAutoFitEnabled({ fit: 'none' }, settingsOn), false);
	assert.equal(isAutoFitEnabled({ fit: false }, settingsOn), false);
});

void test('extractFrontmatter parses fit property accurately', () => {
	assert.equal(extractFrontmatter('---\nfit: auto\n---').frontmatter.fit, 'auto');
	assert.equal(extractFrontmatter('---\nfit: none\n---').frontmatter.fit, 'none');
	assert.equal(extractFrontmatter('---\nfit: true\n---').frontmatter.fit, true);
	assert.equal(extractFrontmatter('---\nfit: false\n---').frontmatter.fit, false);
	assert.equal(extractFrontmatter('---\npresenter-fit: auto\n---').frontmatter.fit, 'auto');
	assert.equal(extractFrontmatter('---\ntitle: Test\n---').frontmatter.fit, undefined);
});

void test('findSplitHeadingInSlide finds second H3 heading outside code fences', () => {
	// 0 or 1 H3 cannot split
	assert.deepEqual(findSplitHeadingInSlide('# Main title\n\nSome text'), { canSplit: false });
	assert.deepEqual(findSplitHeadingInSlide('### Single heading\n\nContent'), { canSplit: false });

	// 2 H3 headings should trigger split candidate at the second H3
	const twoH3 = [
		'## Section Title',
		'### First Topic',
		'Details on topic 1',
		'### Second Topic',
		'Details on topic 2',
	].join('\n');

	const result = findSplitHeadingInSlide(twoH3);
	assert.equal(result.canSplit, true);
	assert.equal(result.splitHeadingTitle, 'Second Topic');
	assert.equal(result.splitLineOffset, 3); // line index of "### Second Topic"

	// H3 inside code fence should be ignored
	const fencedH3 = [
		'### First Topic',
		'```markdown',
		'### Dummy H3 in code block',
		'```',
		'Some text',
		'### Genuine Second Topic',
	].join('\n');

	const resultFenced = findSplitHeadingInSlide(fencedH3);
	assert.equal(resultFenced.canSplit, true);
	assert.equal(resultFenced.splitHeadingTitle, 'Genuine Second Topic');
	assert.equal(resultFenced.splitLineOffset, 5);
});

void test('calculateOverflow accurately computes ratio and clamps optimalScale to 70%', () => {
	// Create mock element
	const mockEl = {
		scrollHeight: 500,
		clientHeight: 500,
	} as unknown as HTMLElement;

	// No overflow
	assert.deepEqual(calculateOverflow(mockEl), {
		isOverflowing: false,
		overflowRatio: 1.0,
		optimalScale: 1.0,
	});

	// Slight overflow within tolerance
	(mockEl as { scrollHeight: number }).scrollHeight = 500 + OVERFLOW_TOLERANCE_PX;
	assert.deepEqual(calculateOverflow(mockEl), {
		isOverflowing: false,
		overflowRatio: 1.0,
		optimalScale: 1.0,
	});

	// Overflow: 600px in 500px container (1.20x overflow)
	(mockEl as { scrollHeight: number }).scrollHeight = 600;
	const res = calculateOverflow(mockEl);
	assert.equal(res.isOverflowing, true);
	assert.equal(res.overflowRatio, 1.2);
	assert.equal(res.optimalScale, 0.83); // 1 / 1.2 = 0.8333... floored to 0.83

	// Severe overflow: 1000px in 500px container (2.0x overflow)
	(mockEl as { scrollHeight: number }).scrollHeight = 1000;
	const severeRes = calculateOverflow(mockEl);
	assert.equal(severeRes.isOverflowing, true);
	assert.equal(severeRes.overflowRatio, 2.0);
	assert.equal(severeRes.optimalScale, MIN_BODY_SCALE); // Strictly clamped to 0.70
});

void test('applyContentScale sets and removes CSS property and class correctly', () => {
	const classes = new Set<string>();
	const styles = new Map<string, string>();

	const mockBodyEl = {
		style: {
			setProperty: (k: string, v: string) => styles.set(k, v),
			removeProperty: (k: string) => styles.delete(k),
		},
		addClass: (cls: string) => classes.add(cls),
		removeClass: (cls: string) => classes.delete(cls),
	} as unknown as HTMLElement;

	// Scale down
	applyContentScale(mockBodyEl, 0.85);
	assert.equal(styles.get('--presenter-body-scale'), '0.85');
	assert.equal(classes.has('is-autofitted'), true);

	// Scale reset
	applyContentScale(mockBodyEl, 1.0);
	assert.equal(styles.has('--presenter-body-scale'), false);
	assert.equal(classes.has('is-autofitted'), false);
});

void test('assessSlideOverflow computes absolute split line and auto-fit scale', () => {
	const styles = new Map<string, string>();
	const classes = new Set<string>();

	const mockBodyEl = {
		scrollHeight: 600,
		clientHeight: 500,
		style: {
			setProperty: (k: string, v: string) => styles.set(k, v),
			removeProperty: (k: string) => styles.delete(k),
		},
		addClass: (cls: string) => classes.add(cls),
		removeClass: (cls: string) => classes.delete(cls),
	} as unknown as HTMLElement;

	const slide = {
		index: 2,
		title: 'Features',
		markdown: '### Intro\nText\n### Details\nMore text',
		startLine: 25,
	};

	// With autoFit disabled
	const infoNoFit = assessSlideOverflow(slide, mockBodyEl, false);
	assert.equal(infoNoFit.slideIndex, 2);
	assert.equal(infoNoFit.isOverflowing, true);
	assert.equal(infoNoFit.overflowRatio, 1.2);
	assert.equal(infoNoFit.fittedScale, 1.0);
	assert.equal(infoNoFit.canSplitByHeading, true);
	assert.equal(infoNoFit.splitHeadingTitle, 'Details');
	assert.equal(infoNoFit.splitLineOffset, 2);
	assert.equal(infoNoFit.absoluteSplitLine, 27); // 25 + 2

	// With autoFit enabled: applies optimal scale (0.83)
	// When scaled, simulate element fitting within bounds
	let currentScale = 1.0;
	const mockFittingBodyEl = {
		get scrollHeight() {
			return currentScale < 0.9 ? 480 : 600;
		},
		clientHeight: 500,
		style: {
			setProperty(k: string, v: string) {
				styles.set(k, v);
				if (k === '--presenter-body-scale') {
					currentScale = parseFloat(v);
				}
			},
			removeProperty(k: string) {
				styles.delete(k);
				if (k === '--presenter-body-scale') {
					currentScale = 1.0;
				}
			},
		},
		addClass: (cls: string) => classes.add(cls),
		removeClass: (cls: string) => classes.delete(cls),
	} as unknown as HTMLElement;

	const infoFit = assessSlideOverflow(slide, mockFittingBodyEl, true);
	assert.equal(infoFit.isOverflowing, false); // Successfully resolved by auto-fit!
	assert.equal(infoFit.fittedScale, 0.83);
});
