import {
	type App,
	TFile,
} from 'obsidian';

/**
 * Escapes HTML characters for safe injection.
 */
export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Converts an ArrayBuffer to a Base64-encoded string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i] as number);
	}
	if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
		return window.btoa(binary);
	}
	if (typeof btoa === 'function') {
		return btoa(binary);
	}
	return '';
}

/**
 * Determines the MIME type based on file extension.
 */
export function getMimeType(extension: string): string {
	const ext = extension.toLowerCase();
	switch (ext) {
		case 'svg':
			return 'image/svg+xml';
		case 'png':
			return 'image/png';
		case 'gif':
			return 'image/gif';
		case 'webp':
			return 'image/webp';
		default:
			return 'image/jpeg';
	}
}

/**
 * Reads a vault TFile and converts it to a base64 data URL, caching the result.
 */
export async function fileToBase64DataUrl(
	app: App,
	file: TFile,
	cache?: Map<string, string>
): Promise<string> {
	if (cache?.has(file.path)) {
		return cache.get(file.path)!;
	}

	const mime = getMimeType(file.extension);
	const buffer = await app.vault.adapter.readBinary(file.path);
	const base64 = arrayBufferToBase64(buffer);
	const dataUrl = `data:${mime};base64,${base64}`;

	if (cache) {
		cache.set(file.path, dataUrl);
	}

	return dataUrl;
}

/**
 * Resolves a logo string to a portable base64 data URL or external URL for export.
 * Vault files are read and converted to base64 so exported HTML works without Obsidian.
 */
export async function resolveLogoDataUrl(
	app: App,
	logoStr: string,
	sourcePath: string,
	cache?: Map<string, string>
): Promise<string | null> {
	if (!logoStr || !logoStr.trim()) return null;
	const trimmed = logoStr.trim();

	// Check if already an absolute external URL or data URI
	if (
		trimmed.startsWith('http://') ||
		trimmed.startsWith('https://') ||
		trimmed.startsWith('data:')
	) {
		return trimmed;
	}

	// Try resolving via exact vault path
	let file = app.vault.getAbstractFileByPath(trimmed);
	if (!(file instanceof TFile)) {
		// Try resolving via link syntax (e.g. "logo.png" or "[[logo.png]]")
		const cleanLink = trimmed.replace(/^\[\[/, '').replace(/\]\]$/, '');
		file = app.metadataCache.getFirstLinkpathDest(cleanLink, sourcePath);
	}

	if (file instanceof TFile) {
		try {
			return await fileToBase64DataUrl(app, file, cache);
		} catch (err) {
			console.warn('Failed to encode logo image to base64 for export:', logoStr, err);
		}
	}

	return null;
}

/**
 * Converts Obsidian vault local images in an element to inline base64 data URLs.
 * Reuses cached data URLs when the same image is referenced repeatedly across slides.
 */
export async function inlineLocalImages(
	app: App,
	container: HTMLElement,
	sourcePath: string,
	cache?: Map<string, string>
): Promise<void> {
	const imgs = container.querySelectorAll<HTMLImageElement>('img');
	for (let i = 0; i < imgs.length; i++) {
		const img = imgs[i];
		if (!img) continue;
		const src = img.getAttribute('src');
		if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
			continue;
		}

		// Try resolving via Obsidian resource path or link
		try {
			const cleanSrc = decodeURIComponent(src)
				.replace(/^app:\/\/local\//, '')
				.replace(/^app:\/\/obsidian\.md\//, '');
			let file = app.vault.getAbstractFileByPath(cleanSrc);
			if (!(file instanceof TFile)) {
				file = app.metadataCache.getFirstLinkpathDest(cleanSrc, sourcePath);
			}

			if (file instanceof TFile) {
				img.src = await fileToBase64DataUrl(app, file, cache);
			}
		} catch (e) {
			console.warn('Failed to inline image for export:', src, e);
		}
	}
}
