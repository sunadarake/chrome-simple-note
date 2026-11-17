#!/bin/bash
# PreToolUse hook: rm -r で / や $HOME などの重要な場所を消すコマンドを止める
# 使い方: settings.json の hooks から呼ばれる(標準入力に JSON が渡される)

input=$(cat)

# rm の再帰オプション(-r, -rf, -fr, -R, --recursive)があるか
rm_re='(^|[^[:alnum:]_./-])rm[[:space:]]+([^"|;&]*[[:space:]])?(-[[:alnum:]]*[rR][[:alnum:]]*|--recursive)([[:space:]"]|$)'
# 対象が / /* ~ ~/ ~/* $HOME ${HOME} のいずれかか
target_re='[[:space:]](/|/\*|~|~/|~/\*|\$HOME|\$\{HOME\}|\$HOME/|\$HOME/\*|\$\{HOME\}/|\$\{HOME\}/\*)([[:space:]"\;|&]|$)'

# コマンドを ; | & と改行(JSON 上の \n)で区切り、区切りごとに判定する
# (別のコマンドの引数に含まれる / を対象と誤判定しないため。/tmp などは対象外)
while IFS= read -r seg || [ -n "$seg" ]; do
    if printf '%s' "$seg" | grep -Eq "$rm_re" && printf '%s' "$seg" | grep -Eq "$target_re"; then
        echo "危険な rm -r (/ や HOME が対象) のためブロックしました" >&2
        exit 2
    fi
done < <(printf '%s' "$input" | sed 's/\\n/\n/g' | tr ';|&' '\n\n\n')
exit 0
