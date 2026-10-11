# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
