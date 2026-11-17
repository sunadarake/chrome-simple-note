---
name: todo-loop
description: 未完了のTODOを1件ずつ、実装→AGENTS.md更新→commit の順に繰り返す
argument-hint: [件数 (省略時は未完了がなくなるまで)]
allowed-tools: Bash(awk:*), Bash(head:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Skill, Read, Glob, Grep, Edit, Write, AskUserQuestion
---

## 件数
$ARGUMENTS

## 未完了のTODOファイル（最大5件）
!`awk 'FNR==1{c=0} /^[\140][\140][\140]/{c=!c;next} !c&&/^- \[ \]/&&!s[FILENAME]++{print FILENAME}' todo/*-todo.md | head -5`

## 手順
1. 上記一覧が空なら、未完了の TODO はないと報告して終了する
2. 次を1サイクルとして、件数(指定がなければ未完了がなくなるまで)だけ繰り返す
   1. Skill ツールで `todo-next` を実行し、未完了で番号が最小の TODO を1件実装する
   2. Skill ツールで `update-agents-and-git` を実行し、AGENTS.md の更新と git commit をまとめて行う
3. 一覧を取り直し、次の TODO があれば手順2へ戻る

## 止める条件
- `todo-next` が AskUserQuestion で質問したとき: 回答を受けてから続ける
- テストが失敗したとき: commit せず、そこで止めて報告する
- コミットすべきでないファイル(`.env` など)が見つかったとき: commit せず、そこで止めて報告する

## ルール
- 1サイクルで実装するのは TODO 1件だけ。commit を挟まずに次の TODO へ進まない
- push はしない

## 報告
- 処理した TODO ファイルと、それぞれの commit
- 止まった場合はその理由と、残りの未完了 TODO
