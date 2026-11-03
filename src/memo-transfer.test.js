import { describe, expect, it } from 'vitest';
import { exportMemos, mergeMemos, parseImport } from './memo-transfer.js';

const memo = (id, secret = false) => ({
  id,
  title: `t${id}`,
  content: `c${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  secret,
});
const file = (memos, version = 1) => JSON.stringify({ version, memos });

describe('exportMemos', () => {
  const now = new Date('2026-02-03T04:05:06.000Z');

  it('シークレットメモを含めず、渡された順のまま書き出す', () => {
    const data = JSON.parse(
      exportMemos([memo(3), memo(2, true), memo(1)], now),
    );
    expect(data.memos.map((m) => m.id)).toEqual([3, 1]);
  });

  it('形式のバージョンと書き出し日時を入れる', () => {
    const data = JSON.parse(exportMemos([memo(1)], now));
    expect(data.version).toBe(1);
    expect(data.exportedAt).toBe('2026-02-03T04:05:06.000Z');
  });

  it('書き出した内容を取り込むと元のメモに戻る（順番も同じ）', () => {
    const memos = [memo(3), memo(2), memo(1)];
    expect(parseImport(exportMemos(memos, now))).toEqual(memos);
  });
});

describe('parseImport', () => {
  it.each([
    ['JSON ではない', 'abc'],
    ['version が違う', file([], 2)],
    ['memos が配列でない', JSON.stringify({ version: 1, memos: {} })],
    ['配列そのもの', JSON.stringify([memo(1)])],
    ['null', 'null'],
  ])('%s場合はエラーにする', (_, text) => {
    expect(() => parseImport(text)).toThrow();
  });

  it.each([
    ['id がない', { content: 'a' }],
    ['id が数値でない', { id: '1', content: 'a' }],
    ['id が有限でない', { id: 1e999, content: 'a' }],
    ['content が文字列でない', { id: 1, content: 5 }],
    ['メモが null', null],
  ])('メモの %s場合は、何件目かを示してエラーにする', (_, item) => {
    expect(() => parseImport(file([memo(1), item]))).toThrow(
      '2 件目のメモの形式が正しくありません',
    );
  });

  it('title と createdAt がなければ補う', () => {
    const [result] = parseImport(file([{ id: 0, content: 'あ'.repeat(25) }]));
    expect(result.title).toBe('あ'.repeat(20));
    expect(result.createdAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('secret: true のメモも通常メモとして取り込む', () => {
    expect(parseImport(file([memo(1, true)]))[0].secret).toBe(false);
  });

  it('空のメモ一覧は空配列になる', () => {
    expect(parseImport(file([]))).toEqual([]);
  });
});

describe('mergeMemos', () => {
  it('同じ id はスキップし、残りを追加する', () => {
    const result = mergeMemos([memo(2), memo(1)], [memo(3), memo(2)]);
    expect(result.memos.map((m) => m.id)).toEqual([3, 2, 1]);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('今あるメモの内容は上書きしない', () => {
    const current = { ...memo(1), content: '手元の内容' };
    const result = mergeMemos([current], [memo(1)]);
    expect(result.memos).toEqual([current]);
  });

  it('id の降順（新しい順）に並べる', () => {
    const result = mergeMemos([memo(5), memo(1)], [memo(4), memo(2), memo(6)]);
    expect(result.memos.map((m) => m.id)).toEqual([6, 5, 4, 2, 1]);
  });

  it('今あるシークレットメモと同じ id もスキップする', () => {
    const result = mergeMemos([memo(1, true)], [memo(1)]);
    expect(result.memos).toEqual([memo(1, true)]);
    expect(result.skipped).toBe(1);
  });

  it('ファイルの中で id が重なっていても 1 件だけ追加する', () => {
    const result = mergeMemos([], [memo(1), memo(1)]);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
