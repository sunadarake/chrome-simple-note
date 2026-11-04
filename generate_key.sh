#!/usr/bin/env bash
# manifest.json に key を追加して、拡張機能の ID を固定する
set -euo pipefail

cd "$(dirname "$0")"

for cmd in openssl jq; do
    if ! command -v "$cmd" >/dev/null; then
        echo "$cmd コマンドが見つかりません" >&2
        exit 1
    fi
done

if jq -e 'has("key")' manifest.json >/dev/null; then
    echo "manifest.json には key が既にあります。何もしません"
    exit 0
fi

if [ -f key.pem ]; then
    echo "既存の key.pem を使います"
else
    openssl genrsa -out key.pem 2048 2>/dev/null
    chmod 600 key.pem
    echo "秘密鍵を作成しました: key.pem"
fi

public_der=$(openssl rsa -in key.pem -pubout -outform DER 2>/dev/null | base64 | tr -d '\n')

# 拡張機能 ID は公開鍵の SHA-256 の先頭 16 バイトを、0-9a-f から a-p に置き換えたもの
extension_id=$(printf '%s' "$public_der" | base64 -d | openssl dgst -sha256 -binary | xxd -p -l 16 | tr '0-9a-f' 'a-p')

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
# 他のキーの並びを変えないよう、name の直後に key を入れる
jq --indent 2 --arg key "$public_der" \
    'to_entries | map(., if .key == "name" then {key: "key", value: $key} else empty end) | from_entries' \
    manifest.json >"$tmp"
cat "$tmp" >manifest.json

echo "manifest.json に key を追加しました"
echo "拡張機能 ID: $extension_id"
