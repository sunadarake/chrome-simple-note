# 保存・コピー・削除ボタンをタイトルの右へ移し、ログをエディタに重ねる

## 概要
メイン画面下のフッターにある「削除」「コピー」「保存」ボタンを、上のタイトル行の右側に移す。フッターをなくし、ログ（`.log-message`）はエディタの下端に重ねて一時表示する。エディタを縦に大きく取るため。

## 調査結果
- `src/memo.html` の `.main-header` に「»」ボタン（`.sidebar-open`）と `.title-display` がある。`.footer` に `.log-message`、`.delete-btn`、`.copy-btn`、`.save-btn` がある。
- `src/memo.css`: `.footer` は `padding: 15px 0; border-top`、`.editor` は `flex: 1; margin-bottom: 25px`。`.log-message` は `flex: 1`、通常は `opacity: 0`、`.show` で表示。ボタンは `margin-left: 10px`。
- シークレット用に `.main-content.secret .footer { border-top-color }` がある（フッター削除で不要になる）。
- `src/memo.js` は `.log-message`、`.copy-btn`、`.save-btn`、`.delete-btn` をクラス名で取得しており、親要素には依存しない。テストも同様なので、クラス名を保てばそのまま通る見込み。
- `.editor` は `position: relative` なので、ログを絶対配置で重ねられる。

## 実装計画
- [x] ステップ1: `memo.html` の `.main-header` で `.title-display` の右に、削除・コピー・保存の3ボタンを置く。`.footer` は削除し、`.log-message` は `.editor` の中（`textarea` の後）に移す（`src/memo.html`）
- [x] ステップ2: `memo.css` で `.title-display` を `flex: 1` にして、ボタンを右端に並べる。ボタンの `margin-left: 10px` はヘッダーの `gap` に合わせて見直す（`src/memo.css`）
- [x] ステップ3: `memo.css` で `.log-message` を `.editor` の下端に絶対配置で重ねる（`pointer-events: none`、`z-index` で textarea の前面）。`.footer` と `.main-content.secret .footer` のスタイルを削除し、`.editor` の `margin-bottom` を見直す（`src/memo.css`）
- [x] ステップ4: シークレット表示中でもログの色が読めるか確認し、必要なら `.main-content.secret .log-message` の配色を足す（`src/memo.css`）
- [x] ステップ5: `AGENTS.md` に、ボタンがタイトル行の右にあることと、ログがエディタに重なって表示されること（本文欄の大きさを変えないため）を追記する（`AGENTS.md`）

## テスト・確認方法
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [ ] 実機で、ボタンがタイトルの右端に並び、エディタが下まで広がること
- [ ] 保存・コピー・エクスポートなどでログがエディタ下端に出て、消えること
- [ ] ログが出ている間も、エディタへの入力・クリック・スクロールができること
- [ ] ウィンドウを狭くしても、長いタイトルとボタンが崩れないこと
- [ ] シークレットメモ表示中も、ボタンとログが読めること

## 決定事項
- ボタンはタイトルの右側（右端）に置く。
- ボタンの並び順は今のまま（削除・コピー・保存）。
- ログはエディタの下端に重ねて表示する。フッターはなくす。

## 懸念点・未決事項
- ログが本文の最終行に重なって読みにくくならないか、実機で確認する。
- タイトルが長いとき、ボタンとの間隔や折り返しをどうするか実機で確認する（`.title-display` は今のところ折り返しの指定がない）。
- ボタンを上に置くと、`.sidebar-open`（「»」）が左端、ボタンが右端になる。幅が狭いときの並びを確認する。
