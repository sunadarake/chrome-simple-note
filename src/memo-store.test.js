import { describe, expect, it } from 'vitest';
import {
  createMemo,
  filterMemos,
  removeMemo,
  retitle,
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
  it('本文の先頭から指定の文字数を返す', () => {
    expect(titleOf('あ'.repeat(25), 20)).toBe('あ'.repeat(20));
    expect(titleOf('あ'.repeat(25), 10)).toBe('あ'.repeat(10));
  });

  it('指定の文字数に満たなければそのまま返す', () => {
    expect(titleOf('短い', 30)).toBe('短い');
  });

  it('最初の1行だけにする', () => {
    expect(titleOf('1行目\n2行目', 30)).toBe('1行目');
  });

  it('前後の空白を取り除き、先頭の空行は飛ばす', () => {
    expect(titleOf('  \n\t 題名 \n本文', 30)).toBe('題名');
  });

  it('先頭の # や ## などの見出し記号を取り除く', () => {
    expect(titleOf('# 見出し', 30)).toBe('見出し');
    expect(titleOf('### 見出し3', 30)).toBe('見出し3');
    expect(titleOf('##   余分な空白  ', 30)).toBe('余分な空白');
  });

  it('# の後ろに空白がなければ見出し記号として扱わない', () => {
    expect(titleOf('#tag', 30)).toBe('#tag');
    expect(titleOf('見出しではない # 途中', 30)).toBe('見出しではない # 途中');
  });

  it('見出し記号だけ・空白だけなら空にする', () => {
    expect(titleOf('#', 30)).toBe('');
    expect(titleOf('## ', 30)).toBe('');
    expect(titleOf('  \n ', 30)).toBe('');
  });

  it('見出し記号を除いた後で文字数に切る', () => {
    expect(titleOf(`# ${'あ'.repeat(40)}`, 30)).toBe('あ'.repeat(30));
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
    const result = updateContent(memos, 2, 'x'.repeat(40), 30);
    expect(result[1].content).toBe('x'.repeat(40));
    expect(result[1].title).toBe('x'.repeat(30));
    expect(result[0]).toBe(memos[0]);
  });

  it('元の配列を変更しない', () => {
    const memos = [memo(1)];
    updateContent(memos, 1, 'changed', 30);
    expect(memos[0].content).toBe('');
  });
});

describe('retitle', () => {
  it('全メモのタイトルを本文から作り直す', () => {
    const memos = [memo(1, 'a'.repeat(40), 'a'.repeat(20)), memo(2, 'b', 'x')];
    const result = retitle(memos, 30);
    expect(result.map((m) => m.title)).toEqual(['a'.repeat(30), 'b']);
  });

  it('変わらないメモは同じオブジェクトのまま返す', () => {
    const memos = [memo(1, 'abc', 'abc')];
    expect(retitle(memos, 30)[0]).toBe(memos[0]);
  });

  it('元の配列を変更しない', () => {
    const memos = [memo(1, 'a'.repeat(40), 'a')];
    retitle(memos, 30);
    expect(memos[0].title).toBe('a');
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
