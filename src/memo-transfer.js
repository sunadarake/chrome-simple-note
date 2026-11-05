import { titleOf } from './memo-store.js';

const FORMAT_VERSION = 1;

/**
 * ファイルに書かれているメモ。信頼できないので、使う前に確認する
 * @typedef {object} RawMemo
 * @property {number} [id]
 * @property {string} [title]
 * @property {string} [content]
 * @property {string} [createdAt]
 */

/**
 * シークレットメモは含めず、渡された順のまま JSON にする
 * @param {import('./memo-store.js').Memo[]} memos
 * @param {Date} now
 * @returns {string}
 */
export function exportMemos(memos, now) {
  return JSON.stringify(
    {
      version: FORMAT_VERSION,
      exportedAt: now.toISOString(),
      memos: memos.filter((memo) => !memo.secret),
    },
    null,
    2,
  );
}

/**
 * 取り込むメモは、ファイルに secret があっても通常メモにする
 * @param {string} text
 * @param {number} titleLength
 * @returns {import('./memo-store.js').Memo[]}
 */
export function parseImport(text, titleLength) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON として読み込めませんでした');
  }
  if (data?.version !== FORMAT_VERSION || !Array.isArray(data.memos)) {
    throw new Error('メモのファイルではありません（形式が違います）');
  }
  return data.memos.map(
    (/** @type {RawMemo | null} */ item, /** @type {number} */ index) => {
      if (
        typeof item?.id !== 'number' ||
        !Number.isFinite(item.id) ||
        typeof item.content !== 'string'
      ) {
        throw new Error(`${index + 1} 件目のメモの形式が正しくありません`);
      }
      return {
        id: item.id,
        title:
          typeof item.title === 'string'
            ? item.title
            : titleOf(item.content, titleLength),
        content: item.content,
        createdAt:
          typeof item.createdAt === 'string'
            ? item.createdAt
            : new Date(item.id).toISOString(),
        secret: false,
      };
    },
  );
}

/**
 * 同じ id は取り込まない。一覧の並びは id の降順で決まるため、その順にそろえる
 * @param {import('./memo-store.js').Memo[]} current
 * @param {import('./memo-store.js').Memo[]} imported
 */
export function mergeMemos(current, imported) {
  const knownIds = new Set(current.map((memo) => memo.id));
  const added = [];
  for (const memo of imported) {
    if (knownIds.has(memo.id)) continue;
    knownIds.add(memo.id);
    added.push(memo);
  }
  return {
    memos: [...current, ...added].sort((a, b) => b.id - a.id),
    added: added.length,
    skipped: imported.length - added.length,
  };
}
