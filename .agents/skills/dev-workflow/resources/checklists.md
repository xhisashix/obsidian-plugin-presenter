# Development Workflow Checklists & Documentation Impact Matrix

This reference provides detailed checklists for Phase 2 (Design) and Phase 5 (Review & Documentation Sync) of the `dev-workflow` skill.

---

## 1. Documentation Impact Matrix (ドキュメント影響マトリクス)

Whenever you make a change in the codebase, check the corresponding rows below to identify all documentation files that **MUST** be updated before finishing the task:

| Change Category (変更種別) | `specification.md` | `architecture.md` | `ui-ux.md` | `standard-markdown-compatibility.md` | `README.md` & `README_ja.md` | `sample-presentation.md` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **New / Modified Markdown Syntax or HTML Directive** (`<!-- ... -->`, headings, `---`) | **YES** (§2, §4, §11, §12) | - | - | **YES** (§2, §3) | **YES** (Features, Usage) | **YES** (Optional demo) |
| **New / Modified Frontmatter Property or Plugin Setting** | **YES** (§3.2 Table) | - | - | - | **YES** (Features / Usage) | - |
| **New / Modified Command (`addCommand`)** | **YES** (§4.4, §14 Table) | - | - | - | **YES** (Features / Commands) | - |
| **New / Modified Source File or Module Split** (`src/**/*.ts`) | - | **YES** (§2 Tree & §2.1 Mermaid) | - | - | - | - |
| **New Export Format or Major Data Flow** (HTML, PPTX, Print) | **YES** (§7, §9) | **YES** (§3 Sequence Diagram) | **YES** (§8) | - | **YES** (Features, Distribution) | - |
| **New UI Modal, Toolbar Button, or Keyboard Shortcut** | **YES** (§6.1, §6.2) | **YES** (§2 if new file) | **YES** (§5–§11) | - | **YES** (Shortcuts Table) | - |
| **New Slide Layout, Typography, or CSS Token (`--presenter-*`)** | **YES** (§11) | - | **YES** (§2, §4) | - | **YES** (Features) | **YES** (Optional demo) |
| **Security / Bundling / CSS Architecture Rule** | **YES** (if user-relevant) | **YES** (§5 Strategy) | - | - | - | - |

---

## 2. Design Document Section Guide (各設計書の更新箇所ガイド)

### `docs/design/specification.md` (機能仕様書)
- **§2 スライド分割・解釈仕様**: スライド区切りルール、見出し自動継承（`inheritHeadings`）などの変更時
- **§3.2 パラメータ一覧表**: フロントマターキーまたはプラグイン設定（Settings）を追加・変更した時
- **§4 グリッドレイアウト（マルチカラム）仕様**: カラム記法・スタイル・挿入コマンドの変更時
- **§5 ラベル・バッジ装飾仕様**: `[xxx]` バッジ構文や除外ルールの変更時
- **§6 操作・ナビゲーション体系**: ショートカットキー（§6.1）やツールバーボタン（§6.2）の追加・変更時
- **§7 印刷・PDF出力仕様**: `@media print` やハンドアウト印刷の変更時
- **§8 リアルタイムプレビュー仕様**: プレビューペインの挙動・同期制御の変更時
- **§9 発表者ノート & 資料配布仕様**: ノート抽出（§9.1）、カンペドロワー（§9.2）、単一HTMLエクスポート（§9.3）、PowerPointエクスポート（§9.4）の変更時
- **§10 スライドはみ出し検知と自動フィット仕様**: Overflow計測、Auto-fit、分割機能の変更時
- **§11〜§13 スマートレイアウト・比率・ステップ・Overview・Lightbox・サマリー**: 各機能の変更時
- **§14 提供コマンド一覧**: `addCommand` でコマンドを追加・変更した時

### `docs/design/architecture.md` (システムアーキテクチャ設計書)
- **§2 コンポーネント構成 (ディレクトリツリー)**: `src/` 配下にファイルを追加・削除・リネームした時
- **§2.1 コンポーネント関連図 (Mermaid Flowchart)**: モジュール間の依存関係が変わった時
- **§3 データフロー (Mermaid Sequence Diagram)**: プレゼン開始、プレビュー同期、HTMLエクスポート、PPTXエクスポート等の処理フローが変わった時
- **§4 ライフサイクル・リソース管理**: `onload`/`onunload`、`onOpen`/`onClose` のイベント管理が変わった時
- **§5 レンダリング戦略とセキュリティ・互換性**: バンドル構成、セキュリティ対策、CSS設計原則が変わった時

### `docs/design/ui-ux.md` (UI/UX・スタイリング設計書)
- **§2 デザイントークン・CSS変数**: `--presenter-*` 変数や配色マッピング表の変更時
- **§3 レスポンシブスケーリング設計**: ステージサイズ計算やアスペクト比の変更時
- **§4 タイポグラフィ・レイアウト階層**: 表紙、本文、中扉、引用、KPIカード、Callout等のフォント・余白変更時
- **§5〜§11 各UIコンポーネントのUX仕様**: ツールバー、プレビューペイン、ノートドロワー、配布HTML、Overview Grid、Lightbox、Overflow検査モーダルのUI変更時

### `docs/design/standard-markdown-compatibility.md` (標準Markdown互換化 設計書)
- 新しいHTMLコメント指示子（`<!-- ... -->`）やCommonMark互換ルールを導入した時

---

## 3. Obsidian Plugin Coding Conventions Checklist (Obsidianプラグイン開発・コーディング規約チェックリスト)

During Phase 3 (Development) and Phase 5 (Review), verify compliance with `AGENTS.md`, the [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines), and `eslint-plugin-obsidianmd`:

### A. Architecture, TypeScript & Bundling
- [ ] **Minimal `main.ts`**: `src/main.ts` only handles plugin lifecycle (`onload`, `onunload`), settings loading/saving, and `addCommand` registrations.
- [ ] **File Size & Single Responsibility**: Feature logic is modularized across `src/parser/`, `src/ui/`, `src/export/`, and `src/commands/` (~200–300 lines max per file).
- [ ] **Strict TypeScript & Async Safety**: Compiles cleanly with `"strict": true`, no `any` types, explicit interfaces in `src/types.ts`, and `async/await` with proper error handling (no unhandled floating promises).
- [ ] **No Build Artifacts in Git**: Never stage or commit `main.js`, `node_modules/`, or temporary build outputs.

### B. Obsidian API & DOM Best Practices
- [ ] **DOM Creation Helpers**: Use Obsidian's `createEl()`, `createDiv()`, `createSpan()`, `empty()`, and `setText()` instead of raw `innerHTML` or `outerHTML` assignments.
- [ ] **Vault & File APIs (No Node/Electron in Runtime)**: Use `app.vault` (`read`, `create`, `modify`, `createBinary`, `modifyBinary`) and `normalizePath()` instead of Node.js `fs` or `path` modules (`obsidianmd/no-nodejs-modules`).
- [ ] **Workspace View Access**: Use `app.workspace.getActiveViewOfType(MarkdownView)` instead of directly referencing deprecated `app.workspace.activeLeaf`.

### C. Lifecycle, Event Cleanup & Performance
- [ ] **Registered Listeners**: Register all workspace, DOM, and interval listeners via `this.registerEvent()`, `this.registerDomEvent()`, and `this.registerInterval()`.
- [ ] **Component & Observer Cleanup**: Call `this.component.unload()` and `this.resizeObserver.disconnect()` inside `onClose()` / `onunload()`.
- [ ] **Preserve Workspace Leaves**: Do not detach custom view leaves in `onunload()` so user workspace layouts are restored on reload.
- [ ] **Lightweight Startup & Debouncing**: Keep `onload()` fast (lazy/on-demand initialization for heavy tasks like print/export), and debounce frequent editor/vault events.

### D. Commands, Settings & UX Copy (Obsidian Style Guide)
- [ ] **Sentence Case**: All UI text, setting names, section headings, buttons, and command names use **Sentence case** (e.g., `Auto-fit overflowing slides`, `Export presentation as powerpoint (.pptx)`).
- [ ] **Settings Headings**: Settings section headers use `new Setting(containerEl).setName('...').setHeading()` rather than raw HTML heading tags (`h1`–`h6`).
- [ ] **Declarative Settings Search**: Any new setting is added to `DEFAULT_SETTINGS`, `PresenterSettingTab.display()`, and `PresenterSettingTab.getSettingDefinitions()`.
- [ ] **Stable Command IDs**: Commands use stable `id`s via `this.addCommand()` and do not repeat the plugin name prefix in `name`.

### E. CSS, Security & Cross-Output Consistency
- [ ] **Zero `!important` & Scoped Selectors**: Neither `styles.css` nor `src/export/exportStyles.ts` contains `!important`; all classes are scoped under `.presenter-*`.
- [ ] **Zero Dynamic Code Execution**: Neither source code nor bundled dependencies (`main.js`) contain `createElement('script')`, `eval()`, or `new Function()`.
- [ ] **Local & Offline First**: Zero telemetry, zero hidden network calls, and strict vault scope.
- [ ] **Cross-Output Consistency**: New slide layouts or visual elements work across Live Preview, Fullscreen Modal, Print/PDF, Standalone HTML Export, and PowerPoint (`.pptx`) Export.

---

## 4. Phase 5 Final Self-Review Checklist (最終レビューチェックリスト)

Before reporting completion to the user or creating a PR:

1. **Quality Gates**:
   - [ ] `npm test` passes all unit and bundle security tests.
   - [ ] `npm run lint` passes with zero errors and warnings.
   - [ ] `npm run build` succeeds without TypeScript or esbuild errors.
2. **Documentation Synchronization**:
   - [ ] Checked the **Documentation Impact Matrix** above.
   - [ ] Updated affected `docs/design/*.md` files.
   - [ ] Updated both `README.md` (English) and `README_ja.md` (Japanese) so they remain in parity.
3. **Git Working Tree**:
   - [ ] Inspected `git status` and `git diff`.
   - [ ] Confirmed `main.js` and temporary scratch files are not staged or left dirty if unintended.
