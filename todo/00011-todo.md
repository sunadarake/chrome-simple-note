# エクスポート／インポートを「⋯」メニューにまとめる

## 概要
サイドバー下部のエクスポート・インポートボタン（`.sidebar-transfer`）をなくし、ヘッダーの「⋯」ボタンから開くメニューにまとめる。メモ一覧の縦を広く取るため。

## 調査結果
- `src/memo.html` 27〜37行目の `.sidebar-transfer` に `.export-btn`、`.import-btn`、非表示の `.import-input`（file）がある。
- `src/memo.js` 53〜55行目でこの3要素を取得し、223〜225行目でイベントを登録している（エクスポート→`exportToFile`、インポート→`importInput.click()`、change→`importFromFile`）。
- `src/memo.css` に `.sidebar-transfer`、`.export-btn`、`.import-btn` のスタイルがある。ヘッダーは `.sidebar-header`（タイトル＋`.sidebar-close`）。
- `src/memo.test.js` が `.export-btn` / `.import-btn` / `.import-input` をクラス名で参照している（289〜380行目付近）。クラス名を保てばテストはほぼそのまま通る。
- `.memo-list` は `flex: 1` なので、下部ボタンを消せば自動で縦に広がる。

## 実装計画
- [x] ステップ1: `memo.html` の `.sidebar-transfer` を削除し、`.sidebar-header` の `.sidebar-close` の左に「⋯」ボタン（`.sidebar-menu-btn`、`aria-label`、`aria-expanded`）と、`.export-btn` / `.import-btn` を入れたメニュー（`.sidebar-menu`、`hidden`）、`.import-input` を置く
- [x] ステップ2: `memo.css` で `.sidebar-menu` をドロップダウン表示（`.sidebar-header` を `position: relative`、メニューは絶対配置で下向き）にし、不要になった `.sidebar-transfer` のスタイルを削除する。ボタンは既存の `.export-btn` / `.import-btn` の見た目を流用し、「⋯」は `.sidebar-close` と同じ見た目にそろえる
- [x] ステップ3: `memo.js` に、「⋯」でメニューを開閉し（`hidden` と `aria-expanded` を更新）、項目を押したとき・メニューの外をクリックしたときに閉じる処理を追加する。既存のエクスポート／インポート処理は変えない
- [x] ステップ4: `memo.test.js` に、「⋯」で開閉する、項目を押すと閉じる、外側クリックで閉じる、のテストを追加する
- [x] ステップ5: `AGENTS.md` のディレクトリ構成・仕様に、エクスポート／インポートが「⋯」メニュー内にあることを一言追記する

## テスト・確認方法
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [ ] 実機で、サイドバー下部のボタンが消え、一覧が縦に広がること
- [ ] 「⋯」→エクスポートでファイルが保存され、メニューが閉じること
- [ ] 「⋯」→インポートでファイル選択が開き、取り込めること
- [ ] メニューの外をクリックすると閉じること
- [ ] サイドバー幅 200px でもメニューがはみ出さないこと
- [ ] シークレットメモ表示中も動作すること

## 決定事項
- 「⋯」ボタンはサイドバーのヘッダー（「«」の左）に置く。
- メニューは、項目を選んだとき、メニューの外をクリックしたときに閉じる。Esc キーでは閉じない。

## 懸念点・未決事項
- `.memo-list` の `overflow-x: hidden` はメニューには影響しないが、`.sidebar` 側で切れないか、実機で確認する。
- 幅 200px のとき、タイトル・「⋯」・「«」が窮屈にならないか実機で確認する。
- ファイル選択ダイアログ（`importInput.click()`）は、メニューを閉じても動くか確認する（`hidden` の入力は `.sidebar-menu` の外に置くのが安全）。
