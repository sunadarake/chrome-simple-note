/**
 * @typedef {object} Memo
 * @property {number} id
 * @property {string} title
 * @property {string} content
 * @property {string} createdAt
 * @property {boolean} [secret] シークレットメモ。タブを閉じると消える
 */

/**
 * 本文の最初の1行を、前後の空白と先頭の見出し記号（# や ##）を除いて、指定の文字数まで
 * @param {string} content
 * @param {number} length
 * @returns {string}
 */
export function titleOf(content, length) {
  const firstLine = content.trim().split('\n')[0];
  return firstLine
    .replace(/^#+(\s+|$)/, '')
    .trim()
    .substring(0, length);
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
 * @param {number} titleLength
 * @returns {Memo[]}
 */
export function updateContent(memos, id, content, titleLength) {
  return memos.map((memo) =>
    memo.id === id
      ? { ...memo, content, title: titleOf(content, titleLength) }
      : memo,
  );
}

/**
 * 全メモのタイトルを本文から作り直す。変わらないメモは同じオブジェクトのまま返す
 * @param {Memo[]} memos
 * @param {number} titleLength
 * @returns {Memo[]}
 */
export function retitle(memos, titleLength) {
  return memos.map((memo) => {
    const title = titleOf(memo.content, titleLength);
    return title === memo.title ? memo : { ...memo, title };
  });
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
