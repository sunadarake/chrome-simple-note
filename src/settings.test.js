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
      autoSave: { normal: true, secret: false },
      autoSaveDelayMs: { normal: 2000, secret: 500 },
      confirmDelete: { normal: true, secret: false },
      fontSize: 20,
      titleLength: 50,
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
      fakeStorage(
        JSON.stringify({
          autoSaveDelayMs: { normal: 100, secret: 9999 },
          fontSize: 99,
        }),
      ),
    );
    expect(loaded.autoSaveDelayMs).toEqual({ normal: 500, secret: 5000 });
    expect(loaded.fontSize).toBe(24);
  });

  it('既定は自動保存オフ、削除確認オン、タイトルは 50 文字', () => {
    const loaded = loadSettings(fakeStorage());
    expect(loaded.autoSave).toEqual({ normal: false, secret: false });
    expect(loaded.confirmDelete).toEqual({ normal: true, secret: true });
    expect(loaded.titleLength).toBe(50);
  });

  it('旧形式の自動保存設定は通常メモに引き継ぎ、シークレットは既定にする', () => {
    const loaded = loadSettings(
      fakeStorage(JSON.stringify({ autoSave: true, autoSaveDelayMs: 2000 })),
    );
    expect(loaded.autoSave).toEqual({ normal: true, secret: false });
    expect(loaded.autoSaveDelayMs).toEqual({ normal: 2000, secret: 1000 });
    expect(loaded.confirmDelete).toEqual({ normal: true, secret: true });
  });

  it('新しい形式で片方だけ欠けていても、その項目だけ既定値で補う', () => {
    const loaded = loadSettings(
      fakeStorage(
        JSON.stringify({
          autoSave: { normal: true },
          autoSaveDelayMs: { secret: 3000 },
          confirmDelete: { secret: false },
        }),
      ),
    );
    expect(loaded.autoSave).toEqual({ normal: true, secret: false });
    expect(loaded.autoSaveDelayMs).toEqual({ normal: 1000, secret: 3000 });
    expect(loaded.confirmDelete).toEqual({ normal: true, secret: false });
  });

  it('タイトルの文字数は 10〜100 に丸める', () => {
    const load = (titleLength) =>
      loadSettings(fakeStorage(JSON.stringify({ titleLength }))).titleLength;
    expect(load(5)).toBe(10);
    expect(load(500)).toBe(100);
    expect(load('30')).toBe(50);
  });

  it('数値でない値は既定値にする', () => {
    const loaded = loadSettings(
      fakeStorage(JSON.stringify({ autoSaveDelayMs: '1000', fontSize: null })),
    );
    expect(loaded.autoSaveDelayMs).toEqual(DEFAULT_SETTINGS.autoSaveDelayMs);
    expect(loaded.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
  });

  it('真偽値でない自動保存・削除確認は既定値にする', () => {
    const loaded = loadSettings(
      fakeStorage(
        JSON.stringify({
          autoSave: { normal: 'yes', secret: true },
          confirmDelete: 'no',
        }),
      ),
    );
    expect(loaded.autoSave).toEqual({ normal: false, secret: true });
    expect(loaded.confirmDelete).toEqual({ normal: true, secret: true });
  });
});
