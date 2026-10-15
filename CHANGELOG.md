# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
