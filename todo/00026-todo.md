# 本文が空でも手動タイトルだけで保存できるようにする

## 概要
今は本文が空白のみだと、手動タイトルを付けても保存ボタン・自動保存で保存されない。手動タイトルがあれば、本文が空でもメモとして保存できるようにする。本文もタイトルも空のメモは、これまでどおり保存しない。

## 調査結果
- `src/memo.js` の `saveMemo` は `contentInput.value.trim() === ''` で保存をやめる。`scheduleAutoSave` の自動保存も本文が空白のみだと保存しない。`deleteAllMemos` の件数も本文が空のメモを数えない。
- `src/storage.js` の `saveMemos` は `memo.content.trim() !== ''` のメモだけを書き出す。本文が空で手動タイトルだけのメモは、ここでも落ちる。
- `src/memo-store.js` の `updateContent` は、手動タイトルがあれば本文が空でも `title` を手動タイトルから作る。表示・一覧・検索・エクスポートはそのまま動く。
- 手動タイトルは `customTitle` に保存され、`Memo` の任意項目。テストは `src/memo.test.js` の「本文が空のメモは、手動タイトルがあっても保存しない」が今の挙動を確かめている。

## 実装計画
- [x] ステップ1: `src/memo-store.js` に、本文か手動タイトルのどちらかに中身があるかを返す純粋関数（例: `hasSavableContent(content, customTitle)`）を足す。本文が空白のみでも、手動タイトルが空白以外なら true（`src/memo-store.js`）
- [x] ステップ2: `src/storage.js` の `saveMemos` をこの関数で判定し、本文が空でも手動タイトルがあるメモを書き出す（`src/storage.js`）
- [x] ステップ3: `src/memo.js` の `saveMemo` の保存条件、`scheduleAutoSave` の自動保存条件、`deleteAllMemos` の件数を、同じ関数にそろえる。本文もタイトルも空のときのログ文言は今のまま（`src/memo.js`）
- [x] ステップ4: テストを更新・追加する。`src/memo-store.test.js` で判定関数、`src/storage.test.js` でタイトルだけのメモを書くこと、`src/memo.test.js` で自動保存・保存ボタン・全メモ削除・シークレットメモのタイトルだけ保存を確かめる（`src/memo-store.test.js`、`src/storage.test.js`、`src/memo.test.js`）
- [x] ステップ5: `AGENTS.md` と `README.md` の「何も書いていないメモは保存しない」「空白のみの内容は保存しない」を、本文もタイトルも空のときだけ保存しない形に直す（`AGENTS.md`、`README.md`）

## テスト・確認方法
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [x] テスト: 本文が空で手動タイトルだけのメモが、自動保存（自動保存オン）と保存ボタン（自動保存オフ）で保存される
- [x] テスト: 本文もタイトルも空のメモは保存されない
- [x] テスト: 全メモ削除の件数に、タイトルだけのメモも数える
- [x] テスト: シークレットメモでも、本文が空でタイトルだけなら sessionStorage に保存される

## 決定事項
- 本文が空でも、手動タイトルがあれば保存する（保存ボタン・自動保存の両方）
- 本文もタイトルも空の新規メモは、これまでどおり保存しない

## 懸念点・未決事項
- タイトルだけ保存したメモは、あとでタイトルを空にすると本文も空のため保存対象から外れ、リロードで消える（本文が空白のみのメモを保存しない既存の規則に合わせる）
