import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initMemoApp } from './memo.js';

const html = readFileSync('src/memo.html', 'utf-8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];

const fakeStorage = (memos) => {
  const data = memos ? { memos: JSON.stringify(memos) } : {};
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

const stored = (storage) => JSON.parse(storage.data.memos);
const q = (selector) => document.querySelector(selector);
const items = () => [...document.querySelectorAll('.memo-item')];
const typeContent = (value) => {
  q('.content-input').value = value;
  q('.content-input').dispatchEvent(new Event('input'));
};
const memo = (id, content) => ({
  id,
  title: content.substring(0, 20),
  content,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const start = ({ memos, confirm = () => true, copy = () => {} } = {}) => {
  const storage = fakeStorage(memos);
  const session = fakeStorage();
  initMemoApp({
    root: document,
    storage,
    sessionStorage: session,
    confirm,
    copy,
  });
  return { ...storage, session };
};

beforeEach(() => {
  document.body.innerHTML = body;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('初期表示', () => {
  it('メモがなければ新規メモを作って保存する', () => {
    const storage = start();
    expect(items()).toHaveLength(1);
    expect(items()[0].textContent).toBe('無題のメモ');
    expect(stored(storage)).toHaveLength(1);
  });

  it('メモがあれば先頭のメモを表示する', () => {
    start({ memos: [memo(2, 'first'), memo(1, 'second')] });
    expect(q('.content-input').value).toBe('first');
    expect(items()[0].classList.contains('active')).toBe(true);
  });
});

describe('保存', () => {
  it('保存ボタンで本文とタイトルを保存する', () => {
    const storage = start({ memos: [memo(1, 'old')] });
    q('.content-input').value = 'new content';
    q('.save-btn').click();
    expect(stored(storage)[0]).toMatchObject({
      content: 'new content',
      title: 'new content',
    });
    expect(q('.log-message').textContent).toBe('メモを保存しました');
  });

  it('入力が1秒止まると自動保存する', () => {
    const storage = start({ memos: [memo(1, 'old')] });
    typeContent('typed');
    vi.advanceTimersByTime(999);
    expect(stored(storage)[0].content).toBe('old');
    vi.advanceTimersByTime(1);
    expect(stored(storage)[0].content).toBe('typed');
    expect(q('.log-message').textContent).toBe('メモを自動保存しました');
  });

  it('空白のみの内容は自動保存しない', () => {
    const storage = start({ memos: [memo(1, 'old')] });
    typeContent('   ');
    vi.advanceTimersByTime(1000);
    expect(stored(storage)[0].content).toBe('old');
  });

  it('入力中にタイトル表示を更新する', () => {
    start({ memos: [memo(1, 'old')] });
    typeContent('あ'.repeat(25));
    expect(q('.title-display').textContent).toBe('あ'.repeat(20));
    typeContent('');
    expect(q('.title-display').textContent).toBe('新しいメモ');
  });
});

describe('削除', () => {
  it('確認でキャンセルしたら削除しない', () => {
    const storage = start({
      memos: [memo(2, 'a'), memo(1, 'b')],
      confirm: () => false,
    });
    q('.delete-btn').click();
    expect(stored(storage)).toHaveLength(2);
  });

  it('確認で承諾したら削除して先頭のメモを表示する', () => {
    const confirm = vi.fn(() => true);
    const storage = start({ memos: [memo(2, 'a'), memo(1, 'b')], confirm });
    q('.delete-btn').click();
    expect(confirm).toHaveBeenCalledWith('"a" を削除します。よろしいですか？');
    expect(stored(storage).map((m) => m.id)).toEqual([1]);
    expect(q('.content-input').value).toBe('b');
  });

  it('最後の1件を削除したら新規メモを作る', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    q('.delete-btn').click();
    expect(stored(storage)).toHaveLength(1);
    expect(stored(storage)[0].content).toBe('');
  });
});

describe('一覧と検索', () => {
  it('新しいメモは先頭に追加される', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    q('.new-memo-btn').click();
    expect(stored(storage)).toHaveLength(2);
    expect(items()[0].classList.contains('active')).toBe(true);
  });

  it('一覧のメモをクリックするとそのメモを表示する', () => {
    start({ memos: [memo(2, 'a'), memo(1, 'b')] });
    items()[1].click();
    expect(q('.content-input').value).toBe('b');
  });

  it('検索語に合うメモだけ表示する', () => {
    start({ memos: [memo(1, 'apple'), memo(2, 'banana')] });
    q('.search-input').value = 'ban';
    q('.search-input').dispatchEvent(new Event('input'));
    expect(items().map((i) => i.textContent)).toEqual(['banana']);
  });

  it('検索中でも選択したメモを正しく表示する', () => {
    start({ memos: [memo(1, 'apple'), memo(2, 'banana')] });
    q('.search-input').value = 'ban';
    q('.search-input').dispatchEvent(new Event('input'));
    items()[0].click();
    expect(q('.content-input').value).toBe('banana');
  });
});

describe('コピー', () => {
  it('本文を選択してコピーする', () => {
    const copy = vi.fn();
    start({ memos: [memo(1, 'a')], copy });
    q('.copy-btn').click();
    expect(copy).toHaveBeenCalledOnce();
    expect(q('.log-message').textContent).toBe('コンテンツをコピーしました');
  });
});

describe('シークレットメモ', () => {
  const sessionStored = (storage) => JSON.parse(storage.session.data.memos);
  const createSecret = () => q('.secret-memo-btn').click();

  it('ボタンで作ると sessionStorage にだけ保存され、一覧に鍵付きで出る', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    createSecret();
    expect(sessionStored(storage)).toHaveLength(1);
    expect(sessionStored(storage)[0].secret).toBe(true);
    expect(stored(storage).every((m) => !m.secret)).toBe(true);
    expect(items()[0].textContent).toBe('🔒 無題のメモ');
    expect(items()[0].classList.contains('active')).toBe(true);
    expect(items()[1].textContent).toBe('a');
  });

  it('保存と自動保存は sessionStorage にだけ書く', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    createSecret();
    typeContent('secret text');
    vi.advanceTimersByTime(1000);
    expect(sessionStored(storage)[0].content).toBe('secret text');
    q('.content-input').value = 'saved text';
    q('.save-btn').click();
    expect(sessionStored(storage)[0].content).toBe('saved text');
    expect(JSON.stringify(stored(storage))).not.toContain('text');
    expect(items()[0].textContent).toBe('🔒 saved text');
  });

  it('検索の対象に含まれる', () => {
    start({ memos: [memo(1, 'apple')] });
    createSecret();
    typeContent('banana');
    q('.save-btn').click();
    q('.search-input').value = 'ban';
    q('.search-input').dispatchEvent(new Event('input'));
    expect(items().map((i) => i.textContent)).toEqual(['🔒 banana']);
  });

  it('削除すると sessionStorage から消える', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    createSecret();
    q('.delete-btn').click();
    expect(sessionStored(storage)).toEqual([]);
    expect(stored(storage)).toHaveLength(1);
  });

  describe('見た目', () => {
    const isSecretView = () => q('.main-content').classList.contains('secret');

    it('開くとメイン画面が切り替わりラベルが出る', () => {
      start({ memos: [memo(1, 'a')] });
      expect(isSecretView()).toBe(false);
      expect(q('.secret-label').hidden).toBe(true);
      createSecret();
      expect(isSecretView()).toBe(true);
      expect(q('.secret-label').hidden).toBe(false);
    });

    it('一覧のシークレットメモの項目に secret クラスが付く', () => {
      start({ memos: [memo(1, 'a')] });
      createSecret();
      expect(items()[0].classList.contains('secret')).toBe(true);
      expect(items()[1].classList.contains('secret')).toBe(false);
    });

    it('通常メモに切り替えると元に戻る', () => {
      start({ memos: [memo(1, 'a')] });
      createSecret();
      items()[1].click();
      expect(isSecretView()).toBe(false);
      expect(q('.secret-label').hidden).toBe(true);
    });

    it('シークレットメモを削除して通常メモが開くと元に戻る', () => {
      start({ memos: [memo(1, 'a')] });
      createSecret();
      q('.delete-btn').click();
      expect(isSecretView()).toBe(false);
      expect(q('.secret-label').hidden).toBe(true);
    });
  });
});
