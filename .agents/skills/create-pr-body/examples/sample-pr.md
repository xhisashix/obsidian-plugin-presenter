# Sample PR Output Example

Here is an example of what the agent should produce when this skill runs:

---

### PR Title Proposal
- `feat(settings): add declarative settings search API integration`

---

### PR Body

```markdown
## 概要 (Summary)
Obsidian 1.13.0+ で導入された Declarative Settings Search API (`getSettingDefinitions`) に対応し、プラグインの各種設定（テーマ、レイアウト、スライドプレビュー、ノート表示設定など）が Obsidian のグローバル設定検索バーから直接ヒットするようにしました。

## 変更内容 (Changes)
- **Settings Tab の拡張 (`src/ui/settings-tab.ts`)**:
  - `getSettingDefinitions()` を実装し、全設定項目のタイトル・説明・検索キーワードを登録
  - 設定項目クリック時に対応するセクションへ自動スクロールするアンカーリンクを追加
- **型定義の更新 (`src/types/settings.ts`)**:
  - `SettingDefinition` インターフェースを追加し、型安全性を確保
- **ドキュメント更新**:
  - `README.md` および `README_ja.md` に設定検索機能についての記述を追加

## 動作確認・検証 (Verification)
- [x] ESLint および TypeScript ビルドチェック (`npm run lint && npm run build`)
- [x] ユニットテストの通過 (`npm test`)
- [x] Obsidian (v1.13.0) 上での手動動作確認:
  1. 設定画面上部の検索バーで「テーマ」や「overflow」を入力
  2. プラグインの設定項目が候補に表示されることを確認
  3. 検索候補をクリックした際、対象の設定位置までスムーズにスクロールすることを確認

## 影響範囲・破壊的変更 (Impact & Breaking Changes)
- 影響範囲: 設定画面 (`PresenterSettingTab`)
- 破壊的変更: なし（旧バージョンの Obsidian でもフォールバックにより問題なく動作します）

## 関連Issue
- Closes #42
```
