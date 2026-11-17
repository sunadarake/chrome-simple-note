#!/bin/bash
# PreToolUse hook: .env や SSH 鍵などの機密ファイルを Bash から読むコマンドを止める
# 使い方: settings.json の hooks から呼ばれる(標準入力に JSON が渡される)

# .env.example など雛形は除外してから調べる
input=$(cat | sed -E 's/\.env\.(example|sample|template)//g')

end='([[:space:]"'"'"';|&]|$)'
secret_re="(^|[/[:space:]\"'=])(\.env(\.[[:alnum:]_-]+)?|\.netrc)$end"
secret_re="$secret_re|\.ssh/|\.aws/credentials|\.gnupg/|id_(rsa|ed25519|ecdsa|dsa)|\.pem$end"

if printf '%s' "$input" | grep -Eq "$secret_re"; then
    echo "機密ファイル (.env / SSH 鍵など) を扱うためブロックしました" >&2
    exit 2
fi
exit 0
