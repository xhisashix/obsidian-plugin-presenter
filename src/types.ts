export type ColumnStyle = 'card' | 'plain';

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
}

export type SlideType = 'cover' | 'content';

export const VIEW_TYPE_PRESENTER_PREVIEW = 'presenter-preview-view';

export interface SlideData {
	index: number;
	type: SlideType;
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
}
