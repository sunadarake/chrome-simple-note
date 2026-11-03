---
name: update-agents-and-git
description: AGENTS.mdを更新してからgit commitする
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Read, Glob, Grep, Edit
---

## 現在の状態
!`git status --short`

## 変更内容
!`git diff HEAD`

## 手順
1. 上記の変更内容とこのセッションでの作業から、何が変わったかを把握する
2. `AGENTS.md` の記述が現在のコードと一致しているか確認し、必要な箇所だけ更新する
3. `AGENTS.md` を含む変更を `git add` して、1つのコミットにまとめる

## AGENTS.mdのルール
- 書くこと：今後の作業者（AI含む）が知らないと困る仕様、コマンド、ディレクトリ構成、規約、注意点
- 書かないこと：変更履歴や作業ログ、コードを読めばすぐ分かる細かい説明
- 古くなった記述は削除または修正する
- 既存の構成やトーンは維持し、差分は最小限にする
- 更新不要なら変更しない

## コミットメッセージ
- 日本語で簡潔かつ分かりやすく書く
- 1行目は50文字以内、prefix として feat/fix/refactor/docs/test/chore のいずれか
- 2行目は空行
- 3行目以降は「なぜ」を `- ` で始まる箇条書きで1〜3項目書く(1項目1行)
- `Co-Authored-By: Claude ...` や `🤖 Generated with Claude Code` などの署名・クレジット行は含めない

## 注意
- `.env`、認証情報、秘密鍵、ログや一時ファイルなど、コミットすべきでないものが含まれていたら、コミットせずに報告する
- 関係のない変更が混ざっている場合は、コミットを分けるか確認する
- push はしない

## 報告
完了後、AGENTS.mdの変更点（なければ「変更なし」）、コミットメッセージ、対象ファイルを簡潔に報告する
