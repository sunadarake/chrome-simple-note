# Simple Note

## 目的
Chrome のアイコンをクリックするだけで開ける、シンプルなメモ帳の拡張機能。
通常のメモに加えて、タブを閉じると消えるシークレットメモを書ける。

## セットアップ
```bash
git clone git@github.com:sunadarake/chrome-simple-note.git
cd chrome-simple-note
npm install   # テスト・lint などの開発用。拡張機能の実行には不要
```

Chrome で `chrome://extensions` を開き、「デベロッパーモード」を有効にして、「パッケージ化されていない拡張機能を読み込む」でこのディレクトリを選ぶ。

## 使い方
拡張機能のアイコンをクリックすると、新しいタブでメモ画面が開く。

- 「＋ 新しいメモ」で通常のメモを作る。`localStorage` に保存される
- 「🔒 シークレットメモ」でシークレットメモを作る。`sessionStorage` に保存され、タブを閉じると消える
- 入力が 1 秒止まると自動保存される。「保存」「コピー」「削除」のボタンもある

## 仕様

| 機能 | 説明 |
|:-|:-|
| メモ一覧 | 本文の先頭 20 文字をタイトルとして表示する |
| 検索 | タイトルと本文を対象に、大文字小文字を区別せず絞り込む |
| シークレットメモ | 一覧に 🔒 が付き、開いている間はダークグレーの配色になる |

| コマンド | 説明 |
|:-|:-|
| `npm test` | テストを実行する |
| `npm run lint` | ESLint を実行する |
| `npm run typecheck` | 型チェックを実行する |
| `npm run format` | Prettier で整形する |
| `./release.sh` | 配布用の zip を `release/` に作る |
| `./publish.sh` | zip を GitHub Release に公開する |
