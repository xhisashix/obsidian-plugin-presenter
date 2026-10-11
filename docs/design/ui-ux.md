# UI/UX・スタイリング設計書 (UI/UX & Styling Design Document)

## 1. デザイン原則 (Design Principles)

1. **コンテンツ主導 (Content-First)**:
   スライド作成者がテキストと論理構成に集中できるよう、余計な装飾を排し、高い可読性と洗練された余白を提供します。
2. **動的デザイントークン (Dynamic Design Tokens)**:
   CSSカスタムプロパティ（CSS変数）を採用し、フロントマターで指定されたカラーが瞬時に全UI要素へ調和して波及する仕組みを構築します。
3. **レスポンシブ・アスペクト比維持 (Scale & Ratio Fidelity)**:
   ディスプレイサイズや解像度に関わらず、16:9 または 4:3 のスライド比率を崩さず、常に最適な拡大率（Scale Transform）でセンタリング表示します。

---

## 2. デザイントークン・CSS変数 (Design Tokens)

スライドカード（`.presenter-slide-card`）に対して、以下の変数が動的にバインドされます。

```css
.presenter-slide-card {
  --presenter-base-color: #ffffff;   /* ベースカラー: スライド背景色 */
  --presenter-main-color: #1e293b;   /* メインカラー: 本文・見出し・基本文字 */
  --presenter-accent-color: #2563eb; /* アクセントカラー: 強調・ライン・マーカー */
}
```

### 2.1 配色マッピング表

| 要素                    | 適用プロパティ            | 参照変数                                              |
| :---------------------- | :------------------------ | :---------------------------------------------------- |
| **スライド背景**        | `background-color`        | `--presenter-base-color`                              |
| **本文・段落**          | `color`                   | `--presenter-main-color`                              |
| **H1 (表紙見出し)**     | `color`                   | `--presenter-accent-color`                            |
| **H2 (スライド見出し)** | `color` / `border-bottom` | `--presenter-main-color` / `--presenter-accent-color` |
| **箇条書きマーカー**    | `li::marker`              | `--presenter-accent-color`                            |
| **太字 (`strong`)**     | `color`                   | `--presenter-accent-color`                            |
| **引用 (`blockquote`)** | `border-left-color`       | `--presenter-accent-color`                            |
| **ラベル・バッジ (`.presenter-badge`)** | `background-color` / `color` | `--presenter-accent-color` / `#ffffff`               |
| **進捗バー**            | `background`              | `--presenter-accent-color`                            |

---

## 3. レスポンシブスケーリング設計 (Responsive Scaling Strategy)

### 3.1 基準解像度 (Base Coordinate System)

- **16:9 基準サイズ**: `1280px × 720px`
- **4:3 基準サイズ**: `1280px × 960px`

### 3.2 拡大縮小計算ロジック

スライドステージ（`.presenter-stage`）の実際の描画領域サイズ（`stageWidth`, `stageHeight`）を取得し、`ResizeObserver` を通じて動的にスケール係数を算出します。

```typescript
const scaleX = (stageWidth - padding) / baseWidth;
const scaleY = (stageHeight - padding) / baseHeight;
const scale = Math.min(scaleX, scaleY, 1.5);

cardEl.style.width = `${baseWidth}px`;
cardEl.style.height = `${baseHeight}px`;
cardEl.style.transform = `scale(${Math.max(scale, 0.2)})`;
```

- **利点**:
  - CSSの `font-size` やマージンをビューポートごとに再計算する必要がなく、文字の折り返し位置やレイアウトバランスが100%固定されます。
  - プロジェクター投影、大画面モニター、ノートPC画面のいずれでも同一の美しいスライド姿を保持します。

---

## 4. タイポグラフィ・レイアウト階層 (Typography & Hierarchy)

### 4.1 表紙スライド (`.presenter-slide-cover`)

- **配置**: 上下左右中央揃え (`justify-content: center; align-items: center;`)
- **H1**: `font-size: 54px`, `font-weight: 800`, `line-height: 1.2`
- **サブタイトル/段落**: `font-size: 24px`, `opacity: 0.85`

### 4.2 通常スライド (`.presenter-slide-content`)

- **H2 (タイトル)**: `font-size: 36px`, `font-weight: 700`, 下部にアクセントボーダー (4px)
- **H3 (小見出し)**: `font-size: 24px`, `font-weight: 600`
- **本文 (p, li)**: `font-size: 20px`, `line-height: 1.6`
- **テーブル (table)**: `font-size: 18px`, 均等パディング、薄いグリッド線
- **コードブロック (pre)**: `font-size: 16px`, 角丸8px

---

## 5. フローティングツールバー UX (Toolbar UX)

- **UIスタイル**: グラスモルフィズム（半透明ダーク背景 `rgba(15, 23, 42, 0.82)` + `backdrop-filter: blur(14px)`）
- **インタラクション**:
  - 通常表示時はプレゼンテーションに没入できるよう、透明度 `0.3` で控えめに表示。
  - マウスをツールバー周辺にホバーすると `opacity: 1` にスムーズにトランジション。
  - 各ボタンには Obsidian 標準の Lucide アイコンを採用し、ホバーエフェクトと明確な aria-label を付与。
  - **発表者ノートボタン**: 現在のスライドにノート（`> [!note]`）が存在する場合は右上にアクセントドット（インジケーター）が点灯。開閉状態に応じてアクティブハイライト。
  - **印刷ボタン**: クリックで「スライドのみ印刷」と「ハンドアウト（解説付き）印刷」を選べるポップアップメニューを展開。

---

## 6. リアルタイムプレビューペイン UI/UX (Preview Pane UX)

### 6.1 ペイン構成とテーマ調和
- **コンテナ (`.presenter-preview-container`)**:
  Obsidian のテーマ変数（`--background-secondary`）と調和したダーク/ライト適応背景。
- **上部ツールバー (`.presenter-preview-toolbar`)**:
  半透明背景（`rgba(15, 23, 42, 0.7)`）とバックドロップブラー（`blur(8px)`）を採用した洗練されたバー。
  - ページ送り（前へ・次へ）と現在位置カウンター表示（`X / Y`）。
  - **カーソル追従トグル（ピンボタン）**:
    追従有効時はアクセントカラー（`--interactive-accent` / `#38bdf8`）のハイライト背景と境界線でアクティブ状態を明示。
  - **全画面プレゼンボタン**:
    プレビュー状態から1クリックでフルスクリーンプレゼンテーションを開始。
- **プレビューキャンバス (`.presenter-preview-stage`)**:
  - `ResizeObserver` による追従拡大縮小。狭小なサイドバー幅（300px前後）から大型の分割ペインまで、スライドのアスペクト比を1ピクセルも崩さず美しくセンタリング描画。
  - スライドカードに繊細なドロップシャドウ（`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35)`）を施し、エディタとの視覚的分離と立体感を演出。
- **空状態（Empty State）**:
  Markdownファイルが開かれていない場合は、落ち着いたミュートカラーでガイダンスメッセージを表示。

---

## 7. 発表者ノートドロワー UI/UX (Speaker Notes Drawer UX)

### 7.1 ドロワーの構造とアニメーション
- **配置**: スライドステージ下部に固定され、下から上へスムーズにスライドイン展開（`animation: presenterDrawerSlideUp 0.2s ease-out`）。
- **ビジュアル**:
  - ダークトーン（`rgba(15, 23, 42, 0.95)`）＋ バックドロップブラー（`blur(12px)`）による高級感のあるガラス調インターフェース。
  - 最適な高さ制限（`height: 220px; max-height: 38vh`）により、スライド投影領域を過度に圧迫しない設計。
- **ヘッダー**:
  - アイコン付きタイトル（`Speaker notes & details`）および最小化ボタン（`chevron-down`）。
- **コンテンツ領域**:
  - 縦スクロール対応（`overflow-y: auto`）、可読性の高い文字サイズ（14px）と行間（1.6）。
  - ノートが存在しないスライドではイタリック体で「No speaker notes for this slide.」と静かに案内。

### 7.2 スライドステージとの排他・自動リサイズ調和
- ノートドロワーの開閉（`N` キーまたはトグルボタン）が行われると、ステージの利用可能高さの変化を検知して `applySlideScale()` が即時実行されます。
- スライドカードのスケール（縮小率）が自動的に再調整されるため、**ノートドロワーがスライド本文や図表と重なる事故を100%防止**します。

---

## 8. 配布用Web資料・ハンドアウト UI/UX (Handout & Standalone Web UX)

### 8.1 単一HTMLエクスポートの受取手体験
非エンジニアがブラウザでダブルクリックした際、一切の初期設定やプラグインなしで直感的に読めるよう、以下のUI/UXを提供します。

- **ヘッダーバー (Top Navbar)**:
  - 左端: ドキュメントタイトルと「Presentation」バッジ。
  - 中央/右端: **[ 🖥 スライド表示 ]** と **[ 📄 配布資料（詳細解説）表示 ]** のデュアルビュースイッチ。
  - 補助ツール: ノート開閉ボタン（`📝 ノート`）、印刷ボタン（`🖨 印刷 / PDF`）。
- **🖥 スライド表示モード**:
  - 矢印キーやスペースキーで軽快にめくれるフルスクリーン・スライドショー。
  - 画面下部にフローティングナビゲーションコントローラーを完備。
- **📄 配布資料（ハンドアウト）表示モード**:
  - 縦スクロールで上から下へすらすら読める、Notion公開記事や洗練されたWebレポート風のデザイン。
  - 各スライドカードの下に、アクセントバッジ（`💡 解説・背景メモ`）とともに `> [!note]` の詳細解説が展開。
  - 箇条書きスライドだけでは伝わらない「なぜ」「背景」「口頭で話したニュアンス」が文章として補完され、会議の欠席者や役員でも100%理解できるドキュメント体験を実現。

### 8.2 ハンドアウト印刷（A4最適化）レイアウト
- 印刷（またはPDF保存）実行時、1ページにつき「上部: スライドカード（高さ380px） ＋ 下部: 詳細解説ノート（破線区切り）」という美しい SlideDoc 形式で出力。
- ページ送りが自動制御され、紙で配布してもWebでPDF保存しても破綻しないプロ品質の資料が完成します。


