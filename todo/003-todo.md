# シークレットメモの追加

## 概要
通常のメモとは別に「シークレットメモ」を作れるようにする。
シークレットメモはメモ画面のタブを閉じると自動で消え、`localStorage` には保存しない。

## 調査結果
- `src/memo-store.js`: `Memo` 型は `{id, title, content, createdAt}`。`createMemo(now)` が新規メモを作る
- `src/storage.js`: `loadMemos(storage)` / `saveMemos(storage, memos)` が `localStorage` の `memos` キーに全メモを読み書きする
- `src/memo.js`: `initMemoApp({root, storage, confirm, copy})` が UI を組み立てる。メモは `memos` 配列 1 つで管理し、保存のたびに `saveMemos` で全件を書く
- `src/main.js`: 実際の `document` / `localStorage` を渡して起動する
- `src/memo.html`: サイドバーに「＋ 新しいメモ」ボタン（`.new-memo-btn`）がある
- `manifest.json` に `storage` 権限はない。`sessionStorage` は権限不要で、タブごとに独立し、タブを閉じると消える（リロードでは残る）
- 既存のメモ（`secret` を持たない）は通常メモとして扱えばよい

## 実装計画
- [x] ステップ1: `Memo` 型に `secret` を追加し、`createMemo(now, secret = false)` で設定する。`secret` が無い既存データは通常メモ（`false`）として扱う（`src/memo-store.js`）
- [x] ステップ2: `storage.js` を、通常メモは `localStorage`、シークレットメモは `sessionStorage` に分けて読み書きする形にする。`loadMemos(local, session)` は両方を `id` の降順で結合して返し、`saveMemos(local, session, memos)` は `secret` で振り分けて書く。`localStorage` の `memos` キーとデータ形式は変えない。シークレットメモは `localStorage` に一切書かない（`src/storage.js`）
- [x] ステップ3: `initMemoApp` が `sessionStorage` を引数で受け取り、`loadMemos` / `saveMemos` に渡す。`src/main.js` では実際の `sessionStorage` を渡す（`src/memo.js`、`src/main.js`）
- [x] ステップ4: 「シークレットメモ」ボタン（`.secret-memo-btn`）を「＋ 新しいメモ」の隣に追加し、押すと `secret: true` のメモを作成して先頭に表示する。作成後に通常⇄シークレットの切り替えはできない（`src/memo.html`、`src/memo.css`、`src/memo.js`）
- [x] ステップ5: 一覧ではシークレットメモのタイトルの前に `🔒 ` を付ける。検索、自動保存、コピー、削除の確認は通常メモと同じ挙動にする（`src/memo.js`）
- [x] ステップ6: `AGENTS.md` の保存先とディレクトリ構成の記述を更新する。シークレットメモは `sessionStorage` に保存し、タブを閉じると消える旨を書く（`AGENTS.md`）

## テスト・確認方法
- [x] `src/memo-store.test.js`: `createMemo` が `secret` を設定する（既定は `false`）。既存の `createMemo` のテストを `secret` 入りに更新する
- [x] `src/storage.test.js`: シークレットメモは `sessionStorage` にだけ書かれ、`localStorage` に書かれない。通常メモは `localStorage` にだけ書かれる。読み込み時に両方が `id` の降順で結合される。`secret` を持たない既存データを通常メモとして読める
- [x] `src/memo.test.js`: ボタンでシークレットメモが作られ、一覧に `🔒` 付きで出る。保存・自動保存で `sessionStorage` にだけ書かれる。削除の確認と検索が通常メモと同じように動く。初期表示でシークレットメモがあっても先頭が表示される
- [x] `npm run lint` / `npm run typecheck` / `npm test` / `npx prettier --check .` が通る
- [ ] `chrome://extensions` で読み込み、シークレットメモを作って保存→リロードで残る→タブを閉じて開き直すと消える、通常メモは残る、を手動確認する

## 決定事項
- 「セッションを閉じたあと」は「メモ画面のタブを閉じたとき」。保存先は `sessionStorage`（権限追加は不要）
- 作成は「シークレットメモ」ボタンを追加して行う。作成後の通常⇄シークレット切り替えは作らない
- 一覧は通常メモと同じ一覧に混ぜ、タイトルの前に `🔒 ` を付ける。検索の対象にも含める
- 自動保存・コピー・削除の確認は通常メモと同じ挙動。保存先だけが異なる

## 懸念点・未決事項
- `sessionStorage` はリロードでは消えない。また Chrome の「閉じたタブを開く」で復元すると残ることがある。「タブを閉じたら確実に消す」ものではない点を、ユーザーに伝える
- 複数のメモ画面のタブを開くと、`sessionStorage` はタブごとに独立するため、シークレットメモは他のタブに表示されない。通常メモの `localStorage` は以前から全タブで共有され、後から保存したタブの内容で上書きされる（今回は変更しない）
- シークレットメモの本文は、タブを開いている間は DevTools から見られる。強い秘匿を目的としたものではなく、「履歴に残さない」ためのもの
- 読み込み時の並びは `id` の降順にそろえる。通常メモは作成順（新しい順）に保存されているため、既存の並びは変わらない想定
- ボタンの文言・配置（「シークレットメモ」、サイドバー内）と `🔒` の表示は暫定。実装後に画面で確認して調整する
