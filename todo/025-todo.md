# publish.sh で、公開に成功したあと古い Release とタグを削除する

## 概要
`./publish.sh` で新しい Release を公開したあと、それより古い Release とそのタグをすべて削除する。常に最新の1つだけが残るようにする。

## 調査結果
- `publish.sh` は、未コミット・未 push・同じタグの Release の有無を確かめ、`./release.sh` で zip を作り、`gh release create` で公開する。古い Release の削除はしていない。
- 今の Release は v13.6.1、v13.6.2、v13.6.3 の3つ（`gh release list`）。タグは GitHub 側に作られていて、ローカルにはタグがない（`git tag` が空）。
- `gh release delete <タグ> --cleanup-tag --yes` で、Release と GitHub 側のタグをまとめて削除できる（gh 2.103.3 で確認）。
- `publish.sh` は draft の Release もタグで検索できないため、一覧（`gh release list --json tagName`）から探している。同じ方法で削除対象を集める。

## 実装計画
- [x] ステップ1: `publish.sh` の `gh release create` の後に、`gh release list --json tagName` から今回のタグ以外を集め、削除する一覧を表示する。一覧が空なら何もしない（`publish.sh`）
- [x] ステップ2: 一覧を表示したあと `y/N` で確認し、`y` のときだけ各タグを `gh release delete "$t" --cleanup-tag --yes` で削除する。入力がない（端末でない）ときは `N` として削除しない（`publish.sh`）
- [x] ステップ3: ローカルに同名のタグがあれば `git tag -d` で消す（`publish.sh`）
- [x] ステップ4: `AGENTS.md` の `publish.sh` の説明に、公開後に古い Release とタグを確認のうえ削除することを追記する（`AGENTS.md`）

## テスト・確認方法
- [x] `shellcheck publish.sh` と `bash -n publish.sh` が通ること
- [x] 偽の `gh` を `PATH` の先頭に置いて、削除する一覧の表示、`y` で削除、`N` で削除しない、一覧が空、今回のタグは消さない、を確かめる（本物の Release は削除しない）
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること

## 決定事項
- 消す範囲は、今回のタグ以外の Release をすべて（常に最新の1つだけ残す）
- 削除は新しい Release の公開に成功したあとにする（公開に失敗したとき、古い Release まで失わないため）
- 削除する前に一覧を表示して `y/N` で確認する（既定は `N`）

## 懸念点・未決事項
- Release の削除は元に戻せない。新しい Release の公開が済んでから確認するので、確認で `N` を選べば古い Release は残る
- `gh release list` は既定で30件まで。それより多い場合に残る可能性があるため、`--limit` を指定する
- 本物の GitHub に対する削除の動作確認はしていない（偽の `gh` でのテストのみ）
