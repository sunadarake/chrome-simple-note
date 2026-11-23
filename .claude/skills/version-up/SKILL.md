---
name: version-up
description: バージョンを更新してgit commitする
argument-hint: [major|minor|patch|x.y.z]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git tag:*), Bash(git describe:*), Read, Glob, Grep, Edit, Write
---

## 現在の状態
!`git status --short`

## タグ
!`git tag --sort=-v:refname | head -5`

## 最近のコミット
!`git log --oneline -10`

## 引数
$ARGUMENTS

## 手順
1. 現在のバージョン(`1.0.0` 形式)を読む。次の順に探し、最初に見つかったものを正とする
   - `package.json`(Node / Electron) → `manifest.json`(拡張機能など) → `pyproject.toml` → `setup.cfg` → `setup.py` → `Cargo.toml`
   - `CMakeLists.txt`(`project(... VERSION x.y.z)`) → `meson.build` → `configure.ac`(`AC_INIT`)
   - `Makefile.PL` / `dist.ini` / `META.json`(Perl)
   - `version.go` / `version.h` などのバージョン定数(Go は `go.mod` に版がないため、定数がある場合のみ)
   - `VERSION`
2. どれもなければ `VERSION`(1行で `1.0.0`)を新規作成し、手順6へ進む(規模判定はしない)
3. 引数があればそれに従う
   - `major` / `minor` / `patch`: 該当の桁を+1し、下位の桁は0にする
   - `x.y.z`: その値を設定する。現在より小さい、または同じなら更新せず報告して止める
4. 引数がなければ、前回バージョンからの変更で判定する
   - 基準点は `v<現在値>` タグ。なければバージョンを最後に変更したコミット(`git log -1 -- <ファイル>`)
   - 基準点以降の `git log` と `git diff --stat` を見て決める
   - major: 破壊的変更(互換性のない仕様変更、コマンド・オプション・出力形式の削除や変更)
   - minor: 後方互換のある機能追加、大きめの変更
   - patch: バグ修正、リファクタ、docs、chore のみ
   - 迷う場合は低い方にする。変更が1件もなければ更新せず報告して止める
5. 同じ値を持つ他のバージョン記載(`package-lock.json` の先頭の `version`、`__version__`、`#define *_VERSION`、Perl の `$VERSION` など)も合わせて更新する
6. バージョンのファイルだけを `git add` し、`git commit -q` でコミットする

## ログ
- 正常時は出力を小さくし、成功時の詳細は表示しない
- 失敗したときだけエラー内容を表示する

## コミットメッセージ
- 日本語で簡潔に書く。1行目は `chore: バージョンを X.Y.Z に更新`
- 2行目は空行
- 3行目以降は判定理由を `- ` で始まる箇条書きで1〜3項目書く(1項目1行)
- `Co-Authored-By: Claude ...` や `🤖 Generated with Claude Code` などの署名・クレジット行は含めない

## 注意
- バージョン以外の未コミットの変更は commit に含めない
- タグは打たない。push はしない

## 報告
旧バージョン → 新バージョン、判定理由(引数指定ならその旨)、コミットメッセージを簡潔に報告する
