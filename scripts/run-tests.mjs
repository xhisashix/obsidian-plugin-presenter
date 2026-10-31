import esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

const outfile = 'tests/.bundle.test.mjs';

const jszipBrowserCleanPlugin = {
	name: 'jszip-browser-clean',
	setup(build) {
		build.onResolve({ filter: /^jszip$/ }, () => ({
			path: path.resolve('node_modules/jszip/lib/index.js'),
		}));

		build.onResolve(
			{ filter: /^(lie|setimmediate|readable-stream)$/ },
			(args) => ({
				path: args.path,
				namespace: 'jszip-shim',
			})
		);

		build.onLoad({ filter: /^lie$/, namespace: 'jszip-shim' }, () => ({
			contents: 'module.exports = Promise;',
			loader: 'js',
		}));

		build.onLoad(
			{ filter: /^setimmediate$/, namespace: 'jszip-shim' },
			() => ({
				contents: `
					if (typeof globalThis.setImmediate !== 'function') {
						globalThis.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
						globalThis.clearImmediate = (id) => clearTimeout(id);
					}
				`,
				loader: 'js',
			})
		);

		build.onLoad(
			{ filter: /^readable-stream$/, namespace: 'jszip-shim' },
			() => ({
				contents: 'module.exports = { Readable: null };',
				loader: 'js',
			})
		);
	},
};

const obsidianStubPlugin = {
	name: 'obsidian-stub',
	setup(build) {
		build.onResolve({ filter: /^obsidian$/ }, (args) => ({
			path: args.path,
			namespace: 'obsidian-stub',
		}));
		build.onLoad({ filter: /.*/, namespace: 'obsidian-stub' }, () => ({
			contents: `
				export class Modal { constructor(app) { this.app = app; } open() {} close() {} }
				export class SuggestModal extends Modal {
					setPlaceholder() {}
					setInstructions() {}
				}
				export class Plugin {}
				export class PluginSettingTab {}
				export class Setting {}
				export class Notice {}
				export class MarkdownView {}
				export class Component { load() {} unload() {} }
				export class TFile {}
				export class MarkdownRenderer { static render() {} }
				export function setIcon() {}
			`,
			loader: 'js',
		}));
	},
};

try {
	await esbuild.build({
		entryPoints: ['tests/index.test.ts'],
		bundle: true,
		platform: 'node',
		format: 'esm',
		outfile,
		target: 'node20',
		plugins: [obsidianStubPlugin, jszipBrowserCleanPlugin],
	});

	const child = spawn(process.execPath, ['--test', outfile], {
		stdio: 'inherit',
	});

	child.on('exit', (code) => {
		try {
			rmSync(outfile, { force: true });
		} catch {
			// ignore cleanup error
		}
		process.exit(code ?? 0);
	});
} catch (err) {
	console.error('Test build failed:', err);
	try {
		rmSync(outfile, { force: true });
	} catch {
		// ignore
	}
	process.exit(1);
}
