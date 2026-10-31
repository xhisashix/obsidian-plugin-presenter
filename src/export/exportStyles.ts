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
			padding: 28px 48px;
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
			margin: 14px 0;
			border-radius: 8px;
			border-left: 4px solid var(--presenter-accent-color);
			padding: 12px 16px;
			background: rgba(120, 120, 120, 0.05);
			box-sizing: border-box;
		}

		.callout-title {
			font-weight: 700;
			font-size: 16px;
			margin-bottom: 4px;
		}

		.callout-content {
			font-size: 15px;
		}

		.presenter-slide-content h2 {
			font-size: 32px;
			font-weight: 700;
			margin-bottom: 14px;
			color: var(--presenter-main-color);
			border-bottom: 3px solid var(--presenter-accent-color);
			padding-bottom: 6px;
		}

		.presenter-slide-content h3 {
			font-size: 24px;
			font-weight: 600;
			margin: 16px 0 10px 0;
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
			gap: 28px;
			width: 100%;
			margin: 16px 0;
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
		}

		.presenter-cols-4 {
			grid-template-columns: repeat(4, minmax(0, 1fr));
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
			padding-top: 36px;
		}

		.presenter-cols.presenter-cols-step .presenter-col::before {
			content: "STEP " counter(presenter-step-counter, decimal-leading-zero);
			position: absolute;
			top: 10px;
			left: 18px;
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
			padding: 22px 26px;
			box-sizing: border-box;
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
		.presenter-cols-plain .presenter-col,
		.presenter-col.presenter-col-plain {
			background: transparent;
			border: none;
			border-radius: 0;
			padding: 0;
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
			padding: 40px 20px;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		#handout-mode.hidden {
			display: none;
		}

		.handout-wrapper {
			width: 100%;
			max-width: 900px;
			display: flex;
			flex-direction: column;
			gap: 36px;
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

			.navbar, .progress-bar, .floating-controls, .notes-drawer {
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
