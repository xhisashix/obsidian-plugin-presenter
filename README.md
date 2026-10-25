[English](README.md) | [日本語](README_ja.md)

# Obsidian Presenter

A presentation plugin for Obsidian that turns your Markdown notes directly into clean, styled slides with live preview and high-quality export.

Keep your natural note-taking workflow and AI-generated Markdown structure (`# H1` as title slide, `## H2` as slide delimiter) intact. Featuring intuitive frontmatter theming, multi-column grid layouts, speaker notes, standalone portable HTML export, and slide overflow auto-fit.

---

## Features

- **Live Split-Pane Preview**:
  - View rendered slides right beside your editor in real time as you write.
  - Automatically syncs and highlights the slide matching your editor cursor position (with a pin/unpin toggle).
  - Smooth typing experience powered by a 250ms debounced renderer.
- **Natural Markdown Structure**:
  - `# H1`: Presentation title slide.
  - `## H2`: New slide title and delimiter.
  - `### H3` / `#### H4`: Subsections and column headers within slides.
  - (Explicit slide delimiters using horizontal rules `---` are also supported).
- **Smart Slide Layouts & Auto-Inference**:
  - Automatically identifies header-only slides as centered **Section Divider** slides.
  - Formats single-blockquote slides as elegant **Quote / Big Statement** cards.
  - Full override support with explicit directives (`<!-- slide: section -->`, `<!-- slide: quote -->`, `<!-- slide: content -->`) and configurable toggle in Settings or frontmatter (`smartLayouts: false`).
- **Flexible Styling & Color Themes (Settings & Frontmatter)**:
  - Configure default color palettes, headers, footers, and logos in the plugin settings.
  - Zero-configuration required: notes convert to slides instantly, and any property can be overridden per note via frontmatter.
- **Multi-Column Grid Layouts & Ratio/Step Options**:
  - Uses standard Markdown-compatible HTML comments (`<!-- columns 2 -->`, `<!-- columns 3 -->`) for cross-platform compatibility.
  - **Non-uniform column ratios**: Supports `<!-- columns 2:1 -->` (wide diagram on the left, explanation on the right) and `<!-- columns 1:2 -->`.
  - **Step flow process**: Use `<!-- columns 3 step -->` to format items as progressive sequence cards (`STEP 01`, `STEP 02`...).
  - Choose between **Card style** and **Plain style** (`<!-- columns 2 plain -->`).
- **KPI Metrics & Styled Key Takeaway Callouts**:
  - Standalone bold metrics like `**+140%**` or `**3.5x**` are automatically displayed with prominent accent typography.
  - Callouts such as `> [!important]`, `> [!tip]`, and `> [!warning]` are styled as impactful conclusion summary cards.
- **Slide Overview Grid (Slide Sorter)**:
  - Press `G` or `O` (or click the grid icon on the toolbar) to view a bird's-eye thumbnail grid of all slides, enabling instant jump navigation during Q&A sessions.
- **Clickable Image & Diagram Zoom (Lightbox)**:
  - Click any image or Mermaid diagram during a presentation or in exported HTML to zoom in full-screen (`Escape` to close).
- **One-Click Summary Copy for Sharing**:
  - Run `Presenter: Copy summary for sharing` from the command palette to copy a structured outline with key takeaways to your clipboard for instant pasting into Slack, Teams, or email.
- **Automatic Labels & Badges**:
  - Writing `[IMPORTANT]`, `[NOTE]`, or `[STEP 1]` automatically formats text into a visually distinct accent badge.
- **Full Obsidian Markdown Support**:
  - Clean rendering of tables, code blocks, images, LaTeX math formulas, Callouts, checklists, and lists.
- **Header, Footer & Logo Display**:
  - Customizable header titles, logos, copyright notices, and page numbers (`X / Y`).
- **Speaker Notes**:
  - Standard Obsidian callouts (`> [!note]`) are automatically excluded from the main projection slides and kept as speaker notes.
  - Toggle speaker notes on/off during a presentation using the toolbar or the `N` key.
- **Handout (SlideDoc) Printing**:
  - Select "Print handout with notes" to produce clean, executive-ready A4 handouts featuring the slide view alongside detailed explanations.
- **Standalone Portable HTML Export**:
  - Export self-contained, single-file HTML presentations (`<note-name>-presentation.html`) via the command palette.
  - Recipients need only a web browser (no Obsidian or internet connection required) and can switch between **[ 🖥 Slide View ]** and **[ 📄 Handout Document View ]** with a single click.
  - Includes slide overview drawer (`G` key), `#slide-N` deep-link URL hash synchronization, and lightbox zoom.
- **High-Quality PDF Export**:
  - Press `Cmd + P` (Mac) or `Ctrl + P` (Windows) inside presentation mode to export high-resolution slide or handout PDFs.
- **Slide Overflow Detection & Auto-fit**:
  - Detects overflowing content in real time and displays an alert badge (`⚠ N`) on the toolbar.
  - Auto-fit compresses font size, line height, and padding down to 70% to keep content inside the card frame without losing legibility.
  - For long slides exceeding 70% reduction, the inspector modal provides a one-click **Split slide** button to cleanly divide the slide at heading boundaries (undoable via `Cmd + Z`).
- **Responsive Aspect Ratio**:
  - Automatically scales to fit any screen resolution while maintaining standard 16:9 or 4:3 aspect ratios.

---

## Installation

### From Obsidian Community Plugins
*(Available once approved)*
1. Open **Settings → Community plugins** in Obsidian.
2. Turn off **Restricted mode**.
3. Click **Browse** and search for **Presenter**.
4. Click **Install**, then **Enable**.

### Manual Installation
1. Download the latest release assets (`main.js`, `manifest.json`, `styles.css`) from GitHub Releases.
2. Create the plugin folder inside your vault:
   ```bash
   <Vault>/.obsidian/plugins/markdown-presenter/
   ```
3. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
4. In Obsidian, go to **Settings → Community plugins**, click **Reload plugins**, and enable **Presenter**.

---

## Usage

### 1. Write Slide Notes

Frontmatter configuration is completely optional. Add frontmatter only when you want to customize settings for a specific presentation.

```markdown
---
# Optional overrides (defaults from Settings tab are used if omitted)
header: "Q4 Strategy Pitch"
accentColor: "#38bdf8"
---

# New Business Proposal
Innovating Knowledge Work with AI

Speaker: Jane Doe
Date: 2026-10-15

## Background & Challenges

While generative AI tools increase information bandwidth, sharing structured knowledge still takes too long.

- High presentation deck creation overhead
- Time wasted adjusting formatting and slide layouts
- Knowledge quickly becoming outdated

## Proposed Solution

<!-- columns 2 -->
### Markdown-Driven
- Regular notes transform directly into slides
- AI-generated outlines ready for presentation

### Rapid Preview & PDF
- Instant real-time preview
- One-click PDF generation for executive review
<!-- /columns -->

## Summary

Bridge the gap between thought and presentation with zero friction.
```

### 2. Open Live Slide Preview

Keep a live slide preview open side-by-side as you write:
- **Editor Tab Header**: Click the **TV** icon in the top-right header of your note.
- **Command Palette**: Run `Presenter: Open slide preview` or `Presenter: Toggle slide preview`.
- **Ribbon Icon**: Click the **TV** icon in the left ribbon bar.

> [!TIP]
> - **Cursor Sync**: The preview automatically scrolls to the slide where your cursor is positioned. Click the pin icon in the preview header to pause auto-sync and inspect a specific slide.
> - **Launch Fullscreen**: Click the "Start presentation" button in the preview header to immediately switch to full-screen mode at the current slide.

### 3. Start Presentation (Fullscreen)

- **Ribbon Icon**: Click the projector screen icon in the left ribbon.
- **Command Palette**: Run `Presenter: Start presentation`.

---

## Keyboard Shortcuts

| Action | Keys |
| :--- | :--- |
| **Next Slide** | `→` / `↓` / `Space` / `PageDown` / `L` / `J` |
| **Previous Slide** | `←` / `↑` / `PageUp` / `H` / `K` |
| **First Slide** | `Home` |
| **Last Slide** | `End` |
| **Toggle Fullscreen** | `F` |
| **Slide Overview Grid** | `G` / `O` |
| **Toggle Speaker Notes** | `N` |
| **Print / PDF Export** | `P` |
| **Zoom Image / Diagram** | Click image or Mermaid SVG (`Escape` to close) |
| **Exit Presentation** | `Escape` |

---

## Multi-Column Grid Layouts

### 1. Basic Syntax (HTML Comment Directives)

Presenter uses standard HTML comments (`<!-- columns N -->`) to specify multi-column layouts so your notes stay 100% compliant with CommonMark. In other editors (GitHub, VS Code), these comments remain invisible and your headings render as standard sections.

#### 2-Column Example
```markdown
<!-- columns 2 -->

### Left Column
Content for the left side (lists, images, text)

### Right Column
Content for the right side

<!-- /columns -->
```

Headings (such as H3) automatically define column boundaries. If you wish to split paragraphs without headings, insert `<!-- column -->`:

```markdown
<!-- columns 2 -->
Content for left column
<!-- column -->
Content for right column
<!-- /columns -->
```

Use `<!-- columns 3 -->` or `<!-- columns 4 -->` for 3 or 4 columns.

### 2. Column Styles: Card vs Plain

| Style | Appearance | Usage |
| :--- | :--- | :--- |
| **Card (Default)** | Subtle background tint, rounded border, and comfortable padding | `<!-- columns 2 -->` or `<!-- columns 2 card -->` |
| **Plain** | Transparent background, borderless, zero internal padding | `<!-- columns 2 plain -->` or `<!-- columns 3 plain -->` |

#### Example: Plain Style
```markdown
<!-- columns 2 plain -->

### Minimalist Layout
Blends directly into the slide background without borders.

### Clean Data Comparison
Ideal for clean side-by-side lists and image comparisons.

<!-- /columns -->
```

#### Setting Global or Note Defaults
- **Per-note default**: Add `columnStyle: plain` to the frontmatter.
- **Global vault default**: Go to **Settings → Presenter → Default column style** and select `Plain (transparent & borderless)`.

### 3. Quick Insertion Commands

Insert column directives quickly using the Command Palette (`Cmd + P` / `Ctrl + P`) or by binding hotkeys:

- `Presenter: Insert column layout...` (Interactive modal picker)
- `Presenter: Insert 2-column layout`
- `Presenter: Insert 3-column layout`
- `Presenter: Insert 4-column layout`
- `Presenter: Insert 2-column plain layout`
- `Presenter: Insert column break` (`<!-- column -->`)

> [!TIP]
> If text is currently selected, running an insert command automatically wraps the selected block in `<!-- columns N -->` and `<!-- /columns -->`.

---

## Labels & Badges

Writing `[label] text` automatically styles the bracketed label with an accent color badge:

```markdown
- [IMPORTANT] Deadline is next Wednesday
- [CHALLENGE] Reducing slide creation time
- [STEP 1] Requirements definition and outline
```

Regular Markdown links `[Title](url)`, internal wikilinks `[[Note]]`, and task checkboxes `- [ ]` remain unaffected.

---

## Speaker Notes & Distribution

Balance live stage presentations with easy document distribution for non-technical stakeholders:

### 1. Writing Speaker Notes
Use standard Obsidian callout syntax `> [!note]`:

```markdown
## Core Architecture

- Microservices backend
- Event-driven message queue

> [!note] Speaker Note & Explanation
> This text is automatically hidden on the big presentation screen and visible only in speaker notes (`N` key).
> During HTML export or handout printing, it expands beneath the slide as detailed explanatory reading material.
```

### 2. Standalone HTML Export
Export your presentation as a single self-contained HTML file:
- Run `Presenter: Export presentation as standalone HTML` from the Command Palette.
- The exported `<note-name>-presentation.html` contains all scripts and styles inline—no external servers or dependencies required.
- Recipients simply double-click to view, with a toggle in the top-right corner to switch between **[ 🖥 Slide Mode ]** and **[ 📄 Handout Document Mode ]**.

### 3. Handout (SlideDoc) Print & PDF
- Press `P` or click the Print icon in presentation mode and choose **Print handout with notes**.
- Generates an executive A4 PDF report with slide cards on top and detailed speaker notes below.

---

## Slide Overflow Detection & Auto-fit

Prevents content overflow and cut-off text during presentations.

### 1. Alert Badges & Inspector Modal
- A badge (`⚠ N`) appears on the toolbar whenever slides exceed their visible card bounds.
- Clicking the badge opens the **Slide overflow inspection** modal showing exact overflow percentages (`+20% overflow`) and quick action buttons.

### 2. Auto-fit
Automatically scales down CSS font size, line height, and padding (clamped down to 70% to ensure readability).
- **Vault-wide setting**: Enable **Settings → Layout & grid → Auto-fit overflowing slides**.
- **Per-note setting**: Add `fit: auto` to frontmatter.

```markdown
---
fit: auto
---
```

### 3. One-Click Slide Splitting
For large slides that still overflow at 70% reduction, click **Split slide** inside the inspection modal to automatically insert a `---` break before the second `###` heading.

---

## Design Documents

For architecture details, specifications, and UI/UX design:
- [System Architecture (architecture.md)](docs/design/architecture.md)
- [Functional Specification (specification.md)](docs/design/specification.md)
- [UI/UX & Styling Specification (ui-ux.md)](docs/design/ui-ux.md)

---

## Development

```bash
# Install dependencies
npm install

# Watch mode
npm run dev

# Production build (type-check & bundle)
npm run build

# Run linter
npm run lint

# Run test suite
npm test
```

---

## License

[MIT License](LICENSE) © 2026 xhisashix
