# src/ への再構成とテスト・静的解析の導入

## 概要
現在のコードはルート直下の `memo.js` 1ファイルに、状態管理・永続化・DOM操作・タイマーが混在しており、単体テストができない。
コードを `src/` に移して責務ごとに分け、Vitest・ESLint・Prettier・tsc(checkJs)を導入してテストを追加する。ユーザーから見た挙動は変えない（下記の不具合修正を除く）。

## 調査結果
- 現状のファイル: `manifest.json` / `background.js` / `memo.html` / `memo.css` / `memo.js` / `icons/`
- `memo.js` はグローバルの `memos` / `currentMemoIndex` / `lastContent` と、読み込み時に取得するDOM要素に依存する。インデックス管理のため、削除・検索で `memos[index]` と DOM の対応が崩れやすい
- `localStorage` を直接呼んでいる（`memos` キー、JSON配列、要素は `{id, title, content, createdAt}`）
- 不具合・懸念（現状コード）
  - `saveMemo` と自動保存で `title` を「更新前の content」から作っており、タイトルが1回遅れる。また新規メモの初回保存では `title` が空になる
  - コピーが非推奨の `document.execCommand('copy')`
  - `manifest.json` の `permissions` に `storage` があるが `chrome.storage` は未使用。`web_accessible_resources` も実質不要の可能性が高い
- テスト・lint・型チェックの仕組みは現状なし。`package.json` もない

## 実装計画
- [x] ステップ1: `package.json` 作成（npm、`"type": "module"`）。devDependencies に vitest / jsdom / eslint / @eslint/js / globals / eslint-config-prettier / prettier / typescript を追加。scripts に `test` / `lint` / `typecheck` / `format` を定義（`package.json`）
- [x] ステップ2: 設定ファイル追加。`eslint.config.js`（flat config、ブラウザ+chrome のグローバル、prettier と競合するルールを無効化）、`.prettierrc`、`jsconfig.json` または `tsconfig.json`（`checkJs: true`、`noEmit`、`include: ["src"]`、`types` に `chrome` 用の `@types/chrome` を追加）、`vitest.config.js`（環境 jsdom）、`.gitignore`（`node_modules/`）
- [x] ステップ3: ファイル移動。`git mv` で `background.js` → `src/background.js`、`memo.html` / `memo.css` / `memo.js` → `src/` 配下へ。`manifest.json` の `service_worker` を `src/background.js` に、`background.js` 内の `getURL` を `src/memo.html` に合わせる。`manifest.json` はルートに置く（`manifest.json` / `src/background.js`）
- [x] ステップ4: 純粋ロジックを分離（`src/memo-store.js`）。DOMやstorageに触れない関数として、新規メモ作成、本文更新（タイトルは更新後の本文から算出）、削除、検索フィルタ、タイトル算出を `id` ベースで実装。入力を変更せず新しい配列を返す形にする
- [x] ステップ5: 永続化を分離（`src/storage.js`）。`load(storage)` / `save(storage, memos)` が storage（`getItem`/`setItem` を持つオブジェクト）を引数で受け取る。キーは `memos` のまま維持
- [x] ステップ6: UI層を整理（`src/memo.js`）。`init(root, deps)` 形式にして、DOM要素・storage・タイマー・clipboard・`confirm` を引数から受け取れるようにし、グローバル状態とモジュール読み込み時の副作用をなくす。選択中のメモは `index` ではなく `id` で保持する。自動保存の待ち時間(1秒)は定数にする
- [x] ステップ7: `memo.html` を `<script type="module" src="memo.js">` に変更し、エントリポイントで `init` を呼ぶ（`src/memo.html`）
- [x] ステップ8: JSDoc で型（`Memo` など）と関数シグネチャを付け、`npm run typecheck` が通るようにする（`src/*.js`）
- [x] ステップ9: `manifest.json` の不要な権限・設定の整理（ユーザー確認後。「懸念点」参照）
- [x] ステップ10: `AGENTS.md` のコマンド・ディレクトリ構成・コーディング規約を新構成に更新する（`AGENTS.md`）

## テスト・確認方法
- [x] `src/memo-store.test.js`: 作成、更新（タイトルが更新後の本文の先頭20文字になる）、削除、検索（タイトル・本文・大文字小文字無視、該当なし）、元の配列を変更しないこと
- [x] `src/storage.test.js`: 保存と読み込みの往復、データなしの場合は空配列、既存形式（`memos` キー）を読めること
- [x] `src/memo.test.js`（jsdom + fake timers）: 初期表示（メモなしなら新規作成、ありなら先頭を表示）、保存ボタン、1秒後の自動保存、空白のみは保存しない、削除の確認（`confirm` が false なら削除しない）、検索での表示切替、コピー
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npm run format -- --check` がすべて通る
- [ ] `chrome://extensions` で読み込み、アイコンクリック→メモ画面表示→作成・編集・保存・削除・検索・コピー、既存の `localStorage` データがそのまま見えることを手動確認

## 決定事項
- パッケージ管理は npm
- ビルドなしの ES Modules。`src/` をそのまま拡張機能として読み込む（`manifest.json` はルートに残す）
- 保存先は `localStorage` のまま（既存データを維持し、storage 層を分離してテスト可能にする）
- 追加ツール: Prettier、JSDoc + tsc の checkJs（TypeScript 化はしない）。CI は導入しない
- テストは Vitest + jsdom

- `manifest.json` の `storage` 権限と `web_accessible_resources` は削除する
- タイトルが1回遅れる不具合は、この再構成の中で修正する

## 懸念点・未決事項
- タイトルが1回遅れる不具合は、再構成の中で修正する想定（挙動が変わるため、問題があれば指示してほしい）
- `execCommand('copy')` を `navigator.clipboard.writeText` に変えるかは未決。変えると拡張機能ページでの権限・フォーカス条件の確認が必要。この計画では注入可能にして挙動は維持し、変更は別タスクとする
- `manifest.json` の `storage` 権限と `web_accessible_resources` は不要の可能性が高いが、削除してよいか未確認（ステップ9の前に確認する）
- ES Modules の `<script type="module">` は拡張機能ページ（`chrome-extension://`）で動作する想定。手動確認で必ず検証する
- ファイル名（`memo-store.js` など）は暫定。実装時に既存の命名と合わせる
