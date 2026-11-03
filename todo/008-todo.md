# サイドバーの開閉トグルボタン

## 概要
左サイドバーを開閉するトグルボタンを、メイン画面の左上に追加する。
サイドバーを閉じるとメイン画面が横いっぱいに広がり、開閉の状態は次に開いたときも引き継ぐ。

## 調査結果
- `src/memo.html`: `.container` の中に `.sidebar`、`.sidebar-resizer`、`.main-content` が並ぶ。`.main-content` の先頭は `.secret-label`（絶対配置）、続いて `.title-display`
- `src/memo.css`: `.title-display` が `border-bottom` と `margin-bottom: 25px` を持ち、タイトル行の区切りを兼ねている。シークレットメモの表示では `.main-content.secret .title-display` が文字色と下線の色を変える
- `src/sidebar.js`: `initSidebarResize({ root, storage })` が、サイドバーの幅の復元・ドラッグ・保存（`localStorage` の `sidebarWidth`）を行う。引数でDOMとstorageを受け取る作りで、`sidebar.test.js` が `memo.html` を読み込んでテストしている
- `src/main.js`: `initSidebarResize({ root: document, storage: localStorage })` を呼んでいる
- サイドバーを閉じると、操作ボタン（新しいメモ、検索、インポート／エクスポートなど）はすべて見えなくなる。開閉ボタンはサイドバーの外に置く必要がある

## 実装計画
- [x] ステップ1: `src/memo.html` の `.title-display` を `<div class="main-header">` で包み、その先頭に開閉ボタン `<button class="sidebar-toggle" aria-label="サイドバーを開閉" aria-expanded="true">☰</button>` を置く（`src/memo.html`）
- [x] ステップ2: `src/memo.css` を変更する（`src/memo.css`）
  - `.main-header` を `display: flex; align-items: center; gap: 12px` にし、これまで `.title-display` が持っていた `border-bottom` と `margin-bottom` を移す。`.title-display` からは外す（見た目は今と同じにする）
  - `.main-content.secret .title-display` の下線の色の指定を `.main-content.secret .main-header` に移す（文字色は `.title-display` に残す）
  - `.sidebar-toggle` の見た目を追加する（小さな角丸のボタン。通常メモは明るい背景、シークレットメモは暗い背景で読めるようにする）
  - `.container.sidebar-collapsed` のとき、`.sidebar` と `.sidebar-resizer` を `display: none` にする
- [x] ステップ3: `src/sidebar.js` に `initSidebarToggle({ root, storage })` を追加する。`sidebarCollapsed` を `localStorage` から読んで起動時に反映し、ボタンのクリックで `.container` の `sidebar-collapsed` クラスと `aria-expanded` を切り替えて、その場で保存する。`initSidebarResize` とは独立した関数にする（`src/sidebar.js`）
- [x] ステップ4: `src/main.js` から `initSidebarToggle({ root: document, storage: localStorage })` を呼ぶ（`src/main.js`）
- [x] ステップ5: `AGENTS.md` の `src/sidebar.js` の説明と仕様・注意点に、開閉の状態（`localStorage` の `sidebarCollapsed`）を追記する。`README.md` の機能表と `release-notes.md` にも反映する（`AGENTS.md`、`README.md`、`release-notes.md`）

## テスト・確認方法
- [x] `src/sidebar.test.js`: 保存がなければ開いた状態（`sidebar-collapsed` なし、`aria-expanded="true"`）／保存が `true` なら閉じた状態で起動する／ボタンのクリックで閉じる・開くが切り替わる／切り替えたときに `sidebarCollapsed` が保存される／閉じても `sidebarWidth`（幅）は変わらない
- [x] `src/memo.test.js`: 既存のタイトル表示（`.title-display`）のテストが、構造の変更後も通る
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npx prettier --check .` が通る
- [ ] `chrome://extensions` で読み込み、次を確認する（手動）
  - ボタンで開閉でき、閉じるとメイン画面が横いっぱいに広がる
  - 閉じた状態でタブを開き直しても、閉じたまま始まる
  - 開き直したとき、前に決めたサイドバーの幅に戻る
  - 通常メモとシークレットメモの両方で、タイトル行（下線を含む）の見た目が変わらず、ボタンが読みやすい
  - 閉じている間も、本文欄の表示・入力・自動保存が普通に使える

## 決定事項
- ボタンはメイン画面の左上（タイトル行の左）に置く。サイドバーの開閉に関係なく同じ場所にある
- 開閉の状態は `localStorage` の `sidebarCollapsed` に保存し、次に開いたときも引き継ぐ
- ショートカットキーは付けない（ボタンのクリックだけ）
- 閉じるときはサイドバーを `display: none` にする（アニメーションは付けない）

## 懸念点・未決事項
- サイドバーを閉じると、新しいメモの作成、検索、インポート／エクスポートが使えなくなる。開いてから操作する必要がある
- 閉じている間は、サイドバーの幅の復元やドラッグの処理は動いたままになる（境界が非表示で操作できないだけ）。開き直したときに幅が保たれる
- 開閉の状態は、メモ画面の複数のタブで共有されない（保存はタブごとの最後の操作で上書きされる）。サイドバーの幅と同じ扱い
- タイトル行の構造を変えるため、見た目（余白・下線）が崩れないか、実際の画面で確認する必要がある
- ボタンの記号（☰）は暫定。画面で見て、分かりにくければ変える
- Release Note の追記は含めるが、バージョンの更新は含めない（必要なら別途依頼する）
