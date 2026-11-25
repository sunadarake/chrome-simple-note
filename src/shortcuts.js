/** ヘルプ画面にも同じ一覧を出すため、キーの割り当てを1か所にまとめる */
export const SHORTCUTS = [
  { keys: 'Ctrl+C', description: '本文をコピー（選択がなければ全体）' },
  { keys: 'Ctrl+S', description: '保存' },
  { keys: 'Ctrl+Z', description: 'アンドゥ（本文を1つ前に戻す）' },
  { keys: 'Ctrl+Shift+Z', description: 'リドゥ（アンドゥした本文をやり直す）' },
  { keys: 'Ctrl+O', description: '新しいメモを作成' },
  { keys: 'Ctrl+Shift+O', description: 'シークレットメモを作成' },
  { keys: 'Ctrl+F', description: '検索欄にフォーカス' },
  { keys: 'Ctrl+Shift+F', description: '全メモを検索' },
  { keys: 'Ctrl+P', description: '検索欄にフォーカスしてメモを絞り込む' },
  { keys: 'Ctrl+J', description: '次のメモを開く' },
  { keys: 'Ctrl+K', description: '前のメモを開く' },
  { keys: 'Ctrl+,', description: '設定を開く' },
  { keys: 'Delete', description: 'このメモを削除' },
];

/**
 * @param {object} deps
 * @param {EventTarget} deps.root
 * @param {() => boolean} deps.isActive エディタを操作できる状態か
 * @param {() => boolean} deps.hasSelection 入力欄に選択範囲があるか
 * @param {() => void} deps.copy
 * @param {() => void} deps.save
 * @param {() => void} deps.undo
 * @param {() => void} deps.redo
 * @param {() => void} deps.remove
 * @param {() => void} deps.newMemo
 * @param {() => void} deps.newSecretMemo
 * @param {() => void} deps.focusSearch
 * @param {() => void} deps.openSearch 全メモ検索パネルを開く
 * @param {(direction: number) => void} deps.moveMemo
 * @param {() => void} deps.openSettings
 * @param {() => boolean} deps.escape 閉じるものがあったら true を返す
 */
export function initShortcuts({
  root,
  isActive,
  hasSelection,
  copy,
  save,
  undo,
  redo,
  remove,
  newMemo,
  newSecretMemo,
  focusSearch,
  openSearch,
  moveMemo,
  openSettings,
  escape,
}) {
  root.addEventListener('keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event);
    if (key.repeat || key.isComposing) return;
    const withCtrl = key.ctrlKey && !key.altKey && !key.metaKey;
    const name = key.key.toLowerCase();

    // 設定・ヘルプを閉じるため、Esc だけはエディタが隠れていても効かせる
    if (!withCtrl && key.key === 'Escape') {
      if (escape()) key.preventDefault();
      return;
    }
    if (!isActive()) return;

    if (withCtrl && name === 'c') {
      // 選択中のテキストはブラウザ既定のコピーに任せる
      if (hasSelection()) return;
      key.preventDefault();
      copy();
      return;
    }
    if (withCtrl && name === 's') {
      key.preventDefault();
      save();
      return;
    }
    if (withCtrl && name === 'z') {
      key.preventDefault();
      if (key.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    if (withCtrl && name === 'o') {
      key.preventDefault();
      if (key.shiftKey) {
        newSecretMemo();
      } else {
        newMemo();
      }
      return;
    }
    if (withCtrl && name === 'f' && key.shiftKey) {
      key.preventDefault();
      openSearch();
      return;
    }
    if (withCtrl && (name === 'f' || name === 'p')) {
      key.preventDefault();
      focusSearch();
      return;
    }
    if (withCtrl && name === 'j') {
      key.preventDefault();
      moveMemo(1);
      return;
    }
    if (withCtrl && name === 'k') {
      key.preventDefault();
      moveMemo(-1);
      return;
    }
    if (withCtrl && name === ',') {
      key.preventDefault();
      openSettings();
      return;
    }
    if (key.key === 'Delete') {
      key.preventDefault();
      remove();
    }
  });
}
