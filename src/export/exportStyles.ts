export interface ExportStyleParams {
	baseColor: string;
	mainColor: string;
	accentColor: string;
	baseWidth: number;
	baseHeight: number;
}

/**
 * Returns the complete CSS styling for the standalone presentation HTML export.
 */
export function getExportStyles(params: ExportStyleParams): string {
	const { baseColor, mainColor, accentColor, baseWidth, baseHeight } = params;

	return `
		:root {
			--presenter-base-color: ${baseColor};
			--presenter-main-color: ${mainColor};
			--presenter-accent-color: ${accentColor};
			--slide-width: ${baseWidth}px;
			--slide-height: ${baseHeight}px;
		}

		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
			background: #090d16;
			color: #e2e8f0;
			overflow: hidden;
			height: 100vh;
			display: flex;
			flex-direction: column;
		}

		/* Top Navigation Bar */
		.navbar {
			height: 52px;
			background: rgba(15, 23, 42, 0.95);
			backdrop-filter: blur(10px);
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 0 20px;
			z-index: 100;
			flex-shrink: 0;
		}

		.nav-left {
			display: flex;
			align-items: center;
			gap: 14px;
			font-size: 14px;
			font-weight: 600;
			color: #f8fafc;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.nav-badge {
			background: rgba(56, 189, 248, 0.15);
			color: #38bdf8;
			border: 1px solid rgba(56, 189, 248, 0.3);
			border-radius: 4px;
			padding: 2px 8px;
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
		}

		.nav-right {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		/* Mode Switcher Buttons */
		.view-switch {
			display: flex;
			background: rgba(0, 0, 0, 0.35);
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 6px;
			padding: 2px;
		}

		.view-switch-btn {
			background: transparent;
			border: none;
			color: #94a3b8;
			padding: 6px 14px;
			font-size: 12px;
			font-weight: 600;
			border-radius: 4px;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: all 0.15s ease;
		}

		.view-switch-btn:hover {
			color: #ffffff;
		}

		.view-switch-btn.active {
			background: var(--presenter-accent-color);
			color: #ffffff;
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		}

		.btn-tool {
			background: rgba(255, 255, 255, 0.08);
			border: 1px solid rgba(255, 255, 255, 0.12);
			color: #cbd5e1;
			padding: 6px 12px;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 600;
			cursor: pointer;
			display: flex;
			align-items: center;
			gap: 6px;
			transition: all 0.15s ease;
		}

		.btn-tool:hover {
			background: rgba(255, 255, 255, 0.16);
			color: #ffffff;
		}

		.btn-tool.active {
			background: rgba(56, 189, 248, 0.25);
			color: #38bdf8;
			border-color: rgba(56, 189, 248, 0.4);
		}

		/* Slide Overview Grid / Table of Contents Modal */
		.presenter-overview-overlay {
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(9, 13, 22, 0.96);
			backdrop-filter: blur(16px);
			z-index: 1500;
			display: flex;
			flex-direction: column;
			padding: 36px 48px;
			box-sizing: border-box;
			overflow-y: auto;
		}

		.presenter-overview-overlay.hidden {
			display: none;
		}

		.presenter-overview-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 28px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.12);
			padding-bottom: 16px;
			flex-shrink: 0;
		}

		.presenter-overview-title {
			color: #ffffff;
			font-size: 20px;
			font-weight: 700;
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.presenter-overview-count {
			font-size: 13px;
			color: #94a3b8;
			background: rgba(255, 255, 255, 0.1);
			padding: 2px 8px;
			border-radius: 12px;
		}

		.presenter-overview-close-btn {
			position: relative;
			color: #ffffff;
			font-size: 20px;
			cursor: pointer;
			opacity: 0.75;
			transition: opacity 0.15s, background-color 0.15s;
			width: 40px;
			height: 40px;
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.12);
			border: none;
		}

		.presenter-overview-close-btn:hover {
			opacity: 1;
			background: rgba(255, 255, 255, 0.25);
		}

		.presenter-overview-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
			gap: 20px;
			width: 100%;
		}

		.presenter-overview-thumb {
			background: #1e293b;
			border: 2px solid transparent;
			border-radius: 8px;
			padding: 16px;
			cursor: pointer;
			transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
			display: flex;
			flex-direction: column;
			min-height: 120px;
			position: relative;
			box-sizing: border-box;
			text-align: left;
		}

		.presenter-overview-thumb:hover {
			transform: translateY(-3px);
			border-color: var(--presenter-accent-color);
			box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
		}

		.presenter-overview-thumb.is-active {
			border-color: var(--presenter-accent-color);
			box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.4);
		}

		.presenter-overview-thumb-badge {
			font-size: 11px;
			font-weight: 700;
			color: #94a3b8;
			margin-bottom: 8px;
			text-transform: uppercase;
		}

		.presenter-overview-thumb-title {
			color: #f1f5f9;
			font-size: 14px;
			font-weight: 600;
			line-height: 1.4;
			flex: 1;
			word-break: break-word;
		}

		.presenter-overview-thumb.is-section {
			background: rgba(56, 189, 248, 0.1);
			border: 1px dashed rgba(56, 189, 248, 0.4);
		}

		.presenter-overview-thumb.is-section .presenter-overview-thumb-title {
			color: var(--presenter-accent-color);
			text-align: center;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		/* Progress Bar */
		.progress-bar {
			height: 3px;
			background: var(--presenter-accent-color);
			width: 0%;
			transition: width 0.2s ease;
			flex-shrink: 0;
		}

		/* Presentation View Container */
		#presentation-mode {
			flex: 1;
			display: flex;
			flex-direction: column;
			position: relative;
			overflow: hidden;
		}

		.stage-container {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
			position: relative;
			padding: 20px;
		}

		/* Slide Card */
		.slide-card {
			width: var(--slide-width);
			height: var(--slide-height);
			background-color: var(--presenter-base-color);
			color: var(--presenter-main-color);
			box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
			border-radius: 12px;
			padding: 22px 44px;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			position: absolute;
			opacity: 0;
			pointer-events: none;
			transform-origin: center center;
			transition: opacity 0.2s ease;
		}

		.slide-card.active {
			opacity: 1;
			pointer-events: auto;
		}

		.presenter-slide-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			min-height: 22px;
			margin-bottom: 10px;
			border-bottom: 1px solid rgba(120, 120, 120, 0.15);
			padding-bottom: 4px;
			flex-shrink: 0;
		}

		.presenter-slide-header:empty {
			display: none;
		}

		.presenter-header-title {
			font-size: 13px;
			font-weight: 600;
			letter-spacing: 0.05em;
			text-transform: uppercase;
			color: var(--presenter-main-color);
			opacity: 0.65;
		}

		.presenter-logo-image {
			max-height: 20px;
			max-width: 120px;
			object-fit: contain;
		}

		.presenter-slide-body {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			font-size: 20px;
			line-height: 1.6;
		}

		.presenter-slide-cover .presenter-slide-body {
			justify-content: center;
			align-items: center;
			text-align: center;
		}

		.presenter-slide-cover h1 {
			font-size: 46px;
			font-weight: 800;
			margin-bottom: 20px;
			line-height: 1.25;
			color: var(--presenter-main-color);
		}

		/* Section Divider Slide Layout */
		.presenter-slide-section {
			justify-content: center;
			text-align: center;
			background: radial-gradient(circle at center, rgba(120, 120, 120, 0.04) 0%, transparent 70%), var(--presenter-base-color);
		}

		.presenter-slide-section .presenter-slide-body {
			justify-content: center;
			align-items: center;
			text-align: center;
		}

		.presenter-slide-section .presenter-slide-body h2 {
			font-size: 46px;
			font-weight: 800;
			border-bottom: none;
			color: var(--presenter-accent-color);
			margin-bottom: 16px;
		}

		.presenter-slide-section .presenter-slide-body p {
			font-size: 24px;
			opacity: 0.85;
			max-width: 800px;
			margin: 0 auto;
		}

		/* Quote / Big Statement Slide Layout */
		.presenter-slide-quote {
			justify-content: center;
			text-align: center;
		}

		.presenter-slide-quote .presenter-slide-body {
			justify-content: center;
			align-items: center;
		}

		.presenter-slide-quote .presenter-slide-body blockquote {
			border-left: none;
			background: transparent;
			padding: 0 40px;
			font-size: 28px;
			font-style: italic;
			line-height: 1.5;
			position: relative;
			color: var(--presenter-main-color);
		}

		.presenter-slide-quote .presenter-slide-body blockquote::before {
			content: "“";
			font-size: 72px;
			line-height: 1;
			color: var(--presenter-accent-color);
			opacity: 0.4;
			display: block;
			margin-bottom: -24px;
			font-family: Georgia, serif;
		}

		/* KPI / Metric styling */
		.presenter-kpi-value {
			font-size: 44px;
			font-weight: 800;
			color: var(--presenter-accent-color);
			line-height: 1.1;
			margin: 10px 0;
			letter-spacing: -0.02em;
			display: block;
			text-align: center;
		}

		/* Callouts */
		.presenter-slide-body .callout,
		.callout {
			margin: 8px 0;
			border-radius: 8px;
			border-left: 4px solid var(--presenter-accent-color);
			padding: 9px 14px;
			background: rgba(120, 120, 120, 0.05);
			box-sizing: border-box;
		}

		.callout-title {
			font-weight: 700;
			font-size: 15.5px;
			margin-bottom: 4px;
		}

		.presenter-slide-body .callout .callout-content p,
		.presenter-slide-body .callout .callout-content li,
		.callout-content {
			font-size: 15.5px;
			line-height: 1.42;
		}

		.presenter-slide-content h2 {
			font-size: 28px;
			font-weight: 700;
			margin-bottom: 10px;
			color: var(--presenter-main-color);
			border-bottom: 3px solid var(--presenter-accent-color);
			padding-bottom: 5px;
		}

		.presenter-slide-content h3 {
			font-size: 22px;
			font-weight: 600;
			margin: 14px 0 8px 0;
			color: var(--presenter-main-color);
		}

		.presenter-slide-body p {
			margin-bottom: 6px;
			margin-top: 4px;
		}

		.presenter-slide-body ul, .presenter-slide-body ol {
			padding-left: 24px;
			padding-inline-start: 24px;
			margin-left: 0;
			margin-top: 3px;
			margin-bottom: 5px;
		}

		.presenter-slide-body li {
			margin-bottom: 2px;
			line-height: 1.45;
		}

		.presenter-slide-body li > ul, .presenter-slide-body li > ol {
			padding-left: 16px;
			padding-inline-start: 16px;
			margin-left: 0;
			margin-top: 0;
			margin-bottom: 0;
		}

		.presenter-slide-body li > ul > li, .presenter-slide-body li > ol > li {
			margin-bottom: 1px;
		}

		.presenter-col h3 + ul,
		.presenter-col h3 + ol,
		.presenter-slide-body h3 + ul,
		.presenter-slide-body h3 + ol {
			margin-top: 2px;
		}

		.presenter-slide-body pre {
			background: rgba(0, 0, 0, 0.06);
			padding: 16px;
			border-radius: 8px;
			overflow-x: auto;
			font-size: 15px;
			font-family: monospace;
			margin-bottom: 16px;
		}

		.presenter-slide-body code {
			background: rgba(0, 0, 0, 0.05);
			padding: 2px 6px;
			border-radius: 4px;
			font-size: 0.9em;
		}

		/* Mermaid Diagrams */
		.presenter-slide-body .block-language-mermaid,
		.presenter-slide-body .mermaid {
			display: flex;
			justify-content: flex-start;
			align-items: center;
			text-align: left;
			width: 100%;
			margin: 12px 0;
			overflow: visible;
			line-height: normal;
		}

		.presenter-slide-body .block-language-mermaid svg,
		.presenter-slide-body .mermaid svg {
			margin-left: 0;
			margin-right: auto;
			max-width: 100%;
			max-height: 500px;
			height: auto;
			overflow: visible;
			filter: none;
		}

		/* Ensure Mermaid foreignObject does not clip node labels */
		.presenter-slide-body .block-language-mermaid foreignObject,
		.presenter-slide-body .mermaid foreignObject {
			overflow: visible;
		}

		.presenter-slide-body .block-language-mermaid g.edgePaths path.path,
		.presenter-slide-body .block-language-mermaid g.edgePaths path,
		.presenter-slide-body .mermaid g.edgePaths path.path,
		.presenter-slide-body .mermaid g.edgePaths path {
			stroke: var(--presenter-main-color);
			stroke-width: 2px;
			stroke-opacity: 0.85;
		}

		.presenter-slide-body .block-language-mermaid marker path,
		.presenter-slide-body .block-language-mermaid marker polygon,
		.presenter-slide-body .mermaid marker path,
		.presenter-slide-body .mermaid marker polygon {
			fill: var(--presenter-main-color);
			stroke: var(--presenter-main-color);
		}

		.presenter-slide-body .block-language-mermaid g.edgeLabels rect,
		.presenter-slide-body .block-language-mermaid g.edgeLabel rect,
		.presenter-slide-body .block-language-mermaid .edgeLabel .label rect,
		.presenter-slide-body .mermaid g.edgeLabels rect,
		.presenter-slide-body .mermaid g.edgeLabel rect,
		.presenter-slide-body .mermaid .edgeLabel .label rect {
			fill: var(--presenter-base-color, #ffffff);
			fill-opacity: 1;
			opacity: 1;
			stroke: color-mix(in srgb, var(--presenter-main-color) 25%, transparent);
			stroke-width: 1px;
			rx: 4px;
			ry: 4px;
		}

		.presenter-slide-body .block-language-mermaid .edgeLabel,
		.presenter-slide-body .block-language-mermaid g.edgeLabels .edgeLabel,
		.presenter-slide-body .block-language-mermaid g.edgeLabels foreignObject div,
		.presenter-slide-body .block-language-mermaid g.edgeLabels text,
		.presenter-slide-body .block-language-mermaid g.edgeLabels span,
		.presenter-slide-body .mermaid .edgeLabel,
		.presenter-slide-body .mermaid g.edgeLabels .edgeLabel,
		.presenter-slide-body .mermaid g.edgeLabels foreignObject div,
		.presenter-slide-body .mermaid g.edgeLabels text,
		.presenter-slide-body .mermaid g.edgeLabels span {
			background-color: var(--presenter-base-color, #ffffff);
			opacity: 1;
			color: var(--presenter-main-color);
			fill: var(--presenter-main-color);
			font-family: inherit;
			border-radius: 4px;
		}

		.presenter-slide-body .block-language-mermaid line.messageLine0,
		.presenter-slide-body .block-language-mermaid line.messageLine1,
		.presenter-slide-body .block-language-mermaid .messageLine0,
		.presenter-slide-body .block-language-mermaid .messageLine1,
		.presenter-slide-body .mermaid line.messageLine0,
		.presenter-slide-body .mermaid line.messageLine1,
		.presenter-slide-body .mermaid .messageLine0,
		.presenter-slide-body .mermaid .messageLine1 {
			stroke: var(--presenter-main-color);
			stroke-width: 1.5px;
			stroke-opacity: 0.85;
		}

		.presenter-slide-body .block-language-mermaid #arrowhead path,
		.presenter-slide-body .block-language-mermaid .arrowheadPath,
		.presenter-slide-body .mermaid #arrowhead path,
		.presenter-slide-body .mermaid .arrowheadPath {
			fill: var(--presenter-main-color);
			stroke: var(--presenter-main-color);
		}

		.presenter-slide-body .block-language-mermaid text.messageText,
		.presenter-slide-body .block-language-mermaid .messageText,
		.presenter-slide-body .mermaid text.messageText,
		.presenter-slide-body .mermaid .messageText {
			fill: var(--presenter-main-color);
			stroke: none;
			font-size: 13px;
			font-weight: 500;
			text-align: center;
		}

		.presenter-slide-body .block-language-mermaid line.actor-line,
		.presenter-slide-body .mermaid line.actor-line {
			stroke: color-mix(in srgb, var(--presenter-main-color) 35%, transparent);
			stroke-width: 1.5px;
		}

		.presenter-slide-body .block-language-mermaid .sequenceNumber,
		.presenter-slide-body .mermaid .sequenceNumber {
			fill: #ffffff;
			font-weight: 700;
			font-size: 11px;
		}

		.presenter-slide-body .block-language-mermaid .loopLine,
		.presenter-slide-body .mermaid .loopLine {
			stroke: color-mix(in srgb, var(--presenter-main-color) 40%, transparent);
		}

		.presenter-slide-body .block-language-mermaid .labelBox,
		.presenter-slide-body .mermaid .labelBox {
			fill: var(--presenter-main-color);
		}

		.presenter-slide-body .block-language-mermaid .labelText text,
		.presenter-slide-body .mermaid .labelText text {
			fill: #ffffff;
		}

		.presenter-slide-body table {
			width: 100%;
			border-collapse: separate;
			border-spacing: 0;
			margin-bottom: 16px;
			border-radius: 8px;
			overflow: hidden;
			border: 1px solid color-mix(in srgb, var(--presenter-main-color) 16%, transparent);
			box-shadow: 0 2px 8px color-mix(in srgb, var(--presenter-main-color) 4%, transparent);
			background-color: transparent;
		}

		.presenter-slide-body th, .presenter-slide-body td {
			padding: 10px 16px;
			text-align: left;
		}

		.presenter-slide-body th {
			background: color-mix(in srgb, var(--presenter-main-color) 6%, transparent);
			color: var(--presenter-main-color);
			font-weight: 700;
			border-top: none;
			border-left: none;
			border-bottom: 2px solid var(--presenter-accent-color);
			border-right: 1px solid color-mix(in srgb, var(--presenter-main-color) 12%, transparent);
		}

		.presenter-slide-body th:last-child {
			border-right: none;
		}

		.presenter-slide-body td {
			border-top: none;
			border-left: none;
			border-bottom: 1px solid color-mix(in srgb, var(--presenter-main-color) 10%, transparent);
			border-right: 1px solid color-mix(in srgb, var(--presenter-main-color) 10%, transparent);
			color: var(--presenter-main-color);
		}

		.presenter-slide-body td:last-child {
			border-right: none;
		}

		.presenter-slide-body tr:last-child td {
			border-bottom: none;
		}

		.presenter-slide-body tbody tr:nth-child(odd),
		.presenter-slide-body tbody tr:nth-child(odd) td {
			background-color: var(--presenter-base-color, #ffffff);
		}

		.presenter-slide-body tbody tr:nth-child(even),
		.presenter-slide-body tbody tr:nth-child(even) td {
			background-color: color-mix(in srgb, var(--presenter-main-color) 2.5%, var(--presenter-base-color, #ffffff));
		}

		.presenter-slide-body tbody tr:hover,
		.presenter-slide-body tbody tr:hover td {
			background-color: color-mix(in srgb, var(--presenter-accent-color) 6%, var(--presenter-base-color, #ffffff));
			transition: background-color 0.15s ease;
		}

		/* Badge */
		.presenter-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 2px 10px;
			font-size: 0.72em;
			font-weight: 700;
			line-height: 1.35;
			letter-spacing: 0.5px;
			border-radius: 6px;
			background: var(--presenter-accent-color, #2563eb);
			color: #ffffff;
			vertical-align: 2px;
			margin-right: 8px;
			box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
			text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
		}

		.presenter-slide-body .presenter-badge,
		h1 .presenter-badge,
		h2 .presenter-badge,
		h3 .presenter-badge,
		h4 .presenter-badge,
		h5 .presenter-badge,
		h6 .presenter-badge {
			color: #ffffff;
		}

		/* Multi-column grid */
		.presenter-cols {
			display: grid;
			gap: 20px;
			width: 100%;
			margin: 10px 0;
			align-items: stretch;
		}

		.presenter-cols-1 {
			grid-template-columns: 1fr;
		}

		.presenter-cols-2 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.presenter-cols-3 {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 16px;
		}

		.presenter-cols-4 {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 14px;
		}

		/* Non-uniform column ratios */
		.presenter-cols.presenter-cols-ratio-2-1 {
			grid-template-columns: 2fr 1fr;
		}

		.presenter-cols.presenter-cols-ratio-1-2 {
			grid-template-columns: 1fr 2fr;
		}

		.presenter-cols.presenter-cols-ratio-3-1 {
			grid-template-columns: 3fr 1fr;
		}

		.presenter-cols.presenter-cols-ratio-1-3 {
			grid-template-columns: 1fr 3fr;
		}

		/* Step flow process layout */
		.presenter-cols.presenter-cols-step {
			counter-reset: presenter-step-counter;
			position: relative;
		}

		.presenter-cols.presenter-cols-step .presenter-col {
			counter-increment: presenter-step-counter;
			position: relative;
			padding-top: 32px;
		}

		.presenter-cols.presenter-cols-step .presenter-col::before {
			content: "STEP " counter(presenter-step-counter, decimal-leading-zero);
			position: absolute;
			top: 8px;
			left: 16px;
			font-size: 11px;
			font-weight: 800;
			letter-spacing: 0.08em;
			color: var(--presenter-accent-color);
			background: rgba(120, 120, 120, 0.08);
			padding: 2px 8px;
			border-radius: 4px;
		}

		.presenter-col {
			display: flex;
			flex-direction: column;
			min-width: 0;
			background: rgba(120, 120, 120, 0.04);
			border: 1px solid rgba(120, 120, 120, 0.12);
			border-radius: 10px;
			padding: 15px 18px;
			box-sizing: border-box;
		}

		.presenter-slide-content .presenter-col h3 {
			font-size: 19.5px;
			margin: 0 0 6px 0;
			line-height: 1.3;
		}

		.presenter-slide-body .presenter-col p,
		.presenter-slide-body .presenter-col li {
			font-size: 17.5px;
			line-height: 1.4;
		}

		.presenter-slide-body .presenter-cols-3 .presenter-col,
		.presenter-slide-body .presenter-cols-4 .presenter-col {
			padding: 13px 15px;
		}

		.presenter-slide-content .presenter-cols-3 .presenter-col h3,
		.presenter-slide-content .presenter-cols-4 .presenter-col h3 {
			font-size: 18px;
			margin: 0 0 5px 0;
		}

		.presenter-slide-body .presenter-cols-3 .presenter-col p,
		.presenter-slide-body .presenter-cols-3 .presenter-col li,
		.presenter-slide-body .presenter-cols-4 .presenter-col p,
		.presenter-slide-body .presenter-cols-4 .presenter-col li {
			font-size: 16px;
			line-height: 1.38;
		}

		.presenter-slide-body .presenter-cols-3 .presenter-col ul,
		.presenter-slide-body .presenter-cols-3 .presenter-col ol,
		.presenter-slide-body .presenter-cols-4 .presenter-col ul,
		.presenter-slide-body .presenter-cols-4 .presenter-col ol {
			padding-left: 18px;
			padding-inline-start: 18px;
		}

		.presenter-slide-body .presenter-cols:has(~ .presenter-cols),
		.presenter-slide-body .presenter-cols + .presenter-cols {
			margin-top: 6px;
			margin-bottom: 6px;
			gap: 14px;
		}

		.presenter-slide-body .presenter-cols:has(~ .presenter-cols) .presenter-col,
		.presenter-slide-body .presenter-cols + .presenter-cols .presenter-col,
		.presenter-slide-body .callout ~ .presenter-cols .presenter-col {
			padding: 12px 15px;
		}

		.presenter-col .presenter-kpi-value {
			font-size: 32px;
			margin: 4px 0;
		}

		.presenter-slide-body .presenter-col table {
			font-size: 15px;
			margin: 6px 0;
		}

		.presenter-slide-body .presenter-col th,
		.presenter-slide-body .presenter-col td {
			padding: 6px 10px;
		}

		.presenter-col > :first-child {
			margin-top: 0;
		}

		.presenter-col h3 + ul,
		.presenter-col h3 + ol,
		.presenter-slide-body h3 + ul,
		.presenter-slide-body h3 + ol {
			margin-top: 2px;
			margin-block-start: 2px;
		}

		.presenter-col > :last-child {
			margin-bottom: 0;
		}

		/* Plain column style (borderless, transparent, no inner padding) */
		.presenter-slide-body .presenter-cols-plain .presenter-col,
		.presenter-cols-plain .presenter-col,
		.presenter-col.presenter-col-plain {
			background: transparent;
			border: none;
			border-radius: 0;
			padding: 0;
		}

		.presenter-slide-body .presenter-cols.presenter-cols-step .presenter-col,
		.presenter-cols.presenter-cols-step .presenter-col {
			padding-top: 32px;
		}

		.presenter-cols.presenter-cols-step > .presenter-col:not(:last-child)::after {
			content: "➔";
			position: absolute;
			right: -14px;
			top: 50%;
			transform: translateY(-50%);
			font-size: 16px;
			font-weight: 800;
			color: var(--presenter-accent-color);
			z-index: 2;
			pointer-events: none;
		}

		.presenter-cols:not(.presenter-cols-pyramid):not(.presenter-cols-funnel):not(.presenter-cols-plain) > .presenter-col.presenter-col-highlight {
			border: 2px solid var(--presenter-accent-color);
			background: rgba(37, 99, 235, 0.04);
		}

		/* Pyramid & Funnel Diagram Row Layout */
		.presenter-slide-body .presenter-cols.presenter-cols-pyramid,
		.presenter-slide-body .presenter-cols.presenter-cols-funnel,
		.presenter-cols.presenter-cols-pyramid,
		.presenter-cols.presenter-cols-funnel {
			display: flex;
			flex-direction: column;
			gap: 10px;
			margin: 10px 0;
		}

		.presenter-slide-body .presenter-cols.presenter-cols-pyramid .presenter-col.presenter-diagram-row,
		.presenter-slide-body .presenter-cols.presenter-cols-funnel .presenter-col.presenter-diagram-row,
		.presenter-cols.presenter-cols-pyramid .presenter-col.presenter-diagram-row,
		.presenter-cols.presenter-cols-funnel .presenter-col.presenter-diagram-row {
			display: grid;
			grid-template-columns: 44% 1fr;
			gap: 20px;
			align-items: stretch;
			background: transparent;
			border: none;
			border-radius: 0;
			padding: 0;
		}

		.presenter-tier-shape {
			display: flex;
			align-items: center;
			justify-content: center;
			text-align: center;
			min-height: 74px;
			padding: 10px 16px;
			box-sizing: border-box;
			background: var(--presenter-main-color);
			color: #ffffff;
			position: relative;
		}

		.presenter-slide-content .presenter-tier-shape h3,
		.presenter-tier-shape h3 {
			margin: 0;
			font-size: 16.5px;
			font-weight: 700;
			line-height: 1.3;
			color: #ffffff;
		}

		.presenter-cols-pyramid .presenter-tier-1 .presenter-tier-shape {
			clip-path: polygon(26% 0%, 74% 0%, 82% 100%, 18% 100%);
			padding-left: 22%;
			padding-right: 22%;
			background: var(--presenter-accent-color);
		}

		.presenter-cols-pyramid .presenter-tier-2 .presenter-tier-shape {
			clip-path: polygon(17% 0%, 83% 0%, 91% 100%, 9% 100%);
			padding-left: 14%;
			padding-right: 14%;
			background: color-mix(in srgb, var(--presenter-main-color) 74%, var(--presenter-base-color) 26%);
		}

		.presenter-cols-pyramid .presenter-tier-3 .presenter-tier-shape {
			clip-path: polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%);
			padding-left: 8%;
			padding-right: 8%;
			background: var(--presenter-main-color);
		}

		.presenter-cols-pyramid .presenter-tier-4 .presenter-tier-shape {
			clip-path: polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%);
			padding-left: 6%;
			padding-right: 6%;
			background: var(--presenter-main-color);
		}

		.presenter-cols-funnel .presenter-tier-shape {
			min-height: 64px;
		}

		.presenter-cols-funnel .presenter-tier-1 .presenter-tier-shape {
			clip-path: polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%);
			padding-left: 8%;
			padding-right: 8%;
			background: var(--presenter-main-color);
		}

		.presenter-cols-funnel .presenter-tier-2 .presenter-tier-shape {
			clip-path: polygon(9% 0%, 91% 0%, 83% 100%, 17% 100%);
			padding-left: 16%;
			padding-right: 16%;
			background: color-mix(in srgb, var(--presenter-main-color) 80%, var(--presenter-base-color) 20%);
		}

		.presenter-cols-funnel .presenter-tier-3 .presenter-tier-shape {
			clip-path: polygon(18% 0%, 82% 0%, 74% 100%, 26% 100%);
			padding-left: 24%;
			padding-right: 24%;
			background: color-mix(in srgb, var(--presenter-main-color) 62%, var(--presenter-base-color) 38%);
		}

		.presenter-cols-funnel .presenter-tier-4 .presenter-tier-shape {
			clip-path: polygon(26% 0%, 74% 0%, 68% 100%, 32% 100%);
			padding-left: 28%;
			padding-right: 28%;
			background: color-mix(in srgb, var(--presenter-main-color) 48%, var(--presenter-base-color) 52%);
		}

		.presenter-cols-funnel .presenter-col.presenter-col-highlight .presenter-tier-shape {
			background: var(--presenter-accent-color);
		}

		.presenter-tier-detail {
			display: flex;
			flex-direction: column;
			justify-content: center;
			background: rgba(120, 120, 120, 0.04);
			border: 1px solid rgba(120, 120, 120, 0.14);
			border-left: 4px solid var(--presenter-main-color);
			border-radius: 8px;
			padding: 10px 16px;
			position: relative;
		}

		.presenter-tier-detail::before {
			content: "➔";
			position: absolute;
			left: -18px;
			top: 50%;
			transform: translateY(-50%);
			font-size: 13px;
			color: rgba(120, 120, 120, 0.5);
			font-weight: 700;
		}

		.presenter-col.presenter-col-highlight .presenter-tier-detail {
			border-left-color: var(--presenter-accent-color);
			background: rgba(37, 99, 235, 0.04);
		}

		.presenter-col.presenter-col-highlight .presenter-tier-detail::before {
			color: var(--presenter-accent-color);
		}

		.presenter-tier-detail ul,
		.presenter-tier-detail ol,
		.presenter-tier-detail p {
			margin: 0;
		}

		/* 2x2 Matrix Layout */
		.presenter-slide-body .presenter-cols.presenter-cols-matrix,
		.presenter-cols.presenter-cols-matrix {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 16px;
			position: relative;
			padding: 8px 8px 22px 28px;
			border-left: 2.5px solid rgba(120, 120, 120, 0.4);
			border-bottom: 2.5px solid rgba(120, 120, 120, 0.4);
			margin: 8px 0;
		}

		.presenter-cols.presenter-cols-matrix::before {
			content: "▲ 高 (High)";
			position: absolute;
			top: -6px;
			left: 6px;
			font-size: 11px;
			font-weight: 800;
			color: var(--presenter-main-color);
			opacity: 0.75;
		}

		.presenter-cols.presenter-cols-matrix::after {
			content: "高 (High) ▶";
			position: absolute;
			bottom: 2px;
			right: 6px;
			font-size: 11px;
			font-weight: 800;
			color: var(--presenter-main-color);
			opacity: 0.75;
		}

		.presenter-cols.presenter-cols-matrix > .presenter-col:nth-child(2) {
			border: 2px solid var(--presenter-accent-color);
			background: rgba(37, 99, 235, 0.05);
		}

		/* Cycle / Loop Layout */
		.presenter-slide-body .presenter-cols.presenter-cols-cycle,
		.presenter-cols.presenter-cols-cycle {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 20px 32px;
			position: relative;
			margin: 8px 0;
		}

		.presenter-cols.presenter-cols-cycle::after {
			content: "↻";
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 40px;
			height: 40px;
			border-radius: 50%;
			background: var(--presenter-accent-color);
			color: #ffffff;
			font-size: 22px;
			font-weight: 800;
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 3;
		}

		.presenter-cols.presenter-cols-cycle > .presenter-col {
			position: relative;
		}

		.presenter-cols.presenter-cols-cycle > .presenter-col:nth-child(1)::after {
			content: "➔";
			position: absolute;
			right: -23px;
			top: 50%;
			transform: translateY(-50%);
			font-size: 16px;
			font-weight: 800;
			color: var(--presenter-accent-color);
		}

		.presenter-cols.presenter-cols-cycle > .presenter-col:nth-child(2)::after {
			content: "▼";
			position: absolute;
			bottom: -19px;
			left: 50%;
			transform: translateX(-50%);
			font-size: 13px;
			font-weight: 800;
			color: var(--presenter-accent-color);
		}

		.presenter-cols.presenter-cols-cycle > .presenter-col:nth-child(4)::after {
			content: "◀";
			position: absolute;
			left: -23px;
			top: 50%;
			transform: translateY(-50%);
			font-size: 14px;
			font-weight: 800;
			color: var(--presenter-accent-color);
		}

		.presenter-cols.presenter-cols-cycle > .presenter-col:nth-child(3)::after {
			content: "▲";
			position: absolute;
			top: -19px;
			left: 50%;
			transform: translateX(-50%);
			font-size: 13px;
			font-weight: 800;
			color: var(--presenter-accent-color);
		}

		/* Horizontal Bar Chart */
		.presenter-chart-bars {
			display: flex;
			flex-direction: column;
			gap: 14px;
			margin: 10px 0;
		}

		.presenter-chart-row {
			display: flex;
			flex-direction: column;
			gap: 5px;
		}

		.presenter-chart-meta {
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			gap: 8px;
			font-size: 15.5px;
			line-height: 1.3;
		}

		.presenter-chart-label {
			color: var(--presenter-main-color);
		}

		.presenter-chart-val {
			font-weight: 700;
			color: var(--presenter-main-color);
			opacity: 0.85;
			white-space: nowrap;
		}

		.presenter-chart-row-accent .presenter-chart-val {
			color: var(--presenter-accent-color);
			opacity: 1;
			font-weight: 800;
		}

		.presenter-chart-track {
			width: 100%;
			height: 18px;
			background: rgba(120, 120, 120, 0.12);
			border-radius: 6px;
			overflow: hidden;
		}

		.presenter-chart-fill {
			height: 100%;
			background: rgba(100, 116, 139, 0.55);
			border-radius: 6px;
		}

		.presenter-chart-row-accent .presenter-chart-fill {
			background: var(--presenter-accent-color);
		}

		.presenter-slide-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-top: auto;
			min-height: 20px;
			padding-top: 6px;
			border-top: 1px solid rgba(120, 120, 120, 0.15);
			font-size: 12px;
			opacity: 0.6;
			flex-shrink: 0;
		}

		/* Bottom Control Floating Bar */
		.floating-controls {
			position: absolute;
			bottom: 24px;
			left: 50%;
			transform: translateX(-50%);
			background: rgba(15, 23, 42, 0.85);
			backdrop-filter: blur(8px);
			border: 1px solid rgba(255, 255, 255, 0.15);
			border-radius: 30px;
			padding: 6px 16px;
			display: flex;
			align-items: center;
			gap: 12px;
			z-index: 90;
			box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
		}

		.nav-btn {
			background: transparent;
			border: none;
			color: #cbd5e1;
			width: 32px;
			height: 32px;
			border-radius: 50%;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 14px;
		}

		.nav-btn:hover {
			background: rgba(255, 255, 255, 0.1);
			color: #ffffff;
		}

		.counter-label {
			font-size: 13px;
			font-weight: 600;
			color: #cbd5e1;
			min-width: 60px;
			text-align: center;
		}

		/* Speaker Notes Drawer in Web View */
		.notes-drawer {
			height: 220px;
			background: rgba(15, 23, 42, 0.96);
			border-top: 1px solid rgba(255, 255, 255, 0.12);
			display: flex;
			flex-direction: column;
			z-index: 95;
			flex-shrink: 0;
			transition: all 0.2s ease;
		}

		.notes-drawer.hidden {
			display: none;
		}

		.notes-header {
			padding: 8px 24px;
			background: rgba(0, 0, 0, 0.3);
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
			font-size: 12px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: #94a3b8;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.notes-body {
			flex: 1;
			overflow-y: auto;
			padding: 16px 28px;
			font-size: 14px;
			line-height: 1.6;
			color: #e2e8f0;
		}

		.notes-empty {
			color: #64748b;
			font-style: italic;
		}

		/* Handout (Document Reading) Mode Container */
		#handout-mode {
			flex: 1;
			overflow-y: auto;
			background: #f1f5f9;
			color: #1e293b;
			padding: 40px 24px;
		}

		#handout-mode.hidden {
			display: none;
		}

		.handout-container {
			display: flex;
			justify-content: center;
			gap: 32px;
			width: 100%;
			max-width: 1240px;
			margin: 0 auto;
			align-items: flex-start;
		}

		/* Handout Table of Contents Sidebar */
		.handout-sidebar {
			position: sticky;
			top: 24px;
			width: 260px;
			max-height: calc(100vh - 100px);
			overflow-y: auto;
			background: #ffffff;
			border-radius: 12px;
			padding: 20px 16px;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
			border: 1px solid #e2e8f0;
			flex-shrink: 0;
			display: flex;
			flex-direction: column;
			gap: 16px;
		}

		.handout-sidebar-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding-bottom: 12px;
			border-bottom: 1px solid #e2e8f0;
		}

		.handout-sidebar-title {
			font-size: 15px;
			font-weight: 700;
			color: #0f172a;
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.handout-sidebar-count {
			font-size: 11px;
			font-weight: 600;
			color: #64748b;
			background: #f1f5f9;
			padding: 2px 8px;
			border-radius: 12px;
		}

		.handout-toc {
			display: flex;
			flex-direction: column;
			gap: 8px;
		}

		.handout-toc-list {
			list-style: none;
			padding: 0;
			margin: 0;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.handout-toc-item {
			display: flex;
			flex-direction: column;
		}

		.handout-toc-group {
			display: flex;
			flex-direction: column;
			gap: 4px;
		}

		.handout-toc-section-link {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 10px;
			border-radius: 6px;
			text-decoration: none;
			color: #1e293b;
			font-weight: 600;
			font-size: 13px;
			line-height: 1.4;
			transition: background-color 0.15s, color 0.15s;
		}

		.handout-toc-section-link:hover {
			background: #f8fafc;
			color: var(--presenter-accent-color);
		}

		.handout-toc-section-link.is-active {
			background: rgba(56, 189, 248, 0.12);
			color: var(--presenter-accent-color);
			font-weight: 700;
		}

		.handout-toc-section-icon {
			font-size: 13px;
			flex-shrink: 0;
		}

		.handout-toc-section-title {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.handout-toc-sublist {
			list-style: none;
			padding-left: 14px;
			margin: 0 0 4px 10px;
			display: flex;
			flex-direction: column;
			gap: 2px;
			border-left: 2px solid #e2e8f0;
		}

		.handout-toc-subitem {
			display: flex;
			flex-direction: column;
		}

		.handout-toc-link {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 5px 8px;
			border-radius: 4px;
			text-decoration: none;
			color: #64748b;
			font-size: 12px;
			line-height: 1.4;
			transition: background-color 0.15s, color 0.15s;
		}

		.handout-toc-link:hover {
			background: #f1f5f9;
			color: #0f172a;
		}

		.handout-toc-link.is-active {
			background: rgba(56, 189, 248, 0.12);
			color: var(--presenter-accent-color);
			font-weight: 600;
		}

		.handout-toc-num {
			font-size: 11px;
			font-weight: 600;
			color: #94a3b8;
			flex-shrink: 0;
		}

		.handout-toc-text {
			flex: 1;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.handout-wrapper {
			flex: 1;
			max-width: 900px;
			display: flex;
			flex-direction: column;
			gap: 36px;
			min-width: 0;
		}

		/* Responsive styling for smaller screens */
		@media (max-width: 1024px) {
			.handout-container {
				flex-direction: column;
				align-items: center;
			}

			.handout-sidebar {
				position: static;
				width: 100%;
				max-width: 900px;
				max-height: 280px;
			}
		}

		.handout-header-card {
			background: #ffffff;
			border-radius: 12px;
			padding: 32px 40px;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
			border: 1px solid #e2e8f0;
			text-align: center;
		}

		.handout-header-card h1 {
			font-size: 32px;
			color: #0f172a;
			margin-bottom: 8px;
		}

		.handout-meta {
			font-size: 14px;
			color: #64748b;
		}

		.handout-item {
			scroll-margin-top: 72px;
			background: #ffffff;
			border-radius: 12px;
			overflow: hidden;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
			border: 1px solid #e2e8f0;
			display: flex;
			flex-direction: column;
		}

		.handout-slide-preview {
			padding: 32px 44px;
			background-color: var(--presenter-base-color);
			color: var(--presenter-main-color);
			border-bottom: 1px solid #e2e8f0;
		}

		.handout-slide-preview .presenter-slide-body {
			font-size: 17px;
		}

		.handout-slide-preview h2 {
			font-size: 26px;
			margin-bottom: 16px;
			border-bottom: 2px solid var(--presenter-accent-color);
			padding-bottom: 6px;
		}

		.handout-notes-box {
			padding: 24px 36px;
			background: #f8fafc;
		}

		.handout-notes-badge {
			display: inline-block;
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: #2563eb;
			background: #eff6ff;
			border: 1px solid #bfdbfe;
			padding: 3px 8px;
			border-radius: 4px;
			margin-bottom: 10px;
		}

		.handout-notes-content {
			font-size: 14px;
			line-height: 1.7;
			color: #334155;
		}

		/* Print Styling */
		@media print {
			body {
				background: #ffffff;
				color: #000000;
				overflow: visible;
				height: auto;
			}

			.navbar, .progress-bar, .floating-controls, .notes-drawer, .handout-sidebar {
				display: none;
			}

			#presentation-mode {
				display: none;
			}

			#handout-mode {
				display: block;
				background: #ffffff;
				padding: 0;
				overflow: visible;
			}

			.handout-item {
				box-shadow: none;
				border: 1px solid #cbd5e1;
				page-break-after: always;
				break-after: page;
				margin-bottom: 20px;
			}
		}
	`;
}
