# Release Templates Resource

Use these templates when preparing a new release in Phase 1 of the `release-workflow` skill.

---

## 1. `CHANGELOG.md` Entry Template

Insert the new version section immediately above the previous release heading in `CHANGELOG.md` (following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format):

```markdown
## [<VERSION>] - <YYYY-MM-DD>

### Added

- **<Feature Title>**:
  - <Implementation or user-facing detail 1>
  - <Implementation or user-facing detail 2>

### Changed & Improved

- **<Improvement / Refactoring Title>**:
  - <Detail of performance, UX, or architectural improvement>

### Fixed

- **<Bug Fix Title>**:
  - <Description of the fix>

---
```

*(Omit unused subsections such as `Fixed` or `Changed & Improved` if not applicable to the release).*

---

## 2. `RELEASE_NOTES.md` Template

Overwrite `RELEASE_NOTES.md` with the latest release notes targeting `<VERSION>`:

```markdown
# Presenter <VERSION> リリースノート (Release Notes)

**リリース日**: <YYYY-MM-DD>  
**対象バージョン**: `<VERSION>`  
**プラグインID**: `markdown-presenter`  
**対応Obsidianバージョン**: `minAppVersion: <MIN_APP_VERSION>`

---

## 概要 (Overview)

`v<VERSION>` では、<リリース全体の目的・テーマを1〜2文で要約>を実施しました。

<主要な新機能や改善点のハイライトを簡潔に紹介>

---

## ✨ 新機能・改善点 (New Features & Improvements)

### 1. <機能・改善タイトル 1 (Japanese & English)>
<機能の概要説明>

- **<ポイント 1>**: <詳細説明>
- **<ポイント 2>**: <詳細説明>

### 2. <機能・改善タイトル 2 (Japanese & English)>
<機能の概要説明>

- **<ポイント 1>**: <詳細説明>
- **<ポイント 2>**: <詳細説明>

---

## 🛠️ インストール / アップデート手順 (Installation & Update)

### 1. 手動インストール・更新の場合
1. GitHub Release アセットから以下の 3 ファイルをダウンロードします：
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. お使いの Obsidian Vault 内のプラグインフォルダに配置（既存のフォルダがある場合は中身を上書き）します：
   ```bash
   <Vault>/.obsidian/plugins/markdown-presenter/
   ```
3. Obsidian の **設定 → コミュニティプラグイン** より、Presenter プラグインを再読込、または Obsidian を再起動してください。

### 2. コミュニティプラグイン経由の場合
- Obsidian 内の **設定 → コミュニティプラグイン → アップデートを確認** から最新版（`<VERSION>`）へ更新可能です。
```

---

## 3. Release Pull Request (`develop` → `main`) Template

- **PR Title**: `release: v<VERSION>`

```markdown
## 概要 (Summary)

本PRは、`develop` ブランチで開発・検証された新機能、UI/UX向上、パフォーマンス改善、およびリファクタリングを `main` ブランチへ反映し、**Presenter v<VERSION>** として正式リリースするためのマージリクエストです。

---

## 主なハイライト (Key Highlights)

1. **<ハイライト 1>**: <要約>
2. **<ハイライト 2>**: <要約>
3. **<ハイライト 3>**: <要約>

---

## 変更内容 (Changes)

### 1. ✨ 新機能・機能拡張 (Features)
- **<機能名> (`<関連ファイルまたはPR番号>`)**:
  - <詳細>

### 2. ⚡️ パフォーマンス / 🎨 スタイル改善 (Improvements & Styles)
- **<改善項目> (`<関連ファイルまたはPR番号>`)**:
  - <詳細>

### 3. 🛠 リファクタリング & テスト強化 (Refactoring & Tests)
- **<リファクタリング・テスト項目>**:
  - <詳細>

### 4. 📝 バージョン更新・ドキュメント (Release Prep & Documentation)
- `manifest.json`, `package.json`, `package-lock.json`, `versions.json` を `<VERSION>` へ更新
- `CHANGELOG.md` および `RELEASE_NOTES.md` に `v<VERSION>` の詳細を反映

---

## 動作確認・検証 (Verification)

- [x] 単体テスト実行 (`npm test`): 全テスト通過
- [x] 静的解析チェック (`npm run lint`): エラー 0件
- [x] プロダクションビルド (`npm run build`): 正常ビルド完了
- [ ] 実機での主要機能・動作確認:
  1. <確認ステップ 1>
  2. <確認ステップ 2>

---

## 影響範囲・破壊的変更 (Impact & Breaking Changes)

- **影響範囲**: <影響するモジュール・画面>
- **破壊的変更**: なし / あり（詳細: ）

---

## 含まれるプルリクエスト (Included PRs)

- #<PR番号> `<PRタイトル>`
```
