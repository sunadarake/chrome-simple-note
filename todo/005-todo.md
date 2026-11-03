# サイドバーの幅をドラッグで変更できるようにする

## 概要
左サイドバーの右端をドラッグして幅を変えられるようにし、変えた幅を次に開いたときも使う。
今は幅が 280px で固定されている。

## 調査結果
- `src/memo.css`: `.sidebar` が `width: 280px`（`box-sizing: border-box`、`padding: 20px`）。外側の `.container` は `display: flex`、`max-width: 1400px`、`margin: 0 auto` で、画面が広いと左右に余白ができる
- `src/memo.html`: `.container` の直下に `.sidebar` と `.main-content` が並ぶ
- `src/main.js`: `initMemoApp` を呼ぶエントリポイント。実際の `document` / `localStorage` を渡している
- `src/memo.js`: メモの状態・保存・表示を扱う。サイドバーの幅とは無関係
- 保存先: `localStorage` の `memos` キーはメモ用。幅は別のキーに分ける
- テストは `jsdom` で動く。`jsdom` には `setPointerCapture` がないため、ドラッグはマウスイベントで実装する

## 実装計画
- [x] ステップ1: `src/memo.html` の `.sidebar` と `.main-content` の間に、ドラッグ用の細い要素（`.sidebar-resizer`）を追加する（`src/memo.html`）
- [x] ステップ2: `src/sidebar.js` を新規作成し、`initSidebarResize({ root, storage })` を実装する。メモ本体とは独立した処理なので `memo.js` とは分ける。内容は次のとおり
  - 幅の範囲は最小 200px、最大 600px。既定は 280px
  - 起動時に `storage` の `sidebarWidth` を読み、数値でない・範囲外なら範囲内に丸める（なければ既定値）。`.sidebar` の `style.width` に反映する
  - `.sidebar-resizer` で `mousedown` → `document` の `mousemove` で幅を更新 → `mouseup` で終了、という流れにする。幅は `マウスの X 座標 − .container の左端` から求めて範囲内に丸める
  - `mouseup` のときに幅を `sidebarWidth` として保存する（ドラッグ中は保存しない）
  - ドラッグ中は文字が選択されないようにし、カーソルを `col-resize` にする
  - （`src/sidebar.js`）
- [x] ステップ3: `src/main.js` から `initSidebarResize` を呼ぶ。`root` は `document`、`storage` は `localStorage`（`src/main.js`）
- [x] ステップ4: `src/memo.css` に `.sidebar-resizer` を追加する。幅 6px、`cursor: col-resize`、ホバー時にうっすら色を付ける。`margin: 0 -3px`、`position: relative`、`z-index` で、前後の要素の大きさを変えずに境界線に重ねる。`.sidebar` には `flex-shrink: 0` を足して、狭い画面でも幅が縮まないようにする（`src/memo.css`）
- [x] ステップ5: `AGENTS.md` のディレクトリ構成に `src/sidebar.js` を追加し、仕様・注意点にサイドバーの幅の範囲と保存先（`localStorage` の `sidebarWidth`）を追記する。`README.md` の機能表にも 1 行足す（`AGENTS.md`、`README.md`）

## テスト・確認方法
- [x] `src/sidebar.test.js`（jsdom）: 保存がなければ既定幅（280px）のまま／保存した幅を起動時に反映する／範囲外（100 や 900）や数値でない値は範囲内に丸めて反映する／`mousedown` → `mousemove` で幅が変わる／最小 200px・最大 600px を超えない／`mouseup` で保存され、`mousedown` していない `mousemove` では変わらない／ドラッグ中は保存されず `mouseup` で 1 回保存される
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npx prettier --check .` が通る
- [ ] `chrome://extensions` で読み込み、境界線にカーソルを乗せると形が変わる、ドラッグで幅が変わる、200px と 600px で止まる、タブを開き直しても幅が残る、画面が広い（`max-width` に達する）ときも境界線がマウスに追従する、を確認する（手動）

## 決定事項
- 幅の範囲は最小 200px、最大 600px（既定は今と同じ 280px）
- 幅は `localStorage` の `sidebarWidth` キーに保存する（メモの `memos` キーとは分ける）
- ダブルクリックでのリセットなど、ドラッグ以外の操作は付けない
- ドラッグは `mouse` イベントで実装する（`pointer` イベントは使わない）

## 懸念点・未決事項
- 画面幅が `max-width: 1400px` を超えると `.container` が中央寄せになる。マウスの位置から求める幅は、`.container` の左端を基準にして補正する想定
- メモ画面を複数のタブで開いている場合、幅は保存時に上書きされる（各タブが次に開かれたときから反映）。メモの `localStorage` と同様の扱いで、同期はしない
- 保存された幅が範囲外だった場合（手で書き換えた、将来範囲を変えた）は、エラーにせず範囲内に丸める
- 6px の境界用の要素の見た目（色・ホバー時の見え方）は暫定。実際の画面で確認して調整する
