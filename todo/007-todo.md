# メモのインポート／エクスポート

## 概要
メモを JSON ファイルに書き出す（エクスポート）機能と、書き出したファイルから読み込む（インポート）機能を追加する。
バックアップや別のブラウザへの移行に使う。メモの並び順は維持する。

## 調査結果
- `src/memo-store.js`: `Memo` 型は `{id, title, content, createdAt, secret?}`。`id` は作成時刻（`Date.now()`）
- `src/storage.js`: `loadMemos` は通常メモ（`localStorage`）とシークレットメモ（`sessionStorage`）を結合し、`id` の降順（新しい順）で返す。`saveMemos` は `secret` で保存先を振り分ける。**一覧の並びは `id` の降順で決まる**ため、`id` を保ったままインポートすれば並びも維持される
- `src/memo.js`: `initMemoApp({root, storage, sessionStorage, confirm, copy})`。`memos` 配列、`renderMemoList`、`showLogMessage`、`saveMemos` を持つ。外部とのやり取りは引数で受け取る作りで、テストしやすい
- `src/memo.html` / `src/memo.css`: サイドバーは「新しいメモ」「シークレットメモ」ボタン、検索欄、`.memo-list`（`flex: 1`、縦スクロール）の順。`.memo-list` の下にボタンを足せる
- ファイルのダウンロードは、`Blob` と `<a download>` で行える（拡張機能ページで追加の権限は不要）。ファイルの選択は `<input type="file">` で行う

## 実装計画
- [x] ステップ1: `src/memo-transfer.js` を新規作成する（DOM・storage に触れない純粋関数）。`src/memo-store.js` とは分ける（`src/memo-transfer.js`）
  - `exportMemos(memos, now)`: シークレットメモを除いた通常メモを、渡された順のまま `{ "version": 1, "exportedAt": "<ISO日時>", "memos": [...] }` の JSON 文字列にする（整形して出力）
  - `parseImport(text)`: JSON として読み、`version` が 1 で `memos` が配列であることを確認する。各メモは `id`（有限の数値）と `content`（文字列）が必須。`title` が無ければ `titleOf(content)`、`createdAt` が無ければ `id` から作る。取り込むメモは常に通常メモ（`secret: false`）にする。形式が正しくなければ、日本語のメッセージで `Error` を投げる
  - `mergeMemos(current, imported)`: 既にある `id`（通常・シークレットとも）と同じメモはスキップし、残りを追加して `id` の降順に並べる。`{ memos, added, skipped }` を返す
- [x] ステップ2: `src/memo.html` の `.memo-list` の下に、「エクスポート」「インポート」ボタン（`.export-btn`、`.import-btn`）と、非表示のファイル選択（`<input type="file" class="import-input" accept=".json,application/json" hidden>`）を追加する（`src/memo.html`）
- [x] ステップ3: `src/memo.css` に、サイドバー下部のボタンの見た目（2 つを横に並べる、既存のボタンに合わせた控えめな色）を追加する（`src/memo.css`）
- [x] ステップ4: `src/memo.js` に処理を追加する（`src/memo.js`）
  - `initMemoApp` が `download(filename, text)` を引数で受け取る
  - エクスポート: 通常メモがなければ「エクスポートするメモがありません」と表示して終了。あれば `exportMemos` の結果を `simple-note-<日時>.json` として `download` に渡し、「N 件をエクスポートしました」と表示する
  - インポート: ボタンでファイル選択を開き、選択後に `file.text()` を `parseImport` → `mergeMemos` に通す。`memos` を更新して `saveMemos` で保存し、一覧を再描画する。選択中のメモは変えない。「N 件をインポートしました（M 件は同じ ID のためスキップ）」と表示する。形式エラーのときは、エラーのメッセージを表示してメモは変えない。同じファイルを続けて選べるよう、選択後に入力欄の値を空に戻す
- [x] ステップ5: `src/main.js` で、`Blob` と `<a download>` を使う実際の `download` を渡す（`src/main.js`）
- [x] ステップ6: `AGENTS.md` にファイルの形式（`version: 1`、通常メモのみ、インポートは追加でスキップは同じ `id`、並びは `id` の降順）と `src/memo-transfer.js` の説明を追記する。`README.md` の機能表と `release-notes.md` にも反映する（`AGENTS.md`、`README.md`、`release-notes.md`）

## テスト・確認方法
- [x] `src/memo-transfer.test.js`: エクスポートはシークレットメモを含まず、渡された順を保つ／出力が `parseImport` で元に戻る（往復）／`parseImport` が不正な JSON、`version` 違い、`memos` が配列でない、`id` や `content` が不正なメモをエラーにする／`title` と `createdAt` の補完／`secret: true` のメモも通常メモとして取り込む／`mergeMemos` が同じ `id` をスキップし、`id` の降順に並べ、`added` と `skipped` を正しく返す／既存のシークレットメモと同じ `id` もスキップする
- [x] `src/memo.test.js`: エクスポートで `download` が正しいファイル名と内容で呼ばれる／通常メモがないときは呼ばれずメッセージが出る／インポートで一覧に追加され、保存される／同じ `id` はスキップされる／不正なファイルではメッセージが出てメモが変わらない／インポート後に選択中のメモが変わらない
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npx prettier --check .` が通る
- [ ] `chrome://extensions` で読み込み、次を確認する（手動）
  - 「エクスポート」で JSON ファイルがダウンロードされ、中身にメモの順番どおりに入っている
  - 別のブラウザプロファイル、または全メモを削除したあとに「インポート」すると、同じ並びで復元される
  - もう一度同じファイルをインポートすると、すべてスキップされる
  - サイドバーを狭く・広くしても、下部のボタンが崩れない

## 決定事項
- ファイル形式は JSON 1 ファイル（`{version, exportedAt, memos}`）。メモは `id` / `title` / `content` / `createdAt` をそのまま持つ
- シークレットメモはエクスポートしない。インポートで取り込むメモは、ファイルに `secret: true` があっても通常メモにする
- インポートは今あるメモを消さずに追加する。同じ `id` のメモはスキップする
- 順番は、エクスポートでは一覧の順（`id` の降順）のまま書き出し、インポートでは `id` を保ったまま追加して `id` の降順に並べる（一覧の並びは `id` で決まるため）
- ボタンは、サイドバーの下部（メモ一覧の下）に「エクスポート」「インポート」を置く

## 懸念点・未決事項
- 入力してから自動保存までの 1 秒の間は、エクスポートにその編集が含まれない。エクスポート前に保存し直す処理は入れない（通常の保存と同じ扱い）
- 一覧の順番は `id`（作成時刻）で決まるため、ユーザーが並べ替えることはできない。「順番の維持」は、`id` を保つことで実現する
- 別の環境で作ったメモと `id` が偶然同じ場合（同じミリ秒に作成）は、スキップされて取り込まれない。実際にはほぼ起きない
- インポートでは、ファイルの大きさの上限や、メモの件数の上限は設けない
- `localStorage` の容量（おおむね 5MB）を超える量を取り込むと保存に失敗する可能性がある。今回は対応しない
- ダウンロードの保存先やファイル名の確認ダイアログは、ブラウザの設定に従う
- 別バージョンのファイルを読み込めるよう、ファイル形式に `version` を入れる。今回は `1` のみ対応し、それ以外はエラーにする
