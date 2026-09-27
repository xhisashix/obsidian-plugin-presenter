export interface PresenterSettings {
	defaultBaseColor: string;
	defaultMainColor: string;
	defaultAccentColor: string;
	defaultHeader: string;
	defaultFooter: string;
	defaultLogo: string;
	aspectRatio: '16:9' | '4:3';
}

export const DEFAULT_SETTINGS: PresenterSettings = {
	defaultBaseColor: '#ffffff',
	defaultMainColor: '#1e293b',
	defaultAccentColor: '#2563eb',
	defaultHeader: '',
	defaultFooter: '',
	defaultLogo: '',
	aspectRatio: '16:9',
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
}

export type SlideType = 'cover' | 'content';

export interface SlideData {
	index: number;
	type: SlideType;
	title: string;
	markdown: string;
}

export interface PresentationData {
	title: string;
	frontmatter: SlideFrontmatter;
	slides: SlideData[];
}
