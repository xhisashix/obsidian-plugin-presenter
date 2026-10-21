import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { TFile, type App } from 'obsidian';
import {
	arrayBufferToBase64,
	escapeHtml,
	fileToBase64DataUrl,
	getMimeType,
	resolveLogoDataUrl,
} from '../src/export/imageInliner';
import { getExportStyles } from '../src/export/exportStyles';
import { getExportScript } from '../src/export/exportScript';
import {
	buildHandoutItemsHtml,
	buildSlideCardsHtml,
	type RenderedExportSlide,
} from '../src/export/htmlExporter';

void test('escapeHtml escapes dangerous HTML characters', () => {
	assert.equal(
		escapeHtml('<script>alert("xss" & \'test\')</script>'),
		'&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;'
	);
});

void test('getMimeType returns correct mime types for common image formats', () => {
	assert.equal(getMimeType('svg'), 'image/svg+xml');
	assert.equal(getMimeType('SVG'), 'image/svg+xml');
	assert.equal(getMimeType('png'), 'image/png');
	assert.equal(getMimeType('gif'), 'image/gif');
	assert.equal(getMimeType('webp'), 'image/webp');
	assert.equal(getMimeType('jpg'), 'image/jpeg');
	assert.equal(getMimeType('jpeg'), 'image/jpeg');
});

void test('arrayBufferToBase64 converts byte buffer to Base64 string', () => {
	const text = 'Hello, Obsidian Presenter!';
	const buffer = new TextEncoder().encode(text).buffer;
	const base64 = arrayBufferToBase64(buffer);
	assert.equal(base64, Buffer.from(text).toString('base64'));
});

void test('fileToBase64DataUrl reads binary and caches base64 result', async () => {
	const sampleContent = 'PNG_DUMMY_BINARY_DATA';
	const buffer = new TextEncoder().encode(sampleContent).buffer;
	let readCount = 0;

	const mockFile = new TFile();
	Object.assign(mockFile, {
		path: 'assets/image.png',
		extension: 'png',
	});

	const mockApp = {
		vault: {
			adapter: {
				readBinary: async (path: string) => {
					readCount++;
					assert.equal(path, 'assets/image.png');
					return buffer;
				},
			},
		},
	} as unknown as App;

	const cache = new Map<string, string>();

	// First call reads from vault and populates cache
	const url1 = await fileToBase64DataUrl(mockApp, mockFile, cache);
	assert.equal(readCount, 1);
	assert.match(url1, /^data:image\/png;base64,/);
	assert.equal(cache.has('assets/image.png'), true);

	// Second call hits cache without calling readBinary
	const url2 = await fileToBase64DataUrl(mockApp, mockFile, cache);
	assert.equal(readCount, 1);
	assert.equal(url1, url2);
});

void test('resolveLogoDataUrl handles external URLs, data URLs, and vault files', async () => {
	const mockApp = {
		vault: {
			getAbstractFileByPath: () => null,
		},
		metadataCache: {
			getFirstLinkpathDest: () => null,
		},
	} as unknown as App;

	// Empty input
	assert.equal(await resolveLogoDataUrl(mockApp, '', 'note.md'), null);

	// External HTTP/HTTPS
	assert.equal(
		await resolveLogoDataUrl(mockApp, 'https://example.com/logo.png', 'note.md'),
		'https://example.com/logo.png'
	);

	// Inline Data URI
	assert.equal(
		await resolveLogoDataUrl(mockApp, 'data:image/svg+xml;base64,PHN2Zz4=', 'note.md'),
		'data:image/svg+xml;base64,PHN2Zz4='
	);
});

void test('getExportStyles generates CSS with provided colors and dimensions', () => {
	const css = getExportStyles({
		baseColor: '#123456',
		mainColor: '#abcdef',
		accentColor: '#fe5722',
		baseWidth: 1920,
		baseHeight: 1080,
	});

	assert.match(css, /--presenter-base-color:\s*#123456/);
	assert.match(css, /--presenter-main-color:\s*#abcdef/);
	assert.match(css, /--presenter-accent-color:\s*#fe5722/);
	assert.match(css, /--slide-width:\s*1920px/);
	assert.match(css, /--slide-height:\s*1080px/);
});

void test('getExportScript includes total slide count and client logic', () => {
	const script = getExportScript({
		totalSlides: 5,
		baseWidth: 1280,
		baseHeight: 720,
		slidesData: [{ index: 0, notesHtml: '<p>Note</p>' }],
	});

	assert.match(script, /const total = 5;/);
	assert.match(script, /showSlide\(index\)/);
	assert.match(script, /nextSlide\(\)/);
});

void test('buildSlideCardsHtml and buildHandoutItemsHtml construct proper structure', () => {
	const dummySlides: RenderedExportSlide[] = [
		{
			index: 0,
			type: 'cover',
			title: 'Title Slide',
			bodyHtml: '<h1>Welcome</h1>',
			notesHtml: '<p>Speaker notes</p>',
		},
	];

	const slideHtml = buildSlideCardsHtml(
		dummySlides,
		'Company Presentation',
		'Page Footer',
		'<div class="logo"></div>',
		1
	);

	assert.match(slideHtml, /presenter-slide-cover/);
	assert.match(slideHtml, /Company Presentation/);
	assert.match(slideHtml, /class="logo"/);
	assert.match(slideHtml, /1 \/ 1/);

	const handoutHtml = buildHandoutItemsHtml(dummySlides, 'Page Footer', 1);
	assert.match(handoutHtml, /handout-item/);
	assert.match(handoutHtml, /Speaker notes/);
	assert.match(handoutHtml, /Slide 1 of 1/);
});
