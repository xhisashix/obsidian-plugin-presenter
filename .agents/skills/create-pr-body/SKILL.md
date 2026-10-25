---
name: create-pr-body
description: >-
  Generates a comprehensive, high-quality Pull Request (PR) title and body based on
  git diffs, commit history, branch names, and repository templates. Use this skill
  whenever the user asks to create, draft, or update a PR description, PR body, or
  pull request text.
---

# Create PR Body Skill

This skill guides the agent to systematically inspect the repository's current changes, branch name, and commit history to produce a clear, well-structured Pull Request (PR) title and body.

---

## Workflow Steps

### Step 1: Collect Git Context & Check PR Templates

Gather the necessary context by running the following checks:

1. **Check Current Branch and Status**:
   ```bash
   git branch --show-current
   git status --short
   ```
2. **Inspect Commit History & Diff against Base Branch**:
   Identify the base branch (commonly `main`, `master`, or `develop`).
   ```bash
   # List commits on this branch not yet in main
   git log --oneline origin/main..HEAD 2>/dev/null || git log --oneline main..HEAD 2>/dev/null || git log -n 5 --oneline

   # Summary of modified files
   git diff --stat origin/main...HEAD 2>/dev/null || git diff --stat main...HEAD 2>/dev/null || git diff --stat HEAD~1

   # Detailed diff (inspect key changes)
   git diff origin/main...HEAD 2>/dev/null || git diff main...HEAD 2>/dev/null || git diff HEAD~1
   ```
3. **Check for Existing Repository PR Templates**:
   Look for existing templates in the repository:
   - `.github/pull_request_template.md`
   - `.github/PULL_REQUEST_TEMPLATE.md`
   - `.github/PULL_REQUEST_TEMPLATE/*.md`
   - `docs/pull_request_template.md`
   - `pull_request_template.md`

   If a repository template exists, **always prioritize using its format and sections**.
   If no repository template exists, use the default templates in [resources/templates.md](./resources/templates.md).

---

### Step 2: Analyze the Changes

Break down the changes by addressing the following key questions:

1. **Why (Background & Purpose)**:
   - What problem does this PR solve, or what feature does it introduce?
   - Is there a related issue (e.g., `#123`, `closes #45`) or context mentioned by the user?
2. **What (Key Implementation Details)**:
   - Group changes logically (e.g., Core Logic, UI/Styles, Configuration, Tests, Docs).
   - Highlight any refactoring, breaking changes, or architectural decisions.
3. **How to Verify (Testing & QA)**:
   - What automated tests were added, updated, or executed (e.g., `npm test`, `npm run lint`)?
   - What manual verification steps should reviewers perform to test the changes?
4. **Impact & Risks**:
   - Are there breaking changes, schema migrations, or dependency updates?
   - Does this affect performance, backward compatibility, or mobile/desktop environments?

---

### Step 3: Determine the Language & Format

- **Language**:
  - Default to **Japanese** if the user prompts in Japanese.
  - Default to **English** if the user prompts in English or if the project/repository explicitly standardizes on English PRs.
  - If unsure, provide the PR body in Japanese with an English title (or offer both).
- **PR Title**:
  - Use [Conventional Commits](https://www.conventionalcommits.org/) format when appropriate:
    - `feat: ...` for new features
    - `fix: ...` for bug fixes
    - `refactor: ...` for code refactoring without behavior change
    - `docs: ...` for documentation updates
    - `test: ...` for adding or improving tests
    - `chore: ...` for maintenance, dependencies, or configuration
  - Keep the title concise (under 72 characters) and imperative.

---

### Step 4: Draft the PR Body

Using the selected template (repository template or [resources/templates.md](./resources/templates.md)), generate the draft:

1. **Title Proposal**: 1 primary recommended title, plus 1-2 alternatives if helpful.
2. **Overview / Summary**: 1-3 sentences summarizing the purpose and outcome.
3. **Changes**: Bulleted breakdown of changes categorized logically.
4. **Verification / Testing**: Clear testing commands and manual test checklist.
5. **Checklist**: Pre-merge checkboxes (tests passed, lint passed, docs updated, etc.).

Refer to [examples/sample-pr.md](./examples/sample-pr.md) for a reference output example.

---

### Step 5: Deliver Output & Offer CLI Execution

1. Present the PR Title and Body in a clean markdown code fence so the user can easily copy and paste it into GitHub or GitLab.
2. If the user has GitHub CLI (`gh`) available and wants to create the PR directly, offer the command:
   ```bash
   gh pr create --title "<PR_TITLE>" --body "<PR_BODY>"
   ```
   Or for draft PR:
   ```bash
   gh pr create --draft --title "<PR_TITLE>" --body "<PR_BODY>"
   ```
