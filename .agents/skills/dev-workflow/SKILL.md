---
name: dev-workflow
description: >-
  Standardized end-to-end development workflow for the Obsidian Presenter plugin
  covering Requirements -> Design -> Development -> Testing -> Review (including
  mandatory design document and README synchronization). Use this skill whenever
  developing a new feature, modifying specifications, refactoring architecture,
  or fixing bugs to ensure zero documentation drift and strict quality compliance.
---

# Obsidian Presenter Development Workflow Skill

This skill defines the standard 5-phase engineering workflow (**Requirements → Design → Development → Testing → Review**) for the Obsidian Presenter plugin.

Follow these phases in order when implementing features, enhancements, or architectural changes so that code quality, test coverage, and documentation (`docs/design/*.md`, `README.md`, `README_ja.md`) always remain in sync.

---

## Phase 1: Requirements (要件定義)

Before writing code, clarify the scope, user value, and constraints.

1. **Clarify Purpose & User Experience**:
   - Identify **Why** the change is needed and **What** user scenario it solves.
   - If any requirement is ambiguous (e.g., syntax format, default toggle state, edge-case behavior), ask the user for clarification before proceeding.
2. **Define Functional Scope**:
   - **Markdown Syntax / Directives**: Does this introduce or change headings, HTML comments (`<!-- ... -->`), badges, or callouts?
   - **Configuration**: Does it require a new plugin setting (`PresenterSettings`), frontmatter key (`PresentationFrontmatter`), or command (`addCommand`)?
   - **Presentation Views & Exports**: How should this feature behave across all outputs?
     - Live Split-Pane Preview (`PresenterPreviewView`)
     - Fullscreen Presentation (`PresenterModal`)
     - Print / Handout PDF (`@media print`)
     - Standalone HTML Export (`htmlExporter.ts`)
     - Editable PowerPoint Export (`pptxExporter.ts`)
3. **Verify Core Project Principles**:
   - **Standard Markdown Compatibility**: New syntax MUST remain valid, readable CommonMark/GFM in other viewers (use HTML comments `<!-- ... -->` for invisible layout hints).
   - **Zero-Config Principle**: Notes must work out of the box without requiring frontmatter.
   - **Offline & Security Compliance**: No network calls, no telemetry, no dynamic script evaluation.

---

## Phase 2: Design (設計 & ドキュメント影響特定)

Design the module structure and explicitly identify which design documents and README sections must be updated.

1. **Architecture & Module Boundaries**:
   - Keep `src/main.ts` minimal (lifecycle and command registration only).
   - Split responsibilities cleanly across modules (keep individual files under ~200–300 lines):
     - `src/parser/`: Markdown parsing, frontmatter, directives, columns, layout inference
     - `src/ui/`: Modals, preview view, slide renderer, stage helpers, overflow measurement
     - `src/export/`: Standalone HTML exporter and PowerPoint (`.pptx`) exporter
     - `src/commands/`: Editor and presentation command handlers
     - `src/types.ts` & `src/settings.ts`: Interfaces, defaults, and settings tab
2. **Identify Documentation Impact (Mandatory Planning)**:
   Check the Documentation Impact Matrix in [resources/checklists.md](./resources/checklists.md) to determine which files in `docs/design/` and root markdown files will require updates:
   - `docs/design/specification.md`: New features, syntax rules, frontmatter keys, settings, commands, or export behaviors.
   - `docs/design/architecture.md`: New source files/modules, component relationships, or data-flow sequences.
   - `docs/design/ui-ux.md`: New modals, toolbar buttons, keyboard shortcuts, typography, or CSS variables.
   - `docs/design/standard-markdown-compatibility.md`: New HTML comment directives or CommonMark parsing rules.
   - `README.md` & `README_ja.md`: User-facing features, usage examples, shortcuts, or commands.
   - `examples/sample-presentation.md`: Demo slides showcasing the new capability.
3. **Align on Design (For Complex Tasks)**:
   - For non-trivial features or breaking changes, briefly present the design and affected files to the user before implementation.

---

## Phase 3: Development (開発・実装)

Implement the changes in strict compliance with **Obsidian Community Plugin Coding Conventions** (`AGENTS.md`, [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines), [Obsidian Style Guide](https://help.obsidian.md/style-guide), and `eslint-plugin-obsidianmd`).

1. **Branch Hygiene**:
   - Check the current branch (`git branch --show-current`). Work on a dedicated feature/fix branch branched off `develop` unless instructed otherwise.
2. **Obsidian Plugin Coding Conventions (Mandatory)**:
   - **File & Module Organization**:
     - Keep `src/main.ts` minimal (focused only on plugin lifecycle `onload`/`onunload` and command registration).
     - Split feature logic into focused modules with single responsibilities (~200–300 lines max per file).
     - Never commit build artifacts (`main.js`, `node_modules/`).
   - **Obsidian DOM & Vault API Usage**:
     - Use Obsidian's DOM helpers (`createEl`, `createDiv`, `createSpan`, `empty()`, `setText()`) instead of raw `innerHTML` / `outerHTML` assignments.
     - Use Obsidian's `Vault` and `FileManager` APIs (`app.vault.read`, `app.vault.createBinary`, `app.vault.modifyBinary`, `normalizePath`) instead of Node.js `fs` or `path` modules (`obsidianmd/no-nodejs-modules` compliance & mobile compatibility).
     - Access active views via `app.workspace.getActiveViewOfType(MarkdownView)` rather than deprecated `activeLeaf` access.
   - **Safe Lifecycle, Event & Memory Management**:
     - Register all workspace, DOM, and interval listeners with `this.registerEvent()`, `this.registerDomEvent()`, and `this.registerInterval()` so they unload cleanly.
     - Always call `unload()` on child `Component` instances (e.g., passed to `MarkdownRenderer.render`) and `disconnect()` on `ResizeObserver` instances inside `onClose()` / `onunload()`.
     - Do not forcibly detach workspace leaves in `onunload()` so user workspace layouts are preserved across plugin reloads.
     - Keep `onload()` lightweight; defer heavy work (like print DOM generation or export rendering) until triggered on-demand.
   - **UX Copy, Settings & Commands (Obsidian Style Guide)**:
     - Always use **Sentence case** for UI headings, buttons, command names, and setting labels (e.g., `Export presentation as powerpoint (.pptx)` — never Title Case).
     - Use `new Setting(containerEl).setName('...').setHeading()` for settings section headers instead of raw `<h1>`–`<h6>` elements.
     - Register commands via `this.addCommand()` with stable command `id`s (do not include the plugin name prefix in `name`, as Obsidian adds it automatically).
     - When adding a setting in `src/settings.ts`, update `DEFAULT_SETTINGS`, the `display()` UI, `loadData()`/`saveData()` persistence, and `getSettingDefinitions()`.
   - **CSS & Styling Rules**:
     - **Zero `!important`**: Never use `!important` in `styles.css` or `src/export/exportStyles.ts`. Control overrides via selector specificity (e.g., `.presenter-slide-card .presenter-slide-body ...`).
     - Scope all CSS classes with the `.presenter-` prefix to prevent leaking styles into Obsidian's core workspace or other plugins.
   - **Security, Privacy & TypeScript Strictness**:
     - Adhere to `"strict": true` in TypeScript with explicit interfaces in `src/types.ts` and proper `async/await` error handling (no floating promises).
     - **Zero Dynamic Code Execution**: Never introduce `createElement('script')`, `eval()`, or `new Function()` in source code or bundled third-party dependencies.
     - Maintain 100% local/offline operation with zero telemetry or unauthorized network requests.
   - **Cross-Output Parity**:
     - When adding visual slide elements or layouts, ensure consistent rendering across in-app view (`styles.css`), standalone HTML export (`exportStyles.ts`), and PowerPoint export (`pptxLayoutRenderer.ts`).

---

## Phase 4: Testing (テスト & 品質ゲート)

Verify the implementation with automated unit tests and static analysis.

1. **Write / Update Unit Tests**:
   - Add unit tests covering happy paths, edge cases (e.g., code fences, empty slides, frontmatter overrides), and regression checks:
     - `tests/parser.test.ts`: Slide splitting, frontmatter, columns, badges, layout inference, heading inheritance
     - `tests/overflow.test.ts`: Overflow calculation, auto-fit scaling, slide split detection, caching
     - `tests/export.test.ts`: HTML export styles, scripts, image inlining, DOM structure
     - `tests/pptx.test.ts`: PPTX theme, DOM block extraction, layout rendering, bundle security checks
   - If a new test file is created, import it in `tests/index.test.ts`.
2. **Run All Quality Gates**:
   Execute the full verification suite and resolve any failures or warnings:
   ```bash
   npm test
   npm run lint
   npm run build
   ```
   - `npm test`: Must pass 100% of unit tests.
   - `npm run lint`: Must pass ESLint (`eslint-plugin-obsidianmd`) with zero warnings/errors.
   - `npm run build`: Must pass `tsc -noEmit` and production esbuild bundling cleanly.

---

## Phase 5: Review & Documentation Sync (レビュー・ドキュメント反映)

Perform a thorough self-review and synchronize all documentation before concluding the task.

1. **Update Documentation & Design Docs (Mandatory Gate)**:
   Update all documents identified in Phase 2 using the checklist in [resources/checklists.md](./resources/checklists.md):
   - [ ] `docs/design/specification.md` updated (if specs, frontmatter, settings, or commands changed)
   - [ ] `docs/design/architecture.md` updated (if files/modules or data flows changed)
   - [ ] `docs/design/ui-ux.md` updated (if UI, toolbar, modals, or styles changed)
   - [ ] `docs/design/standard-markdown-compatibility.md` updated (if Markdown directives changed)
   - [ ] `README.md` (English) and `README_ja.md` (Japanese) updated in tandem
   - [ ] `examples/sample-presentation.md` updated (if helpful to showcase new syntax)
2. **Code & Git Self-Review**:
   - Run `git status` and `git diff` to inspect all modified and untracked files.
   - Ensure build artifacts (`main.js`, `node_modules/`) are **not** staged for commit.
   - Verify all items in the **Self-Review Checklist** in [resources/checklists.md](./resources/checklists.md).
3. **Report & Next Steps**:
   - Present a clear summary of changes (Code, Tests, and Documentation updated) to the user.
   - When the user is ready to open a Pull Request, use the `create-pr-body` skill to draft the PR description.
