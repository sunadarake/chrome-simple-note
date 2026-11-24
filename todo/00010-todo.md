# サイドバーのメモ一覧に横スクロールバーを出さない

## 概要
左サイドバーのメモ一覧（`.memo-list`）に横スクロールバーが出ないようにする。
ホバーのたびにバーが出たり消えたりして、表示がズレたり治ったりを繰り返し見づらいため。

## 調査結果
- `src/memo.css` の `.memo-list` は `overflow-y: auto; flex: 1;` で、`overflow-x` を指定していない。`overflow-y` が `auto` のとき、`overflow-x` の `visible` は `auto` として扱われる。
- 原因と考えられるのは `.memo-item:hover` の `transform: translateX(3px)`。ホバー中の項目が右へ 3px はみ出し、横スクロールバーが出る。バーの高さ分だけ縦の領域が減って表示がズレ、ホバーが外れるとバーが消えて戻る。
- `.memo-item` 自体は `overflow: hidden; text-overflow: ellipsis` なので、項目内の文字はあふれていない。
- `src/memo.js` は `memo-item` クラスを付けるだけで、変更は不要。

## 実装計画
- [x] ステップ1: `.memo-list` に `overflow-x: hidden;` を追加する（`src/memo.css`）
- [ ] ステップ2: 実機で確認し、ホバー時の右 3px が欠けて目立つ場合のみ、`.memo-list` の右に余白を足すか検討する（`src/memo.css`）

## テスト・確認方法
- [ ] `chrome://extensions` で再読み込みし、メモを多数作って一覧にマウスを乗せても横スクロールバーが出ず、表示がズレないこと
- [ ] サイドバー幅を 200px / 600px にしても横スクロールバーが出ないこと
- [ ] 通常メモ・シークレットメモの両方で確認する
- [x] `npm test` / `npm run lint` / `npm run typecheck` が通ること（CSSのみの変更なので新規テストは不要）

## 決定事項
- 横スクロールは出さず、`overflow-x: hidden` で隠す方針（依頼どおり）。
- ホバー時の `translateX(3px)` の動きは残す。

## 懸念点・未決事項
- `overflow-x: hidden` により、ホバー中の項目の右端 3px が切れる。見た目に違和感が出たらステップ2で対処する。
- 原因は推測なので、実機で再現と解消を確認する。
