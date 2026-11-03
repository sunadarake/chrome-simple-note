const KEY = 'memos';

/**
 * 通常メモは local、シークレットメモは session に保存されているものを新しい順で返す
 * @param {Pick<Storage, 'getItem'>} local
 * @param {Pick<Storage, 'getItem'>} session
 * @returns {import('./memo-store.js').Memo[]}
 */
export function loadMemos(local, session) {
  const read = (/** @type {Pick<Storage, 'getItem'>} */ storage) =>
    JSON.parse(storage.getItem(KEY) ?? '[]');
  return [...read(local), ...read(session)].sort((a, b) => b.id - a.id);
}

/**
 * シークレットメモは local に書かない
 * @param {Pick<Storage, 'setItem'>} local
 * @param {Pick<Storage, 'setItem'>} session
 * @param {import('./memo-store.js').Memo[]} memos
 */
export function saveMemos(local, session, memos) {
  local.setItem(KEY, JSON.stringify(memos.filter((memo) => !memo.secret)));
  session.setItem(KEY, JSON.stringify(memos.filter((memo) => memo.secret)));
}
