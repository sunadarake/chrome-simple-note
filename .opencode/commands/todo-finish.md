---
description: TODO の実装後に、AGENTS.md 更新→README 更新→commit→バージョン更新をまとめて行う
---

## バージョン指定
$ARGUMENTS

## 現在の状態
!`git status --short`

## 手順
次の順に Skill ツールで実行する。
1. `update-agents-md`: AGENTS.md を更新する(commit はしない)
2. `readme-update`: README.md を更新する(commit はしない)
3. `git-commit`: 1〜2 を含む未コミットの変更を commit する
4. `version-up`: バージョンを更新して commit する。バージョン指定があれば引数として渡す

## 止める条件
- 手順3の前に未コミットの変更がなく、1〜2 でも変更が出なかったとき: 手順4だけ実行する
- コミットすべきでないファイル(`.env` など)が見つかったとき: commit せず、そこで止めて報告する
- 各 skill が質問してきたとき: 回答を受けてから続ける

## ルール
- 実装やテストの修正はしない。仕上げの更新だけを行う
- タグは打たない。push はしない

## 報告
- 各手順で変えたファイルと、作った commit
- 旧バージョン → 新バージョン
