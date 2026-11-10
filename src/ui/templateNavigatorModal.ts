import { type App, type Editor, MarkdownView, Modal, Notice } from 'obsidian';
import { isSingleLineComment, isThematicBreak, matchAtxHeading } from '../parser/blocks';
import { FenceTracker } from '../parser/fence';
import {
	DESIGN_PRINCIPLES,
	SLIDE_TEMPLATES,
	type SlideTemplateDefinition,
	TEMPLATE_CATEGORIES,
	type TemplateInsertMode,
	TEMPLATE_USECASES,
	buildTemplateMarkdown,
	getSlideTemplateById,
} from '../templates/slideTemplates';
import { renderTemplatePreviewIcon } from './templatePreviewIcon';

export type NavigatorTab = 'usecase' | 'all' | 'principles';

export interface TemplateNavigatorOptions {
	editor?: Editor | null;
	targetFilePath?: string | null;
	initialTab?: NavigatorTab;
	onInsert?: (template: SlideTemplateDefinition, mode: TemplateInsertMode) => void;
}

/**
 * Scans lines from the start of the document up to `upToLine` (inclusive) to determine
 * whether the current slide already has an `## H2` heading and whether any body content
 * has been written after that heading.
 */
function scanCurrentSlideHeadingState(
	editor: Editor,
	upToLine: number
): { hasH2: boolean; hasBodyAfterH2: boolean } {
	if (upToLine < 0) {
		return { hasH2: false, hasBodyAfterH2: false };
	}

	let startLine = 0;
	if (editor.getLine(0).trim() === '---') {
		let fmClosedAt = -1;
		for (let i = 1; i <= upToLine; i++) {
			const trimmed = editor.getLine(i).trim();
			if (trimmed === '---' || trimmed === '...') {
				fmClosedAt = i;
				break;
			}
		}
		if (fmClosedAt === -1) {
			return { hasH2: false, hasBodyAfterH2: false };
		}
		startLine = fmClosedAt + 1;
	}

	const fence = new FenceTracker();
	let hasH2 = false;
	let hasBodyAfterH2 = false;

	for (let i = startLine; i <= upToLine; i++) {
		const line = editor.getLine(i);
		if (fence.feed(line)) {
			if (hasH2) {
				hasBodyAfterH2 = true;
			}
			continue;
		}

		const heading = matchAtxHeading(line);
		if (heading && heading.level === 1) {
			hasH2 = false;
			hasBodyAfterH2 = false;
			continue;
		}
		if (heading && heading.level === 2) {
			hasH2 = true;
			hasBodyAfterH2 = false;
			continue;
		}
		if (isThematicBreak(line)) {
			hasH2 = false;
			hasBodyAfterH2 = false;
			continue;
		}

		if (hasH2) {
			const trimmed = line.trim();
			if (trimmed.length > 0 && !isSingleLineComment(line)) {
				hasBodyAfterH2 = true;
			}
		}
	}

	return { hasH2, hasBodyAfterH2 };
}

/**
 * Automatically determines whether a template should be inserted as a full slide
 * (`## Action Title` + body) or body-only (layout block only) based on the editor cursor/selection context.
 *
 * - If the current slide already has a `##` heading and no body content has been written yet
 *   (or the user selected only body lines beneath an existing `##` heading), returns `'body-only'`
 *   to avoid duplicating the slide heading.
 * - Otherwise returns `'full-slide'`.
 */
export function resolveSmartInsertMode(editor: Editor): 'full-slide' | 'body-only' {
	const selection = editor.getSelection();
	if (selection.length > 0) {
		if (/^\s*#{1,2}[ \t]+\S/.test(selection)) {
			return 'full-slide';
		}
		const from = editor.getCursor('from');
		const state = scanCurrentSlideHeadingState(editor, from.line - 1);
		return state.hasH2 ? 'body-only' : 'full-slide';
	}

	const cursor = editor.getCursor();
	const state = scanCurrentSlideHeadingState(editor, cursor.line);
	if (state.hasH2 && !state.hasBodyAfterH2) {
		return 'body-only';
	}
	return 'full-slide';
}

/**
 * Inserts a slide template snippet into the given Obsidian Editor.
 * Positions the cursor at the start of the newly inserted template so live preview
 * immediately syncs to the new slide.
 * Returns the resolved insert mode (`'full-slide'` or `'body-only'`).
 */
export function insertSlideTemplateIntoEditor(
	editor: Editor,
	template: SlideTemplateDefinition,
	mode: TemplateInsertMode = 'full-slide'
): 'full-slide' | 'body-only' {
	const resolvedMode: 'full-slide' | 'body-only' =
		mode === 'auto' ? resolveSmartInsertMode(editor) : mode;
	const snippet = buildTemplateMarkdown(template, resolvedMode);
	const selection = editor.getSelection();

	if (selection.length > 0) {
		const from = editor.getCursor('from');
		const to = editor.getCursor('to');
		editor.replaceRange(snippet, from, to);
		editor.setCursor({ line: from.line, ch: 0 });
		return resolvedMode;
	}

	const cursor = editor.getCursor();
	const currentLineText = editor.getLine(cursor.line);

	if (currentLineText.trim().length === 0) {
		editor.replaceRange(
			snippet,
			{ line: cursor.line, ch: 0 },
			{ line: cursor.line, ch: currentLineText.length }
		);
		editor.setCursor({ line: cursor.line, ch: 0 });
	} else {
		const prefix = '\n\n';
		editor.replaceRange(`${prefix}${snippet}`, {
			line: cursor.line,
			ch: currentLineText.length,
		});
		editor.setCursor({ line: cursor.line + 2, ch: 0 });
	}
	return resolvedMode;
}

/**
 * Resolves a usable Markdown Editor instance from the workspace.
 */
export function resolveMarkdownEditor(app: App, targetFilePath?: string | null): Editor | null {
	const activeView = app.workspace.getActiveViewOfType(MarkdownView);
	if (activeView) {
		if (!targetFilePath || activeView.file?.path === targetFilePath) {
			return activeView.editor;
		}
	}

	let fallbackEditor: Editor | null = null;
	app.workspace.iterateAllLeaves((leaf) => {
		if (leaf.view instanceof MarkdownView) {
			if (targetFilePath && leaf.view.file?.path === targetFilePath) {
				fallbackEditor = leaf.view.editor;
			} else if (!fallbackEditor) {
				fallbackEditor = leaf.view.editor;
			}
		}
	});

	return fallbackEditor;
}

/**
 * Interactive Slide Template Navigator Modal based on consulting slide layout methodology.
 * Provides 3 tabs:
 * 1. 目的から探す (12 purpose-driven usecases -> recommended & alternative templates)
 * 2. 全テンプレート (All 13 templates grouped into 4 structural categories)
 * 3. デザイン絶対原則 (6 core slide design & storytelling principles)
 */
export class TemplateNavigatorModal extends Modal {
	private activeTab: NavigatorTab;
	private selectedUsecaseIndex = 0;
	private selectedTemplate: SlideTemplateDefinition | null = null;
	private options: TemplateNavigatorOptions;

	private bodyContainerEl!: HTMLElement;
	private tabButtons: Map<NavigatorTab, HTMLButtonElement> = new Map();

	constructor(app: App, options: TemplateNavigatorOptions = {}) {
		super(app);
		this.options = options;
		this.activeTab = options.initialTab ?? 'usecase';
	}

	onOpen(): void {
		this.modalEl.addClass('presenter-template-nav-modal');
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('presenter-template-nav-content');

		this.buildHeader(contentEl);
		this.bodyContainerEl = contentEl.createDiv({ cls: 'presenter-template-nav-body' });
		this.renderBody();
	}

	onClose(): void {
		this.tabButtons.clear();
		this.contentEl.empty();
	}

	private buildHeader(parentEl: HTMLElement): void {
		const headerEl = parentEl.createDiv({ cls: 'presenter-template-nav-header' });

		const titleBlock = headerEl.createDiv({ cls: 'presenter-template-nav-title-block' });
		titleBlock.createEl('h2', {
			cls: 'presenter-template-nav-title',
			text: 'スライド・テンプレート体系',
		});
		titleBlock.createEl('p', {
			cls: 'presenter-template-nav-subtitle',
			text: 'プロフェッショナル基準のレイアウト設計と論理構成',
		});

		const tabsBar = headerEl.createDiv({ cls: 'presenter-template-nav-tabs' });
		const tabs: Array<{ id: NavigatorTab; label: string }> = [
			{ id: 'usecase', label: '目的から探す' },
			{ id: 'all', label: '全テンプレート' },
			{ id: 'principles', label: 'デザイン絶対原則' },
		];

		for (const tab of tabs) {
			const btn = tabsBar.createEl('button', {
				cls: 'presenter-template-nav-tab-btn',
				text: tab.label,
				attr: { type: 'button' },
			});
			if (tab.id === this.activeTab) {
				btn.addClass('is-active');
			}
			btn.onclick = () => {
				this.activeTab = tab.id;
				this.selectedTemplate = null;
				this.updateTabButtons();
				this.renderBody();
			};
			this.tabButtons.set(tab.id, btn);
		}
	}

	private updateTabButtons(): void {
		for (const [id, btn] of this.tabButtons.entries()) {
			if (id === this.activeTab) {
				btn.addClass('is-active');
			} else {
				btn.removeClass('is-active');
			}
		}
	}

	private renderBody(): void {
		this.bodyContainerEl.empty();

		if (this.selectedTemplate) {
			this.renderTemplateDetailView(this.bodyContainerEl, this.selectedTemplate);
			return;
		}

		if (this.activeTab === 'usecase') {
			this.renderUsecaseTab(this.bodyContainerEl);
		} else if (this.activeTab === 'all') {
			this.renderAllTemplatesTab(this.bodyContainerEl);
		} else {
			this.renderPrinciplesTab(this.bodyContainerEl);
		}
	}

	private renderUsecaseTab(container: HTMLElement): void {
		const layout = container.createDiv({ cls: 'presenter-template-usecase-layout' });

		// Left Sidebar: 12 Usecases
		const sidebar = layout.createDiv({ cls: 'presenter-template-usecase-sidebar' });
		const sidebarHeader = sidebar.createDiv({ cls: 'presenter-template-usecase-sidebar-header' });
		const qTitle = sidebarHeader.createDiv({ cls: 'presenter-template-usecase-q-title' });
		qTitle.createSpan({ cls: 'presenter-template-accent-q', text: 'Q.' });
		qTitle.createSpan({ text: ' スライドで何を伝えたいですか？' });
		sidebarHeader.createEl('p', {
			cls: 'presenter-template-usecase-q-desc',
			text: '1スライド・1メッセージの原則に従い、目的を選択してください。',
		});

		const listEl = sidebar.createDiv({ cls: 'presenter-template-usecase-list' });
		TEMPLATE_USECASES.forEach((uc, idx) => {
			const itemBtn = listEl.createEl('button', {
				cls:
					idx === this.selectedUsecaseIndex
						? 'presenter-template-usecase-item is-selected'
						: 'presenter-template-usecase-item',
				text: uc.label,
				attr: { type: 'button' },
			});
			itemBtn.onclick = () => {
				this.selectedUsecaseIndex = idx;
				this.renderBody();
			};
		});

		// Right Content: Recommended & Alternative Templates
		const mainPane = layout.createDiv({ cls: 'presenter-template-usecase-main' });
		const mainHeader = mainPane.createDiv({ cls: 'presenter-template-usecase-main-header' });
		mainHeader.createEl('h3', {
			cls: 'presenter-template-section-heading',
			text: '最適解（レイアウトの型）',
		});
		mainHeader.createEl('p', {
			cls: 'presenter-template-section-sub',
			text: '選択した目的に対して、コンサルティングファームが採用する最適な構造です。カードを選択すると厳格なルールとMarkdownスニペットを確認・挿入できます。',
		});

		const activeUsecase = TEMPLATE_USECASES[this.selectedUsecaseIndex] ?? TEMPLATE_USECASES[0]!;
		const primaryTemplate = getSlideTemplateById(activeUsecase.primary);
		const secondaryTemplate = activeUsecase.secondary
			? getSlideTemplateById(activeUsecase.secondary)
			: undefined;

		const cardsGrid = mainPane.createDiv({ cls: 'presenter-template-rec-grid' });
		if (primaryTemplate) {
			this.renderTemplateCard(cardsGrid, primaryTemplate, 'primary');
		}
		if (secondaryTemplate) {
			this.renderTemplateCard(cardsGrid, secondaryTemplate, 'secondary');
		}

		if (!secondaryTemplate && primaryTemplate) {
			const noteBox = mainPane.createDiv({ cls: 'presenter-template-single-note' });
			noteBox.setText(
				`このメッセージの性質においては、上記「${primaryTemplate.name}」の一択がプロの定石です。`
			);
		}
	}

	private renderAllTemplatesTab(container: HTMLElement): void {
		const wrapper = container.createDiv({ cls: 'presenter-template-all-wrapper' });
		const topBar = wrapper.createDiv({ cls: 'presenter-template-all-topbar' });
		topBar.createEl('h3', {
			cls: 'presenter-template-all-title',
			text: '全レイアウト・ライブラリ',
		});
		topBar.createSpan({
			cls: 'presenter-template-all-count',
			text: `全 ${SLIDE_TEMPLATES.length} 種類`,
		});

		for (const category of TEMPLATE_CATEGORIES) {
			const groupEl = wrapper.createDiv({ cls: 'presenter-template-category-group' });
			groupEl.createDiv({
				cls: 'presenter-template-category-badge',
				text: category,
			});

			const gridEl = groupEl.createDiv({ cls: 'presenter-template-all-grid' });
			const templatesInCat = SLIDE_TEMPLATES.filter((t) => t.category === category);
			for (const tpl of templatesInCat) {
				this.renderTemplateCard(gridEl, tpl, 'catalog');
			}
		}
	}

	private renderPrinciplesTab(container: HTMLElement): void {
		const wrapper = container.createDiv({ cls: 'presenter-template-principles-wrapper' });
		const intro = wrapper.createDiv({ cls: 'presenter-template-principles-intro' });
		intro.createEl('h3', {
			cls: 'presenter-template-principles-heading',
			text: '資料作成の基礎法則',
		});
		intro.createEl('p', {
			cls: 'presenter-template-principles-lead',
			text: 'トップファームの資料が美しく説得力を持つのは、以下の普遍的なルールが全スライドにわたって厳格に適用されているからです。',
		});

		const grid = wrapper.createDiv({ cls: 'presenter-template-principles-grid' });
		for (const principle of DESIGN_PRINCIPLES) {
			const card = grid.createDiv({ cls: 'presenter-template-principle-card' });
			const head = card.createDiv({ cls: 'presenter-template-principle-head' });
			head.createDiv({
				cls: 'presenter-template-principle-icon',
				text: principle.icon,
			});
			head.createEl('h4', {
				cls: 'presenter-template-principle-title',
				text: principle.title,
			});

			card.createDiv({
				cls: 'presenter-template-principle-summary',
				text: principle.content,
			});

			const ul = card.createEl('ul', { cls: 'presenter-template-principle-list' });
			for (const pt of principle.points) {
				const li = ul.createEl('li', { cls: 'presenter-template-principle-item' });
				li.createSpan({ cls: 'presenter-template-principle-dot', text: '●' });
				li.createSpan({ text: pt });
			}
		}
	}

	private renderTemplateCard(
		parentEl: HTMLElement,
		template: SlideTemplateDefinition,
		variant: 'primary' | 'secondary' | 'catalog'
	): void {
		const card = parentEl.createDiv({
			cls: `presenter-template-card is-${variant}`,
			attr: { role: 'button', tabindex: '0' },
		});

		const badgeRow = card.createDiv({ cls: 'presenter-template-card-badges' });
		if (variant === 'primary') {
			badgeRow.createSpan({
				cls: 'presenter-template-badge-primary',
				text: '推奨テンプレート',
			});
		} else if (variant === 'secondary') {
			badgeRow.createSpan({
				cls: 'presenter-template-badge-secondary',
				text: '代替パターン',
			});
		} else {
			badgeRow.createSpan({
				cls: 'presenter-template-badge-secondary',
				text: 'テンプレート詳細・挿入',
			});
		}

		const previewStage = card.createDiv({ cls: 'presenter-template-card-stage' });
		const previewCanvas = previewStage.createDiv({ cls: 'presenter-template-card-canvas' });
		renderTemplatePreviewIcon(previewCanvas, template.previewType);

		card.createEl('h4', {
			cls: 'presenter-template-card-name',
			text: template.name,
		});
		card.createDiv({
			cls: 'presenter-template-card-cat',
			text: template.category,
		});
		card.createDiv({
			cls: 'presenter-template-card-desc',
			text: template.description,
		});

		const openDetail = () => {
			this.selectedTemplate = template;
			this.renderBody();
		};

		card.onclick = openDetail;
		card.onkeydown = (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				openDetail();
			}
		};
	}

	private renderTemplateDetailView(
		container: HTMLElement,
		template: SlideTemplateDefinition
	): void {
		const detail = container.createDiv({ cls: 'presenter-template-detail' });

		// Detail Header with Back Button
		const topBar = detail.createDiv({ cls: 'presenter-template-detail-header' });
		const titleArea = topBar.createDiv({ cls: 'presenter-template-detail-title-area' });
		titleArea.createDiv({
			cls: 'presenter-template-detail-cat',
			text: template.category,
		});
		titleArea.createEl('h3', {
			cls: 'presenter-template-detail-name',
			text: template.name,
		});

		const backBtn = topBar.createEl('button', {
			cls: 'presenter-template-back-btn',
			text: '← 一覧へ戻る',
			attr: { type: 'button' },
		});
		backBtn.onclick = () => {
			this.selectedTemplate = null;
			this.renderBody();
		};

		// Two-column Detail Body
		const columns = detail.createDiv({ cls: 'presenter-template-detail-cols' });

		// Left Column: Visual Wireframe + Action Buttons
		const leftCol = columns.createDiv({ cls: 'presenter-template-detail-left' });
		const previewCard = leftCol.createDiv({ cls: 'presenter-template-detail-preview-box' });
		const canvas = previewCard.createDiv({ cls: 'presenter-template-detail-canvas' });
		renderTemplatePreviewIcon(canvas, template.previewType);

		const actionBox = leftCol.createDiv({ cls: 'presenter-template-detail-actions' });
		const insertFullBtn = actionBox.createEl('button', {
			cls: 'presenter-template-btn-primary',
			text: '＋ 新規スライドとして挿入（推奨）',
			attr: { type: 'button' },
		});
		insertFullBtn.onclick = () => this.handleInsert(template, 'full-slide');

		const insertBodyBtn = actionBox.createEl('button', {
			cls: 'presenter-template-btn-secondary',
			text: '＋ 現在のスライドにレイアウトのみ挿入',
			attr: { type: 'button' },
		});
		insertBodyBtn.onclick = () => this.handleInsert(template, 'body-only');

		const copyBtn = actionBox.createEl('button', {
			cls: 'presenter-template-btn-ghost',
			text: '📋 Markdownスニペットをコピー',
			attr: { type: 'button' },
		});
		copyBtn.onclick = () => {
			void this.handleCopy(template);
		};

		// Right Column: Structure, Rules, and Markdown Preview
		const rightCol = columns.createDiv({ cls: 'presenter-template-detail-right' });

		const intentBox = rightCol.createDiv({ cls: 'presenter-template-info-card' });
		intentBox.createEl('h4', {
			cls: 'presenter-template-info-heading',
			text: '💡 構造と意図',
		});
		intentBox.createEl('p', {
			cls: 'presenter-template-info-text',
			text: template.description,
		});
		const sceneBox = intentBox.createDiv({ cls: 'presenter-template-scene-box' });
		sceneBox.createEl('strong', { text: '最適なシーン: ' });
		sceneBox.createSpan({ text: template.scene });

		const rulesBox = rightCol.createDiv({ cls: 'presenter-template-info-card' });
		rulesBox.createEl('h4', {
			cls: 'presenter-template-info-heading',
			text: '⚖️ トップファームの厳格なルール',
		});
		const ruleList = rulesBox.createEl('ul', { cls: 'presenter-template-rule-list' });
		for (const rule of template.rules) {
			const li = ruleList.createEl('li', { cls: 'presenter-template-rule-item' });
			li.createSpan({ cls: 'presenter-template-rule-bullet', text: '■' });
			li.createSpan({ text: rule });
		}

		const snippetBox = rightCol.createDiv({ cls: 'presenter-template-info-card' });
		snippetBox.createEl('h4', {
			cls: 'presenter-template-info-heading',
			text: '📝 挿入されるMarkdownスニペット',
		});
		const pre = snippetBox.createEl('pre', { cls: 'presenter-template-snippet-pre' });
		pre.createEl('code', { text: buildTemplateMarkdown(template, 'full-slide') });
	}

	private handleInsert(template: SlideTemplateDefinition, mode: TemplateInsertMode): void {
		if (this.options.onInsert) {
			this.options.onInsert(template, mode);
			this.close();
			return;
		}

		const editor =
			this.options.editor ?? resolveMarkdownEditor(this.app, this.options.targetFilePath);
		if (!editor) {
			new Notice('Please open a Markdown note in the editor to insert a template.');
			return;
		}

		insertSlideTemplateIntoEditor(editor, template, mode);
		new Notice(`Inserted template: ${template.name}`);
		this.close();
	}

	private async handleCopy(template: SlideTemplateDefinition): Promise<void> {
		const markdown = buildTemplateMarkdown(template, 'full-slide');
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			await navigator.clipboard.writeText(markdown);
			new Notice(`Copied "${template.name}" snippet to clipboard.`);
		}
	}
}
