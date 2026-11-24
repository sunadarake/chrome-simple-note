const KEY = 'settings';

export const AUTO_SAVE_DELAY_RANGE = { min: 500, max: 5000 };
export const FONT_SIZE_RANGE = { min: 12, max: 24 };
export const TITLE_LENGTH_RANGE = { min: 10, max: 100 };

/**
 * @typedef {{ normal: boolean, secret: boolean }} PerKindBoolean
 * @typedef {{ normal: number, secret: number }} PerKindNumber
 * @typedef {object} Settings
 * @property {PerKindBoolean} autoSave
 * @property {PerKindNumber} autoSaveDelayMs
 * @property {PerKindBoolean} confirmDelete
 * @property {number} fontSize
 * @property {number} titleLength タイトルにする本文の先頭の文字数
 */

/** @type {Settings} */
export const DEFAULT_SETTINGS = {
  autoSave: { normal: false, secret: false },
  autoSaveDelayMs: { normal: 1000, secret: 1000 },
  confirmDelete: { normal: true, secret: true },
  fontSize: 16,
  titleLength: 50,
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
 * メモ種別ごとの真偽値。旧形式の boolean は通常メモに引き継ぐ
 * @param {unknown} value
 * @param {PerKindBoolean} fallback
 * @returns {PerKindBoolean}
 */
function booleansPerKind(value, fallback) {
  if (typeof value === 'boolean') {
    return { normal: value, secret: fallback.secret };
  }
  const saved = /** @type {Record<string, unknown>} */ (
    value !== null && typeof value === 'object' ? value : {}
  );
  return {
    normal: typeof saved.normal === 'boolean' ? saved.normal : fallback.normal,
    secret: typeof saved.secret === 'boolean' ? saved.secret : fallback.secret,
  };
}

/**
 * メモ種別ごとの数値。旧形式の number は通常メモに引き継ぐ
 * @param {unknown} value
 * @param {{min: number, max: number}} range
 * @param {PerKindNumber} fallback
 * @returns {PerKindNumber}
 */
function numbersPerKind(value, range, fallback) {
  if (typeof value === 'number') {
    return {
      normal: clampNumber(value, range, fallback.normal),
      secret: fallback.secret,
    };
  }
  const saved = /** @type {Record<string, unknown>} */ (
    value !== null && typeof value === 'object' ? value : {}
  );
  return {
    normal: clampNumber(saved.normal, range, fallback.normal),
    secret: clampNumber(saved.secret, range, fallback.secret),
  };
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
    autoSave: booleansPerKind(saved.autoSave, DEFAULT_SETTINGS.autoSave),
    autoSaveDelayMs: numbersPerKind(
      saved.autoSaveDelayMs,
      AUTO_SAVE_DELAY_RANGE,
      DEFAULT_SETTINGS.autoSaveDelayMs,
    ),
    confirmDelete: booleansPerKind(
      saved.confirmDelete,
      DEFAULT_SETTINGS.confirmDelete,
    ),
    fontSize: clampNumber(
      saved.fontSize,
      FONT_SIZE_RANGE,
      DEFAULT_SETTINGS.fontSize,
    ),
    titleLength: clampNumber(
      saved.titleLength,
      TITLE_LENGTH_RANGE,
      DEFAULT_SETTINGS.titleLength,
    ),
  };
}

/**
 * @param {Pick<Storage, 'setItem'>} storage
 * @param {Settings} settings
 */
export function saveSettings(storage, settings) {
  storage.setItem(KEY, JSON.stringify(settings));
}
