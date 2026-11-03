import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { initSidebarResize, initSidebarToggle } from './sidebar.js';

const html = readFileSync('src/memo.html', 'utf-8');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];

const fakeStorage = (width) => {
  const data = width === undefined ? {} : { sidebarWidth: width };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

const q = (selector) => document.querySelector(selector);
const mouse = (target, type, clientX = 0) =>
  target.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true }));
const widthOf = () => q('.sidebar').style.width;

const start = (savedWidth) => {
  const storage = fakeStorage(savedWidth);
  initSidebarResize({ root: document, storage });
  return storage;
};

beforeEach(() => {
  document.body.innerHTML = body;
});

describe('初期の幅', () => {
  it('保存がなければ既定の280pxにする', () => {
    start();
    expect(widthOf()).toBe('280px');
  });

  it('保存した幅を反映する', () => {
    start('350');
    expect(widthOf()).toBe('350px');
  });

  it.each([
    ['100', '200px'],
    ['900', '600px'],
    ['abc', '280px'],
  ])('保存値 %s は %s にする', (saved, expected) => {
    start(saved);
    expect(widthOf()).toBe(expected);
  });
});

describe('ドラッグ', () => {
  it('ドラッグ中はマウスの位置に合わせて幅が変わる', () => {
    start();
    mouse(q('.sidebar-resizer'), 'mousedown', 280);
    mouse(document, 'mousemove', 400);
    expect(widthOf()).toBe('400px');
    mouse(document, 'mouseup');
  });

  it('200pxより狭く、600pxより広くならない', () => {
    start();
    mouse(q('.sidebar-resizer'), 'mousedown', 280);
    mouse(document, 'mousemove', 50);
    expect(widthOf()).toBe('200px');
    mouse(document, 'mousemove', 1000);
    expect(widthOf()).toBe('600px');
    mouse(document, 'mouseup');
  });

  it('mouseup で幅を保存する（ドラッグ中は保存しない）', () => {
    const storage = start();
    mouse(q('.sidebar-resizer'), 'mousedown', 280);
    mouse(document, 'mousemove', 400);
    expect(storage.data.sidebarWidth).toBeUndefined();
    mouse(document, 'mouseup');
    expect(storage.data.sidebarWidth).toBe('400');
  });

  it('mouseup のあとはマウスを動かしても変わらない', () => {
    start();
    mouse(q('.sidebar-resizer'), 'mousedown', 280);
    mouse(document, 'mouseup');
    mouse(document, 'mousemove', 500);
    expect(widthOf()).toBe('280px');
  });

  it('mousedown していないときは変わらない', () => {
    start();
    mouse(document, 'mousemove', 500);
    expect(widthOf()).toBe('280px');
  });

  it('ドラッグ中は文字を選択できず、終わると元に戻る', () => {
    start();
    mouse(q('.sidebar-resizer'), 'mousedown', 280);
    expect(document.body.style.userSelect).toBe('none');
    expect(document.body.style.cursor).toBe('col-resize');
    mouse(document, 'mouseup');
    expect(document.body.style.userSelect).toBe('');
    expect(document.body.style.cursor).toBe('');
  });
});

describe('開閉', () => {
  const startToggle = (collapsed) => {
    const storage = fakeStorage();
    if (collapsed !== undefined) storage.data.sidebarCollapsed = collapsed;
    initSidebarToggle({ root: document, storage });
    return storage;
  };
  const isCollapsed = () =>
    q('.container').classList.contains('sidebar-collapsed');
  const expanded = () => q('.sidebar-toggle').getAttribute('aria-expanded');

  it('保存がなければ開いた状態で始まる', () => {
    startToggle();
    expect(isCollapsed()).toBe(false);
    expect(expanded()).toBe('true');
  });

  it('保存が true なら閉じた状態で始まる', () => {
    startToggle('true');
    expect(isCollapsed()).toBe(true);
    expect(expanded()).toBe('false');
  });

  it('ボタンで閉じる・開くが切り替わる', () => {
    startToggle();
    q('.sidebar-toggle').click();
    expect(isCollapsed()).toBe(true);
    expect(expanded()).toBe('false');
    q('.sidebar-toggle').click();
    expect(isCollapsed()).toBe(false);
    expect(expanded()).toBe('true');
  });

  it('切り替えるたびに状態を保存する', () => {
    const storage = startToggle();
    q('.sidebar-toggle').click();
    expect(storage.data.sidebarCollapsed).toBe('true');
    q('.sidebar-toggle').click();
    expect(storage.data.sidebarCollapsed).toBe('false');
  });

  it('閉じても保存した幅は変わらない', () => {
    const storage = start('350');
    initSidebarToggle({ root: document, storage });
    q('.sidebar-toggle').click();
    expect(widthOf()).toBe('350px');
    expect(storage.data.sidebarWidth).toBe('350');
  });
});
