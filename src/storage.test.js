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

const memo = (id, secret) => ({
  id,
  title: `t${id}`,
  content: `c${id}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  secret,
});

describe('storage', () => {
  it('データがなければ空配列を返す', () => {
    expect(loadMemos(fakeStorage(), fakeStorage())).toEqual([]);
  });

  it('通常メモは local、シークレットメモは session にだけ書く', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    saveMemos(local, session, [memo(2, true), memo(1, false)]);
    expect(JSON.parse(local.data.memos)).toEqual([memo(1, false)]);
    expect(JSON.parse(session.data.memos)).toEqual([memo(2, true)]);
  });

  it('保存したメモを新しい順で読み込める', () => {
    const local = fakeStorage();
    const session = fakeStorage();
    const memos = [memo(3, false), memo(2, true), memo(1, false)];
    saveMemos(local, session, memos);
    expect(loadMemos(local, session)).toEqual(memos);
  });

  it('secret を持たない既存の memos キーのJSONを通常メモとして読める', () => {
    const old = { id: 1, title: 't', content: 'c', createdAt: 'x' };
    const local = fakeStorage({ memos: JSON.stringify([old]) });
    expect(loadMemos(local, fakeStorage())).toEqual([old]);
  });
});
