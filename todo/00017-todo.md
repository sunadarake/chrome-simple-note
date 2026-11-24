# JSON ファイルのドラッグ＆ドロップでインポートする

## 概要
設定パネルを開いているときに、JSON ファイルをパネルへドラッグ＆ドロップすると、今の「インポート」ボタンと同じ内容でメモを取り込めるようにする。複数のファイルをまとめてドロップしたときは、全部取り込む。

## 調査結果
- `src/memo.js` の `importFromFile` は、`importInput.files?.[0]`（1ファイルだけ）を `parseImport` → `mergeMemos` → `saveMemos` → `renderMemoList` の順に処理し、成功・失敗をログに出す。`finally` で `importInput.value = ''` に戻す。
- `src/memo-transfer.js`: `parseImport`（形式の検証。不正なら `Error` を投げる）と `mergeMemos`（同じ `id` はスキップ、`id` 降順に整列）。ここは変更しなくてよい。
- `src/memo.html`: `.settings-panel`（`hidden` で開閉。開いている間だけ表示）の中に `.export-btn` / `.import-btn` / `.delete-all-btn` と、隠し `<input type="file" class="import-input" accept=".json,application/json" hidden>` がある。
- `src/memo.css`: `.settings-panel` は `flex: 1; overflow-y: auto`。ダークテーマとシークレット配色は `.container[data-theme='dark']` と `.main-content.secret` の組で分けている。
- `src/memo.test.js`: 「インポート」の `importFile` ヘルパーが `input.files` を差し替えて `change` を起こす。ドロップのテストは `DragEvent` の `dataTransfer.files` を差し替える形になる（jsdom には `DataTransfer` がないので、`Object.defineProperty` で渡す）。

## 実装計画
- [x] ステップ1: `importFromFile` を、ファイルの配列を受け取る形に直す（`importFiles(files)`）。ファイルごとに `parseImport` → `mergeMemos` を順に行い、取り込んだ件数とスキップした件数を合計して、最後に1回だけ `saveMemos` / `renderMemoList` / ログ表示をする。ファイルの形式が不正なものは、そのファイルだけ飛ばす。ログは、全部成功なら今までの文言（`N件をインポートしました（M件は同じIDのためスキップ）`）、1つでも失敗があれば、失敗したファイル名と理由を続けて出す（文言は実装時に決める）（`src/memo.js`）
- [x] ステップ2: ファイル選択（`importInput` の `change`）は `importInput.files` を `importFiles` に渡す形にする。`accept` はそのまま、`multiple` を付けて複数選択も同じ処理にする。`finally` で入力を空に戻す処理は残す（`src/memo.js`、`src/memo.html`）
- [x] ステップ3: `.settings-panel` に `dragover` / `dragleave` / `drop` を付ける。`dragover` は `preventDefault()` でドロップを許可し（ファイルを含むドラッグのときだけ。`dataTransfer.types` に `Files` があるか確認）、パネルに `.drop-active` を付ける。`dragleave` と `drop` で外す。`drop` は `preventDefault()` して、`event.dataTransfer.files` を `importFiles` に渡す。ファイル以外（テキストなど）のドラッグでは何もしない（`src/memo.js`）
- [x] ステップ4: `.settings-panel.drop-active` のスタイルを追加する。細い点線の枠と薄い背景だけにして、影・グラデーションは使わない（ダークテーマ／シークレット配色の組にも同じルールを足す）（`src/memo.css`）
- [x] ステップ5: パネルの「データ」に、ドロップできることが分かる1行の説明を足す（例: 「JSON ファイルをこの画面にドラッグ＆ドロップしても取り込めます」）（`src/memo.html`）
- [x] ステップ6: テストを追加・更新する。(a) 1ファイルのドロップで取り込まれ、ログと一覧に反映される (b) 複数ファイルのドロップで件数が合計される (c) 同じ `id` はスキップされる (d) 不正なファイルが混ざっても、ほかのファイルは取り込まれ、失敗が報告される (e) ファイル以外のドラッグでは `drop` を許可せず、何も取り込まない (f) ドラッグ中は `.drop-active` が付き、離れる・ドロップすると外れる (g) 設定パネルを閉じている間は（パネルが非表示なので）ドロップしても取り込まれない。既存の「インポート」のテストは、`importFiles` への変更後も通ること（`src/memo.test.js`）
- [x] ステップ7: `AGENTS.md` と `README.md` を更新する。インポートは設定パネルへのドラッグ＆ドロップ（複数可）でもできること、不正なファイルがあっても残りは取り込むことを書く（`AGENTS.md`、`README.md`）

## テスト・確認方法
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [ ] 実機で、設定パネルを開いて JSON ファイルをドロップすると、メモが取り込まれ、ログが出て、一覧に増えること
- [ ] 実機で、複数ファイルを同時にドロップできること
- [ ] 実機で、ドラッグ中にパネルの枠が出て、離れると消えること（ライト・ダーク・シークレットを開いたままの3通り）
- [ ] 実機で、設定パネルを閉じているときにドロップしても取り込まれないこと
- [ ] 実機で、JSON 以外のファイルや壊れた JSON をドロップしても、画面が壊れずログにエラーが出ること

## 決定事項
- ドロップで取り込めるのは、設定パネルを開いているときだけにする（メモ画面全体にはしない）。
- 複数のファイルをまとめてドロップしたときは、全部取り込む。
- 取り込みの中身（検証・マージ）は、今のインポートと同じ（`parseImport` / `mergeMemos`）。

- パネルの外へのドロップは、画面全体で `dragover` / `drop` を止めて、Chrome がタブをファイル表示に切り替えないようにする（確認済み）。

## 懸念点・未決事項
- 設定パネルを閉じている間に、メモ画面へファイルをドロップすると、Chrome の標準動作でそのタブがファイルの表示に切り替わる（メモ画面が消える）。これを防ぐため、画面全体で `dragover` / `drop` を `preventDefault()` して何もしない形にするかは、計画外なので実装前に確認したい。
- 「設定パネルを開いたときだけ」は、パネル全体にドロップできる、と解釈した。専用のドロップ欄をパネルの中に作る形がよければ、ステップ3・4を直す。
- ファイルの種類は拡張子や MIME で絞らず、中身を `parseImport` で検証する（`.json` 以外でも、形式が合えば取り込める）。拡張子で弾く場合は指示してほしい。
- 失敗したファイルがあるときのログ文言は、1行に収まるかを実装時に確認する（ログは上余白の横一列に出る）。
