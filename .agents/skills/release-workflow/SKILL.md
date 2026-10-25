---
name: release-workflow
description: >-
  End-to-end release workflow for the Obsidian Presenter plugin. Covers version
  bumping (manifest.json, package.json, package-lock.json, versions.json),
  updating CHANGELOG.md and RELEASE_NOTES.md, running tests/lint/build,
  creating or updating the release Pull Request from develop to main, and
  creating/pushing the version tag and publishing GitHub Release notes after
  merge. Use this skill whenever the user asks to prepare a release, create a
  release PR, tag a release, or publish a new version.
---

# Obsidian Plugin Release Workflow Skill

This skill guides the agent through the standardized two-phase release workflow for this Obsidian community plugin (`develop` → `main` → Git Tag & GitHub Release).

Depending on the user's request and repository state, start at **Phase 1** (Release Preparation & PR Creation) or **Phase 2** (Post-Merge Tagging & GitHub Release Publication).

---

## Phase 1: Release Preparation & Release PR (`develop` → `main`)

Execute Phase 1 when the user asks to prepare a release from `develop` (e.g., `"developブランチの内容でリリース準備を進めてください"`).

### Step 1: Inspect Branches & Unreleased Changes

1. Check current branch, working tree status, and local branches that might contain unmerged release work:
   ```bash
   git status --short
   git branch -v
   git fetch origin
   ```
   *(If there is a local feature branch ahead of `develop` intended for this release, confirm with the user or fast-forward merge it into `develop` first).*
2. Ensure you are on `develop` and up to date with `origin/develop`:
   ```bash
   git checkout develop
   git pull origin develop
   ```
3. Inspect commits and file diffs between `origin/main` and `develop`:
   ```bash
   git log --oneline --reverse origin/main..develop
   git diff --stat origin/main...develop
   ```

### Step 2: Determine Target Version (`<VERSION>`)

1. Check the current version in `manifest.json` on `main`.
2. Determine the next Semantic Version (`x.y.z`, **without** a leading `v`):
   - **MINOR (`x.Y.0`)**: New backward-compatible features.
   - **PATCH (`x.y.Z`)**: Bug fixes, refactoring, or minor styling/performance tweaks only.
   - **MAJOR (`X.0.0`)**: Breaking changes.

### Step 3: Bump Version & Update Release Documentation

1. **Update Version Files**:
   - `manifest.json`: Update `"version": "<VERSION>"` (keep `minAppVersion` accurate).
   - `package.json`: Update `"version": "<VERSION>"`.
   - `versions.json`: Add `"<VERSION>": "<minAppVersion>"`.
   - `package-lock.json`: Sync version by running:
     ```bash
     npm i --package-lock-only
     ```
2. **Update `CHANGELOG.md` and `RELEASE_NOTES.md`**:
   - Follow the templates in [resources/release-templates.md](./resources/release-templates.md).
   - Add a `## [<VERSION>] - YYYY-MM-DD` section at the top of `CHANGELOG.md` covering all changes since the last release on `main`.
   - Update `RELEASE_NOTES.md` with the new version, release date, overview, feature details, and update instructions.
   - If new user-facing syntax, commands, or settings were introduced, ensure `README.md` and `README_ja.md` are up to date.

### Step 4: Run Quality Gates (Tests, Lint, Build)

Run all verification checks and ensure zero errors:

```bash
npm test && npm run lint && npm run build
```

### Step 5: Commit, Push `develop`, and Create/Update Release PR

1. Stage and commit the release preparation changes on `develop`:
   ```bash
   git add manifest.json package.json package-lock.json versions.json CHANGELOG.md RELEASE_NOTES.md
   git commit -m "feat: prepare v<VERSION> release, finalize documentation and sync package-lock"
   git push origin develop
   ```
2. Create or update the Pull Request from `develop` to `main` using the PR template in [resources/release-templates.md](./resources/release-templates.md):
   - **Title**: `release: v<VERSION>`
   - Check if an open PR already exists:
     ```bash
     gh pr list --base main --head develop
     ```
   - Create a new PR (or update existing with `gh pr edit <PR_NUMBER> --body-file -`):
     ```bash
     gh pr create --base main --head develop --title "release: v<VERSION>" --body-file - << 'EOF'
     <PR_BODY>
     EOF
     ```
3. **Hand-off to User for Merge**:
   - Share the PR URL with the user.
   - Remind the user that because `main` has branch protection rules (`Require approvals` with `Repository admin: Always allow` in the Bypass list), once all CI checks pass they can check **`Merge without waiting for requirements to be met (bypass rules)`** on GitHub to merge the PR, and then ask the agent to proceed to Phase 2 (tag creation).

---

## Phase 2: Post-Merge Tagging & GitHub Release (`main`)

Execute Phase 2 after the user confirms the release PR has been merged into `main` (e.g., `"マージまで完了したので、タグの作成を行ってください"`).

### Step 1: Sync `main` Branch

1. Switch to `main` and pull the merged release commit:
   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   ```
2. Verify that `manifest.json` on `main` reflects `<VERSION>`:
   ```bash
   git show main:manifest.json
   ```

### Step 2: Create & Push the Release Tag

> **CRITICAL OBSIDIAN RULE**: The Git tag MUST exactly match `manifest.json`'s `version` **without a leading `v`** (e.g. `1.4.0`, **never** `v1.4.0`).

```bash
git tag -a <VERSION> -m "Release <VERSION>"
git push origin <VERSION>
```

### Step 3: Verify GitHub Actions Release & Populate Release Notes

1. Pushing the tag triggers `.github/workflows/release.yml`, which builds `main.js`, attests build provenance, and creates the GitHub Release with `main.js`, `manifest.json`, and `styles.css`.
2. Check the workflow and release status:
   ```bash
   gh run list --workflow=release.yml --limit 3
   gh release view <VERSION>
   ```
3. Once the GitHub Release is created by `github-actions[bot]`, attach `RELEASE_NOTES.md` as the release body:
   ```bash
   gh release edit <VERSION> --notes-file RELEASE_NOTES.md
   ```
4. Share the final GitHub Release URL (`https://github.com/xhisashix/obsidian-plugin-presenter/releases/tag/<VERSION>`) with the user.
