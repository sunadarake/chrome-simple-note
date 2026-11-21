# 既に開いているメモ画面のタブがあれば、新しいタブを開かずにそのタブへ切り替える

## 概要
拡張アイコンを押したとき、メモ画面（`src/memo.html`）のタブが既にあれば新しいタブを開かず、そのタブをアクティブにしてウィンドウを前面に出す。メモ画面のタブが同時に複数開かないようにする。

## 調査結果
- `src/background.js` は `chrome.action.onClicked` で `chrome.tabs.create` を呼ぶだけ（3行）。既存タブの検索はしていない。
- `manifest.json` に `permissions` はない。`chrome.tabs.query({ url })` で既存タブを探すには `tabs` 権限が必要（自拡張機能ページの URL は Chrome 154 以降なら権限なしでも読めるが、古い Chrome でも動くよう `tabs` を使う）。
- `chrome.tabs.update` でタブをアクティブにし、`chrome.windows.update` の `focused` でウィンドウを前面に出せる。どちらも権限は不要。
- `src/background.js` のテストはまだない。他のモジュールは `src/*.test.js` でテストしている。

## 実装計画
- [x] ステップ1: `src/background.js` を、`chrome.tabs.query({ url })` で `src/memo.html` のタブを探し、あれば `chrome.tabs.update` でアクティブ化＋`chrome.windows.update` でフォーカス、なければ `chrome.tabs.create` する処理に変える。連続クリックで二重に開かないよう Promise で直列化する（`src/background.js`）
- [x] ステップ2: `src/background.test.js` を追加し、既存タブがあれば作成せず切り替える／なければ作成する／関係ないタブは無視する／`pendingUrl` でも見つける／連続クリックでも1つだけ開く、を検証する
- [x] ステップ3: `README.md` の使い方と、`AGENTS.md` の `background.js`・権限の記述を新しい挙動に合わせる
- [x] ステップ4: `manifest.json` に `tabs` 権限を追加する

## テスト・確認方法
- [x] `npm test` / `npm run lint` / `npm run typecheck` / `npx prettier --check .` が通ること
- [ ] 実機で `chrome://extensions` から読み込み直し、次を確認する
  - メモ画面を開いた状態でアイコンを押すと、新しいタブは増えず既存タブに切り替わる
  - 別ウィンドウのメモ画面でも、そのウィンドウが前面に出る
  - メモ画面を閉じた状態でアイコンを押すと、新しいタブで開く
  - アイコンを連続で押しても、メモ画面のタブは1つだけになる

## 決定事項
- 変更前から複数のメモタブが開いている場合は1つに切り替え、他のメモタブは閉じない（シークレットメモの内容を失わないため）
- `tabs` 権限を追加し、`chrome.tabs.query({ url })` で既存タブを探す。Chrome のバージョンによらず重複を防ぐ
- 権限追加により、インストール時に「閲覧履歴の読み取り」の警告が出る

## 懸念点・未決事項
- 複数のメモタブがある場合、`chrome.tabs.query` の並びで最初に見つかったタブへ切り替える
- `tabs` 権限は「閲覧履歴の読み取り」の警告が出るため、Chrome ウェブストアの審査では既存タブの検索に使うことを説明する
