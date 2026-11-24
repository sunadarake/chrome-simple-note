#!/bin/bash
# 成功したら "ok: <コマンド>" の1行だけ、失敗したら出力をすべて表示して終了コードを引き継ぐ
out=$("$@" 2>&1)
status=$?
if [ "$status" -eq 0 ]; then
  echo "ok: $*"
else
  echo "$out"
fi
exit "$status"
