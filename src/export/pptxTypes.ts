import type { ColumnRatio, ColumnStyle, ColumnVariant, SlideLayout } from '../types';

export interface PptxTheme {
	baseColor: string;
	mainColor: string;
	accentColor: string;
	mutedTextColor: string;
	cardBgColor: string;
	cardBorderColor: string;
	codeBgColor: string;
	codeBorderColor: string;
	codeTextColor: string;
	tableHeaderBgColor: string;
	tableRowOddBgColor: string;
	tableRowEvenBgColor: string;
	tableBorderColor: string;
	blockquoteBgColor: string;
	dividerColor: string;
	isDark: boolean;
	aspectRatio: '16:9' | '4:3';
	width: number;
	height: number;
	fontFace: string;
	monoFontFace: string;
	headerText: string;
	footerText: string;
	logoDataUrl: string | null;
}

export interface PptxTextSpan {
	text: string;
	bold?: boolean;
	italic?: boolean;
	strike?: boolean;
	code?: boolean;
	isBadge?: boolean;
	linkUrl?: string;
	color?: string;
	fontSize?: number;
	breakLine?: boolean;
}

export interface PptxListItem {
	spans: PptxTextSpan[];
	level: number;
	ordered: boolean;
	index?: number;
	checked?: boolean;
}

export interface PptxTableCell {
	spans: PptxTextSpan[];
	isHeader: boolean;
	align?: 'left' | 'center' | 'right';
}

export type PptxBlock =
	| {
			kind: 'heading';
			level: 1 | 2 | 3 | 4 | 5 | 6;
			text: string;
			spans: PptxTextSpan[];
	  }
	| {
			kind: 'paragraph';
			spans: PptxTextSpan[];
	  }
	| {
			kind: 'list';
			ordered: boolean;
			items: PptxListItem[];
	  }
	| {
			kind: 'code';
			code: string;
			language?: string;
	  }
	| {
			kind: 'blockquote';
			spans: PptxTextSpan[];
	  }
	| {
			kind: 'callout';
			calloutType: string;
			title: string;
			spans: PptxTextSpan[];
	  }
	| {
			kind: 'table';
			rows: PptxTableCell[][];
	  }
	| {
			kind: 'image';
			dataUrl: string;
			alt: string;
			naturalWidth?: number;
			naturalHeight?: number;
	  }
	| {
			kind: 'kpi';
			value: string;
	  }
	| {
			kind: 'columns';
			count: number;
			style: ColumnStyle;
			ratio?: ColumnRatio;
			variant?: ColumnVariant;
			columns: PptxBlock[][];
	  }
	| {
			kind: 'hr';
	  };

export interface PptxLayoutBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface ExtractedSlideContent {
	index: number;
	layout: SlideLayout;
	title: string;
	blocks: PptxBlock[];
	notesText?: string;
}
