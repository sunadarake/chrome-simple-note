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
 * シークレットメモは local に書かない。何も書いていない（空白のみを含む）メモは
 * 書き始める前の新規メモなので、どちらにも書かない
 * @param {Pick<Storage, 'setItem'>} local
 * @param {Pick<Storage, 'setItem'>} session
 * @param {import('./memo-store.js').Memo[]} memos
 */
export function saveMemos(local, session, memos) {
  const written = memos.filter((memo) => memo.content.trim() !== '');
  local.setItem(KEY, JSON.stringify(written.filter((memo) => !memo.secret)));
  session.setItem(KEY, JSON.stringify(written.filter((memo) => memo.secret)));
}
