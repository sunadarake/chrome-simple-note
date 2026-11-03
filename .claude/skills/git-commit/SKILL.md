---
name: git-commit
description: ここまでの変更をgit commitする
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
---

## 現在の状態
!`git status --short`

## 変更内容
!`git diff HEAD`

## 手順
1. 上記の変更内容を確認する
2. コミット対象のファイルを `git add` する
3. コミットする

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
コミット後、コミットメッセージと対象ファイルを簡潔に報告する
