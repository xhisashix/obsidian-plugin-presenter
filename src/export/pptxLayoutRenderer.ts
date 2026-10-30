import type PptxGenJS from 'pptxgenjs';
import type { ColumnRatio, SlideData } from '../types';
import { blendHexColors, resolveCalloutColor } from './pptxTheme';
import type {
	PptxBlock,
	PptxLayoutBox,
	PptxListItem,
	PptxTableCell,
	PptxTextSpan,
	PptxTheme,
} from './pptxTypes';

const MARGIN_X = 0.6;
const HEADER_Y = 0.25;
const HEADER_H = 0.38;
const FOOTER_H = 0.35;

/**
 * Converts `PptxTextSpan[]` into PptxGenJS `TextProps[]` with rich inline styling.
 */
export function spansToTextProps(
	spans: PptxTextSpan[],
	theme: PptxTheme,
	baseOptions: {
		fontSize?: number;
		color?: string;
		bold?: boolean;
		italic?: boolean;
	} = {}
): PptxGenJS.TextProps[] {
	const fontSize = baseOptions.fontSize ?? 14;
	const defaultColor = baseOptions.color ?? theme.mainColor;
	const props: PptxGenJS.TextProps[] = [];

	for (const span of spans) {
		if (span.breakLine) {
			props.push({
				text: '',
				options: { breakLine: true, fontSize, fontFace: theme.fontFace },
			});
			continue;
		}

		if (span.isBadge) {
			props.push({
				text: ` ${span.text.trim()} `,
				options: {
					bold: true,
					fontSize: Math.max(10, fontSize - 2),
					color: 'FFFFFF',
					highlight: theme.accentColor,
					fontFace: theme.fontFace,
				},
			});
			props.push({
				text: ' ',
				options: {
					fontSize,
					color: defaultColor,
					fontFace: theme.fontFace,
				},
			});
			continue;
		}

		const isBold = Boolean(baseOptions.bold || span.bold);
		const isItalic = Boolean(baseOptions.italic || span.italic);
		const textColor = span.color
			? span.color
			: span.bold && !baseOptions.color
				? theme.accentColor
				: defaultColor;

		const options: PptxGenJS.TextPropsOptions = {
			fontSize: span.code ? Math.max(10, fontSize - 1) : fontSize,
			fontFace: span.code ? theme.monoFontFace : theme.fontFace,
			color: textColor,
			bold: isBold,
			italic: isItalic,
			strike: span.strike ? 'sngStrike' : undefined,
			highlight: span.code ? theme.codeBgColor : undefined,
			hyperlink: span.linkUrl ? { url: span.linkUrl } : undefined,
		};

		props.push({
			text: span.text,
			options,
		});
	}

	if (props.length === 0) {
		props.push({
			text: '',
			options: { fontSize, color: defaultColor, fontFace: theme.fontFace },
		});
	}

	return props;
}

/**
 * Computes individual column widths given a total width, column count, gap, and optional ratio.
 */
export function computeColumnWidths(
	totalWidth: number,
	count: number,
	gap: number,
	ratio?: ColumnRatio
): number[] {
	const safeCount = Math.max(1, count);
	const availableWidth = Math.max(1, totalWidth - gap * (safeCount - 1));

	if (safeCount === 2 && ratio) {
		const parts = ratio.split(':').map(Number);
		const leftWeight = parts[0] || 1;
		const rightWeight = parts[1] || 1;
		const sum = leftWeight + rightWeight;
		return [
			(availableWidth * leftWeight) / sum,
			(availableWidth * rightWeight) / sum,
		];
	}

	const each = availableWidth / safeCount;
	return Array.from({ length: safeCount }, () => each);
}

/**
 * Estimates the vertical height (in inches) required to render a list of `PptxBlock`s
 * within a given width.
 */
export function estimateBlocksHeight(blocks: PptxBlock[], width: number): number {
	const charsPerLine = Math.max(16, Math.floor(width * 22));
	let totalH = 0;

	for (const block of blocks) {
		switch (block.kind) {
			case 'heading': {
				const h = block.level <= 2 ? 0.52 : 0.42;
				totalH += h + 0.08;
				break;
			}
			case 'kpi': {
				totalH += 0.72;
				break;
			}
			case 'paragraph': {
				const textLen = block.spans.reduce((acc, s) => acc + s.text.length, 0);
				const lines = Math.max(1, Math.ceil(textLen / charsPerLine));
				totalH += lines * 0.28 + 0.1;
				break;
			}
			case 'list': {
				let listH = 0.06;
				for (const item of block.items) {
					const textLen = item.spans.reduce((acc, s) => acc + s.text.length, 0);
					const lines = Math.max(1, Math.ceil(textLen / Math.max(12, charsPerLine - 4)));
					listH += lines * 0.27 + 0.04;
				}
				totalH += listH + 0.08;
				break;
			}
			case 'code': {
				const lineCount = Math.max(1, block.code.split(/\r?\n/).length);
				totalH += Math.min(3.2, lineCount * 0.22 + 0.24) + 0.12;
				break;
			}
			case 'blockquote':
			case 'callout': {
				const textLen = block.spans.reduce((acc, s) => acc + s.text.length, 0);
				const lines = Math.max(1, Math.ceil(textLen / Math.max(12, charsPerLine - 4)));
				const titleExtra = block.kind === 'callout' ? 0.3 : 0;
				totalH += titleExtra + lines * 0.26 + 0.26;
				break;
			}
			case 'table': {
				const rowCount = Math.max(1, block.rows.length);
				totalH += rowCount * 0.38 + 0.16;
				break;
			}
			case 'image': {
				totalH += Math.min(2.6, width * 0.55) + 0.12;
				break;
			}
			case 'columns': {
				const colWidths = computeColumnWidths(width, block.count, 0.22, block.ratio);
				let maxColH = 0.8;
				block.columns.forEach((colBlocks, idx) => {
					const cw = colWidths[idx] ?? colWidths[0] ?? width / block.count;
					const innerW = block.style === 'card' ? Math.max(0.8, cw - 0.36) : cw;
					const colH =
						estimateBlocksHeight(colBlocks, innerW) +
						(block.style === 'card' ? 0.36 : 0) +
						(block.variant === 'step' ? 0.32 : 0);
					if (colH > maxColH) maxColH = colH;
				});
				totalH += maxColH + 0.14;
				break;
			}
			case 'hr': {
				totalH += 0.2;
				break;
			}
		}
	}

	return totalH;
}

/**
 * Renders a single `SlideData` and its extracted `PptxBlock[]` onto a PptxGenJS Slide.
 */
export function renderPptxSlide(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	slide: SlideData,
	blocks: PptxBlock[],
	theme: PptxTheme,
	totalSlides: number
): void {
	pptxSlide.background = { color: theme.baseColor };

	// 1. Render Header & Footer
	const hasHeader = Boolean(theme.headerText || theme.logoDataUrl);
	if (hasHeader) {
		renderSlideHeader(pptx, pptxSlide, theme);
	}
	renderSlideFooter(pptx, pptxSlide, slide.index, totalSlides, theme);

	const bodyTop = hasHeader ? HEADER_Y + HEADER_H + 0.14 : 0.45;
	const footerTop = theme.height - FOOTER_H - 0.2;
	const bodyHeight = Math.max(2.0, footerTop - bodyTop - 0.12);
	const bodyBox: PptxLayoutBox = {
		x: MARGIN_X,
		y: bodyTop,
		w: theme.width - MARGIN_X * 2,
		h: bodyHeight,
	};

	const layout = slide.layout || slide.type;

	if (layout === 'cover') {
		renderCoverSlide(pptx, pptxSlide, slide, blocks, bodyBox, theme);
	} else if (layout === 'section') {
		renderSectionSlide(pptx, pptxSlide, slide, blocks, bodyBox, theme);
	} else if (layout === 'quote') {
		renderQuoteSlide(pptx, pptxSlide, slide, blocks, bodyBox, theme);
	} else {
		renderContentSlide(pptx, pptxSlide, slide, blocks, bodyBox, theme);
	}
}

function renderSlideHeader(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	theme: PptxTheme
): void {
	const contentW = theme.width - MARGIN_X * 2;

	if (theme.headerText) {
		pptxSlide.addText(theme.headerText, {
			x: MARGIN_X,
			y: HEADER_Y,
			w: contentW * 0.75,
			h: 0.3,
			fontSize: 9.5,
			bold: true,
			color: theme.mutedTextColor,
			fontFace: theme.fontFace,
			valign: 'middle',
			margin: 0,
		});
	}

	if (theme.logoDataUrl && theme.logoDataUrl.startsWith('data:image/')) {
		pptxSlide.addImage({
			data: theme.logoDataUrl,
			x: theme.width - MARGIN_X - 1.1,
			y: HEADER_Y + 0.02,
			w: 1.1,
			h: 0.26,
			sizing: { type: 'contain', w: 1.1, h: 0.26 },
		});
	}

	pptxSlide.addShape(pptx.ShapeType.rect, {
		x: MARGIN_X,
		y: HEADER_Y + HEADER_H - 0.02,
		w: contentW,
		h: 0.01,
		fill: { color: theme.dividerColor },
		line: { color: theme.dividerColor, width: 0 },
	});
}

function renderSlideFooter(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	slideIndex: number,
	totalSlides: number,
	theme: PptxTheme
): void {
	const contentW = theme.width - MARGIN_X * 2;
	const footerY = theme.height - FOOTER_H - 0.15;

	pptxSlide.addShape(pptx.ShapeType.rect, {
		x: MARGIN_X,
		y: footerY,
		w: contentW,
		h: 0.01,
		fill: { color: theme.dividerColor },
		line: { color: theme.dividerColor, width: 0 },
	});

	if (theme.footerText) {
		pptxSlide.addText(theme.footerText, {
			x: MARGIN_X,
			y: footerY + 0.06,
			w: contentW * 0.75,
			h: 0.26,
			fontSize: 9,
			color: theme.mutedTextColor,
			fontFace: theme.fontFace,
			valign: 'middle',
			margin: 0,
		});
	}

	pptxSlide.addText(`${slideIndex + 1} / ${totalSlides}`, {
		x: theme.width - MARGIN_X - 1.5,
		y: footerY + 0.06,
		w: 1.5,
		h: 0.26,
		fontSize: 9,
		color: theme.mutedTextColor,
		fontFace: theme.fontFace,
		align: 'right',
		valign: 'middle',
		margin: 0,
	});
}

function renderCoverSlide(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	slide: SlideData,
	blocks: PptxBlock[],
	box: PptxLayoutBox,
	theme: PptxTheme
): void {
	let titleText = slide.title;
	const remainingBlocks: PptxBlock[] = [];

	for (let i = 0; i < blocks.length; i++) {
		const b = blocks[i]!;
		if (i === 0 && b.kind === 'heading' && b.level === 1) {
			titleText = b.text;
			continue;
		}
		remainingBlocks.push(b);
	}

	const centerY = box.y + box.h * 0.36;

	// Main Cover Title
	pptxSlide.addText(titleText, {
		x: box.x + 0.6,
		y: centerY - 0.65,
		w: box.w - 1.2,
		h: 1.15,
		fontSize: 36,
		bold: true,
		color: theme.accentColor,
		fontFace: theme.fontFace,
		align: 'center',
		valign: 'middle',
	});

	// Accent Divider Bar
	pptxSlide.addShape(pptx.ShapeType.rect, {
		x: box.x + (box.w - 1.4) / 2,
		y: centerY + 0.58,
		w: 1.4,
		h: 0.055,
		fill: { color: theme.accentColor },
		line: { color: theme.accentColor, width: 0 },
	});

	// Subtitle / Cover Body Content
	let subY = centerY + 0.82;
	for (const block of remainingBlocks) {
		if (block.kind === 'paragraph' || block.kind === 'heading') {
			const textProps = spansToTextProps(block.spans, theme, {
				fontSize: block.kind === 'heading' ? 20 : 16,
				color: theme.mutedTextColor,
			});
			pptxSlide.addText(textProps, {
				x: box.x + 1.0,
				y: subY,
				w: box.w - 2.0,
				h: 0.48,
				align: 'center',
				valign: 'top',
			});
			subY += 0.5;
		}
	}
}

function renderSectionSlide(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	slide: SlideData,
	blocks: PptxBlock[],
	box: PptxLayoutBox,
	theme: PptxTheme
): void {
	let titleText = slide.title;
	const subtitleBlocks: PptxBlock[] = [];

	for (let i = 0; i < blocks.length; i++) {
		const b = blocks[i]!;
		if (i === 0 && b.kind === 'heading') {
			titleText = b.text;
			continue;
		}
		subtitleBlocks.push(b);
	}

	const centerY = box.y + box.h * 0.44;

	// Vertical Accent Pillar
	pptxSlide.addShape(pptx.ShapeType.rect, {
		x: box.x + 0.6,
		y: centerY - 0.65,
		w: 0.12,
		h: 1.3,
		fill: { color: theme.accentColor },
		line: { color: theme.accentColor, width: 0 },
	});

	pptxSlide.addText(titleText, {
		x: box.x + 0.95,
		y: centerY - 0.6,
		w: box.w - 1.5,
		h: 0.95,
		fontSize: 32,
		bold: true,
		color: theme.mainColor,
		fontFace: theme.fontFace,
		valign: 'middle',
	});

	if (subtitleBlocks.length > 0) {
		const firstSub = subtitleBlocks[0]!;
		if (firstSub.kind === 'paragraph' || firstSub.kind === 'heading') {
			const props = spansToTextProps(firstSub.spans, theme, {
				fontSize: 16,
				color: theme.mutedTextColor,
			});
			pptxSlide.addText(props, {
				x: box.x + 0.95,
				y: centerY + 0.38,
				w: box.w - 1.5,
				h: 0.45,
				valign: 'top',
			});
		}
	}
}

function renderQuoteSlide(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	slide: SlideData,
	blocks: PptxBlock[],
	box: PptxLayoutBox,
	theme: PptxTheme
): void {
	let curY = box.y;
	const quoteSpans: PptxTextSpan[] = [];

	for (const b of blocks) {
		if (b.kind === 'heading' && b.level <= 2) {
			pptxSlide.addText(b.text, {
				x: box.x,
				y: curY,
				w: box.w,
				h: 0.55,
				fontSize: 22,
				bold: true,
				color: theme.mainColor,
				fontFace: theme.fontFace,
			});
			curY += 0.7;
		} else if (b.kind === 'blockquote' || b.kind === 'paragraph') {
			quoteSpans.push(...b.spans);
		}
	}

	const cardY = curY + 0.35;
	const cardH = Math.max(2.2, box.h - (curY - box.y) - 0.7);

	pptxSlide.addShape(pptx.ShapeType.roundRect, {
		x: box.x + 0.4,
		y: cardY,
		w: box.w - 0.8,
		h: cardH,
		fill: { color: theme.blockquoteBgColor },
		line: { color: theme.cardBorderColor, width: 1 },
		rectRadius: 0.08,
	});

	pptxSlide.addShape(pptx.ShapeType.rect, {
		x: box.x + 0.4,
		y: cardY,
		w: 0.1,
		h: cardH,
		fill: { color: theme.accentColor },
		line: { color: theme.accentColor, width: 0 },
	});

	const displaySpans =
		quoteSpans.length > 0 ? quoteSpans : [{ text: slide.title, italic: true }];
	const textProps = spansToTextProps(displaySpans, theme, {
		fontSize: 22,
		italic: true,
		color: theme.mainColor,
	});

	pptxSlide.addText(textProps, {
		x: box.x + 0.85,
		y: cardY + 0.3,
		w: box.w - 1.6,
		h: cardH - 0.6,
		valign: 'middle',
		align: 'left',
	});
}

function renderContentSlide(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	slide: SlideData,
	blocks: PptxBlock[],
	box: PptxLayoutBox,
	theme: PptxTheme
): void {
	let curY = box.y;
	let remainingBlocks = blocks;

	// If first block is H1 or H2, render as the top slide title with accent underline
	const firstBlock = blocks[0];
	if (firstBlock && firstBlock.kind === 'heading' && firstBlock.level <= 2) {
		const titleProps = spansToTextProps(firstBlock.spans, theme, {
			fontSize: 24,
			bold: true,
			color: theme.mainColor,
		});
		pptxSlide.addText(titleProps, {
			x: box.x,
			y: curY,
			w: box.w,
			h: 0.56,
			valign: 'bottom',
			margin: 0,
		});

		pptxSlide.addShape(pptx.ShapeType.rect, {
			x: box.x,
			y: curY + 0.6,
			w: box.w,
			h: 0.035,
			fill: { color: theme.accentColor },
			line: { color: theme.accentColor, width: 0 },
		});

		curY += 0.78;
		remainingBlocks = blocks.slice(1);
	}

	const contentBox: PptxLayoutBox = {
		x: box.x,
		y: curY,
		w: box.w,
		h: Math.max(1.0, box.y + box.h - curY),
	};

	renderBlocksInBox(pptx, pptxSlide, remainingBlocks, contentBox, theme);
}

/**
 * Renders a sequence of `PptxBlock[]` inside a target bounding box.
 */
export function renderBlocksInBox(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	blocks: PptxBlock[],
	box: PptxLayoutBox,
	theme: PptxTheme
): number {
	let curY = box.y;
	const maxY = box.y + box.h;

	for (const block of blocks) {
		if (curY >= maxY - 0.15) break;
		const availH = Math.max(0.3, maxY - curY);

		switch (block.kind) {
			case 'heading': {
				const fontSize = block.level <= 2 ? 20 : block.level === 3 ? 16.5 : 14.5;
				const h = block.level <= 2 ? 0.44 : 0.36;
				const props = spansToTextProps(block.spans, theme, {
					fontSize,
					bold: true,
					color: theme.mainColor,
				});
				pptxSlide.addText(props, {
					x: box.x,
					y: curY,
					w: box.w,
					h,
					valign: 'middle',
					margin: 0,
				});
				curY += h + 0.06;
				break;
			}

			case 'kpi': {
				const h = 0.68;
				pptxSlide.addText(block.value, {
					x: box.x,
					y: curY,
					w: box.w,
					h,
					fontSize: 36,
					bold: true,
					color: theme.accentColor,
					fontFace: theme.fontFace,
					valign: 'middle',
					margin: 0,
				});
				curY += h + 0.06;
				break;
			}

			case 'paragraph': {
				const estH = Math.min(availH, estimateBlocksHeight([block], box.w));
				const props = spansToTextProps(block.spans, theme, {
					fontSize: 14,
					color: theme.mainColor,
				});
				pptxSlide.addText(props, {
					x: box.x,
					y: curY,
					w: box.w,
					h: estH,
					valign: 'top',
					margin: [2, 0, 2, 0],
				});
				curY += estH + 0.04;
				break;
			}

			case 'list': {
				const estH = Math.min(availH, estimateBlocksHeight([block], box.w));
				const listProps = buildListTextProps(block.items, theme);
				if (listProps.length > 0) {
					pptxSlide.addText(listProps, {
						x: box.x,
						y: curY,
						w: box.w,
						h: estH,
						valign: 'top',
						margin: [2, 0, 2, 0],
						 paraSpaceAfter: 4,
					});
				}
				curY += estH + 0.06;
				break;
			}

			case 'callout': {
				const estH = Math.min(availH, estimateBlocksHeight([block], box.w));
				const calloutColor = resolveCalloutColor(block.calloutType, theme.accentColor);
				const calloutBg = blendHexColors(calloutColor, theme.baseColor, theme.isDark ? 0.16 : 0.09);

				pptxSlide.addShape(pptx.ShapeType.roundRect, {
					x: box.x,
					y: curY,
					w: box.w,
					h: estH,
					fill: { color: calloutBg },
					line: { color: blendHexColors(calloutColor, theme.baseColor, 0.35), width: 1 },
					rectRadius: 0.06,
				});

				pptxSlide.addShape(pptx.ShapeType.rect, {
					x: box.x,
					y: curY,
					w: 0.07,
					h: estH,
					fill: { color: calloutColor },
					line: { color: calloutColor, width: 0 },
				});

				const combinedProps: PptxGenJS.TextProps[] = [
					{
						text: block.title,
						options: {
							bold: true,
							fontSize: 13.5,
							color: calloutColor,
							fontFace: theme.fontFace,
							breakLine: block.spans.length > 0,
						},
					},
					...spansToTextProps(block.spans, theme, {
						fontSize: 13,
						color: theme.mainColor,
					}),
				];

				pptxSlide.addText(combinedProps, {
					x: box.x + 0.18,
					y: curY + 0.06,
					w: Math.max(0.5, box.w - 0.3),
					h: Math.max(0.25, estH - 0.12),
					valign: 'middle',
				});

				curY += estH + 0.1;
				break;
			}

			case 'blockquote': {
				const estH = Math.min(availH, estimateBlocksHeight([block], box.w));
				pptxSlide.addShape(pptx.ShapeType.roundRect, {
					x: box.x,
					y: curY,
					w: box.w,
					h: estH,
					fill: { color: theme.blockquoteBgColor },
					line: { color: theme.cardBorderColor, width: 0.5 },
					rectRadius: 0.05,
				});
				pptxSlide.addShape(pptx.ShapeType.rect, {
					x: box.x,
					y: curY,
					w: 0.06,
					h: estH,
					fill: { color: theme.accentColor },
					line: { color: theme.accentColor, width: 0 },
				});
				const props = spansToTextProps(block.spans, theme, {
					fontSize: 13.5,
					italic: true,
					color: theme.mainColor,
				});
				pptxSlide.addText(props, {
					x: box.x + 0.16,
					y: curY + 0.05,
					w: Math.max(0.5, box.w - 0.28),
					h: Math.max(0.24, estH - 0.1),
					valign: 'middle',
				});
				curY += estH + 0.1;
				break;
			}

			case 'code': {
				const estH = Math.min(availH, estimateBlocksHeight([block], box.w));
				pptxSlide.addShape(pptx.ShapeType.roundRect, {
					x: box.x,
					y: curY,
					w: box.w,
					h: estH,
					fill: { color: theme.codeBgColor },
					line: { color: theme.codeBorderColor, width: 1 },
					rectRadius: 0.05,
				});
				pptxSlide.addText(block.code, {
					x: box.x + 0.14,
					y: curY + 0.08,
					w: Math.max(0.5, box.w - 0.28),
					h: Math.max(0.25, estH - 0.16),
					fontFace: theme.monoFontFace,
					fontSize: 10.5,
					color: theme.codeTextColor,
					valign: 'top',
				});
				curY += estH + 0.1;
				break;
			}

			case 'table': {
				const estH = Math.min(availH, estimateBlocksHeight([block], box.w));
				renderTableBlock(pptxSlide, block.rows, {
					x: box.x,
					y: curY,
					w: box.w,
					h: estH,
				}, theme);
				curY += estH + 0.12;
				break;
			}

			case 'image': {
				const maxImgH = Math.min(availH - 0.08, 3.4);
				const fitted = computeAspectFitDimensions(
					block.naturalWidth,
					block.naturalHeight,
					box.w,
					maxImgH
				);
				pptxSlide.addImage({
					data: block.dataUrl,
					x: box.x + (box.w - fitted.w) / 2,
					y: curY,
					w: fitted.w,
					h: fitted.h,
				});
				curY += fitted.h + 0.1;
				break;
			}

			case 'columns': {
				const usedH = renderColumnsBlock(pptx, pptxSlide, block, {
					x: box.x,
					y: curY,
					w: box.w,
					h: availH,
				}, theme);
				curY += usedH + 0.12;
				break;
			}

			case 'hr': {
				pptxSlide.addShape(pptx.ShapeType.rect, {
					x: box.x,
					y: curY + 0.08,
					w: box.w,
					h: 0.015,
					fill: { color: theme.dividerColor },
					line: { color: theme.dividerColor, width: 0 },
				});
				curY += 0.2;
				break;
			}
		}
	}

	return curY - box.y;
}

function buildListTextProps(
	items: PptxListItem[],
	theme: PptxTheme
): PptxGenJS.TextProps[] {
	const result: PptxGenJS.TextProps[] = [];

	items.forEach((item, idx) => {
		const itemSpans = [...item.spans];
		if (item.checked !== undefined) {
			itemSpans.unshift({
				text: item.checked ? '☑ ' : '☐ ',
				bold: true,
				color: item.checked ? theme.accentColor : theme.mutedTextColor,
			});
		}

		const spanProps = spansToTextProps(itemSpans, theme, {
			fontSize: item.level > 0 ? 13 : 14,
			color: theme.mainColor,
		});

		spanProps.forEach((sp, spIdx) => {
			const isFirstSpan = spIdx === 0;
			const isLastSpan = spIdx === spanProps.length - 1;
			sp.options = {
				...sp.options,
				bullet: isFirstSpan
					? item.ordered
						? { type: 'number' }
						: true
					: undefined,
				indentLevel: isFirstSpan ? Math.min(4, item.level) : undefined,
				breakLine: isLastSpan && idx < items.length - 1 ? true : sp.options?.breakLine,
			};
			result.push(sp);
		});
	});

	return result;
}

function renderTableBlock(
	pptxSlide: PptxGenJS.Slide,
	rows: PptxTableCell[][],
	box: PptxLayoutBox,
	theme: PptxTheme
): void {
	const colCount = Math.max(1, ...rows.map((r) => r.length));
	const colW = Array.from({ length: colCount }, () => box.w / colCount);

	const pptxRows: PptxGenJS.TableRow[] = rows.map((row, rowIdx) => {
		return row.map((cell) => {
			const isHeader = cell.isHeader;
			const bg = isHeader
				? theme.tableHeaderBgColor
				: rowIdx % 2 === 1
					? theme.tableRowOddBgColor
					: theme.tableRowEvenBgColor;

			const textProps = spansToTextProps(cell.spans, theme, {
				fontSize: 12.5,
				bold: isHeader,
				color: theme.mainColor,
			});

			const borderBottomColor = isHeader ? theme.accentColor : theme.tableBorderColor;
			const borderBottomPt = isHeader ? 2 : 0.75;

			return {
				text: textProps,
				options: {
					fill: { color: bg },
					align: cell.align || 'left',
					valign: 'middle',
					margin: [0.06, 0.1, 0.06, 0.1],
					border: [
						{ type: 'solid', pt: 0.75, color: theme.tableBorderColor },
						{ type: 'solid', pt: 0.75, color: theme.tableBorderColor },
						{ type: 'solid', pt: borderBottomPt, color: borderBottomColor },
						{ type: 'solid', pt: 0.75, color: theme.tableBorderColor },
					],
				},
			};
		});
	});

	pptxSlide.addTable(pptxRows, {
		x: box.x,
		y: box.y,
		w: box.w,
		colW,
		autoPage: false,
	});
}

function renderColumnsBlock(
	pptx: PptxGenJS,
	pptxSlide: PptxGenJS.Slide,
	block: Extract<PptxBlock, { kind: 'columns' }>,
	box: PptxLayoutBox,
	theme: PptxTheme
): number {
	const gap = 0.22;
	const colWidths = computeColumnWidths(box.w, block.count, gap, block.ratio);
	const isCard = block.style === 'card';
	const isStep = block.variant === 'step';
	const padX = isCard ? 0.2 : 0;
	const padY = isCard ? 0.18 : 0;
	const stepOffsetTop = isStep ? 0.34 : 0;

	// Measure max column height so all cards in the row have uniform height
	let maxColH = 1.0;
	block.columns.forEach((colBlocks, idx) => {
		const colW = colWidths[idx] ?? colWidths[0] ?? box.w / block.count;
		const innerW = Math.max(0.6, colW - padX * 2);
		const est = estimateBlocksHeight(colBlocks, innerW) + padY * 2 + stepOffsetTop;
		if (est > maxColH) maxColH = est;
	});

	const rowH = Math.min(box.h, Math.max(1.2, maxColH));
	let curX = box.x;

	block.columns.forEach((colBlocks, idx) => {
		const colW = colWidths[idx] ?? colWidths[0] ?? box.w / block.count;

		if (isCard) {
			pptxSlide.addShape(pptx.ShapeType.roundRect, {
				x: curX,
				y: box.y,
				w: colW,
				h: rowH,
				fill: { color: theme.cardBgColor },
				line: { color: theme.cardBorderColor, width: 1 },
				rectRadius: 0.06,
			});
		}

		if (isStep) {
			const stepNum = String(idx + 1).padStart(2, '0');
			pptxSlide.addShape(pptx.ShapeType.roundRect, {
				x: curX + padX,
				y: box.y + padY,
				w: 0.42,
				h: 0.26,
				fill: { color: theme.accentColor },
				line: { color: theme.accentColor, width: 0 },
				rectRadius: 0.04,
			});
			pptxSlide.addText(stepNum, {
				x: curX + padX,
				y: box.y + padY,
				w: 0.42,
				h: 0.26,
				fontSize: 10,
				bold: true,
				color: 'FFFFFF',
				fontFace: theme.fontFace,
				align: 'center',
				valign: 'middle',
				margin: 0,
			});
		}

		const innerBox: PptxLayoutBox = {
			x: curX + padX,
			y: box.y + padY + stepOffsetTop,
			w: Math.max(0.5, colW - padX * 2),
			h: Math.max(0.4, rowH - padY * 2 - stepOffsetTop),
		};

		renderBlocksInBox(pptx, pptxSlide, colBlocks, innerBox, theme);
		curX += colW + gap;
	});

	return rowH;
}

function computeAspectFitDimensions(
	naturalW: number | undefined,
	naturalH: number | undefined,
	maxW: number,
	maxH: number
): { w: number; h: number } {
	const safeMaxW = Math.max(0.5, maxW);
	const safeMaxH = Math.max(0.5, maxH);
	if (!naturalW || !naturalH || naturalW <= 0 || naturalH <= 0) {
		const defaultH = Math.min(safeMaxH, safeMaxW * 0.5625);
		return { w: defaultH * (16 / 9), h: defaultH };
	}

	const ratio = naturalW / naturalH;
	let w = safeMaxW;
	let h = w / ratio;
	if (h > safeMaxH) {
		h = safeMaxH;
		w = h * ratio;
	}
	return { w, h };
}
