# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-10-31

### Added

- **Editable PowerPoint (`.pptx`) Export (`pptxgenjs`)**:
  - Added command `Presenter: Export presentation as powerpoint (.pptx)` (`export-pptx`) and presentation toolbar print menu action (`Export as powerpoint (.pptx)`).
  - Generates native, editable `.pptx` slide decks (`<note-name>-presentation.pptx`) saved to the vault and downloaded via the browser.
  - Preserves 16:9 / 4:3 layouts, custom color themes (`baseColor`, `mainColor`, `accentColor`), headers/footers/logos, cover/section/quote/content slide layouts, multi-column grids (`card` / `plain`), non-uniform ratios (`2:1`, `1:2`, `3:1`, `1:3`), step flow cards (`STEP 01`...), KPI metric cards, callout boxes, tables, code blocks, bracket badges, inline images, rasterized SVG/Mermaid diagrams, and speaker notes.
  - Added comprehensive unit test suite (`tests/pptx.test.ts`).
- **Automatic Section Heading Inheritance & Numbering on Split Slides**:
  - Automatically repeats and numbers the parent `## H2` heading across multi-page sections split by `---` as `Title 1-1, Title 1-2, ... Title 1-N` while keeping single-page sections unnumbered.
  - Excludes cover slides, standalone quote slides, and section divider slides from automatic heading inheritance.
  - Configurable vault-wide via **Settings → Layout & grid → Inherit section headings on split slides** (`inheritSlideHeadings`, default `true`) and per-note via frontmatter (`inheritHeadings: true | false`).
- **AI Slide Authoring Skill Documentation & Release Workflow Skill**:
  - Added documentation and links to the official `create-presentation` Agent Skill repository (`xhisashix/obsidian-presenter-skill`) in `README.md` and `README_ja.md`.
  - Added `.agents/skills/release-workflow` skill and release templates for standardized release preparation and tagging.

### Changed & Improved

- **CSS Specificity Refactoring (Zero `!important`)**:
  - Removed all `!important` declarations across `styles.css` and `src/export/exportStyles.ts` by increasing selector specificity, complying strictly with Obsidian community plugin styling guidelines.

### Fixed

- **Standalone HTML Export Layout & Style Parity**:
  - Added missing CSS rules in `src/export/exportStyles.ts` for step flow process badges (`STEP 01`...), non-uniform column ratios (`2:1`, `1:2`, `3:1`, `1:3`), plain column styles, KPI metric cards, key takeaway callouts, section dividers, and quote slide layouts.

---

## [1.4.0] - 2026-10-25

### Added

- **Smart Slide Layouts & Auto-Inference**:
  - Automatically infers header-only slides as centered **Section Divider** (`section`) cards and blockquote slides as prominent **Quote / Big Statement** (`quote`) cards.
  - Three-tier hierarchy: Explicit HTML comment directives (`<!-- slide: section -->`, `<!-- slide: quote -->`, `<!-- slide: content -->`) take precedence over automatic inference.
  - Vault-wide toggle in **Settings → Layout & grid → Enable smart slide layouts** (default `true`) and per-note override via frontmatter `smartLayouts`.
- **Non-Uniform Column Ratios & Step Flow Process**:
  - Golden ratio columns via `<!-- columns 2:1 -->` and `<!-- columns 1:2 -->` (and 3:1 / 1:3), compatible with both `card` and `plain` styles.
  - Step-by-step process flow layout via `<!-- columns 3 step -->` and `<!-- columns 4 step -->` with styled `STEP 01`, `STEP 02`... badges.
  - Direct insertion commands and new presets in `Presenter: Insert column layout...` picker.
- **KPI Metrics & Styled Key Takeaway Callouts**:
  - Standalone bold metrics (e.g. `**+140%**`, `**3.5x**`) or `<!-- kpi -->` are automatically styled as high-impact KPI metric cards.
  - Callouts like `> [!important]`, `> [!tip]`, and `> [!warning]` in slide body are formatted as styled key takeaway conclusion boxes.
- **Slide Overview Grid (Slide Sorter)**:
  - Toggle a bird's-eye thumbnail grid in presentation mode via `G` or `O` keys (or toolbar button) for instant navigation during Q&A.
- **Image & Diagram Lightbox Zoom**:
  - Click any image or Mermaid diagram in presentation view or exported standalone HTML to zoom in full-screen (`Escape` to close).
- **One-Click Summary Copy for Sharing**:
  - Command `Presenter: Copy summary for sharing` extracts the presentation outline, section structure, and key takeaway callouts to the clipboard for instant sharing in Slack, Teams, or email.
- **Mermaid Diagram Native Rendering Support**:
  - Native asynchronous Mermaid diagram rendering (`renderMermaidSlides`) and dedicated presentation styles for diagrams.
- **Standalone HTML Export Enhancements & Modular Architecture**:
  - Added slide overview grid button and `G` key toggle.
  - Deep-link `#slide-N` URL hash synchronization for pinpoint sharing and browser history navigation.
  - Asynchronous Mermaid SVG rendering wait before serialization.
  - Modularized `htmlExporter.ts` into `exportScript.ts`, `exportStyles.ts`, and `imageInliner.ts` with comprehensive unit tests (`tests/export.test.ts`).
- **Agent Skill `create-pr-body`**:
  - Added automated pull request drafting skill with workflow definition, templates, and examples.

### Changed & Improved

- **Slide Overflow Measurement Caching (`SlideOverflowCache`)**:
  - Added content and configuration hash-based caching to prevent redundant DOM reflows during live editing and slide preview.
- **Lazy PDF Print Slide Rendering**:
  - PDF print slide DOM is now generated on-demand only when the user triggers print, dramatically reducing initial presentation load overhead.
- **Theme-Coordinated Table & Slide Typography Refinements**:
  - Improved presentation table styles with theme color coordination and zebra striping.
  - Optimized list spacing, paragraph margins, and stage dimension calculations.
- **Shared Stage UI Helpers**:
  - Consolidated scaling math, toolbar controls, and modal actions into `stageHelpers.ts`.

---

## [1.3.0] - 2026-10-18

### Added

- **Declarative Settings Search API (`getSettingDefinitions`)**:
  - Implemented `getSettingDefinitions()` in `PresenterSettingTab` following the Obsidian declarative settings API.
  - Enables full searchability of all plugin configuration options (Theme, Layout, Badges, Slide Preview, Notes, Standalone HTML Export) within Obsidian's global settings search bar (Obsidian 1.13.0+).
- **English Documentation & Dedicated Japanese Guide**:
  - `README.md` is now fully provided in English, aligning with Obsidian Community Plugin submission standards.
  - Complete Japanese documentation moved to `README_ja.md` with cross-references for Japanese-speaking users.

---

## [1.2.1] - 2026-10-15

### Changed

- Adopted the standard MIT License.
- Updated author metadata (`xhisashix`) in `manifest.json` and `package.json`.

---

## [1.2.0] - 2026-10-15

### Added

- **Slide Overflow Detection and Auto-fit**:
  - Real-time slide body overflow measurement (`scrollHeight > clientHeight + 4px`) across the slide deck.
  - Dynamic visual downscaling via `--presenter-body-scale` CSS variable, clamped with a strict 70% lower bound (`MIN_BODY_SCALE = 0.70`) to maintain readability.
  - Frontmatter `fit` property (`fit: auto` / `fit: none` / `fit: true` / `fit: false`) and vault-wide toggle in **Settings → Layout & grid → Auto-fit overflowing slides**.
  - Interactive "Slide overflow inspection" modal (`OverflowReportModal`) displaying overflow percentage, auto-fit scale badges, jump navigation, and one-click slide split.
  - Candidate split heading detection (`findSplitHeadingInSlide`) identifying the second H3 heading (`###`) to cleanly split overloaded slides into 2 with standard `---`, fully undoable in the active editor.
  - Warning button indicator (`⚠ N`) in both Preview Pane and fullscreen Presentation mode toolbars.
  - Warning badges (`⚠`) on overflowing slides in Jump-to-Slide modal (`JumpToSlideModal`).
  - Command palette command: `Presenter: Check slide overflow` (`check-overflow`).
- **Standard Markdown Compatibility**:
  - Multi-column layouts using standard-compliant HTML comment directives (`<!-- columns 2 -->`, `<!-- columns 2 plain -->`, `<!-- column -->`, `<!-- /columns -->`), leaving raw markdown completely clean and natural in GitHub, VS Code, and Obsidian default reader.
  - Heading-based automatic column partitioning: sibling headings within a `<!-- columns -->` region automatically format into columns without needing explicit column breaks.
  - CommonMark-compliant Setext headings (`===` for cover slide, `---` after paragraph for slide boundary + title).
  - Flexible thematic breaks (`---`, `***`, `___`) for explicit slide boundaries.
  - Strict CommonMark fence tracking to eliminate unintended slide splits inside code blocks.
  - Configurable toggle for `[label]` badge styling (`Enable label badges`), with link definition (`[label]: url`) collision protection.
- **Column Layout Quick Insertion & Hotkey Commands**:
  - Quick picker command (`Presenter: Insert column layout...`) to choose and insert any multi-column layout or column break from a single hotkey.
  - Direct insertion commands for 2/3/4 columns, `card`/`plain` variants, and `<!-- column -->` breaks—each bindable in **Settings → Hotkeys**, supporting both empty-line cursor placement and selection wrapping.
- **Theme-Coordinated Table Design**:
  - Styled table headers with translucent accent color background and prominent accent bottom border.
  - Coordinated alternating zebra striping, cell borders, and typography using subtle main color opacity.
  - Rounded table corners and refined soft drop-shadow for a clean card-like feel.
  - Fully synchronized styling across presentation view and standalone HTML exports.

### Changed

- Updated plugin ID and package identifier to `markdown-presenter`.

### Removed

- **Legacy Non-Standard Column Syntax**:
  - Removed proprietary `::: cols-N`, `::: columns`, and `+++` syntax in favor of universal standard-compatible HTML comments.

---

## [1.1.0] - 2026-10-11

### Added

- **Live Slide Preview Pane**:
  - Real-time slide preview pane that syncs with the active editor cursor.
  - Pin toggle to pause/resume cursor sync.
  - Quick launch button to start full-screen presentation directly from the currently previewed slide.
  - Editor tab action, ribbon icon, and command palette integration (`Presenter: Open slide preview`, `Presenter: Toggle slide preview`).
- **Speaker Notes**:
  - Automatically parses Obsidian Callout blocks (`> [!note]`) as speaker notes and hides them from main presentation slides.
  - Toggle notes overlay in presentation view via `N` key or toolbar button.
- **Standalone HTML Export**:
  - Export presentations as self-contained, single-file HTML documents (`Presenter: Export presentation as standalone HTML`).
  - No external server or Obsidian runtime required; works completely offline.
  - Dual viewing modes in exported HTML: interactive full-screen slide deck and scrollable handout document.
- **Handout Print & PDF Mode**:
  - High-quality printable layout pairing each slide with its speaker notes in a 1-page report / SlideDoc format.
- **Configurable Multi-Column Styles (`card` vs `plain`)**:
  - Support for borderless, transparent multi-column layouts via `::: cols-2 plain` and `::: cols-3 plain`.
  - Configurable per-note via frontmatter `columnStyle: plain` or vault-wide via plugin settings.
- **Settings & Documentation**:
  - Reorganized settings tab UI for improved usability.
  - Updated design documentation (`docs/design/architecture.md`, `specification.md`, `ui-ux.md`) and user guide (`README.md`).

---

## [1.0.1] - 2026-09-27

### Added

- **`[xxx]` Label & Badge auto-styling**: Automatically transforms bracketed labels like `[重要]`, `[STEP 1]`, and `[TASK]` into styled pill badges linked with `--presenter-accent-color`.
- **Design Documentation (`docs/design/`)**:
  - `docs/design/architecture.md`: System architecture, component relationships, data flow, and lifecycle management.
  - `docs/design/specification.md`: Functional specifications covering H1/H2 slide parsing, frontmatter schema, multi-column syntax, badge rules, keyboard navigation, and print/PDF output.
  - `docs/design/ui-ux.md`: UI/UX design document detailing dynamic CSS custom properties, color mapping, 16:9/4:3 responsive scaling calculations, and typography hierarchy.
- **Sample Presentation**: Added label & badge examples to `examples/sample-presentation.md`.
- **README Updates**: Added Labels & Badges section and quick reference.

### Fixed

- **Markdown syntax collision protection**: Strict exclusion rules in `preprocessBadges` ensuring standard links (`[text](url)`), Obsidian wikilinks (`[[note]]`), task checkboxes (`- [ ]`, `- [x]`), footnote references (`[^1]`), and code blocks are completely untouched and preserved.

---

## [1.0.0] - 2026-09-27

### Added

- Initial release of Obsidian Presenter plugin.
- Natural markdown-based slide presentation using `# H1` as cover slide and `## H2` as slide delimiters.
- Frontmatter styling support: `baseColor`, `mainColor`, `accentColor`, `header`, `footer`, `logo`, and `aspectRatio`.
- Multi-column grid layouts via `::: cols-2` and `::: cols-3` syntax.
- Fullscreen presentation modal with keyboard navigation, progress bar, and floating toolbar.
- High-quality print and PDF export support with `@media print` automatic page breaks.
