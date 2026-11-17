# タイトルを手動で変更できるようにする

## 概要
メモのタイトルは今、本文の最初の1行から自動で作られ、画面では編集できない。タイトル行をクリックして編集できるようにし、手動で付けたタイトルは固定する。空にすると自動（本文の先頭行）に戻る。

## 調査結果
- `src/memo.html`: タイトルは `.title-display`（div、初期文言「新しいメモ」）で、`.main-header` の中にある。
- `src/memo-store.js`: `titleOf(content, length)` が本文からタイトルを作る。`updateContent` は更新のたびに `title` を作り直し、`retitle` は全メモの `title` を本文から作り直す（設定の文字数を変えたとき・起動時・インポート後）。
- `src/memo.js`: `updateTitleDisplay(content)`（129行付近）が表示を更新、`handleContentInput` が入力のたびに呼ぶ。`persistCurrentContent` が保存、`retitleAll` が起動時／設定変更時の作り直し、インポート後は `retitle(memos, ...)`（336行付近）。一覧は `memo.title || '無題のメモ'` を出し、検索（`filterMemos`）は `memo.title` と `memo.content` を見る。
- `src/memo-transfer.js`: `exportMemos` はメモをそのまま JSON にする。`parseImport` はファイルの `title` を使うが、直後の `retitle` で本文から上書きされる。`RawMemo` に `customTitle` を足す必要がある。
- `src/memo.css`: `.title-display` に通常・シークレット・ダークの配色（469行、730行付近）がある。input にする場合は同じ配色を `input` にも当てる。
- AGENTS.md に「タイトルは常に本文から作る」「ファイルの独自の `title` は残らない」とあり、仕様の書き換えが必要。

## 実装計画
- [ ] ステップ1: `src/memo-store.js` の `Memo` に `customTitle`（任意の文字列）を足す。`titleOf` の隣にタイトルを決める処理を足す（`customTitle` が空でなければそれを前後の空白除去・設定の文字数で切ったもの、なければ `titleOf(content, length)`）。`updateContent` と `retitle` はこれを使う（`retitle` は `customTitle` のメモも文字数で切り直す）
- [ ] ステップ2: `src/memo-store.js` に、メモの `customTitle` を設定する純粋関数（例: `updateCustomTitle(memos, id, customTitle, titleLength)`）を足す。空文字なら `customTitle` を消して自動に戻す。1か所でしか使わなければ `memo.js` に直接書く
- [ ] ステップ3: `src/memo.html` の `.title-display` を、クリックで編集に切り替えられるようにする。表示用の div と編集用の `input`（`.title-input`、`maxlength` は設定の文字数）を用意し、通常は div、クリックで input（全選択）に切り替える
- [ ] ステップ4: `src/memo.js` に切り替えの処理を足す。`Enter` かフォーカスが外れたら確定、`Escape` で取り消し。確定した値は未保存の変更として持ち、本文と同じ保存の流れ（自動保存のタイマー、保存ボタン）で `persistCurrentContent` に書く。入力中は本文の先頭行ではなく入力値を表示し、空で確定したら本文の先頭行（なければ「新しいメモ」）に戻す。`loadMemo` でメモを切り替えるときは編集状態を閉じる
- [ ] ステップ5: 自動保存の判定（`handleContentInput` の `contentInput.value !== lastContent`）にタイトルの変更も含める。何も書いていない（本文が空白のみ）メモは、手動タイトルがあっても保存先に書かない（既存の規則のまま）
- [ ] ステップ6: `src/memo-transfer.js` の `RawMemo` に `customTitle` を足し、`parseImport` で文字列なら取り込む（古いファイルは `customTitle` がなくても読める。`version` は 1 のまま）。エクスポートは `customTitle` を含めてそのまま出す
- [ ] ステップ7: `src/memo.css` に `.title-input` のスタイルを足す。`.title-display` と同じフォント・サイズ・余白にして、切り替えで高さや位置がずれないようにする。通常・シークレット・ダークの配色を組で書く。色は増やさず白とグレーの細い線にする（編集中だけ下線または細い枠）。クリックできることが分かるよう、`cursor: text` とツールチップ（例: 「クリックしてタイトルを変更」）を付ける
- [ ] ステップ8: `src/memo-store.test.js` / `src/memo-transfer.test.js` / `src/memo.test.js` を更新・追加する（下記）
- [ ] ステップ9: `AGENTS.md`（`memo-store.js`・`memo-transfer.js`の説明、「メモのタイトルは…」「エクスポートは…」の項目、デザインの節）と `README.md` を更新する

## テスト・確認方法
- [ ] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [ ] テスト: `customTitle` があるメモは本文を変えてもタイトルが変わらない／空にすると本文の先頭行に戻る
- [ ] テスト: 設定の文字数を変えたとき、手動タイトルも新しい文字数で切られる（`retitle`）
- [ ] テスト: 手動タイトルがエクスポートされ、インポートで戻る。`customTitle` のない古いファイルも読める
- [ ] テスト: 一覧の表示と検索が手動タイトルを使う
- [ ] テスト: クリックで input に切り替わり、Enter／フォーカス外れで確定、Escape で取り消し、空で確定すると自動に戻る
- [ ] テスト: 自動保存オフでは保存ボタンを押すまでタイトルの変更が保存されない。空白のみの本文では保存されない
- [ ] 実機で、通常・ダーク・シークレットのすべてで、切り替え時にタイトル行がずれず、読みやすい配色になっていること

## 決定事項
- 編集は「クリックで編集に切り替え」。Enter／フォーカス外れで確定
- 手動タイトルを入れたら固定し、空にしたら自動（本文の先頭行）に戻る
- 手動タイトルの文字数の上限は、設定の「タイトルの文字数」（10〜100）にそろえる。設定を下げると手動タイトルも切り詰め直される
- 手動タイトルもエクスポート／インポートし、一覧の検索の対象にする（検索は今も `title` を見る）

## 懸念点・未決事項
- 設定の文字数を下げると、手動タイトルの後ろが切り捨てられ、上げても元には戻らない（`customTitle` の元の文字列を残すかは実装時に決める。提案: `customTitle` は入力された全文を残し、表示用の `title` だけを切る。ただし入力欄の `maxlength` は上限にそろえる）
- AGENTS.md の「タイトルは常に本文から作る」「ファイルに書かれた独自の `title` は残らない」の記述を、`customTitle` がある場合は例外とする形に書き換える
- 手動タイトルだけ書いて本文が空のメモは、既存の規則（何も書いていないメモは保存しない）により保存されない
- 同じファイル（`memo.css` / `memo.html`）を触るので、TODO 020 を先に終えてから 021 に進む方が衝突が少ない
