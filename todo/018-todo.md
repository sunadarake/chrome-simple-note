# タイトルの最大文字数を30にし、設定で変えられるようにする

## 概要
メモのタイトル（本文の先頭から切り出す文字数）を、今の20文字から既定30文字に変える。設定パネルで 10〜100 文字の間で変えられるようにする。文字数を変えたときは、保存済みの全メモのタイトルを作り直す。

## 調査結果
- `src/memo-store.js`: 定数 `TITLE_LENGTH = 20` と `titleOf(content)`。`updateContent` が、保存時に `titleOf(content)` でタイトルを作って `memo.title` に保存する。
- `src/memo.js`: `updateTitleDisplay`（入力中のタイトル表示）が `titleOf` を使う。一覧（`memo.title`）、削除確認の文言（`memo.title`）は保存済みの `title` を使う。
- `src/memo-store.js` の `filterMemos`: 検索は `memo.title` と `memo.content` が対象。
- `src/memo-transfer.js`: インポートで `title` が無いときだけ `titleOf(item.content)` を使う。ファイルに `title` があればそれを使う。
- `src/settings.js`: `Settings`（`autoSave` / `autoSaveDelayMs` / `fontSize` / `theme`）、範囲の定数、`loadSettings` / `saveSettings`。
- `src/memo.html`: 設定パネルの「表示」にセレクト（文字サイズ・テーマ）がある。
- `src/memo-store.test.js`: `titleOf`（20文字で切る）と `updateContent` のテスト、`src/memo.test.js`: 入力中のタイトル表示のテスト（`'あ'.repeat(25)` が20文字になる）がある。仕様変更に合わせて直す必要がある。
- `AGENTS.md` と `README.md` に「先頭20文字」の記述がある。

## 実装計画
- [x] ステップ1: `src/settings.js` に `titleLength`（既定 30）を追加する。範囲は 10〜100（`TITLE_LENGTH_RANGE`）。`loadSettings` で他の数値と同じく丸める（`src/settings.js`）
- [x] ステップ2: `src/memo-store.js` の `titleOf` を `titleOf(content, length)` にして、定数 `TITLE_LENGTH` をなくす。`updateContent` に文字数の引数を足す。新しく `retitle(memos, length)`（全メモのタイトルを本文から作り直す）を追加する。`memo-transfer.js` の `parseImport` も文字数を受け取る（`src/memo-store.js`、`src/memo-transfer.js`）
- [x] ステップ3: `src/memo.html` の設定パネルの「表示」に、「タイトルの文字数」のセレクトを追加する（10, 20, 30, 40, 50, 75, 100）（`src/memo.html`）
- [x] ステップ4: `src/memo.js` に反映する。`updateContent` / `updateTitleDisplay` / インポートに `settings.titleLength` を渡す。設定を変えたら、全メモを `retitle` で作り直して保存し、一覧と入力中のタイトル表示を更新する。`showSettings` と `changeSettings` にセレクトを足す（`src/memo.js`）
- [x] ステップ5: 起動時にも `retitle` をかけて、保存済みの古い20文字のタイトルを30文字に直す（今の設定の文字数と保存済みのタイトルがそろうようにする）。変わったメモがあるときだけ保存する（`src/memo.js`）
- [x] ステップ6: テストを追加・更新する。(a) `settings.test.js`: `titleLength` の既定・範囲外の丸め (b) `memo-store.test.js`: `titleOf` が指定の文字数で切る、`updateContent` / `retitle` の動作 (c) `memo.test.js`: 既定30文字で一覧とタイトル表示が切れる、設定を変えると保存済みの全メモ（シークレット含む）のタイトルが作り直されて保存される、再起動後も保たれる、起動時に古い20文字のタイトルが直る、検索がタイトルで引っかかる（`src/settings.test.js`、`src/memo-store.test.js`、`src/memo.test.js`、`src/memo-transfer.test.js`）
- [x] ステップ7: `AGENTS.md`（「メモのタイトルは保存後の本文の先頭20文字」、設定の範囲、`src/settings.js` の説明）と `README.md`（メモ一覧の「先頭 20 文字」、設定の表）を更新する（`AGENTS.md`、`README.md`）

## テスト・確認方法
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [ ] 実機で、既定で30文字のタイトルが一覧とタイトル欄に出ること
- [ ] 実機で、設定の文字数を 10 / 100 に変えると、一覧とタイトル欄がすぐ変わること
- [ ] 実機で、リロードしても文字数の設定とタイトルが保たれること
- [ ] 実機で、以前のバージョンで保存した20文字のタイトルが、起動後に30文字になること
- [ ] 実機で、シークレットメモのタイトルも文字数の変更に追従すること

## 決定事項
- 既定は30文字。設定は 10〜100 文字のセレクト（10, 20, 30, 40, 50, 75, 100）。
- 文字数を変えたときは、通常・シークレットの全メモのタイトルを本文から作り直して保存する。

- 起動時の作り直し（ステップ5）は入れる。

- タイトルは本文の最初の1行だけにする。前後の空白（先頭の空行も）を除き、先頭の `#` / `##` などの見出し記号（後ろに空白か行末があるもの）を除いてから、設定の文字数で切る。

## 懸念点・未決事項
- 起動時の作り直し（ステップ5）は、計画外の追加。これがないと、バージョンアップ後も、保存済みの古いメモは20文字のタイトルのまま一覧に出る（編集するまで）。不要ならステップ5を外し、変更後に保存したメモだけが新しい文字数になる形に直す。
- インポート後も同じ作り直しをかける（計画外の追加。ファイルのタイトルを残すと、文字数の設定とずれるため）。
- 作り直しにより、インポートしたファイルに入っていた独自の `title` は、本文の先頭の切り出しに置き換わる（タイトルは常に本文から作る仕様のため）。
- 文字数は JavaScript の `substring`（UTF-16の数）で数える。絵文字など一部の文字は 1 文字で 2 カウントになり、切れ目で文字が壊れることがある（今までと同じ。直すなら別途）。
- 一覧は 1 行表示で「…」で省略するので、100 文字にしても、サイドバーの幅を超える分は見えない。ツールチップ（本文の1行目）は今までどおり。
- バージョンは機能追加なので minor 以上になる見込み（別途 `/version-up`）。
