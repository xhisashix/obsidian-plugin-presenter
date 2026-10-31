# Presenter 1.5.1 リリースノート (Release Notes)

**リリース日**: 2026-10-31  
**対象バージョン**: `1.5.1`  
**プラグインID**: `markdown-presenter`  
**対応Obsidianバージョン**: `minAppVersion: 1.7.2`

---

## 概要 (Overview)

`v1.5.1` では、Obsidian コミュニティプラグインのセキュリティガイドラインに準拠するため、PowerPoint（`.pptx`）エクスポート機能の内部依存ライブラリ（`jszip`）に起因していた**動的スクリプト要素の生成（`createElement('script')`）および `new Function()` ポリフィルのバンドル混入を解消するセキュリティ・ビルド修正**を実施しました。

これにより、外部コードの動的挿入リスクを完全に排除し、安全性を向上させました。機能面での互換性や操作方法の変更はありません。

---

## 🛠️ 修正・改善内容 (Fixes & Improvements)

### 1. 🛡 動的スクリプト生成およびレガシーポリフィルのバンドル混入解消 (Eliminate Dynamic Script Injection & Legacy Polyfills)
- **背景**:
  - `pptxgenjs` が依存する `jszip` は、ブラウザ向けデフォルトバンドル（`jszip.min.js`）において、IE6〜8向けの古い非同期実行ポリフィル（`lie`, `immediate`, `setimmediate`）を内包しており、その中に `document.createElement("script")` や `new Function()` が含まれていました。
  - これは Obsidian コミュニティプラグインの「動的なスクリプト挿入（Dynamically injecting script elements）を禁止する」セキュリティポリシーに抵触していました。
- **対応内容**:
  - `esbuild.config.mjs` および `scripts/run-tests.mjs` にて、`jszip` の解決先をバンドル済みファイルから CommonJS ソース（`node_modules/jszip/lib/index.js`）へ直接向けるプラグインを実装。
  - `jszip` 内部のレガシーポリフィル（`lie`, `setimmediate`, `readable-stream`）を、モダンブラウザ標準のネイティブ `Promise` / `setTimeout` ベースの安全なシムに置き換えました。
  - これにより、`main.js` 生成時に `createElement('script')` や `new Function()` が一切含まれないクリーンなビルド出力を実現しました。
  - バンドル成果物に対する検証テスト（`tests/pptx.test.ts`）を追加し、将来の依存更新時にも動的スクリプト生成が含まれないよう回帰防止を行いました。

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
- Obsidian 内の **設定 → コミュニティプラグイン → アップデートを確認** から最新版（`1.5.1`）へ更新可能です。
