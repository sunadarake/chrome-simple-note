const KEY = 'memos';

/**
 * @param {Pick<Storage, 'getItem'>} storage
 * @returns {import('./memo-store.js').Memo[]}
 */
export function loadMemos(storage) {
  return JSON.parse(storage.getItem(KEY) ?? '[]');
}

/**
 * @param {Pick<Storage, 'setItem'>} storage
 * @param {import('./memo-store.js').Memo[]} memos
 */
export function saveMemos(storage, memos) {
  storage.setItem(KEY, JSON.stringify(memos));
}
