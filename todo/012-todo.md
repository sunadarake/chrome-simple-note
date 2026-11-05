# メニューボタンを三本線にして、メニューを右側に出す

## 概要
サイドバーのメニューボタンを「⋯」から「☰」に替え、押すとボタンの右側にメニュー（エクスポート／インポート）が出るようにする。
今は「サイドバーを開く」ボタンも「☰」なので、そちらを「»」に替えて区別する（「«」で閉じて「»」で開く対応にもなる）。

## 調査結果
- `src/memo.html` 18行目の「⋯」が `.sidebar-menu-btn`。52〜56行目の `.sidebar-open`（サイドバーを開く）が「☰」。
- `src/memo.css` の `.sidebar-menu`（133行目〜）は `top: 100%; right: 0` で、ボタンの下に出る。`.sidebar-header` は `position: relative`。
- `.sidebar-open` はサイドバーが閉じているときだけ表示される（`.container.sidebar-collapsed .sidebar-open`）。シークレット中は `.main-content.secret .sidebar-open` で配色が変わるが、中身の記号には依存しない。
- `src/memo.test.js` 286行目のテスト名に「⋯」がある。`src/sidebar.test.js` は `.sidebar-open` をクラス名で参照しており、記号には依存しない。
- `AGENTS.md` 45行目に「⋯」と書いてある。

## 実装計画
- [x] ステップ1: `memo.html` で `.sidebar-menu-btn` の記号を「☰」に、`.sidebar-open` の記号を「»」に替える。`.sidebar-menu-btn` をヘッダーの左端（「SimpleNote」の前）に移す（`src/memo.html`）
- [x] ステップ2: `memo.css` で `.sidebar-menu` を右側に出す。`top: 0; left: 100%` とし、ボタンの右隣に重ねて表示する。`.sidebar-menu-btn` を基準にするため、ボタンとメニューを包む要素を `position: relative` にするか、メニューの位置を調整する（`src/memo.css`）
- [x] ステップ3: テスト名の「⋯」を「☰」に直す（`src/memo.test.js`）
- [x] ステップ4: `AGENTS.md` の記述を「☰」に直し、メニューがボタンの右側に出ることと、`.sidebar-open` の記号が「»」であることを書く（`AGENTS.md`）

## テスト・確認方法
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [ ] 実機で、「☰」を押すとボタンの右側にメニューが出ること
- [ ] メニューが「SimpleNote」やメモ一覧に隠れず、前面に出ること
- [ ] サイドバー幅 200px / 600px でメニューが切れないこと
- [ ] 「«」で閉じると「»」が出て、押すと開くこと。シークレット中も見た目が崩れないこと
- [ ] 項目を選ぶ／外側をクリックするとメニューが閉じること

## 決定事項
- メニューボタンは「☰」、サイドバーを開くボタンは「»」にする。
- メニューはボタンの右側に出す。
- 閉じ方は前回のまま（項目を選ぶ、外側をクリック）。

## 懸念点・未決事項
- 「☰」をヘッダーの左端に移す案で計画した。今の位置（「«」の左）のままだと、右側に出したメニューがサイドバーの外へはみ出すため。位置を変えたくない場合は知らせてほしい。
- メニューが `.sidebar` の外（メイン画面の上）に出る場合、`z-index` や `overflow` で切れないか実機で確認する。
- ヘッダーの左端に「☰」が入ると、「SimpleNote」の中央寄せが少しずれる可能性がある。
