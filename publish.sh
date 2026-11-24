#!/usr/bin/env bash
# 配布用の zip を作り、GitHub Release に公開する
set -euo pipefail

cd "$(dirname "$0")"

version=$(jq -r .version manifest.json)
tag="v${version}"
zip_path="release/chrome-simple-note-${version}.zip"

# タグは push 済みのコミットに作られるため、反映されない変更があれば止める
if [ -n "$(git status --porcelain)" ]; then
  echo "未コミットの変更があります" >&2
  exit 1
fi
if [ -n "$(git log '@{u}..HEAD' --oneline)" ]; then
  echo "push されていないコミットがあります" >&2
  exit 1
fi

# draft の Release はタグで検索できないため、一覧から探す
if gh release list --json tagName --jq '.[].tagName' | grep -qx "$tag"; then
  echo "Release ${tag} は既にあります" >&2
  exit 1
fi

# 前のバージョンの zip が残らないよう、作る前に消す
mkdir -p release
rm -f release/*.zip
# テストファイルは拡張機能の実行に不要なので含めない
zip -r "$zip_path" manifest.json LICENSE icons src -x '*.test.js'

notes_file=$(mktemp)
trap 'rm -f "$notes_file"' EXIT
sed "s/{{VERSION}}/${version}/g" release-notes.md > "$notes_file"

gh release create "$tag" "$zip_path" --title "$tag" --notes-file "$notes_file"

# 公開に成功してから、古い Release とタグを消す（失敗したときに古い Release まで失わないため）
old_tags=$(gh release list --limit 1000 --json tagName --jq '.[].tagName' | grep -vx "$tag" || true)
if [ -n "$old_tags" ]; then
  echo "次の古い Release とタグを削除します:"
  echo "$old_tags"
  for old_tag in $old_tags; do
    gh release delete "$old_tag" --cleanup-tag --yes
    git tag -d "$old_tag" 2>/dev/null || true
  done
fi
