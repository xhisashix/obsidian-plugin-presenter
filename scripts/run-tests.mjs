import esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const outfile = 'tests/.bundle.test.mjs';

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
		plugins: [obsidianStubPlugin],
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
