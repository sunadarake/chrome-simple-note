const KEY = 'settings';

export const AUTO_SAVE_DELAY_RANGE = { min: 500, max: 5000 };
export const FONT_SIZE_RANGE = { min: 12, max: 24 };

/**
 * @typedef {object} Settings
 * @property {boolean} autoSave
 * @property {number} autoSaveDelayMs
 * @property {number} fontSize
 * @property {'light' | 'dark'} theme
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = {
  autoSave: true,
  autoSaveDelayMs: 1000,
  fontSize: 16,
  theme: 'light',
};

/**
 * 数値でない・範囲外の値は、既定値または範囲内に丸める
 * @param {unknown} value
 * @param {{min: number, max: number}} range
 * @param {number} fallback
 */
function clampNumber(value, range, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, value));
}

/**
 * 保存値が壊れていても動くよう、項目ごとに検証して既定値で補う
 * @param {Pick<Storage, 'getItem'>} storage
 * @returns {Settings}
 */
export function loadSettings(storage) {
  /** @type {Partial<Record<keyof Settings, unknown>>} */
  let saved = {};
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? '{}');
    if (parsed && typeof parsed === 'object') saved = parsed;
  } catch {
    // 壊れた JSON は、すべて既定値で動く
  }
  return {
    autoSave:
      typeof saved.autoSave === 'boolean'
        ? saved.autoSave
        : DEFAULT_SETTINGS.autoSave,
    autoSaveDelayMs: clampNumber(
      saved.autoSaveDelayMs,
      AUTO_SAVE_DELAY_RANGE,
      DEFAULT_SETTINGS.autoSaveDelayMs,
    ),
    fontSize: clampNumber(
      saved.fontSize,
      FONT_SIZE_RANGE,
      DEFAULT_SETTINGS.fontSize,
    ),
    theme: saved.theme === 'dark' ? 'dark' : 'light',
  };
}

/**
 * @param {Pick<Storage, 'setItem'>} storage
 * @param {Settings} settings
 */
export function saveSettings(storage, settings) {
  storage.setItem(KEY, JSON.stringify(settings));
}
