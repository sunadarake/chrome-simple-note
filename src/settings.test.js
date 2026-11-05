import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.js';

const fakeStorage = (value) => {
  const data = value === undefined ? {} : { settings: value };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, v) => {
      data[key] = v;
    },
  };
};

describe('settings', () => {
  it('保存値がなければ既定値を返す', () => {
    expect(loadSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('保存した設定を読み込める', () => {
    const storage = fakeStorage();
    const settings = {
      autoSave: false,
      autoSaveDelayMs: 2000,
      fontSize: 20,
      theme: 'dark',
    };
    saveSettings(storage, settings);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it('壊れた JSON は既定値にする', () => {
    expect(loadSettings(fakeStorage('{broken'))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(fakeStorage('null'))).toEqual(DEFAULT_SETTINGS);
  });

  it('一部の項目だけ無い・不正なときは、その項目だけ既定値にする', () => {
    const loaded = loadSettings(
      fakeStorage(
        JSON.stringify({ autoSave: 'yes', fontSize: 20, theme: 'x' }),
      ),
    );
    expect(loaded).toEqual({ ...DEFAULT_SETTINGS, fontSize: 20 });
  });

  it('範囲外の数値は範囲内に丸める', () => {
    const loaded = loadSettings(
      fakeStorage(JSON.stringify({ autoSaveDelayMs: 100, fontSize: 99 })),
    );
    expect(loaded.autoSaveDelayMs).toBe(500);
    expect(loaded.fontSize).toBe(24);
  });

  it('数値でない値は既定値にする', () => {
    const loaded = loadSettings(
      fakeStorage(JSON.stringify({ autoSaveDelayMs: '1000', fontSize: null })),
    );
    expect(loaded.autoSaveDelayMs).toBe(DEFAULT_SETTINGS.autoSaveDelayMs);
    expect(loaded.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
  });
});
