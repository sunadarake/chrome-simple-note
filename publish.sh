#!/usr/bin/env bash
# release.sh で作った zip を GitHub Release に公開する
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

./release.sh

notes_file=$(mktemp)
trap 'rm -f "$notes_file"' EXIT
sed "s/{{VERSION}}/${version}/g" release-notes.md > "$notes_file"

gh release create "$tag" "$zip_path" --title "$tag" --notes-file "$notes_file"
