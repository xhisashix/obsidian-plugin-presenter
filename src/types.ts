export type ColumnStyle = 'card' | 'plain';
export type ColumnRatio = '2:1' | '1:2' | '3:1' | '1:3';
export type ColumnVariant = 'normal' | 'step';

export type SlideLayout = 'cover' | 'content' | 'section' | 'quote';
export type SlideType = SlideLayout;

export interface PresenterSettings {
	defaultBaseColor: string;
	defaultMainColor: string;
	defaultAccentColor: string;
	defaultHeader: string;
	defaultFooter: string;
	defaultLogo: string;
	aspectRatio: '16:9' | '4:3';
	defaultColumnStyle: ColumnStyle;
	showNotes: boolean;
	enableBadges: boolean;
	autoFitOverflow: boolean;
	enableSmartLayouts: boolean;
}

export const DEFAULT_SETTINGS: PresenterSettings = {
	defaultBaseColor: '#ffffff',
	defaultMainColor: '#1e293b',
	defaultAccentColor: '#2563eb',
	defaultHeader: '',
	defaultFooter: '',
	defaultLogo: '',
	aspectRatio: '16:9',
	defaultColumnStyle: 'card',
	showNotes: false,
	enableBadges: true,
	autoFitOverflow: false,
	enableSmartLayouts: true,
};

export interface SlideFrontmatter {
	baseColor?: string;
	mainColor?: string;
	accentColor?: string;
	header?: string;
	footer?: string;
	logo?: string;
	aspectRatio?: '16:9' | '4:3';
	theme?: string;
	columnStyle?: ColumnStyle;
	fit?: 'auto' | 'none' | boolean;
	smartLayouts?: boolean;
}

export const VIEW_TYPE_PRESENTER_PREVIEW = 'presenter-preview-view';

export interface SlideData {
	index: number;
	type: SlideType;
	layout?: SlideLayout;
	title: string;
	markdown: string;
	notes?: string;
	startLine?: number;
	endLine?: number;
}

export interface PresentationData {
	title: string;
	frontmatter: SlideFrontmatter;
	slides: SlideData[];
}

export interface ParseOptions {
	defaultColumnStyle?: ColumnStyle;
	enableBadges?: boolean;
	enableSmartLayouts?: boolean;
}

export interface SlideOverflowInfo {
	slideIndex: number;
	title: string;
	isOverflowing: boolean;
	overflowRatio: number; // e.g. 1.15 for +15%
	fittedScale: number;   // 0.70 to 1.00
	canSplitByHeading: boolean;
	splitHeadingTitle?: string;
	splitLineOffset?: number; // 0-indexed line relative to slide start
	absoluteSplitLine?: number; // absolute line in source note
}
