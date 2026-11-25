/**
 * @typedef {object} Memo
 * @property {number} id
 * @property {string} title
 * @property {string} content
 * @property {string} [customTitle] 手動で付けたタイトルの全文。あれば本文の先頭行より優先する
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
 * 手動タイトル（前後の空白を除く）があればそれを、なければ本文の先頭行を、指定の文字数まで
 * @param {string} content
 * @param {string | undefined} customTitle
 * @param {number} length
 * @returns {string}
 */
export function titleFor(content, customTitle, length) {
  return customTitle?.trim().substring(0, length) || titleOf(content, length);
}

/**
 * 本文か手動タイトルのどちらかに中身があれば、保存する意味がある
 * @param {string} content
 * @param {string} [customTitle]
 * @returns {boolean}
 */
export function hasSavableContent(content, customTitle) {
  return content.trim() !== '' || Boolean(customTitle?.trim());
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
 * タイトルは更新後の本文と手動タイトルから作る。手動タイトルが空なら自動に戻す
 * @param {Memo[]} memos
 * @param {number} id
 * @param {string} content
 * @param {number} titleLength
 * @param {string} [customTitle] 省略すると今の手動タイトルのまま
 * @returns {Memo[]}
 */
export function updateContent(memos, id, content, titleLength, customTitle) {
  return memos.map((memo) => {
    if (memo.id !== id) return memo;
    const custom = (customTitle ?? memo.customTitle)?.trim() || undefined;
    return {
      ...memo,
      content,
      customTitle: custom,
      title: titleFor(content, custom, titleLength),
    };
  });
}

/**
 * 全メモのタイトルを本文と手動タイトルから作り直す。変わらないメモは同じオブジェクトのまま返す
 * @param {Memo[]} memos
 * @param {number} titleLength
 * @returns {Memo[]}
 */
export function retitle(memos, titleLength) {
  return memos.map((memo) => {
    const title = titleFor(memo.content, memo.customTitle, titleLength);
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
 * 全メモ検索の結果に出す、一致箇所の前後を切り出したスニペット
 * @param {string} content
 * @param {string} term
 * @param {number} [radius] 一致箇所の前後に残す文字数
 * @returns {{ before: string, match: string, after: string } | null}
 */
export function snippetFor(content, term, radius = 30) {
  if (term === '') return null;
  const index = content.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return null;
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + term.length + radius);
  // 改行をそのまま出すと行が崩れるので、空白1つにまとめる
  const collapse = (/** @type {string} */ text) => text.replace(/\s+/g, ' ');
  return {
    before: (start > 0 ? '… ' : '') + collapse(content.slice(start, index)),
    match: collapse(content.slice(index, index + term.length)),
    after:
      collapse(content.slice(index + term.length, end)) +
      (end < content.length ? ' …' : ''),
  };
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
