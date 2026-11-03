#!/usr/bin/env bash
# 配布用の zip を release/ に作る
set -euo pipefail

cd "$(dirname "$0")"

version=$(jq -r .version manifest.json)
zip_path="release/chrome-simple-note-${version}.zip"

mkdir -p release
rm -f "$zip_path"
# テストファイルは拡張機能の実行に不要なので含めない
zip -r "$zip_path" manifest.json icons src -x '*.test.js'

echo "作成しました: $zip_path"
