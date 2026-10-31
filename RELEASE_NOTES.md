# Presenter 1.5.0 リリースノート (Release Notes)

**リリース日**: 2026-10-31  
**対象バージョン**: `1.5.0`  
**プラグインID**: `markdown-presenter`  
**対応Obsidianバージョン**: `minAppVersion: 1.7.2`

---

## 概要 (Overview)

`v1.5.0` では、待望の**「PowerPoint（`.pptx`）ネイティブエクスポート機能」**および**「分割スライドにおけるH2見出しの自動継承・連番付与機能」**を追加し、さらに単一HTMLエクスポートのスタイル完全同期とObsidian公式ガイドラインに準拠したCSS詳細度（`!important` 完全排除）のリファクタリングを実施しました。

これにより、Markdownで執筆したスライドをそのままブラウザ（HTML）やPDFだけでなく、二次編集可能なPowerPointファイルとしてもワンクリックで出力できるようになりました。

---

## ✨ 新機能・改善点 (New Features & Improvements)

### 1. 📊 PowerPoint (`.pptx`) ネイティブエクスポート (Editable PowerPoint Export)
Markdownノートから、Microsoft PowerPointやGoogleスライド等で直接開いて二次編集できる `.pptx` ファイルを出力できるようになりました。

- **コマンド & ツールバー連携**:
  - コマンドパレットの `Presenter: Export presentation as powerpoint (.pptx)`、またはプレゼン画面ツールバーの「🖨 印刷 / エクスポート」メニュー内 `Export as powerpoint (.pptx)` から実行可能。
  - ノートと同じフォルダに `<ノート名>-presentation.pptx` を保存し、同時にファイルダウンロードを開始します。
- **リッチなレイアウト・装飾の忠実な再現**:
  - **テーマ・ブランディング**: `16:9` / `4:3` アスペクト比、カスタムカラーパレット（`baseColor`, `mainColor`, `accentColor`）、ヘッダー・フッター・ロゴ画像、ページ番号を反映。
  - **多様なスライドレイアウト**: 表紙（`cover`）、セクション区切り（`section`）、引用カード（`quote`）、通常コンテンツ（`content`）をネイティブシェイプとテキストボックスで構築。
  - **マルチカラム & 高度なブロック要素**: 2〜4カラム（`card` / `plain`）、非均等比率（`2:1`, `1:2`, `3:1`, `1:3`）、ステップフロー（`STEP 01`...）、KPIビッグナンバー、結論Callout、テーブル、コードブロック、角括弧バッジ（`[重要]` 等）を再現。
  - **画像・Mermaid図表・発表者ノート**: ローカル画像やSVG/Mermaidダイアグラムを自動で埋め込み、Obsidianの `> [!note]` はPowerPointの「発表者ノート（Speaker Notes）」欄へ出力されます。

### 2. 📑 分割スライド（`---`）におけるH2見出しの自動継承と連番付与 (Section Heading Inheritance & Numbering)
長いスライドを水平線（`---`）で複数ページに分割した際、文脈が途切れないよう親セクションの `## H2` 見出しを自動的に引き継ぎ、セクション番号＋サブページ番号を付与します。

- **自動連番フォーマット (`Title X-1, Title X-2, ... Title X-N`)**:
  - `---` で複数枚に分割されたH2セクションでは、1枚目を `見出し 1-1`、続くスライドを `見出し 1-2`, `見出し 1-3`... と自動ナンバリング。
  - 分割されていない1ページ完結のH2スライドには番号を付けず、シンプルに保ちます。
  - 表紙（`cover`）、中扉（`section`）、引用強調（`quote`）スライドは自動継承の対象外として適切に除外されます。
- **柔軟なON/OFF設定**:
  - プラグイン設定（**Settings → Layout & grid → Inherit section headings on split slides**、既定値 `ON`）またはノートのフロントマター（`inheritHeadings: false`）でいつでも切り替え可能です。

### 3. 🎨 単一HTMLエクスポートのスタイル完全同期 (HTML Export Style Parity)
- スタンドアローンHTMLエクスポート（`exportStyles.ts`）において、ステップフローのバッジ（`STEP 01`...）、非均等カラム比率（`2:1`, `1:2`, `3:1`, `1:3`）、プレーンカラム、KPIカード、Callout、中扉・引用レイアウトのCSS定義を完全に同期し、Obsidian内表示と同一の描画品質を実現しました。

### 4. 🛠 CSS詳細度の最適化・`!important` の完全排除 (CSS Specificity Refactoring)
- Obsidianコミュニティプラグインの審査ガイドラインに厳密に準拠するため、`styles.css` および `src/export/exportStyles.ts` からすべての `!important` を除去し、適切なセレクタ詳細度によるスタイリングへリファクタリングしました。

### 5. 🤖 AIスライド作成スキル連携ドキュメント & リリースワークフロースキル追加
- `README.md` / `README_ja.md` に公式AIエージェントスキルリポジトリ（[xhisashix/obsidian-presenter-skill](https://github.com/xhisashix/obsidian-presenter-skill)）の案内を追加しました。

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
- Obsidian 内の **設定 → コミュニティプラグイン → アップデートを確認** から最新版（`1.5.0`）へ更新可能です。
