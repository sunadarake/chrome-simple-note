#!/usr/bin/env bash
# 動作確認用に、配布用と同じ zip を release/ に作る（公開は publish.sh）
set -euo pipefail

cd "$(dirname "$0")"

version=$(jq -r .version manifest.json)
zip_path="release/chrome-simple-note-${version}.zip"

mkdir -p release
# 前のバージョンの zip が残らないよう、作る前に消す
rm -f release/*.zip
# テストファイルは拡張機能の実行に不要なので含めない
zip -r "$zip_path" manifest.json LICENSE icons src -x '*.test.js'

echo "作成しました: $zip_path"
