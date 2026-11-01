import type { TemplatePreviewType } from '../templates/slideTemplates';

/**
 * Renders a CSS wireframe preview icon for a slide template into the given container element.
 * Uses Obsidian DOM helpers (`createDiv`, `createSpan`) for safe, framework-free rendering.
 */
export function renderTemplatePreviewIcon(
	containerEl: HTMLElement,
	type: TemplatePreviewType
): HTMLElement {
	const root = containerEl.createDiv({
		cls: `presenter-tpl-icon presenter-tpl-icon-${type}`,
	});

	switch (type) {
		case 'horizontal': {
			root.createDiv({ cls: 'presenter-tpl-h-box presenter-tpl-bg-mcblue' });
			root.createSpan({ cls: 'presenter-tpl-h-arrow', text: '➔' });
			root.createDiv({ cls: 'presenter-tpl-h-box presenter-tpl-bg-mcblue' });
			root.createSpan({ cls: 'presenter-tpl-h-arrow', text: '➔' });
			root.createDiv({ cls: 'presenter-tpl-h-box presenter-tpl-bg-accent' });
			break;
		}

		case 'vertical-flow': {
			const topBar = root.createDiv({
				cls: 'presenter-tpl-vf-top presenter-tpl-bg-mcblue',
			});
			topBar.createSpan({ cls: 'presenter-tpl-vf-arrow', text: '➔' });
			const cols = root.createDiv({ cls: 'presenter-tpl-vf-cols' });
			cols.createDiv({ cls: 'presenter-tpl-vf-col presenter-tpl-bg-muted' });
			cols.createDiv({ cls: 'presenter-tpl-vf-col presenter-tpl-bg-muted' });
			cols.createDiv({ cls: 'presenter-tpl-vf-col presenter-tpl-bg-muted' });
			break;
		}

		case 'swimlane': {
			for (let i = 0; i < 3; i++) {
				const row = root.createDiv({
					cls: i < 2 ? 'presenter-tpl-sw-row presenter-tpl-sw-border' : 'presenter-tpl-sw-row',
				});
				row.createDiv({ cls: 'presenter-tpl-sw-label' });
				for (let j = 0; j < 3; j++) {
					if (i === j) {
						row.createDiv({
							cls:
								i === 2
									? 'presenter-tpl-sw-pill presenter-tpl-bg-accent'
									: 'presenter-tpl-sw-pill presenter-tpl-bg-mcblue',
						});
					} else if (j === i + 1) {
						row.createDiv({ cls: 'presenter-tpl-sw-line' });
					} else {
						row.createDiv({ cls: 'presenter-tpl-sw-spacer' });
					}
				}
			}
			break;
		}

		case 'cycle': {
			const grid = root.createDiv({ cls: 'presenter-tpl-cycle-grid' });
			const q1 = grid.createDiv({
				cls: 'presenter-tpl-cycle-cell presenter-tpl-cycle-tl presenter-tpl-bg-mcblue',
			});
			q1.setText('↻');
			grid.createDiv({
				cls: 'presenter-tpl-cycle-cell presenter-tpl-cycle-tr presenter-tpl-bg-mcblue-70',
			});
			grid.createDiv({
				cls: 'presenter-tpl-cycle-cell presenter-tpl-cycle-bl presenter-tpl-bg-mcblue-40',
			});
			grid.createDiv({
				cls: 'presenter-tpl-cycle-cell presenter-tpl-cycle-br presenter-tpl-bg-accent',
			});
			break;
		}

		case 'two-col': {
			const left = root.createDiv({ cls: 'presenter-tpl-twocol-left' });
			left.createDiv({ cls: 'presenter-tpl-line-head presenter-tpl-bg-mcblue' });
			left.createDiv({ cls: 'presenter-tpl-line-body presenter-tpl-w-85' });
			left.createDiv({ cls: 'presenter-tpl-line-body presenter-tpl-w-65' });
			const right = root.createDiv({
				cls: 'presenter-tpl-twocol-right presenter-tpl-bg-muted',
			});
			right.createDiv({ cls: 'presenter-tpl-twocol-dot' });
			break;
		}

		case 'three-col': {
			for (let i = 0; i < 3; i++) {
				const col = root.createDiv({ cls: 'presenter-tpl-threecol-item' });
				col.createDiv({ cls: 'presenter-tpl-threecol-head presenter-tpl-bg-mcblue' });
				col.createDiv({ cls: 'presenter-tpl-line-body' });
				col.createDiv({ cls: 'presenter-tpl-line-body' });
			}
			break;
		}

		case 'matrix': {
			const plane = root.createDiv({ cls: 'presenter-tpl-matrix-plane' });
			plane.createDiv({ cls: 'presenter-tpl-matrix-q presenter-tpl-matrix-tl' });
			plane.createDiv({ cls: 'presenter-tpl-matrix-q presenter-tpl-matrix-tr' });
			plane.createDiv({ cls: 'presenter-tpl-matrix-q presenter-tpl-matrix-bl' });
			plane.createDiv({ cls: 'presenter-tpl-matrix-q presenter-tpl-matrix-br' });
			plane.createDiv({
				cls: 'presenter-tpl-matrix-dot presenter-tpl-matrix-dot-hi presenter-tpl-bg-accent',
			});
			plane.createDiv({
				cls: 'presenter-tpl-matrix-dot presenter-tpl-matrix-dot-lo presenter-tpl-bg-mcblue',
			});
			break;
		}

		case 'pyramid': {
			root.createDiv({ cls: 'presenter-tpl-pyr-bar presenter-tpl-w-25 presenter-tpl-bg-accent' });
			root.createDiv({
				cls: 'presenter-tpl-pyr-bar presenter-tpl-w-55 presenter-tpl-bg-mcblue-60',
			});
			root.createDiv({
				cls: 'presenter-tpl-pyr-bar presenter-tpl-w-80 presenter-tpl-bg-mcblue-80',
			});
			root.createDiv({ cls: 'presenter-tpl-pyr-bar presenter-tpl-w-100 presenter-tpl-bg-mcblue' });
			break;
		}

		case 'chart': {
			const bars = root.createDiv({ cls: 'presenter-tpl-chart-bars' });
			bars.createDiv({ cls: 'presenter-tpl-chart-bar presenter-tpl-h-35 presenter-tpl-bg-muted' });
			bars.createDiv({ cls: 'presenter-tpl-chart-bar presenter-tpl-h-65 presenter-tpl-bg-muted' });
			const hiBar = bars.createDiv({
				cls: 'presenter-tpl-chart-bar presenter-tpl-h-100 presenter-tpl-bg-accent',
			});
			hiBar.createSpan({ cls: 'presenter-tpl-chart-target', text: '🎯' });

			const insight = root.createDiv({ cls: 'presenter-tpl-chart-insight' });
			insight.createDiv({ cls: 'presenter-tpl-chart-insight-head presenter-tpl-bg-accent' });
			insight.createDiv({ cls: 'presenter-tpl-line-body presenter-tpl-w-85' });
			break;
		}

		case 'big-number': {
			const num = root.createSpan({ cls: 'presenter-tpl-bignum-val', text: '150' });
			num.createSpan({ cls: 'presenter-tpl-bignum-unit', text: '%' });
			break;
		}

		case 'funnel': {
			root.createDiv({ cls: 'presenter-tpl-pyr-bar presenter-tpl-w-100 presenter-tpl-bg-mcblue' });
			root.createDiv({
				cls: 'presenter-tpl-pyr-bar presenter-tpl-w-80 presenter-tpl-bg-mcblue-80',
			});
			const mid = root.createDiv({
				cls: 'presenter-tpl-pyr-bar presenter-tpl-w-60 presenter-tpl-bg-accent presenter-tpl-funnel-alert',
			});
			mid.setText('!');
			root.createDiv({
				cls: 'presenter-tpl-pyr-bar presenter-tpl-w-40 presenter-tpl-bg-mcblue-40',
			});
			break;
		}

		case 'bento': {
			const grid = root.createDiv({ cls: 'presenter-tpl-bento-grid' });
			grid.createDiv({ cls: 'presenter-tpl-bento-main presenter-tpl-bg-mcblue' });
			grid.createDiv({ cls: 'presenter-tpl-bento-topr presenter-tpl-bg-muted' });
			grid.createDiv({ cls: 'presenter-tpl-bento-midl presenter-tpl-bg-muted-dark' });
			grid.createDiv({ cls: 'presenter-tpl-bento-accent presenter-tpl-bg-accent' });
			grid.createDiv({ cls: 'presenter-tpl-bento-botr presenter-tpl-bg-muted' });
			break;
		}

		case 'executive': {
			const banner = root.createDiv({
				cls: 'presenter-tpl-exec-banner presenter-tpl-bg-mcblue',
			});
			banner.setText('結論（アクションタイトル）');
			const cols = root.createDiv({ cls: 'presenter-tpl-exec-cols' });
			cols.createDiv({ cls: 'presenter-tpl-exec-col' });
			cols.createDiv({ cls: 'presenter-tpl-exec-col' });
			cols.createDiv({ cls: 'presenter-tpl-exec-col presenter-tpl-exec-col-accent' });
			break;
		}
	}

	return root;
}
