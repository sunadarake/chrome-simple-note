/** ヘルプ画面にも同じ一覧を出すため、キーの割り当てを1か所にまとめる */
export const SHORTCUTS = [
  { keys: 'Ctrl+C', description: '本文をコピー（選択がなければ全体）' },
  { keys: 'Ctrl+S', description: '保存' },
  { keys: 'Ctrl+U', description: 'アンドゥ（本文を1つ前に戻す）' },
  { keys: 'Ctrl+O', description: '新しいメモを作成' },
  { keys: 'Ctrl+Shift+O', description: 'シークレットメモを作成' },
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
 * @param {() => void} deps.remove
 * @param {() => void} deps.newMemo
 * @param {() => void} deps.newSecretMemo
 */
export function initShortcuts({
  root,
  isActive,
  hasSelection,
  copy,
  save,
  undo,
  remove,
  newMemo,
  newSecretMemo,
}) {
  root.addEventListener('keydown', (event) => {
    const key = /** @type {KeyboardEvent} */ (event);
    if (!isActive() || key.repeat || key.isComposing) return;
    const withCtrl = key.ctrlKey && !key.altKey && !key.metaKey;

    if (withCtrl && key.key.toLowerCase() === 'c') {
      // 選択中のテキストはブラウザ既定のコピーに任せる
      if (hasSelection()) return;
      key.preventDefault();
      copy();
      return;
    }
    if (withCtrl && key.key.toLowerCase() === 's') {
      key.preventDefault();
      save();
      return;
    }
    if (withCtrl && key.key.toLowerCase() === 'u') {
      key.preventDefault();
      undo();
      return;
    }
    if (withCtrl && key.key.toLowerCase() === 'o') {
      key.preventDefault();
      if (key.shiftKey) {
        newSecretMemo();
      } else {
        newMemo();
      }
      return;
    }
    if (key.key === 'Delete') {
      key.preventDefault();
      remove();
    }
  });
}
