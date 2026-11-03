# 未使用の `tabs` 権限を削除する（Chrome ウェブストア審査の差し戻し対応）

## 概要
Chrome ウェブストアの審査で、違反 ID「Purple Potassium」（使っていない権限 `tabs` をリクエストしている）として不承認になった。
`manifest.json` から `tabs` 権限を外し、他の権限も必要最小限か確認したうえで、再提出用のバージョンを出す。

## 調査結果
- `manifest.json`: `"permissions": ["tabs"]` だけが宣言されている。他の権限・`host_permissions` はない
- `chrome.*` API を使っているのは `src/background.js` のみ
  - `chrome.action.onClicked.addListener` は `action` キーがあれば権限は不要
  - `chrome.tabs.create({ url })` は `tabs` 権限がなくても使える。`tabs` 権限が必要なのは、既存タブの `url` / `title` / `favIconUrl` を読む場合などだけ
  - `chrome.runtime.getURL` も権限は不要
- メモの保存は `localStorage` / `sessionStorage` で、`chrome.storage` は使っていない（`storage` 権限も不要）
- つまり `tabs` は不要で、削除してもアイコンクリックで `src/memo.html` を新しいタブで開く挙動は変わらない
- 他に必要な権限はない（`permissions` は空になる）

## 実装計画
- [x] ステップ1: `manifest.json` の `"permissions": ["tabs"]` の行を削除する。`permissions` キー自体を置かない（`manifest.json`）
- [x] ステップ2: `manifest.json` の `version` を `7.0.1` に上げる。ストアは同じバージョンの再アップロードを受け付けないため（`manifest.json`）
- [ ] ステップ3: `release-notes.md` に今回の変更（不要な権限の削除）を反映する。「概要」は 2〜3 行のまま、行を増やさずまとめ直す（`release-notes.md`）
- [x] ステップ4: `README.md` や `AGENTS.md` に `tabs` 権限への言及があれば直す（なければ変更しない）（`README.md`、`AGENTS.md`）
- [x] ステップ5: `./release.sh` で配布用 zip を作り直す（実行はユーザーが判断する）

## テスト・確認方法
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npx prettier --check .` が通る
- [ ] `chrome://extensions` で読み込み直し、次を確認する（手動）
  - 拡張機能の詳細に「タブ」などの権限の表示がない
  - アイコンをクリックすると、新しいタブでメモ画面が開く
  - エラーが出ていない（service worker のコンソールも確認）
- [x] zip 内の `manifest.json` に `permissions` が含まれていないことを確認する

## 決定事項
- 質問なしで進められる内容のため、`tabs` 権限は削除する方針で確定
- 他の権限は元々ないので、追加・見直しは不要

## 懸念点・未決事項
- ストアへの再提出（アップロードと審査申請）はユーザーが開発者ダッシュボードで行う。再審査請求ではなく、修正版のアップロードで対応するのが確実
- 審査用の説明欄に「権限なしで `chrome.tabs.create` のみ使用」と書いておくと伝わりやすい
- バージョンを 7.0.1 にすると `publish.sh` のタグは `v7.0.1` になる。7.0.0 の GitHub Release が既にあるかは未確認（あっても別タグなので問題はない）
- ステップ3（`release-notes.md`）は未実施: 内容が利用者向けの機能紹介で、権限の削除は載せる内容ではないため。載せるかユーザーに確認したい
- ステップ4: `README.md` / `AGENTS.md` / `release-notes.md` に `tabs` への言及はなく、変更なし
