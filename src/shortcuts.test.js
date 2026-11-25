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
    redo: vi.fn(),
    remove: vi.fn(),
    newMemo: vi.fn(),
    newSecretMemo: vi.fn(),
    focusSearch: vi.fn(),
    openSearch: vi.fn(),
    moveMemo: vi.fn(),
    openSettings: vi.fn(),
    escape: vi.fn(() => false),
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
  it('ヘルプ向けの一覧に13個のキーを持つ', () => {
    expect(SHORTCUTS.map((s) => s.keys)).toEqual([
      'Ctrl+C',
      'Ctrl+S',
      'Ctrl+Z',
      'Ctrl+Shift+Z',
      'Ctrl+O',
      'Ctrl+Shift+O',
      'Ctrl+F',
      'Ctrl+Shift+F',
      'Ctrl+P',
      'Ctrl+J',
      'Ctrl+K',
      'Ctrl+,',
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

  it('Ctrl+Z でアンドゥし、ブラウザの既定動作を止める', () => {
    const { root, undo } = setup();
    const event = press(root, 'z', { ctrlKey: true });
    expect(undo).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Ctrl+Shift+Z でリドゥする', () => {
    const { root, redo, undo } = setup();
    const event = press(root, 'Z', { ctrlKey: true, shiftKey: true });
    expect(redo).toHaveBeenCalledOnce();
    expect(undo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Ctrl+U はアンドゥに使わない', () => {
    const { root, undo } = setup();
    const event = press(root, 'u', { ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('Delete で削除する', () => {
    const { root, remove } = setup();
    const event = press(root, 'Delete');
    expect(remove).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Ctrl+O で新しいメモを作成し、ファイルを開く動作を止める', () => {
    const { root, newMemo, newSecretMemo } = setup();
    const event = press(root, 'o', { ctrlKey: true });
    expect(newMemo).toHaveBeenCalledOnce();
    expect(newSecretMemo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Ctrl+Shift+O でシークレットメモを作成する', () => {
    const { root, newMemo, newSecretMemo } = setup();
    const event = press(root, 'O', { ctrlKey: true, shiftKey: true });
    expect(newSecretMemo).toHaveBeenCalledOnce();
    expect(newMemo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Ctrl+F と Ctrl+P で検索欄にフォーカスする', () => {
    const { root, focusSearch } = setup();
    expect(press(root, 'f', { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(press(root, 'p', { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(focusSearch).toHaveBeenCalledTimes(2);
  });

  it('Ctrl+Shift+F で全メモ検索を開く', () => {
    const { root, openSearch, focusSearch } = setup();
    const event = press(root, 'F', { ctrlKey: true, shiftKey: true });
    expect(openSearch).toHaveBeenCalledOnce();
    expect(focusSearch).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('Ctrl+J は次、Ctrl+K は前のメモへ移動する', () => {
    const { root, moveMemo } = setup();
    expect(press(root, 'j', { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(moveMemo).toHaveBeenLastCalledWith(1);
    expect(press(root, 'k', { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(moveMemo).toHaveBeenLastCalledWith(-1);
  });

  it('Ctrl+, で設定を開く', () => {
    const { root, openSettings } = setup();
    const event = press(root, ',', { ctrlKey: true });
    expect(openSettings).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('エディタが表示されていないときは Esc 以外を無視する', () => {
    const deps = setup({ isActive: () => false });
    const { root } = deps;
    for (const [key, init] of [
      ['c', { ctrlKey: true }],
      ['s', { ctrlKey: true }],
      ['z', { ctrlKey: true }],
      ['Z', { ctrlKey: true, shiftKey: true }],
      ['o', { ctrlKey: true }],
      ['O', { ctrlKey: true, shiftKey: true }],
      ['f', { ctrlKey: true }],
      ['F', { ctrlKey: true, shiftKey: true }],
      ['p', { ctrlKey: true }],
      ['j', { ctrlKey: true }],
      ['k', { ctrlKey: true }],
      [',', { ctrlKey: true }],
      ['Delete', {}],
    ]) {
      expect(press(root, key, init).defaultPrevented).toBe(false);
    }
    expect(deps.copy).not.toHaveBeenCalled();
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.undo).not.toHaveBeenCalled();
    expect(deps.redo).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
    expect(deps.newMemo).not.toHaveBeenCalled();
    expect(deps.newSecretMemo).not.toHaveBeenCalled();
    expect(deps.focusSearch).not.toHaveBeenCalled();
    expect(deps.openSearch).not.toHaveBeenCalled();
    expect(deps.moveMemo).not.toHaveBeenCalled();
    expect(deps.openSettings).not.toHaveBeenCalled();
  });

  it('エディタが隠れていても Esc は閉じる処理を呼ぶ', () => {
    const escape = vi.fn(() => true);
    const { root } = setup({ isActive: () => false, escape });
    const event = press(root, 'Escape');
    expect(escape).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('閉じるものがない Esc は何もしない', () => {
    const { root, escape } = setup();
    const event = press(root, 'Escape');
    expect(escape).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(false);
  });

  it('キーリピートと IME 変換中は無視する', () => {
    const { root, save, remove, undo } = setup();
    press(root, 's', { ctrlKey: true, repeat: true });
    press(root, 'z', { ctrlKey: true, isComposing: true });
    press(root, 'Delete', { isComposing: true });
    expect(save).not.toHaveBeenCalled();
    expect(undo).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('Alt・Meta 付きのキーはショートカットにしない', () => {
    const { root, save, moveMemo } = setup();
    press(root, 's', { ctrlKey: true, altKey: true });
    press(root, 's', { metaKey: true });
    press(root, 'j', { ctrlKey: true, altKey: true });
    expect(save).not.toHaveBeenCalled();
    expect(moveMemo).not.toHaveBeenCalled();
  });
});
