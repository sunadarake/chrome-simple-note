/**
 * @typedef {object} Memo
 * @property {number} id
 * @property {string} title
 * @property {string} content
 * @property {string} createdAt
 * @property {boolean} [secret] シークレットメモ。タブを閉じると消える
 */

const TITLE_LENGTH = 20;

/**
 * @param {string} content
 * @returns {string}
 */
export function titleOf(content) {
  return content.substring(0, TITLE_LENGTH);
}

/**
 * @param {Date} [now]
 * @param {boolean} [secret]
 * @returns {Memo}
 */
export function createMemo(now = new Date(), secret = false) {
  return {
    id: now.getTime(),
    title: '',
    content: '',
    createdAt: now.toISOString(),
    secret,
  };
}

/**
 * タイトルは更新後の本文から作る
 * @param {Memo[]} memos
 * @param {number} id
 * @param {string} content
 * @returns {Memo[]}
 */
export function updateContent(memos, id, content) {
  return memos.map((memo) =>
    memo.id === id ? { ...memo, content, title: titleOf(content) } : memo,
  );
}

/**
 * @param {Memo[]} memos
 * @param {number} id
 * @returns {Memo[]}
 */
export function removeMemo(memos, id) {
  return memos.filter((memo) => memo.id !== id);
}

/**
 * @param {Memo[]} memos
 * @param {string} term
 * @returns {Memo[]}
 */
export function filterMemos(memos, term) {
  const lowerTerm = term.toLowerCase();
  return memos.filter(
    (memo) =>
      memo.title.toLowerCase().includes(lowerTerm) ||
      memo.content.toLowerCase().includes(lowerTerm),
  );
}
