import { afterEach, describe, expect, it, vi } from 'vitest';

const MEMO_URL = 'chrome-extension://test-id/src/memo.html';

const load = async (tabs = []) => {
  let onClicked;
  let openTabs = tabs;
  const chrome = {
    action: {
      onClicked: {
        addListener: (listener) => {
          onClicked = listener;
        },
      },
    },
    runtime: {
      getURL: (path) => `chrome-extension://test-id/${path}`,
    },
    tabs: {
      query: vi.fn(async ({ url }) =>
        openTabs.filter((tab) => tab.url === url || tab.pendingUrl === url),
      ),
      create: vi.fn(async ({ url }) => {
        openTabs = [{ id: 2, windowId: 1, url }];
        return openTabs[0];
      }),
      update: vi.fn(async () => ({})),
    },
    windows: {
      update: vi.fn(async () => ({})),
    },
  };
  vi.stubGlobal('chrome', chrome);
  vi.resetModules();
  await import('./background.js');
  return { chrome, click: () => onClicked() };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('メモ画面を開く', () => {
  it('メモ画面のタブがなければ新しいタブで開く', async () => {
    const { chrome, click } = await load();
    await click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: MEMO_URL });
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('メモ画面のタブがあればそのタブに切り替える', async () => {
    const { chrome, click } = await load([
      { id: 1, windowId: 5, url: MEMO_URL, active: false },
    ]);
    await click();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    expect(chrome.windows.update).toHaveBeenCalledWith(5, { focused: true });
  });

  it('読み込み中のメモ画面のタブにも切り替える', async () => {
    const { chrome, click } = await load([
      { id: 3, windowId: 2, pendingUrl: MEMO_URL },
    ]);
    await click();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.tabs.update).toHaveBeenCalledWith(3, { active: true });
    expect(chrome.windows.update).toHaveBeenCalledWith(2, { focused: true });
  });

  it('関係ないタブは無視する', async () => {
    const { chrome, click } = await load([
      { id: 4, windowId: 1, url: 'https://example.com/' },
    ]);
    await click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: MEMO_URL });
  });

  it('連続でクリックしてもタブを1つだけ開く', async () => {
    const { chrome, click } = await load();
    await Promise.all([click(), click()]);
    expect(chrome.tabs.create).toHaveBeenCalledTimes(1);
  });
});
