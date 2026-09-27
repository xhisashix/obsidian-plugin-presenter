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
