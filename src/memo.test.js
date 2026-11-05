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

const start = ({
  memos,
  confirm = () => true,
  copy = () => {},
  download = () => {},
} = {}) => {
  const storage = fakeStorage(memos);
  const session = fakeStorage();
  initMemoApp({
    root: document,
    storage,
    sessionStorage: session,
    confirm,
    copy,
    download,
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
  it('メモがなければ新規メモを作る（何も書くまでは保存しない）', () => {
    const storage = start();
    expect(items()).toHaveLength(1);
    expect(items()[0].textContent).toBe('無題のメモ');
    expect(storage.data.memos).toBeUndefined();
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
    expect(q('.log-message').textContent).toBe('');
  });

  it('空白のみの内容は自動保存しない', () => {
    const storage = start({ memos: [memo(1, 'old')] });
    typeContent('   ');
    vi.advanceTimersByTime(1000);
    expect(stored(storage)[0].content).toBe('old');
  });

  it('空白のみの内容で保存ボタンを押しても保存しない', () => {
    const storage = start({ memos: [memo(1, 'old')] });
    q('.content-input').value = ' \n\t';
    q('.save-btn').click();
    expect(stored(storage)[0].content).toBe('old');
    expect(q('.log-message').textContent).toBe(
      '内容が空のため保存しませんでした',
    );
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
    expect(stored(storage)).toEqual([]);
    expect(items()).toHaveLength(1);
    expect(q('.content-input').value).toBe('');
  });
});

describe('一覧と検索', () => {
  it('新しいメモは先頭に追加される', () => {
    start({ memos: [memo(1, 'a')] });
    q('.new-memo-btn').click();
    expect(items()).toHaveLength(2);
    expect(items()[0].classList.contains('active')).toBe(true);
  });

  it('何も書かない新しいメモは保存先に書かない', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    q('.new-memo-btn').click();
    expect(stored(storage)).toHaveLength(1);
    typeContent('  \n');
    vi.advanceTimersByTime(1000);
    expect(stored(storage)).toHaveLength(1);
  });

  it('空の新しいメモがあっても、削除で一緒に書かない', () => {
    const storage = start({ memos: [memo(2, 'b'), memo(1, 'a')] });
    q('.new-memo-btn').click();
    items()[1].click();
    q('.delete-btn').click();
    expect(stored(storage).map((m) => m.id)).toEqual([1]);
  });

  it('新しいメモに書くと保存され、再起動しても残る', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    q('.new-memo-btn').click();
    typeContent('hello');
    vi.advanceTimersByTime(1000);
    expect(stored(storage)).toHaveLength(2);
    document.body.innerHTML = body;
    initMemoApp({
      root: document,
      storage,
      sessionStorage: storage.session,
      confirm: () => true,
      copy: () => {},
      download: () => {},
    });
    expect(items().map((i) => i.textContent)).toEqual(['hello', 'a']);
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
  const sessionStored = (storage) =>
    JSON.parse(storage.session.data.memos ?? 'null');
  const createSecret = () => q('.secret-memo-btn').click();

  it('ボタンで作ると sessionStorage にだけ保存され、一覧に鍵付きで出る', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    createSecret();
    expect(sessionStored(storage)).toBeNull();
    expect(items()[0].textContent).toBe('🔒 無題のメモ');
    expect(items()[0].classList.contains('active')).toBe(true);
    expect(items()[1].textContent).toBe('a');
  });

  it('何も書かないシークレットメモは sessionStorage にも書かない', () => {
    const storage = start({ memos: [memo(1, 'a')] });
    createSecret();
    q('.save-btn').click();
    expect(sessionStored(storage)).toBeNull();
    expect(stored(storage).every((m) => !m.secret)).toBe(true);
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

describe('マークダウンのハイライト', () => {
  const layer = () => q('.editor-highlight');

  it('メモを開くと本文がハイライトされて表示層に入る', () => {
    start({ memos: [memo(1, '# 見出し')] });
    expect(layer().innerHTML).toBe('<span class="md-heading"># 見出し</span>');
  });

  it('入力すると表示層が更新される', () => {
    start({ memos: [memo(1, 'a')] });
    typeContent('**太字**');
    expect(layer().innerHTML).toBe('<span class="md-bold">**太字**</span>');
  });

  it('メモを切り替えると表示層も切り替わる', () => {
    start({ memos: [memo(2, '# a'), memo(1, '> b')] });
    items()[1].click();
    expect(layer().innerHTML).toBe('<span class="md-quote">&gt; b</span>');
  });
});

describe('ログの色分け', () => {
  it('保存・コピー・削除でそれぞれ種類が付く', () => {
    start({ memos: [memo(1, 'a')] });
    q('.save-btn').click();
    expect(q('.log-message').dataset.kind).toBe('save');
    q('.copy-btn').click();
    expect(q('.log-message').dataset.kind).toBe('copy');
    q('.delete-btn').click();
    expect(q('.log-message').dataset.kind).toBe('delete');
  });

  it('エクスポートは色分けしない', () => {
    start({ memos: [memo(1, 'a')] });
    q('.export-btn').click();
    expect(q('.log-message').dataset.kind).toBe('');
  });
});

describe('ツールチップ', () => {
  it('メモ一覧の項目に本文の1行目だけを出す', () => {
    start({ memos: [memo(1, `${'a'.repeat(150)}\n2行目`)] });
    expect(items()[0].title).toBe('a'.repeat(150));
  });
});

describe('設定パネル', () => {
  const panelHidden = () => q('.settings-panel').hidden;
  const change = (selector, value) => {
    const input = q(selector);
    if (input.type === 'checkbox') input.checked = value;
    else input.value = value;
    input.dispatchEvent(new Event('change'));
  };
  const settingsOf = (storage) => JSON.parse(storage.data.settings);

  it('歯車で開閉し、開いている間はタイトル行とエディタを隠す', () => {
    start();
    expect(panelHidden()).toBe(true);
    q('.settings-btn').click();
    expect(panelHidden()).toBe(false);
    expect(q('.settings-btn').getAttribute('aria-expanded')).toBe('true');
    expect(q('.main-header').hidden).toBe(true);
    expect(q('.editor').hidden).toBe(true);
    q('.settings-btn').click();
    expect(panelHidden()).toBe(true);
    expect(q('.main-header').hidden).toBe(false);
    expect(q('.editor').hidden).toBe(false);
  });

  it('「閉じる」ボタンで閉じる', () => {
    start();
    q('.settings-btn').click();
    q('.settings-close-btn').click();
    expect(panelHidden()).toBe(true);
    expect(q('.editor').hidden).toBe(false);
  });

  it('保存値がなければ既定値を表示する', () => {
    start();
    expect(q('.auto-save-input').checked).toBe(true);
    expect(q('.auto-save-delay-input').value).toBe('1000');
    expect(q('.font-size-input').value).toBe('16');
    expect(q('.theme-input').value).toBe('light');
    expect(q('.container').dataset.theme).toBe('light');
  });

  it('変更した設定を保存し、再起動しても保たれる', () => {
    const storage = start();
    change('.auto-save-delay-input', '3000');
    change('.font-size-input', '20');
    change('.theme-input', 'dark');
    expect(settingsOf(storage)).toEqual({
      autoSave: true,
      autoSaveDelayMs: 3000,
      fontSize: 20,
      theme: 'dark',
    });
    document.body.innerHTML = body;
    initMemoApp({
      root: document,
      storage,
      sessionStorage: storage.session,
      confirm: () => true,
      copy: () => {},
      download: () => {},
    });
    expect(q('.auto-save-delay-input').value).toBe('3000');
    expect(q('.font-size-input').value).toBe('20');
    expect(q('.container').dataset.theme).toBe('dark');
  });

  describe('自動保存', () => {
    it('オフにすると入力しても保存しないが、保存ボタンでは保存する', () => {
      const storage = start({ memos: [memo(1, 'old')] });
      change('.auto-save-input', false);
      expect(q('.auto-save-delay-input').disabled).toBe(true);
      typeContent('typed');
      vi.advanceTimersByTime(10000);
      expect(stored(storage)[0].content).toBe('old');
      q('.save-btn').click();
      expect(stored(storage)[0].content).toBe('typed');
    });

    it('入力後にオフにすると、待っていた自動保存も止まる', () => {
      const storage = start({ memos: [memo(1, 'old')] });
      typeContent('typed');
      change('.auto-save-input', false);
      vi.advanceTimersByTime(10000);
      expect(stored(storage)[0].content).toBe('old');
    });

    it('オンに戻すと自動保存が再開する', () => {
      const storage = start({ memos: [memo(1, 'old')] });
      change('.auto-save-input', false);
      change('.auto-save-input', true);
      expect(q('.auto-save-delay-input').disabled).toBe(false);
      typeContent('typed');
      vi.advanceTimersByTime(1000);
      expect(stored(storage)[0].content).toBe('typed');
    });

    it('保存までの時間を変えられる', () => {
      const storage = start({ memos: [memo(1, 'old')] });
      change('.auto-save-delay-input', '3000');
      typeContent('typed');
      vi.advanceTimersByTime(2999);
      expect(stored(storage)[0].content).toBe('old');
      vi.advanceTimersByTime(1);
      expect(stored(storage)[0].content).toBe('typed');
    });
  });

  it('文字サイズを変えると変数に入り、表示層も作り直す', () => {
    start({ memos: [memo(1, '# a')] });
    change('.font-size-input', '24');
    expect(q('.container').style.getPropertyValue('--editor-font-size')).toBe(
      '24px',
    );
    expect(q('.editor-highlight').innerHTML).toBe(
      '<span class="md-heading"># a</span>',
    );
  });

  it('壊れた保存値は既定値で動く', () => {
    const storage = fakeStorage([memo(1, 'a')]);
    storage.data.settings = '{broken';
    initMemoApp({
      root: document,
      storage,
      sessionStorage: fakeStorage(),
      confirm: () => true,
      copy: () => {},
      download: () => {},
    });
    expect(q('.font-size-input').value).toBe('16');
  });

  describe('全メモ削除', () => {
    it('確認でキャンセルしたら削除しない', () => {
      const storage = start({
        memos: [memo(2, 'a'), memo(1, 'b')],
        confirm: () => false,
      });
      q('.delete-all-btn').click();
      expect(stored(storage)).toHaveLength(2);
    });

    it('承諾したら通常メモをすべて消し、シークレットメモは残す', () => {
      const confirm = vi.fn(() => true);
      const storage = start({
        memos: [memo(2, 'a'), memo(1, 'b')],
        confirm,
      });
      q('.secret-memo-btn').click();
      typeContent('secret');
      q('.save-btn').click();
      q('.delete-all-btn').click();
      expect(confirm).toHaveBeenCalledWith(
        '通常メモ2件をすべて削除します（シークレットメモは残ります）。よろしいですか？',
      );
      expect(stored(storage)).toEqual([]);
      expect(JSON.parse(storage.session.data.memos)).toHaveLength(1);
      expect(items().map((i) => i.textContent)).toEqual(['🔒 secret']);
      expect(q('.log-message').dataset.kind).toBe('delete');
    });

    it('すべて消えたら新しい空のメモを作る', () => {
      const storage = start({ memos: [memo(1, 'a')] });
      q('.delete-all-btn').click();
      expect(stored(storage)).toEqual([]);
      expect(items().map((i) => i.textContent)).toEqual(['無題のメモ']);
      expect(q('.content-input').value).toBe('');
    });

    it('通常メモがなければ確認せずメッセージを出す', () => {
      const confirm = vi.fn(() => true);
      start({ confirm });
      q('.delete-all-btn').click();
      expect(confirm).not.toHaveBeenCalled();
      expect(q('.log-message').textContent).toBe('削除するメモがありません');
    });
  });
});

describe('エクスポート', () => {
  it('通常メモを渡された順のままファイルとして書き出す', () => {
    const download = vi.fn();
    start({ memos: [memo(2, 'b'), memo(1, 'a')], download });
    q('.export-btn').click();
    const [filename, text] = download.mock.calls[0];
    expect(filename).toMatch(/^simple-note-\d{14}\.json$/);
    expect(JSON.parse(text).memos.map((m) => m.id)).toEqual([2, 1]);
    expect(q('.log-message').textContent).toBe('2件をエクスポートしました');
  });

  it('シークレットメモは書き出さない', () => {
    const download = vi.fn();
    start({ memos: [memo(1, 'a')], download });
    q('.secret-memo-btn').click();
    q('.export-btn').click();
    expect(JSON.parse(download.mock.calls[0][1]).memos).toHaveLength(1);
  });

  it('通常メモがなければ書き出さずにメッセージを出す', () => {
    const download = vi.fn();
    start({ memos: [memo(1, 'a')], download });
    q('.secret-memo-btn').click();
    items()[1].click();
    q('.delete-btn').click();
    q('.export-btn').click();
    expect(download).not.toHaveBeenCalled();
    expect(q('.log-message').textContent).toBe(
      'エクスポートするメモがありません',
    );
  });
});

describe('インポート', () => {
  const importFile = async (text) => {
    const input = q('.import-input');
    Object.defineProperty(input, 'files', {
      value: [{ text: () => Promise.resolve(text) }],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await vi.advanceTimersByTimeAsync(0);
  };
  const file = (memos) => JSON.stringify({ version: 1, memos });

  it('メモを追加して保存し、id の降順に並べる', async () => {
    const storage = start({ memos: [memo(2, 'b')] });
    await importFile(file([memo(3, 'c'), memo(1, 'a')]));
    expect(stored(storage).map((m) => m.id)).toEqual([3, 2, 1]);
    expect(items().map((i) => i.textContent)).toEqual(['c', 'b', 'a']);
    expect(q('.log-message').textContent).toBe(
      '2件をインポートしました（0件は同じIDのためスキップ）',
    );
  });

  it('同じ id はスキップし、今ある内容は変えない', async () => {
    const storage = start({ memos: [memo(1, 'mine')] });
    await importFile(file([memo(1, 'other')]));
    expect(stored(storage)[0].content).toBe('mine');
    expect(q('.log-message').textContent).toBe(
      '0件をインポートしました（1件は同じIDのためスキップ）',
    );
  });

  it('選択中のメモは変わらない', async () => {
    start({ memos: [memo(2, 'b')] });
    q('.content-input').value = 'editing';
    await importFile(file([memo(3, 'c')]));
    expect(q('.content-input').value).toBe('editing');
    expect(
      items().find((i) => i.classList.contains('active')).textContent,
    ).toBe('b');
  });

  it('不正なファイルではメッセージを出し、メモは変えない', async () => {
    const storage = start({ memos: [memo(1, 'a')] });
    await importFile('not json');
    expect(stored(storage)).toHaveLength(1);
    expect(q('.log-message').textContent).toBe(
      'JSON として読み込めませんでした',
    );
  });

  it('終わると選択を空に戻し、同じファイルをもう一度選べる', async () => {
    start({ memos: [memo(1, 'a')] });
    await importFile(file([]));
    expect(q('.import-input').value).toBe('');
  });

  it('「インポート」ボタンでファイル選択を開く', () => {
    start();
    let opened = false;
    q('.import-input').click = () => {
      opened = true;
    };
    q('.import-btn').click();
    expect(opened).toBe(true);
  });
});
