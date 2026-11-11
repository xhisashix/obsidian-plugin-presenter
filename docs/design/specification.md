# 機能仕様書 (Functional Specification)

## 1. 概要 (Overview)

本仕様書は、Obsidianプラグイン `markdown-presenter` が提供する機能仕様、記法ルール、Frontmatterスキーマ、操作体系、および出力仕様を定義します。

---

## 2. スライド分割・解釈仕様 (Slide Parsing Specification)

### 2.1 スライド分割ルール

プラグインは Markdown の見出し階層および区切り線をスキャンしてスライドを自動分割します。

| 要素             | 記法                                  | スライド種別        | 挙動                                                               |
| :--------------- | :------------------------------------ | :------------------ | :----------------------------------------------------------------- |
| **表紙スライド** | `# 見出し` (ATX H1) または `タイトル\n===` (Setext H1) | Cover (`cover`)     | プレゼン全体の表紙として認識。タイトル・サブタイトル等を中央配置。 |
| **通常スライド** | `## 見出し` (ATX H2) または `段落\n---` (Setext H2) | Content (`content`) | 各スライドの区切りとなり、上部にタイトル・アクセントバーを配置。   |
| **小見出し**     | `### 見出し` (H3), `#### 見出し` (H4) | -                   | スライド内のサブセクションとして表示（スライドは分割しない）。     |
| **明示的区切り** | `---`, `***`, `___` (水平線・改スライド) | Content (`content`) | 空行や非段落ブロック直後の水平線により、明示的な改スライドを行う。 |

> [!NOTE]
> コードブロック（` ``` ` または ` ~~~ `）内の見出しや水平線は、スライド境界として誤認識されないよう CommonMark 準拠のフェンストラッカーにより厳密に無視されます。

### 2.2 分割スライドの見出し自動継承・連番仕様 (Section Heading Inheritance)

長文スライドを `---` で分割した際、プレゼンテーション時にどのセクションの続きかが一目でわかるよう、親の `## H2` 見出しを自動継承して連番を付与します。

- **連番フォーマット**:
  同一セクション内の複数スライドに対して、`Title X-1, Title X-2, ... Title X-N` の形式で連番を付与（例: `背景と課題 1-1`, `背景と課題 1-2`）。
  1枚目のスライドの見出しも `Title X-1` に更新され、2枚目以降（続きスライド）の先頭に `## Title X-2` が自動挿入されます。
- **単一スライドの保護**:
  分割されていない（1枚のみの）H2セクションは連番が付かず、元のタイトル（`Title`）のまま表示されます。
- **除外ルール**:
  - 表紙スライド (`cover`)
  - 明示的または自動推論された中扉スライド (`section`)
  - 明示的または自動推論された引用スライド (`quote`)
  これらは親セクションの区切りとみなされ、見出しの自動継承は行われません。
- **設定と制御**:
  - **プラグイン設定**: **Settings → Layout & grid → Inherit section headings on split slides** (`inheritSlideHeadings`, デフォルト `true`)
  - **フロントマター**: `inheritHeadings: false` でノート個別に無効化可能。

---

## 3. 設定とフロントマター仕様 (Settings & Frontmatter Specification)

### 3.1 ゼロ設定（フロントマター不要）の原則
**スライド作成にあたり、フロントマターの記述は必須ではありません（0行で動作します）。**

配色、ヘッダー、フッター、ロゴ、アスペクト比、カラムスタイルなどの共通設定は、Obsidianのプラグイン設定画面（**Settings → Presenter**）で一度指定しておけば、すべてのノートに自動適用されます。
フロントマターは、**「そのノート固有で特定の項目だけを上書きしたい場合」にのみ、必要な項目を1〜2行記述**します。

#### 記述例 1: 完全ゼロ設定（推奨・最もシンプル）
```markdown
# プレゼンタイトル

## スライド1
- 箇条書き
```

#### 記述例 2: 特定の項目のみ上書きする場合
```yaml
---
header: "2026年度 経営計画発表会"
accentColor: "#e11d48"
---
```

### 3.2 パラメータ一覧（設定画面とフロントマターの対応）

| フロントマターキー | 設定画面の対応項目 | 型 | デフォルト値 | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `baseColor` (または `background`) | Default base color (background) | string (HEX/RGB) | `#ffffff` | スライドの背景色（ベースカラー：面積比 70%） |
| `mainColor` (または `color`) | Default main color (text) | string (HEX/RGB) | `#1e293b` | 本文テキスト・見出しの基本文字色 |
| `accentColor` | Default accent color | string (HEX/RGB) | `#2563eb` | メイン構造カラー（見出しライン・マーカー・テーブルヘッダー等：面積比 25%） |
| `popColor` (または `pop-color`, `highlightColor`) | Default pop color (highlight) | string (HEX/RGB) | `#ea580c` | 強調・注目色（KPI数値・最重要バッジ・推奨列/象限ハイライト等：面積比 5%） |
| `header` | Default header | string | 空文字 | スライド上部に表示するヘッダーテキスト |
| `footer` | Default footer | string | 空文字 | スライド下部に表示するフッターテキスト |
| `logo` | Default logo | string | 空文字 | Vault内画像パス (`attachments/logo.png`) または外部URL |
| `aspectRatio` | Aspect ratio | `"16:9"` \| `"4:3"` | `"16:9"` | スライドの画面アスペクト比 |
| `columnStyle` | Default column style | `"card"` \| `"plain"` | `"card"` | カラムレイアウトの基本スタイル |
| `fit` (または `presenter-fit`) | Auto-fit overflowing slides | `"auto"` \| `"none"` \| boolean | `false` | カード枠からはみ出たスライドの文字・余白を自動縮小（下限70%）するか |
| `smartLayouts` | Enable smart slide layouts | boolean | `true` | 見出しのみの中扉や引用スライド、KPI数値を自動推論してスタイリングするか |
| `inheritHeadings` | Inherit section headings on split slides | boolean | `true` | `---` で分割されたスライドに親H2見出しを引き継ぎ `Title 1-1, 1-2` と連番付与するか |
| - | Show notes by default | boolean | `false` | プレゼン開始時に発表者ノートドロワーをデフォルト展開するか |
| - | Enable label badges | boolean | `true` | `[重要]` などの角括弧ラベルを視覚的バッジとして自動装飾するか |

### 3.3 設定の優先度 (Priority Rule)

1. **最高優先**: ノートの Frontmatter 個別設定値（指定がある項目のみ）
2. **基本値**: プラグイン設定（Settings タブ）の保存値
3. **システム規定値**: プラグイン組込の初期値 (`DEFAULT_SETTINGS`)

---

## 4. グリッドレイアウト（マルチカラム）仕様

スライド内で横並び（2カラム・3カラム等）を実現するため、標準Markdown仕様を崩さない HTMLコメントディレクティブを提供します。
Obsidian以外のMarkdownビューア（GitHub、VS Code等）ではコメントが非表示になり、見出しが並ぶ通常の文書としてそのまま読めます。

### 4.1 基本記法 (`<!-- columns [N] [style] -->`)

```markdown
<!-- columns 2 card -->

### 左カラムの見出し
- ポイントA
- ポイントB

### 右カラムの見出し
- ポイントC
- ポイントD

<!-- /columns -->
```

- `<!-- columns 2 -->`: 2カラム均等グリッドを生成
- `<!-- columns 3 -->`: 3カラム均等グリッドを生成
- `<!-- columns 2 plain -->`: 背景色・枠線なし（プレーン分割レイアウト）で2カラム生成
- `<!-- columns 2 card -->`: 背景色・枠線・余白あり（カード風レイアウト）で2カラム生成
- `<!-- /columns -->`: カラム領域の終了（省略時はスライド末尾まで）
- `<!-- presenter:columns ... -->`: 名前空間付きエイリアスもサポート

### 4.2 明示的カラム区切り (`<!-- column -->`)

見出しを伴わない任意の文章を区切りたい場合は、`<!-- column -->` を明示的に挟んで分割します。

```markdown
<!-- columns 2 plain -->
左カラムの任意のコンテンツ（リスト、段落など）
<!-- column -->
右カラムの任意のコンテンツ
<!-- /columns -->
```

### 4.3 スタイルオプション（カード vs プレーン）

| スタイル | 特徴 | 適用方法 |
| :--- | :--- | :--- |
| **`card`** (デフォルト) | 『伝わるデザイン』の「面で囲み、線を消す」原則に基づき、外枠線を廃したソフト背景（`#F8FAFC`）、角丸 `12px`、内側パディング（`28px 32px`）、微細なドロップシャドウを持つカードチャンク | `<!-- columns 2 card -->` または `columnStyle: card` |
| **`plain`** | 背景色なし（透明）、枠線なし、パディング `0`。カラム間の余白（gap）のみで並ぶプレーンなテキスト配置 | `<!-- columns 2 plain -->` または `columnStyle: plain` |

> [!NOTE]
> スタイルの優先順位は **ブロックディレクティブ（`plain` / `card`） > フロントマター（`columnStyle`） > プラグイン設定（`defaultColumnStyle`）** です。

### 4.4 クイック挿入コマンド・ホットキー仕様

エディタ上でカラムディレクティブおよびデザインテンプレートを素早く挿入できるよう、以下のコマンド群を提供します。すべてのコマンドは **Settings → Hotkeys** から任意のショートカットキーを割り当て可能です。

- **デザインテンプレート・クイックピッカー (`insert-design-template` / `Insert slide design template...`)**:
  キーボード操作主導で執筆するパワーユーザー向けに、`SuggestModal`（`TemplatePickerModal`）を起動して全13種のプロフェッショナル・デザインテンプレート（ピラミッド、2軸マトリクス、ファネル、サイクル、チャート、Bento、エグゼクティブサマリー等）を日本語名・英語ID・カテゴリ・利用シーンのキーワードでインクリメンタル検索し、即座に挿入。
  - **操作キー**:
    - `Enter`: カーソル位置の文脈に応じた**スマート自動挿入**（現在のスライドに既に `## 見出し` があり本文が未入力の場合はレイアウト枠のみ `body-only`、それ以外は新規スライド全体 `full-slide` を挿入）
    - `Shift + Enter`: 明示的に**レイアウト枠のみ (`body-only`)** を挿入
    - `Cmd / Ctrl + Enter`: 明示的に**新規スライド全体 (`full-slide`：`## アクションタイトル` ＋ レイアウト本文)** を挿入
- **スライド・テンプレート・ナビゲーター (`open-template-navigator` / `Open slide template navigator...`)**:
  コンサルティングファーム基準の13種類のスライドレイアウト体系を「目的から探す（12目的）」「全テンプレート（4カテゴリ・13種）」「デザイン絶対原則（6原則）」の3タブで探索し、厳格なルールとワイヤーフレーム図解を確認した上で、実践的なMarkdownスニペット（新規スライド全体、またはレイアウト部分のみ）をエディタへワンクリック挿入する大型モーダル。
- **全13種デザインテンプレート・ダイレクト挿入コマンド (`insert-template-*`)**:
  各デザインテンプレート（`horizontal-flow`, `vertical-flow`, `swimlane`, `cycle`, `two-column`, `three-column`, `matrix`, `pyramid`, `chart`, `big-number`, `funnel`, `bento`, `executive`）をコマンドパレットやホットキーから1アクションで直接挿入。挿入時はスマート自動判別（`resolveSmartInsertMode`）により、既存 `## 見出し` 直下では見出し重複を防いでボディのみを挿入し、それ以外では新規スライド全体を挿入します。
- **カラムレイアウト・クイック選択ピッカー (`insert-columns` / `Insert column layout...`)**:
  `SuggestModal` を表示し、2/3/4カラム、card/plainスタイル、またはカラム区切り（`<!-- column -->`）を検索・選択して挿入。また、ピッカー先頭から「デザインテンプレート・クイックピッカー」および「スライド・テンプレート・ナビゲーター」を起動可能。
- **カラムダイレクト挿入コマンド**:
  - `insert-columns-2`: `<!-- columns 2 -->` ... `<!-- /columns -->`
  - `insert-columns-3`: `<!-- columns 3 -->` ... `<!-- /columns -->`
  - `insert-columns-4`: `<!-- columns 4 -->` ... `<!-- /columns -->`
  - `insert-columns-2-card` / `insert-columns-2-plain`
  - `insert-columns-3-card` / `insert-columns-3-plain`
  - `insert-column-break`: `<!-- column -->`
- **挿入時のエディタ挙動**:
  - **テキスト未選択時**:
    - カラムブロック挿入時は開始・終了コメントを挿入し、その間の空行へカーソルを自動移動（現在行に文字列がある場合はその行を分断せず直下の行へ挿入）。
    - デザインテンプレート挿入時はスマート自動判別（`auto`）により、現在のスライド先頭が `## 見出し` で本文がまだ空（またはカーソルが `## 見出し` 行上）の場合は `body-only`、それ以外の場合は `full-slide` を挿入し、挿入先頭行へカーソルを移動してリアルタイムプレビューを即座に同期。
  - **テキスト選択時**: 選択範囲を置換（カラムブロックの場合は前後を開始・終了コメントで囲む）。

---

## 5. ラベル・バッジ装飾仕様 (Badge Specification)

### 5.1 構文仕様
`[xxx] テキスト` の形式で記述された文字列を検出し、`<span class="presenter-badge">xxx</span>` に変換します。

- **検出対象**:
  - `[重要]`, `[課題]`, `[STEP 1]`, `[FAQ]` などの角括弧で囲まれた任意のテキストラベル。
  - 行頭、見出し（H1〜H4）、リスト項目（`- [xxx] ...`）、テーブルセル、段落内などで使用可能。
- **除外・誤判定防止ルール**:
  - Markdown標準リンク `[テキスト](URL)` は変換しない（直後に `(` がある場合）。
  - 内部リンク（Wikilink） `[[ノート]]` は変換しない（前後に `[` や `]` がある場合）。
  - 画像リンク `![alt](URL)` は変換しない（直前に `!` がある場合）。
  - タスクチェックボックス `[ ]`, `[x]`, `[X]` は変換しない。
  - 脚注参照 `[^1]` は変換しない。
  - リンク定義 `[id]: URL` は変換しない。
  - コードブロック（フェンスコードおよびインラインコード `` `[xxx]` ``）内は変換しない。

---

## 6. 操作・ナビゲーション体系 (Controls Specification)

### 6.1 キーボードショートカット

| 操作                       | キーバインド                            |
| :------------------------- | :-------------------------------------- |
| **次のスライドへ**         | `→`, `↓`, `Space`, `PageDown`, `L`, `J` |
| **前のスライドへ**         | `←`, `↑`, `PageUp`, `H`, `K`            |
| **最初のスライドへ**       | `Home`                                  |
| **最後のスライドへ**       | `End`                                   |
| **全画面切り替え**         | `F`                                     |
| **発表者ノート表示切替**   | `N`                                     |
| **印刷 / PDFエクスポート** | `P`                                     |
| **スライド終了 (閉じる)**  | `Escape`                                |

### 6.2 ナビゲーションツールバー (Floating Toolbar)

画面下部中央にフローティング配置され、マウスホバー時に鮮明に表示されます。

- **前へ / 次へ ボタン**: スライド移動
- **スライド番号ボタン (`X / Y`)**: クリックで「スライド番号ジャンプモーダル」を開く
- **発表者ノートボタン**: クリックで下部ノートドロワーの開閉をトグル（ノートが存在するスライドではインジケータードットが点灯）
- **全画面ボタン**: フルスクリーン表示の切り替え
- **印刷ボタン**: クリックで印刷モード選択メニュー（「Print slides only」または「Print handout with notes」）を表示
- **閉じるボタン (`X`)**: プレゼンテーションを終了

---

## 7. 印刷・PDF出力仕様 (Print & PDF Specification)

- **メカニズム**:
  ブラウザ／Obsidian の標準印刷機能（`window.print()`）と `@media print` CSS によるページング制御。
- **印刷モード**:
  1. **スライドのみ印刷 (`Print slides only`)**:
     各スライドカードを1ページ1枚のフルサイズ・横向き（ランドスケープ）で出力。
  2. **ハンドアウト印刷 (`Print handout with notes`)**:
     1ページにつき「上部: スライドカード（縮小表示） ＋ 下部: 発表者ノート・詳細解説（`> [!note]`）」を美しく配置し、A4縦/横でそのまま読める配布資料として出力。
- **改ページ保証**:
  すべてのスライドカードおよびハンドアウトラッパー要素に `break-after: page;` および `page-break-after: always;` を適用。
- **UI要素の非表示**:
  印刷時には進行状況バー、ツールバー、エディタ背景はすべて自動的に非表示となります。

---

## 8. リアルタイムプレビュー仕様 (Real-time Preview Specification)

### 8.1 概要
エディタで Markdown を編集しながら、隣接ペインでリアルタイムに完成スライドのレイアウト・デザインを確認できる機能です。

### 8.2 起動トリガー
- **コマンドパレット**:
  - `Presenter: Open slide preview`: エディタの右側に分割ペインとしてプレビューを起動（既に存在する場合はフォーカス）
  - `Presenter: Toggle slide preview`: プレビューペインの開閉をトグル
- **エディタタブヘッダー**: Markdown ノートの右上ヘッダーに配置された「TV/プレゼンテーション」アイコンをクリック
- **リボンメニュー**: 左リボンの「TV」アイコンをクリック

### 8.3 プレビューツールバー機能
プレビューペイン上部に常駐するコンパクトなツールバーです。
- **前へ (`‹`) / 次へ (`›`) ボタン**: 前後のスライドへ手動移動
- **スライド番号ボタン (`X / Y`)**: クリックでスライドジャンプダイアログを表示し、任意のスライドへ直接移動
- **カーソル追従トグル (ピン留めアイコン)**:
  - **有効 (Active)**: エディタ内のカーソル行番号に応じて、プレビュー対象スライドを自動切り替え
  - **無効 (Locked)**: 特定のスライドを固定表示したまま、ドキュメントの他の箇所を自由に編集可能
- **テンプレートナビゲーターボタン (`layout-template` アイコン)**: クリックで「スライド・テンプレート・ナビゲーター (`TemplateNavigatorModal`)」を開き、現在プレビュー中のノートに対して目的別のスライドテンプレートを即座に挿入可能
- **全画面プレゼン開始ボタン**: 現在プレビュー表示中のスライド位置から、即座にフルスクリーンのプレゼンテーションモーダルを開始

### 8.4 同期・パフォーマンス制御
- **デバウンス更新**: テキストタイピング中は 250ms のデバウンスを適用し、エディタの入力レスポンスを犠牲にすることなくスムーズにプレビューを再生成。
- **行番号マッピング**: フロントマターおよび各スライドの境界（H1/H2/---）を走査して `startLine` と `endLine` を動的に追跡。カーソル移動時は Markdown の再パースを行わず、キャッシュされたスライド一覧から即座に対象スライドを切り替え表示。
- **自動スケーリング**: `ResizeObserver` により、分割ペインの幅・高さに合わせてスライドカード（1280×720 または 1280×960）を最適な拡大率で自動スケーリング。

---

## 9. 発表者ノート & 資料配布仕様 (Speaker Notes & Handouts Specification)

### 9.1 記法仕様 (標準Markdown・Callout準拠)
独自記法を導入せず、Obsidian標準のCallout記法（`> [!note]`）を「発表者ノート／詳細解説」として自動認識します。

```markdown
## 提案するソリューション

- **Markdownドリブン**: 普段のメモがそのままスライド化
- **高速プレビュー**: 執筆しながらリアルタイム確認
- **ワンクリック配布**: 非エンジニアにも見やすく共有

> [!note] 補足・背景解説
> ここに記述した内容は、プレゼン投影時にはスライド大画面から自動的に隠れ、発表者の手元カンペになります。
> 一方で、後述のHTMLエクスポートやハンドアウト印刷時には、スライド直下に「詳細解説」として自動展開されます。
```

- **検出ルール**:
  `> [!note]`, `> [!notes]`, `> [!speaker-note]`（大文字小文字不問）で始まるブロッククォートを検出。
- **分離処理**:
  パーサー（`extractSlideNotes`）により、スライド本体コンテンツ（`markdown`）とノートコンテンツ（`notes`）に自動分離。スライドカード内にはノートを含めず、要点のみのクリーンなスライドを描画。
- **互換性の保証**:
  GitHubや他のMarkdownビューア、Obsidianの標準プレビューでもそのまま「標準の注釈・引用ブロック」としてレンダリングされ、記法崩れは一切生じません。

### 9.2 プレゼンターモードでのカンペドロワーUI
- **デフォルト非表示**:
  スライド大画面上はスッキリした発表用スライドのみを投影。
- **トグル操作**:
  ツールバーの「📝 ノート」ボタン、またはキーボードの `N` キーで、画面下部に手元カンペ（Speaker notes drawer）を開閉。
- **ノートインジケーター**:
  現在のスライドにノートが存在する場合、ツールバーボタン右上にアクセントカラーのドット（インジケーター）が点灯。
- **レスポンシブ再計算**:
  ドロワー展開・格納時はスライドステージの有効高さを即座に再検出し、スライドカードのスケール（縮小率）を再計算するため、スライドとノートが重なることはありません。

### 9.3 配布用単一HTMLエクスポート仕様 (Standalone HTML Export)
- **コマンド**:
  `Presenter: Export presentation as standalone HTML`
- **出力形式**:
  - ノートと同じ階層に `<ノート名>-presentation.html` を Vault 内に保存。
  - 同時にブラウザダウンロードトリガーを発火し、OS側のダウンロードフォルダ等へも即時保存。
- **自己完結アーキテクチャ (Zero-Dependency & Offline-First)**:
  - 外部CDN、Webフォント、外部スクリプトへの依存ゼロ。
  - CSS・JavaScriptを単一ファイル内に完全インライン化。
  - Vault内のローカル画像（ロゴやスライド画像）を自動的に Base64 Data URL へ変換してインライン埋め込み。
  - 共有相手は Obsidian やプラグインを一切持たずとも、**任意のWebブラウザでダブルクリックするだけで閲覧可能**。
- **受取手のデュアルビュー体験**:
  1. **🖥 スライド表示モード**: 矢印キーでページ送りできるフルスクリーンプレゼンテーション。ノートボタンでカンペも確認可能。
  2. **📄 配布資料（ハンドアウト）表示モード**: スライドカードと詳細解説（`> [!note]`）が縦スクロールで1ページずつ整然と並ぶ、Webレポート/ドキュメント形式。画面左側には階層的な目次（TOC）サイドバーが常駐し、各種セクションやスライドへ瞬時にスムーズスクロール移動可能。閲覧中のスライドはスクロールに応じて目次内で自動ハイライト（Scrollspy）される。
  3. **📑 スライド一覧 / 目次**: 全スライドをグリッド一覧で俯瞰し、クリックで対象スライドへ即時ジャンプ（配布資料モード時は該当解説箇所へスムーズスクロール）。`G` / `O` キーや `Esc` での開閉に対応。
- **印刷最適化**:
  受取手がブラウザ上で印刷（`Cmd + P`）を実行した場合も、A4用紙1枚につき「スライド ＋ 詳細解説」が綺麗に収まるプリントスタイルを内蔵。

### 9.4 配布用PowerPoint (.pptx) エクスポート仕様 (PowerPoint Export Specification)
- **起動トリガー**:
  - コマンドパレット: `Presenter: Export presentation as powerpoint (.pptx)` (`export-pptx`)
  - プレゼンツールバー: 「🖨 印刷」メニュー内の「Export as powerpoint (.pptx)」アクション
- **出力形式**:
  - ノートと同じ階層に `<ノート名>-presentation.pptx` を Vault 内に保存。
  - ブラウザのダウンロードリンク（Data URL/Blob）を自動発火し、ローカル環境へ直接ダウンロード保存。
- **ネイティブPowerPointオブジェクト変換 (`pptxgenjs`)**:
  - HTML/CSSの画像スクショ貼り付けではなく、PowerPointネイティブのテキストボックス、テーブル、シェイプ、レイアウトとして忠実に再構築。
  - **アスペクト比**: フロントマターおよび設定の `aspectRatio` に応じて `LAYOUT_WIDE` (16:9) または `LAYOUT_4x3` (4:3) を動的適用。
  - **テーマと配色**: フロントマター/設定の `baseColor`, `mainColor`, `accentColor` をRGB 16進に変換し、スライド背景、ヘッダー、アクセントバー、箇条書きマーカー、バッジ色へ適用。
  - **レイアウトの忠実な再現**:
    - 表紙スライド (`cover`): タイトルとサブタイトルの中央配置、ロゴ配置。
    - 中扉スライド (`section`): セクションタイトルのセンタリングとアクセント装飾。
    - 引用スライド (`quote`): 大きな引用メッセージカードの描画。
    - 通常コンテンツスライド (`content`): 上部ヘッダー・タイトルバー、下部フッター・ページ番号。
    - マルチカラムグリッド: 2カラム、3カラム、4カラム、card（角丸・薄い背景・枠線）/ plain（透明・枠線なし）。
    - 非均等カラム比率: `2:1`, `1:2`, `3:1`, `1:3` の幅計算による段組み配置。
    - ステップフロー: `<!-- columns N step -->` による `STEP 01`, `STEP 02`... バッジ付きステップカード。
    - KPIメトリクス: `**+140%**` 等の数値を大文字フォント（44pt）で強調配置。
    - Calloutボックス: `> [!important]` などの要約コールアウトをアクセント枠付きサマリーカードとして配置。
    - テーブル・コードブロック: ネイティブPPTX表オブジェクト（テーマ色ヘッダー）、モノスペース背景付きコードブロック。
    - 図表・画像: ローカル画像・Web画像のBase64埋め込み、Mermaid図（SVG）のCanvas経由PNG自動ラスタライズ埋め込み。
    - 発表者ノート: `> [!note]` の内容を各PPTXスライドのネイティブ発表者ノート（`pptxSlide.addNotes`）へ自動格納。
- **セキュリティ・堅牢性**:
  - Obsidianプラグインセキュリティポリシーに準拠し、動的スクリプト要素の作成（`createElement('script')`）や動的コード評価（`new Function()`）を伴うレガシーポリフィル（IE向け Lie/setImmediate 等）を esbuild レベルで完全に排除（ネイティブ Promise / タイマーへ置換）。

---

## 10. スライドはみ出し検知と自動フィット仕様 (Slide Overflow Detection & Auto-fit)

スライド内に文章やリスト、カラムを詰め込みすぎた結果、スライドカードの境界枠を縦方向にはみ出してしまうケースを自動検知し、安全にフィットまたは分割案内を行う機能です。

### 10.1 はみ出し検知ロジック (`calculateOverflow`)
- **計測対象**:
  スライド本文エリア（`.presenter-slide-body`）。
- **判定条件**:
  `scrollHeight > clientHeight + 4px`（4pxのサブピクセル誤差許容バッファ）。
- **計測環境**:
  全スライドの一括計測は、画面描画を阻害しない非表示のオフスクリーン計測コンテナ（`.presenter-measure-container`）で高速レンダリング（通常ノート20枚でも約30ms）して実行。

### 10.2 自動フィット (Auto-fit)
- **CSS変数駆動**:
  `.presenter-slide-body` に `--presenter-body-scale` を付与し、フォントサイズ・行間・見出し上下マージン・カラムのパディングを一律に比率計算。
- **反復ステップ縮小 (`fitContentToSlideBody`)**:
  初回の比率計算（`1.0 / overflowRatio`）適用後も、グリッド列幅に対する文字折り返しの非線形性によって残余はみ出しが存在する場合は、収まるか下限（`0.70`）に達するまで `0.03` 刻みで段階的に再計測・微調整を実行。
- **縮小下限（70%制限）**:
  視認性と可読性を担保するため、縮小率は `0.70`（70%）でクランプ（下限クリッピング）。
- **設定優先度**:
  Frontmatter `fit: auto` / `fit: none` が最優先、未指定時はプラグイン設定 `autoFitOverflow`（デフォルト: `true`）を適用。

### 10.3 スライド分割判定 (`findSplitHeadingInSlide`)
- **判定基準**:
  スライド内のMarkdownテキストを走査し、**2つ目のH3見出し（`###`）** を検出した場合に分割可能と判定。
- **安全性**:
  コードブロック（```）内の見出しはCommonMarkフェンストラッカーにより厳密に除外。
- **実行動作**:
  インスペクションモーダルの「**Split slide**」押下時、2つ目のH3見出しの直前に `\n---\n\n` を挿入。
  エディタが開いている場合はエディタ履歴経由で挿入されるため、ユーザーは `Cmd + Z`（Undo）で即座に元に戻せます。

### 10.4 UI/UXインジケーター
- **ツールバー警告ボタン**:
  プレビュー画面および全画面プレゼン画面のツールバーに `⚠ N` バッジを表示。クリックで詳細一覧モーダル（`OverflowReportModal`）が展開。
- **スライドジャンプ画面連携**:
  `JumpToSlideModal` 内の候補一覧で、はみ出しが発生しているスライドのタイトルの横に `⚠` バッジを付与。
- **コマンドパレット**:
  `Presenter: Check slide overflow`（`check-overflow`）からいつでも即時検査が可能。

---

## 11. スマートスライドレイアウト仕様 (Smart Slide Layouts & "Tsutawaru Design" Auto-Transforms)

### 11.1 優先順位ルール
1. **最高優先（明示的指示子）**: スライド内に `<!-- slide: section -->`, `<!-- slide: quote -->`, `<!-- slide: content -->` がある場合、設定のON/OFFに関わらず強制適用。
2. **自動推論（設定 `enableSmartLayouts: true` 時）**:
   - `section`（中扉）: H2見出しのみで本文を持たないスライドを自動検知し、中央配置・アクセントタイトルの章扉デザインとして描画。
   - `quote`（引用・ビッグメッセージ）: H2見出し＋単一の引用ブロック（`> ...`）で構成されるスライドを中央大文字の引用デザインとして描画。
   - `KPIメトリクス`: 単独行の太字数値（`**+140%**`, `**3.5x**` 等）を自動検知し、`.presenter-kpi-value`（52px・注目色 `--presenter-pop-color` `#ea580c`・等幅数字 `tabular-nums`）で強調表示。
   - **『伝わるデザイン』自動構造変換 (`tsutawaruTransforms.ts`)**:
     明示的な `<!-- columns -->` 指示子を書かなくても、標準Markdownの自然な構造から視線誘導に優れたスライドレイアウトへ自動変換します：
     - **H3見出し群の自動カード・2×2グリッド化**: スライド内に簡潔な `### H3` セクションが **2〜3個** 並ぶ場合は自動的に2〜3カラムのソフトカード（`#F8FAFC`）へ横並び配置。**4個** 並ぶ場合は横一列の視線移動距離を抑えるため自動的に **`2×2` グリッド (`presenter-cols-grid`)** へ変換（末尾の `> [!important]` Calloutはグリッド外の下部全幅サマリーとして維持）。
     - **画像＋解説テキストの黄金比（6:4）自動分割**: スライド内に単独画像（`![]()` または `![[]]`）と箇条書き/小見出しが共存する場合、自動的に `<!-- columns 6:4 plain -->` 相当の左右分割レイアウト（`presenter-cols-media-split`）へ変換。
     - **コードブロック＋解説の黄金比（6:4）ダーク分割**: 単一のフェンスコードブロック（18行以下）と解説リストが共存する場合、左60%にダークテーマ（`#0F172A`）コード枠、右40%に解説カードを並べる `presenter-cols-code-split` レイアウトへ自動変換。
     - **比較テーブルの縦罫線排除 ＆ 推奨列ハイライト**: 表の縦罫線を排除して横罫線のみとし、数値右揃え（`tabular-nums`）を適用。さらに `<!-- table: highlight N -->` 指示子、または列ヘッダー内の `[推奨]` / `[おすすめ]` / `[Recommended]` / `★` / `🎯`（あるいは唯一の太字ヘッダー列）を自動検知して該当列全体をソフトオレンジ背景＋上部アクセントボーダーでハイライト（`.presenter-table-highlight-col-N`）。
     - **Q&A（よくある質問）の自動ぶら下げインデント整列**: `Q. ...` / `A. ...` の連続行を検知し、`Q.`（メインブルー）と `A.`（ポップオレンジ）の頭文字位置を揃えた `.presenter-qa-list` カードへ自動変換。
3. **フォールバック**: 設定OFFかつ明示コメント未指定時は、すべてのスライドを標準の `content` レイアウトとして描画。

---

## 12. 非均等カラム比率 & コンサル図解バリアント仕様

### 12.1 非均等カラム比率 (`<!-- columns 2:1 -->` / `<!-- columns 6:4 -->` 等)
- `<!-- columns 6:4 -->` (または `<!-- columns 3:2 -->`): 左カラム幅 3fr (60%)、右カラム幅 2fr (40%) の『伝わるデザイン』黄金比グリッドを生成（図表・画像・コード＋解説に最適）。
- `<!-- columns 4:6 -->` (または `<!-- columns 2:3 -->`): 左 40%・右 60% の黄金比グリッド。
- `<!-- columns 2:1 -->`: 左カラム幅 2fr、右カラム幅 1fr のグリッドを生成。
- `<!-- columns 1:2 -->`: 右カラムを広めに確保。
- `<!-- columns 2x2 -->` (または `<!-- columns grid -->`): 4つの要素を2列×2段のグリッド（`.presenter-cols-grid`）として配置。
- `card` / `plain` スタイルとも併用可能（例: `<!-- columns 6:4 plain -->`）。

### 12.2 ステップフロー (`<!-- columns 3 step -->`)
- `<!-- columns 3 step -->` または `<!-- columns 4 step -->`:
- 各カラム上部に `STEP 01`, `STEP 02`... のアクセントインジケーターとカラム間の `➔` 矢印コネクタを自動生成し、手順やフェーズ進行を直感的に図解。

### 12.3 図解バリアント (`pyramid` / `funnel` / `matrix` / `cycle` / `chart`)
- **`<!-- columns pyramid -->`（ピラミッド階層図）**:
  各 `###` セクションを1階層として描画。左側に上層（アクセントカラー・狭幅）から下層（メインカラー・広幅）へ広がる台形ピラミッドシェイプ、右側に各階層の詳細解説カードを横並びで整列配置。また従来の2カラム（左に `▲ / ■ / ▬` 箇条書き＋右に解説箇条書き）記法も自動検知してピラミッド図へアップグレード描画。
- **`<!-- columns funnel -->`（ファネル図）**:
  各 `###` セクションを1フェーズとして描画。左側に上から下へ絞り込まれる逆台形ファネルシェイプ、右側に解説カードを配置。`[ボトルネック]` 等の強調バッジを含むフェーズは自動的にアクセントカラーでハイライト。
- **`<!-- columns matrix -->`（2軸4象限マトリクス）**:
  4つの `###` セクションを `2×2` 象限グリッドとして配置し、左縦軸・下横軸（`▲ 高 (High)` / `高 (High) ▶`）と右上象限（最優先領域）のアクセント枠ハイライトを自動付与。
- **`<!-- columns cycle -->`（循環サイクル図）**:
  4つの `###` セクションを時計回りの `2×2` ループとして配置し、中央に循環コアハブ（`↻`）と各象限間の方向矢印（`➔`, `▼`, `◀`, `▲`）を自動付与。
- **`<!-- chart --> ... <!-- /chart -->`（横棒グラフ）**:
  `- ラベル | 数値テキスト | 80%` 形式のリストを水平バーチャートに変換。太字（`**`）や `[牽引]` 等のバッジを含む行のみをアクセントカラーで塗り、それ以外をニュートラルグレーで描画。

---

## 13. スライド俯瞰グリッド・Lightbox・サマリー共有仕様

### 13.1 スライド俯瞰グリッド (Overview Grid / Slide Sorter)
- プレゼン中に `G` または `O` キー、あるいはツールバーのグリッドボタンを押すと、全スライドのサムネイルカードを全画面一覧表示。
- 章扉（`section`）はアクセント枠で区別され、クリックしたスライドへ即座に移動可能。

### 13.2 クリック拡大 (Lightbox)
- プレゼン中および配布HTML上で、画像（`<img>`）またはMermaid図（`.mermaid`）をクリックすると、画面中央に拡大表示。`Escape` または背景クリックで元のスライドに復帰。

### 13.3 共有用エグゼクティブサマリーコピー (`Presenter: Copy summary for sharing`)
- プレゼンタイトル、章・各スライド構成番号、および結論Callout（`> [!important]`）や重要バッジ（`[重要]`）を抽出した構造化テキストをクリップボードにコピー。Slackやメールでの共有を瞬時に行えます。

---

## 14. 提供コマンド一覧 (Command Palette Commands)

プラグインが登録するすべてのコマンド（IDおよび名称）と機能概要です。すべてのコマンドは Obsidian の **設定 → ホットキー** より任意のショートカットキーにバインドできます。

| コマンドID | コマンド表示名 (Name) | 説明 |
| :--- | :--- | :--- |
| `start-presentation` | `Presenter: Start presentation` | 現在開いているノートで全画面プレゼンテーションを開始 |
| `open-preview` | `Presenter: Open slide preview` | リアルタイムスライドプレビューペインを開く（既に開いていればフォーカス） |
| `toggle-preview` | `Presenter: Toggle slide preview` | スライドプレビューペインの開閉をトグル |
| `export-html` | `Presenter: Export presentation as standalone HTML` | 単一完結のポータブルHTMLプレゼンテーションを出力・保存 |
| `export-pptx` | `Presenter: Export presentation as powerpoint (.pptx)` | 編集可能なネイティブPowerPointファイルを出力・保存 |
| `check-overflow` | `Presenter: Check slide overflow` | スライドはみ出し検査モーダル（警告率一覧・ワンクリック分割）を開く |
| `copy-presentation-summary` | `Presenter: Copy summary for sharing` | スライド構成と要点をまとめたテキストをクリップボードにコピー |
| `insert-design-template` | `Presenter: Insert slide design template...` | 全13種のデザインテンプレートをキーワード検索して即座に挿入するクイックピッカーを表示 |
| `open-template-navigator` | `Presenter: Open slide template navigator...` | 目的別（12種）・全13種のプロフェッショナル・スライドテンプレートナビゲーターを開く |
| `insert-template-horizontal-flow` | `Presenter: Insert template: Horizontal step flow (ホリゾンタルフロー型)` | 横並びステップフロー（`<!-- columns 3 step -->`）テンプレートを挿入 |
| `insert-template-vertical-flow` | `Presenter: Insert template: Vertical tower flow (縦並び＋右向きフロー型)` | 全体進行Callout＋3列タワー（`<!-- columns 3 card -->`）テンプレートを挿入 |
| `insert-template-swimlane` | `Presenter: Insert template: Swimlane timeline (スイムレーン部門別型)` | 部門別マトリクステーブル＋業務改革Calloutテンプレートを挿入 |
| `insert-template-cycle` | `Presenter: Insert template: Continuous cycle loop (サイクル・循環型)` | 循環ループ図（`<!-- columns cycle -->`）テンプレートを挿入 |
| `insert-template-two-column` | `Presenter: Insert template: 2-column text & visual (2カラム比較・対比型)` | 左テキスト・右図表の黄金比（`<!-- columns 2 1:2 card -->`）テンプレートを挿入 |
| `insert-template-three-column` | `Presenter: Insert template: 3-column pillars (3カラム・ピラー型)` | 戦略の3本柱（`<!-- columns 3 card -->`）テンプレートを挿入 |
| `insert-template-matrix` | `Presenter: Insert template: 2x2 positioning matrix (2軸4象限マトリクス型)` | 2軸4象限マトリクス（`<!-- columns matrix -->`）テンプレートを挿入 |
| `insert-template-pyramid` | `Presenter: Insert template: Pyramid hierarchy (ピラミッド階層図型)` | 3階層ピラミッド図（`<!-- columns pyramid -->`）テンプレートを挿入 |
| `insert-template-chart` | `Presenter: Insert template: Chart & insight (チャート＋インサイト抽出型)` | 横棒グラフ（`<!-- chart -->`）＋右インサイト（`2:1`）テンプレートを挿入 |
| `insert-template-big-number` | `Presenter: Insert template: Big number KPI (ビッグナンバー単一指標型)` | 単一巨大KPI（`<!-- kpi -->`）＋結論Calloutテンプレートを挿入 |
| `insert-template-funnel` | `Presenter: Insert template: Funnel & conversion (ファネル・転換率分析型)` | 逆台形ファネル図（`<!-- columns funnel -->`）テンプレートを挿入 |
| `insert-template-bento` | `Presenter: Insert template: Bento box dashboard (弁当箱型ダッシュボード)` | 2段モジュラーダッシュボード（`2:1` ＋ `3カラム`）テンプレートを挿入 |
| `insert-template-executive` | `Presenter: Insert template: Executive summary (エグゼクティブサマリー型)` | 結論Callout＋3カラム（Situation / Findings / Recommendation）テンプレートを挿入 |
| `insert-columns` | `Presenter: Insert column layout...` | カラム数・スタイル・比率をインタラクティブに選べるピッカーモーダルを表示 |
| `insert-columns-2` | `Presenter: Insert 2-column layout` | `<!-- columns 2 -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-2-ratio-2-1` | `Presenter: Insert 2-column (2:1 ratio) layout` | `<!-- columns 2:1 -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-2-ratio-1-2` | `Presenter: Insert 2-column (1:2 ratio) layout` | `<!-- columns 1:2 -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-3` | `Presenter: Insert 3-column layout` | `<!-- columns 3 -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-3-step` | `Presenter: Insert 3-column step flow layout` | `<!-- columns 3 step -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-4` | `Presenter: Insert 4-column layout` | `<!-- columns 4 -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-2-card` | `Presenter: Insert 2-column card layout` | `<!-- columns 2 card -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-2-plain` | `Presenter: Insert 2-column plain layout` | `<!-- columns 2 plain -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-3-card` | `Presenter: Insert 3-column card layout` | `<!-- columns 3 card -->` ... `<!-- /columns -->` を挿入 |
| `insert-columns-3-plain` | `Presenter: Insert 3-column plain layout` | `<!-- columns 3 plain -->` ... `<!-- /columns -->` を挿入 |
| `insert-column-break` | `Presenter: Insert column break` | 明示的カラム区切り `<!-- column -->` を挿入 |


