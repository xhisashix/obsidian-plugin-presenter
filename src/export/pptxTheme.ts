import type { PresenterSettings, SlideFrontmatter } from '../types';
import type { PptxTheme } from './pptxTypes';

const NAMED_COLORS: Record<string, string> = {
	white: 'FFFFFF',
	black: '000000',
	red: 'EF4444',
	blue: '2563EB',
	green: '10B981',
	yellow: 'F59E0B',
	orange: 'F97316',
	purple: '8B5CF6',
	gray: '64748B',
	grey: '64748B',
	navy: '1E3A8A',
	teal: '0D9488',
};

/**
 * Normalizes a CSS color string (#RGB, #RRGGBB, or named color) to a 6-character
 * uppercase hex string without '#' (as required by PptxGenJS).
 */
export function normalizeHexColor(color: string | undefined, fallback = '000000'): string {
	if (!color || !color.trim()) {
		return fallback.replace(/^#/, '').toUpperCase();
	}

	const trimmed = color.trim().toLowerCase();
	const named = NAMED_COLORS[trimmed];
	if (named) {
		return named;
	}

	const raw = trimmed.replace(/^#/, '');
	if (/^[0-9a-f]{6}$/i.test(raw)) {
		return raw.toUpperCase();
	}
	if (/^[0-9a-f]{3}$/i.test(raw)) {
		const r = raw[0]!;
		const g = raw[1]!;
		const b = raw[2]!;
		return `${r}${r}${g}${g}${b}${b}`.toUpperCase();
	}
	if (/^[0-9a-f]{8}$/i.test(raw)) {
		return raw.slice(0, 6).toUpperCase();
	}

	const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
	if (rgbMatch) {
		const r = Math.min(255, Math.max(0, Number(rgbMatch[1]))).toString(16).padStart(2, '0');
		const g = Math.min(255, Math.max(0, Number(rgbMatch[2]))).toString(16).padStart(2, '0');
		const b = Math.min(255, Math.max(0, Number(rgbMatch[3]))).toString(16).padStart(2, '0');
		return `${r}${g}${b}`.toUpperCase();
	}

	return fallback.replace(/^#/, '').toUpperCase();
}

function hexToRgb(hex6: string): { r: number; g: number; b: number } {
	const clean = normalizeHexColor(hex6, '000000');
	return {
		r: parseInt(clean.slice(0, 2), 16),
		g: parseInt(clean.slice(2, 4), 16),
		b: parseInt(clean.slice(4, 6), 16),
	};
}

/**
 * Returns true if the 6-digit hex color is perceptually dark.
 */
export function isDarkColor(hex6: string): boolean {
	const { r, g, b } = hexToRgb(hex6);
	// Relative luminance formula (ITU-R BT.709)
	const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	return luminance < 0.45;
}

/**
 * Mixes foreground hex color into background hex color with weight `fgWeight` (0.0 to 1.0).
 * Equivalent to CSS `color-mix(in srgb, fg <fgWeight*100>%, bg)`.
 */
export function blendHexColors(fgHex: string, bgHex: string, fgWeight: number): string {
	const fg = hexToRgb(fgHex);
	const bg = hexToRgb(bgHex);
	const w = Math.min(1, Math.max(0, fgWeight));
	const r = Math.round(fg.r * w + bg.r * (1 - w))
		.toString(16)
		.padStart(2, '0');
	const g = Math.round(fg.g * w + bg.g * (1 - w))
		.toString(16)
		.padStart(2, '0');
	const b = Math.round(fg.b * w + bg.b * (1 - w))
		.toString(16)
		.padStart(2, '0');
	return `${r}${g}${b}`.toUpperCase();
}

/**
 * Resolves the semantic accent color for an Obsidian Callout type.
 */
export function resolveCalloutColor(calloutType: string, defaultAccent: string): string {
	const type = calloutType.trim().toLowerCase();
	switch (type) {
		case 'tip':
		case 'hint':
		case 'success':
		case 'check':
		case 'done':
			return '10B981';
		case 'warning':
		case 'caution':
		case 'attention':
		case 'question':
		case 'help':
		case 'faq':
			return 'F59E0B';
		case 'danger':
		case 'error':
		case 'bug':
		case 'failure':
		case 'fail':
		case 'missing':
			return 'EF4444';
		case 'important':
		case 'example':
			return '8B5CF6';
		case 'quote':
		case 'cite':
			return '64748B';
		case 'info':
		case 'note':
		case 'todo':
		case 'abstract':
		case 'summary':
		case 'tldr':
		default:
			return normalizeHexColor(defaultAccent, '2563EB');
	}
}

/**
 * Builds the complete PptxTheme object from presentation frontmatter and plugin settings.
 */
export function buildPptxTheme(
	config: SlideFrontmatter,
	settings: PresenterSettings,
	logoDataUrl: string | null = null
): PptxTheme {
	const baseColor = normalizeHexColor(
		config.baseColor || settings.defaultBaseColor,
		'FFFFFF'
	);
	const mainColor = normalizeHexColor(
		config.mainColor || settings.defaultMainColor,
		'1E293B'
	);
	const accentColor = normalizeHexColor(
		config.accentColor || settings.defaultAccentColor,
		'2563EB'
	);

	const isDark = isDarkColor(baseColor);
	const aspectRatio = config.aspectRatio || settings.aspectRatio || '16:9';
	const width = aspectRatio === '4:3' ? 10.0 : 13.333;
	const height = 7.5;

	const headerText = config.header !== undefined ? config.header : settings.defaultHeader;
	const footerText = config.footer !== undefined ? config.footer : settings.defaultFooter;

	return {
		baseColor,
		mainColor,
		accentColor,
		mutedTextColor: blendHexColors(mainColor, baseColor, 0.65),
		cardBgColor: blendHexColors(mainColor, baseColor, isDark ? 0.08 : 0.035),
		cardBorderColor: blendHexColors(mainColor, baseColor, isDark ? 0.18 : 0.11),
		codeBgColor: blendHexColors(mainColor, baseColor, isDark ? 0.12 : 0.06),
		codeBorderColor: blendHexColors(mainColor, baseColor, isDark ? 0.22 : 0.12),
		codeTextColor: mainColor,
		tableHeaderBgColor: blendHexColors(mainColor, baseColor, isDark ? 0.14 : 0.07),
		tableRowOddBgColor: baseColor,
		tableRowEvenBgColor: blendHexColors(mainColor, baseColor, isDark ? 0.06 : 0.03),
		tableBorderColor: blendHexColors(mainColor, baseColor, isDark ? 0.22 : 0.14),
		blockquoteBgColor: blendHexColors(mainColor, baseColor, isDark ? 0.09 : 0.05),
		dividerColor: blendHexColors(mainColor, baseColor, 0.18),
		isDark,
		aspectRatio,
		width,
		height,
		fontFace: 'Meiryo',
		monoFontFace: 'Consolas',
		headerText,
		footerText,
		logoDataUrl,
	};
}
