import { describe, expect, it } from 'vitest';
import {
  createMemo,
  filterMemos,
  removeMemo,
  titleOf,
  updateContent,
} from './memo-store.js';

const memo = (id, content = '', title = '') => ({
  id,
  title,
  content,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('titleOf', () => {
  it('本文の先頭20文字を返す', () => {
    expect(titleOf('あ'.repeat(25))).toBe('あ'.repeat(20));
  });

  it('20文字未満ならそのまま返す', () => {
    expect(titleOf('短い')).toBe('短い');
  });
});

describe('createMemo', () => {
  it('時刻からidと作成日時を作り、本文とタイトルは空にする', () => {
    const now = new Date('2026-01-02T03:04:05.000Z');
    expect(createMemo(now)).toEqual({
      id: now.getTime(),
      title: '',
      content: '',
      createdAt: '2026-01-02T03:04:05.000Z',
      secret: false,
    });
  });

  it('secret を指定するとシークレットメモになる', () => {
    expect(createMemo(new Date(), true).secret).toBe(true);
  });
});

describe('updateContent', () => {
  it('対象メモの本文と、更新後の本文から作ったタイトルを設定する', () => {
    const memos = [memo(1), memo(2)];
    const result = updateContent(memos, 2, 'x'.repeat(30));
    expect(result[1].content).toBe('x'.repeat(30));
    expect(result[1].title).toBe('x'.repeat(20));
    expect(result[0]).toBe(memos[0]);
  });

  it('元の配列を変更しない', () => {
    const memos = [memo(1)];
    updateContent(memos, 1, 'changed');
    expect(memos[0].content).toBe('');
  });
});

describe('removeMemo', () => {
  it('指定idのメモを取り除く', () => {
    const memos = [memo(1), memo(2)];
    expect(removeMemo(memos, 1)).toEqual([memo(2)]);
    expect(memos).toHaveLength(2);
  });
});

describe('filterMemos', () => {
  const memos = [
    memo(1, 'Hello world', 'Hello world'),
    memo(2, 'foo bar', 'foo bar'),
    memo(3, 'タイトル', '別題'),
  ];

  it('タイトルに一致するメモを返す', () => {
    expect(filterMemos(memos, '別題')).toEqual([memos[2]]);
  });

  it('本文に一致するメモを返す', () => {
    expect(filterMemos(memos, 'タイトル')).toEqual([memos[2]]);
  });

  it('大文字小文字を区別しない', () => {
    expect(filterMemos(memos, 'HELLO')).toEqual([memos[0]]);
  });

  it('空の検索語なら全件返す', () => {
    expect(filterMemos(memos, '')).toEqual(memos);
  });

  it('該当がなければ空配列を返す', () => {
    expect(filterMemos(memos, 'zzz')).toEqual([]);
  });
});
