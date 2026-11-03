# Chrome-Simple-Memo

Chrome拡張機能（Manifest V3）のシンプルなメモ帳。
拡張アイコンをクリックすると、新しいタブでメモ画面（`src/memo.html`）が開く。

## 技術スタック
- 言語: JavaScript（ES Modules、ビルドなし。型は JSDoc + `tsc --checkJs`）
- 実行環境: Chrome拡張機能（Manifest V3）
- テスト: Vitest（jsdom）
- 静的解析・整形: ESLint、Prettier
- パッケージ管理: npm

## コマンド
- セットアップ: `npm install`
- テスト: `npm test`
- lint: `npm run lint`
- 型チェック: `npm run typecheck`
- 整形: `npm run format`（確認のみは `npx prettier --check .`）
- ビルド: なし
- リリース: `./release.sh`（`release/` に配布用 zip を作る）、`./publish.sh`（zip を GitHub Release に公開する）
- 動作確認: `chrome://extensions` でデベロッパーモードを有効にし、このディレクトリを「パッケージ化されていない拡張機能を読み込む」で読み込む

## ディレクトリ構成
- `manifest.json` 拡張機能の定義（ルートに置く）
- `src/background.js` アイコンクリックで `src/memo.html` をタブで開く
- `src/memo.html` / `src/memo.css` メモ画面
- `src/main.js` メモ画面のエントリポイント（実際の `document` / `localStorage` / `sessionStorage` を渡して起動する）
- `src/memo.js` UI層。DOM・storage・confirm・コピー・ファイル保存の処理を引数で受け取る
- `src/markdown-highlight.js` 本文をマークダウンの記法ごとに色付けした HTML にする純粋関数
- `src/memo-transfer.js` メモのエクスポート（JSON）とインポート（検証・マージ）を行う純粋関数
- `src/memo-store.js` メモの作成・更新・削除・検索を行う純粋関数
- `src/sidebar.js` サイドバーの幅のドラッグ変更と、ボタンでの開閉（メモ本体とは独立）
- `src/storage.js` `localStorage`（通常メモ）と `sessionStorage`（シークレットメモ）への読み書き
- `src/*.test.js` テスト（`tsc` の対象外）
- `icons/` 拡張機能のアイコン
- `release-notes.md` Release Note のテンプレート（`{{VERSION}}` は `publish.sh` が置き換える）
- `release/` `release.sh` の出力先（git 管理外）
- `todo/` 実装計画（`/todo-plan` で作成、`/todo-refine` で詰める、`NNN-todo.md` 形式）

## 仕様・注意点
- メモは `localStorage` の `memos` キーに JSON 配列で保存する（`chrome.storage` は使っていない）
- シークレットメモ（`secret: true`）は `sessionStorage` の `memos` キーにだけ保存し、`localStorage` には書かない。メモ画面のタブを閉じると消える（リロードでは残る）
- シークレットメモを開いている間は、`.main-content.secret` と一覧の `.memo-item.secret` でダークグレーの配色になり、`.secret-label` が表示される（本文欄の大きさが変わらないよう、ラベルは絶対配置で上余白に重ねる）
- エディタは `textarea`（`.content-input`）の背面に、色付きの `pre`（`.editor-highlight`）を重ねた構成。両者のフォント・余白・折り返し・スクロールは必ずそろえる。ハイライトは色と下線だけにし、太字・斜体・サイズは使わない（文字の位置がずれるため）
- エクスポートは `{version: 1, exportedAt, memos}` の JSON で、シークレットメモは含めない。インポートは今あるメモに追加し、同じ `id` はスキップする。取り込んだメモは常に通常メモ。一覧の並びは `id` の降順で決まるため、`id` を保てば並びも維持される
- サイドバーは「SimpleNote」の横の `.sidebar-close` で閉じ、閉じている間だけ出るメイン画面左上の `.sidebar-open` で開く（どちらも `.sidebar-toggle`）。閉じた状態は `localStorage` の `sidebarCollapsed` に保存する（閉じても幅の保存値は変わらない）
- サイドバーの幅は 200〜600px（既定 280px）で、ドラッグで変えた幅を `localStorage` の `sidebarWidth` に保存する（`memos` とは別のキー）
- メモのタイトルは保存後の本文の先頭20文字
- メモの選択は `id` で管理する（配列のインデックスに依存しない）
- 入力が1秒止まると自動保存する（空白のみの内容は保存しない）
- `manifest.json` に `permissions` は宣言していない（`chrome.tabs.create` などは権限なしで使える）。使っていない権限があると Chrome ウェブストアの審査で不承認になるため、本当に必要になった権限だけを足す
- バージョンは `manifest.json` の `version` で決まる。リリース前に手で更新する（zip 名とタグ `v<version>` に使われる）
- `release-notes.md` の「概要」は 2〜3 行で簡潔に書く。機能を追加しても行を増やさず、まとめ直す
- `publish.sh` は未コミットの変更・未 push のコミット・同じタグの Release があると止まる

## 作業の進め方
- 作業の前に、関連するコードと仕様を読んで理解する
- 不明点や判断が分かれる点は、推測で進めずに質問する
- 依頼された範囲だけを変更する。範囲外で必要な変更に気づいたら報告する
- 作業の完了前に、テスト・lint・型チェックを実行して通ることを確認する

## コーディング規約
- 既存コードの書き方（命名、構成、エラー処理）に合わせる
- コードはシンプルにする。1か所でしか使わない抽象化やヘルパー関数は作らない
- コメントは日本語（UTF-8）で、コードを読んでも分からない「なぜ」だけを書く
- 不要な防御処理（過剰なnullチェック、エラーの握りつぶし）を書かない
- 使わなくなったコード、デバッグ用のログは残さない

## コミット
- メッセージは日本語で、1行目は変更内容が一目で分かる50文字程度にする
- 必要な場合のみ、空行のあとに補足を書く
- 署名・クレジット行（`Co-Authored-By` など）は含めない

## 禁止事項
- `.env`、認証情報、秘密鍵をコミットしない
- `git push`、`git reset --hard`、強制的な上書きをしない
- テストを通すためにテストを弱めたり、無効にしたりしない
