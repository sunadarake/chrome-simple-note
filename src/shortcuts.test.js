import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SHORTCUTS, initShortcuts } from './shortcuts.js';

const setup = (overrides = {}) => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const deps = {
    isActive: () => true,
    hasSelection: () => false,
    copy: vi.fn(),
    save: vi.fn(),
    undo: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
  initShortcuts({ root, ...deps });
  return { root, ...deps };
};

const press = (root, key, init = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  root.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('shortcuts', () => {
  it('ヘルプ向けの一覧に4つのキーを持つ', () => {
    expect(SHORTCUTS.map((s) => s.keys)).toEqual([
      'Ctrl+C',
      'Ctrl+S',
      'Ctrl+U',
      'Delete',
    ]);
  });

  it('選択がなければ Ctrl+C で本文をコピーする', () => {
    const { root, copy } = setup();
    const event = press(root, 'c', { ctrlKey: true });
    expect(copy).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('選択があるときの Ctrl+C はブラウザのコピーに任せる', () => {
    const { root, copy } = setup({ hasSelection: () => true });
    const event = press(root, 'c', { ctrlKey: true });
    expect(copy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('Ctrl+S で保存し、ブラウザのページ保存を止める', () => {
    const { root, save } = setup();
    const event = press(root, 's', { ctrlKey: true });
    expect(save).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Ctrl+U でアンドゥし、ブラウザのソース表示を止める', () => {
    const { root, undo } = setup();
    const event = press(root, 'u', { ctrlKey: true });
    expect(undo).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Delete で削除する', () => {
    const { root, remove } = setup();
    const event = press(root, 'Delete');
    expect(remove).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('エディタが表示されていないときは何もしない', () => {
    const { root, copy, save, undo, remove } = setup({
      isActive: () => false,
    });
    for (const [key, init] of [
      ['c', { ctrlKey: true }],
      ['s', { ctrlKey: true }],
      ['u', { ctrlKey: true }],
      ['Delete', {}],
    ]) {
      expect(press(root, key, init).defaultPrevented).toBe(false);
    }
    expect(copy).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(undo).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('キーリピートと IME 変換中は無視する', () => {
    const { root, save, remove } = setup();
    press(root, 's', { ctrlKey: true, repeat: true });
    press(root, 'Delete', { isComposing: true });
    expect(save).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('Alt・Meta 付きのキーはショートカットにしない', () => {
    const { root, save } = setup();
    press(root, 's', { ctrlKey: true, altKey: true });
    press(root, 's', { metaKey: true });
    expect(save).not.toHaveBeenCalled();
  });
});
