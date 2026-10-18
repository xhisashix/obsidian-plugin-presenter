# Presenter 1.3.0 リリースノート (Release Notes)

**リリース日**: 2026-10-18  
**対象バージョン**: `1.3.0`  
**プラグインID**: `markdown-presenter`  
**対応Obsidianバージョン**: `minAppVersion: 1.7.2`

---

## 概要 (Overview)

`v1.3.0` では、プラグインの使いやすさとObsidian公式エコシステムとの統合を一段と深めるアップデートを実施しました。

Obsidian 1.13.0 以降で導入された**「宣言的設定検索 API（Declarative Settings Search）」**に対応し、Obsidian の全体設定検索バーから Presenter プラグインの各設定項目（テーマ、レイアウト、プレビュー、発表者ノート、HTMLエクスポート等）がダイレクトに検索・ジャンプできるようになりました。

また、Obsidian コミュニティプラグイン登録に向けた品質向上として、公式ドキュメント（`README.md`）を国際基準の**英語ドキュメント**に全面刷新し、日本語ユーザー向けには詳細な日本語解説（`README_ja.md`）を独立して提供しています。

---

## ✨ 新機能・改善点 (New Features & Improvements)

### 1. 宣言的設定検索 API 対応 (Declarative Settings Search / Obsidian 1.13.0+)
Obsidian の新しい設定検索フレームワーク（`getSettingDefinitions`）を完全実装しました。

- **グローバル設定検索との完全連動**:
  - Obsidian の **設定 → 検索バー** に「aspect ratio」「fit」「theme」「preview」「export」「badge」などのキーワードを入力するだけで、Presenter の設定タブ内にある該当トグルやドロップダウンが即座にハイライト・絞り込み表示されます。
- **全設定カテゴリーの定義化**:
  - `General & theming`（テーマ・アスペクト比・背景色・アクセントカラー・ロゴ）
  - `Layout & grid`（カラム既定スタイル・はみ出し自動フィット・ラベルバッジ）
  - `Slide preview`（エディタ連動・自動スクロール）
  - `Speaker notes & export`（カンペ表示・HTMLエクスポート）

### 2. 公式英語ドキュメント (README.md) & 日本語マニュアル (README_ja.md)
グローバルな利用と Obsidian コミュニティ登録ガイドラインに準拠するため、ドキュメント構成を刷新しました。

- **英語公式 README.md**:
  - インストール手順、Markdown 構文ルール、HTMLコメントによるマルチカラムディレクティブ、フロントマター設計、リアルタイムプレビュー、発表者ノート、HTMLエクスポート、設定項目の一覧を網羅した包括的な英語ドキュメントを提供。
- **専用日本語マニュアル (README_ja.md)**:
  - 従来の日本語ドキュメントを `README_ja.md` として維持・整理し、日本語話者向けに丁寧な図解・ステップ解説を提供。

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
- Obsidian 内の **設定 → コミュニティプラグイン → アップデートを確認** から最新版（`1.3.0`）へ更新可能です。
