# エディタのマークダウンハイライト

## 概要
メモのエディタ（今は素の `textarea`）で、マークダウンの記法ごとに文字に色を付ける。
`textarea` の背面に色付きの表示層を重ねる自前のオーバーレイ方式で実装し、依存パッケージやビルド工程は増やさない。

## 調査結果
- `src/memo.html`: エディタは `<textarea class="content-input">`。`.main-content` の中で `.title-display` と `.footer` の間にある
- `src/memo.css`: `.content-input` が `flex: 1`、`padding: 20px`、`border: 1px solid #e1e8ed`、`border-radius: 8px`、`font-size: 16px`、`line-height: 1.6`、`margin-bottom: 25px` を持つ。`font-family` は指定がなく、ブラウザ既定（等幅）になっている。シークレットメモ表示では `.main-content.secret .content-input` が背景・文字色・枠線を変える
- `src/memo.js`: `contentInput` の `value` を読み書きし、`input` イベントで自動保存・タイトル更新、`loadMemo` で本文を設定、コピーで `select()` を呼ぶ。これらは `textarea` のまま維持できる
- `textarea` の中の一部の文字だけ色を変えることはできない。そのため、同じ文字を色付きで表示する層（`pre`）を背面に置き、`textarea` の文字を透明にして重ねる必要がある
- 重ねる 2 つは、フォント・サイズ・行間・余白・折り返し・スクロール位置が 1 ピクセルもずれないようにしないと、文字が二重に見える

## 実装計画
- [x] ステップ1: `src/markdown-highlight.js` を新規作成し、純粋関数 `highlightMarkdown(text)` を実装する。入力の文字列を HTML エスケープして、記法ごとに `<span class="md-...">` で囲んだ HTML 文字列を返す。文字の追加・削除・並べ替えはしない（見た目の位置を `textarea` と一致させるため）。対象の記法は次のとおり
  - 行単位: 見出し（`#`〜`######`）、引用（`>`）、リスト（`-` `*` `+` と `1.`）、区切り線（`---` / `***`）、コードブロック（行頭の ```` ``` ````。閉じるまでの行すべて）
  - 行内: インラインコード（`` ` ``）、太字（`**`）、斜体（`*`）、リンク（`[文字](URL)`）
  - 本文が `\n` で終わるときは、最後の空行が `pre` でも表示されるよう末尾に 1 文字足す
  - （`src/markdown-highlight.js`）
- [x] ステップ2: `src/memo.html` で `textarea` を `<div class="editor">` で包み、その中の `textarea` の前に `<pre class="editor-highlight" aria-hidden="true"></pre>` を置く（`src/memo.html`）
- [x] ステップ3: `src/memo.css` を次のように変更する（`src/memo.css`）
  - `.editor` に、これまで `.content-input` が持っていた外側の見た目（`flex: 1`、`min-height: 0`、`margin-bottom: 25px`、枠線、角丸、背景、影、`position: relative`）を移す。フォーカス時の枠線は `.editor:focus-within` で変える
  - `.editor-highlight` と `.content-input` は、どちらも `position: absolute; inset: 0`、`border: 0`、`padding: 20px`、同じ `font-family`（等幅）・`font-size`・`line-height`・`white-space: pre-wrap`・`overflow-wrap: break-word`・`overflow: auto`・`scrollbar-gutter: stable` にする
  - `.content-input` は背景を透明、文字色を透明にし、`caret-color` で入力位置の線は見えるようにする。`::placeholder` の色は明示する。`.editor-highlight` は `pointer-events: none` にする
  - `.md-heading` / `.md-quote` / `.md-list` / `.md-hr` / `.md-code` / `.md-codeblock` / `.md-bold` / `.md-italic` / `.md-link` に色を付ける。文字の幅が変わらないよう、色と下線だけにして太字・斜体・サイズ変更は使わない
  - シークレットメモ表示（`.main-content.secret`）用に、`.editor` の背景・枠線と、各記法の色を暗い背景で読める色にする。これまでの `.main-content.secret .content-input` の指定は `.editor` に移す
- [x] ステップ4: `src/memo.js` で `.editor-highlight` を取得し、`updateHighlight()`（`highlightMarkdown(contentInput.value)` を `innerHTML` に入れる）を、`loadMemo`（本文の設定後）と `handleContentInput` で呼ぶ。`contentInput` の `scroll` イベントで `.editor-highlight` の `scrollTop` / `scrollLeft` を合わせる（`src/memo.js`）
- [x] ステップ5: `AGENTS.md` に、`src/markdown-highlight.js` の説明と「エディタは `textarea` と `pre` を重ねた構成で、両者のフォント・余白・折り返しを必ずそろえる。ハイライトは色と下線だけで、太字・斜体・サイズは使わない」という注意を追記する。`README.md` の機能表にも 1 行足す（`AGENTS.md`、`README.md`）

## テスト・確認方法
- [x] `src/markdown-highlight.test.js`: 見出し・引用・リスト（`-` / `*` / `+` / `1.`）・区切り線・インラインコード・太字・斜体・リンクがそれぞれのクラスで囲まれる／コードブロックの中では他の記法が効かず、閉じていなくても以降がコードブロックになる／`<` `>` `&` がエスケープされる／どんな入力でも、タグを除いた文字列が元の文字列と一致する（末尾の追加分を除く）／空文字列と、`\n` で終わる文字列の扱い
- [x] `src/memo.test.js`: メモを開くと `.editor-highlight` に本文がハイライトされて入る／入力すると表示層が更新される／メモを切り替えると表示層も切り替わる
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npx prettier --check .` が通る
- [ ] `chrome://extensions` で読み込み、次を確認する（手動）
  - 通常メモとシークレットメモの両方で、文字が二重に見えない（折り返し位置・行間・余白がずれない）
  - 長い文章でスクロールしても、色付きの文字と入力欄が同じ位置で動く
  - 文字の選択、入力位置の線、日本語入力（変換中の文字）が普通に使える
  - 「コピー」が従来どおり本文全体をコピーする
  - 各記法の色が、通常メモとシークレットメモの両方で読みやすい

## 決定事項
- 実装方式は自前のオーバーレイ方式（`textarea` の背面に `pre` を重ねる）。CodeMirror などは導入しない
- 対象の記法は基本のもの（見出し・太字・斜体・インラインコード・コードブロック・リスト・引用・リンク・区切り線）。表とチェックボックスは対象外
- 太字・斜体・サイズの変更は使わず、色と下線だけで表す（文字の位置を `textarea` とずらさないため）

## 懸念点・未決事項
- `textarea` と `pre` のずれは、実際のブラウザでしか確認できない（`jsdom` はレイアウトを計算しない）。折り返し位置、スクロールバーの有無による幅の差、日本語の折り返しは、手動確認の項目に含める
- 本文欄のフォントを、今のブラウザ既定の等幅から、明示した等幅フォントの一覧に変える。見た目が少し変わる可能性がある
- `scrollbar-gutter: stable` により、本文欄の右端に常にスクロールバー分の余白ができる（折り返し幅を `textarea` と `pre` でそろえるため）
- 次の場合はハイライトが完全でない: 複数行にまたがる太字・斜体、入れ子の強調、`_` を使う強調、表、チェックボックス。「基本の記法」の範囲として許容する
- コードブロックを閉じていないと、それ以降がすべてコードブロックとして色付けされる
- 色の具体的な値は、実際の画面で見て調整する
- Release Note やバージョンの更新は、この計画に含めない（必要なら別途依頼する）
