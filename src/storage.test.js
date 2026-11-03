import { describe, expect, it } from 'vitest';
import { loadMemos, saveMemos } from './storage.js';

const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

const memos = [
  { id: 1, title: 't', content: 'c', createdAt: '2026-01-01T00:00:00.000Z' },
];

describe('storage', () => {
  it('データがなければ空配列を返す', () => {
    expect(loadMemos(fakeStorage())).toEqual([]);
  });

  it('保存したメモを読み込める', () => {
    const storage = fakeStorage();
    saveMemos(storage, memos);
    expect(loadMemos(storage)).toEqual(memos);
  });

  it('既存の memos キーのJSONを読み込める', () => {
    const storage = fakeStorage({ memos: JSON.stringify(memos) });
    expect(loadMemos(storage)).toEqual(memos);
  });
});
