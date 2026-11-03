# release.sh と publish.sh の作成

## 概要
拡張機能を配布用の zip にする `release.sh` と、その zip を GitHub Release（draft）に投稿する `publish.sh` を作る。
Release Note には拡張機能の概要（2〜3行）とインストール方法を載せる。

## 調査結果
- 配布に必要なファイル: `manifest.json`、`icons/`、`src/`（`src/*.test.js` は不要）
- `manifest.json` の `version` は `1.0`、拡張機能名は `Chrome-Simple-Memo`
- リモートは `git@github.com:sunadarake/chrome-simple-note.git`。`gh`（ログイン済み）、`zip`、`jq` が使える
- 既存のタグ・Release はない。`release/` ディレクトリもない
- `.gitignore` は `node_modules/` のみ。`.prettierignore` は `package-lock.json` などを除外している
- `AGENTS.md` の禁止事項に `git push` がある。`gh release create --draft` はタグを作らない（公開時に作られる）ため、この制約とは衝突しない

## 実装計画
- [x] ステップ1: `release.sh` を作成する。`set -euo pipefail`、リポジトリのルートに移動、`jq` で `manifest.json` の `version` を取得し、`release/chrome-simple-note-<version>.zip` を作る。`manifest.json`、`icons/`、`src/`（`*.test.js` を除外）だけを zip の直下に入れる。既存の同名 zip は作り直す（`release.sh`）
- [x] ステップ2: `publish.sh` を作成する。`release.sh` を実行して zip を作り、`release-notes.md` の `{{VERSION}}` を差し込んで、`gh release create v<version> <zip> --draft --title ... --notes-file ...` で投稿する。同じタグの Release が既にある場合はエラーで止まる。`gh` が未ログインでも止まる（`publish.sh`）
- [x] ステップ3: Release Note のテンプレート `release-notes.md` を作成する。「概要」（2〜3行）と「インストール方法」を書く。インストール方法は、zip をダウンロードして展開 → `chrome://extensions` を開く → 右上の「デベロッパーモード」を有効にする → 「パッケージ化されていない拡張機能を読み込む」で展開したフォルダを選ぶ（`release-notes.md`）
- [x] ステップ4: 両スクリプトに実行権限を付ける（`chmod +x`）。`.gitignore` に `release/` を追加する（`.gitignore`）
- [x] ステップ5: lint / 整形の対象に影響しないか確認する。`release-notes.md` は Markdown で、Prettier が対象にするかを確認し、必要なら `.prettierignore` に追加する（`.prettierignore`）
- [x] ステップ6: `AGENTS.md` のコマンドとディレクトリ構成に、`release.sh` / `publish.sh` / `release-notes.md` / `release/` と、バージョンは `manifest.json` の `version` を手で更新する旨を追記する（`AGENTS.md`）

## テスト・確認方法
- [x] `./release.sh` を実行し、`release/chrome-simple-note-1.0.zip` ができる
- [x] `unzip -l` で、直下に `manifest.json`、`icons/`、`src/` があり、`*.test.js` と `node_modules/` が含まれないことを確認する
- [ ] zip を別ディレクトリに展開し、`chrome://extensions` で読み込んで動作することを確認する（手動）
- [ ] `./publish.sh` を実行し、GitHub 上に draft の Release（タグ `v1.0`、zip 添付、Release Note に概要とインストール方法）ができる。確認後に不要なら draft を削除する（手動）
- [ ] 同じバージョンで `./publish.sh` を再実行するとエラーで止まる
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npx prettier --check .` が通る

## 決定事項
- zip には実行に必要なもの（`manifest.json`、`icons/`、`src/` から `*.test.js` を除いたもの）だけを入れ、zip の直下に `manifest.json` が来る
- バージョンは `manifest.json` の `version` から取り、zip 名は `chrome-simple-note-<version>.zip`、タグは `v<version>`
- Release Note はテンプレート `release-notes.md` を編集して使い、`publish.sh` が `--notes-file` で渡す
- インストール方法は、zip を展開して「パッケージ化されていない拡張機能を読み込む」手順にする（Chrome ウェブストアは未公開）
- Release は draft で作る
- `publish.sh` は未コミットの変更と未 push のコミットがあると止まる（タグが push 済みコミットに作られるため）
- draft の Release はタグで検索できないため、重複確認は `gh release list` の一覧から行う

## 懸念点・未決事項
- `publish.sh` の実行で外部（GitHub）に Release が作られる。実装後の動作確認は、実行前にユーザーに確認してから行う
- バージョンの更新は手作業になる。`manifest.json` を更新し忘れると、同じタグの Release でエラーになる（意図した動作）
- Release Note の概要の文面は、実装時に `README.md` と `manifest.json` の説明を元に書き、ユーザーが確認する
- タグは `gh release create` の対象コミット（既定ブランチの先頭）に作られる。未コミットの変更や未 push のコミットは Release に反映されない。`publish.sh` で未コミットの変更を検知して止めるかは、実装時に判断する
