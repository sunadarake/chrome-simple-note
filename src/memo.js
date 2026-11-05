import { highlightMarkdown } from './markdown-highlight.js';
import { exportMemos, mergeMemos, parseImport } from './memo-transfer.js';
import {
  createMemo,
  filterMemos,
  removeMemo,
  retitle,
  titleOf,
  updateContent,
} from './memo-store.js';
import { loadSettings, saveSettings } from './settings.js';
import { loadMemos, saveMemos } from './storage.js';

const LOG_DISPLAY_MS = 3000;

/**
 * @param {object} deps
 * @param {ParentNode} deps.root
 * @param {Pick<Storage, 'getItem' | 'setItem'>} deps.storage 通常メモの保存先
 * @param {Pick<Storage, 'getItem' | 'setItem'>} deps.sessionStorage シークレットメモの保存先
 * @param {(message: string) => boolean} deps.confirm
 * @param {() => void} deps.copy 選択中のテキストをクリップボードにコピーする
 * @param {(filename: string, text: string) => void} deps.download テキストをファイルとして保存する
 */
export function initMemoApp({
  root,
  storage,
  sessionStorage,
  confirm,
  copy,
  download,
}) {
  /** @param {string} selector */
  const query = (selector) => {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`要素が見つかりません: ${selector}`);
    return element;
  };
  const newMemoBtn = query('.new-memo-btn');
  const secretMemoBtn = query('.secret-memo-btn');
  const searchInput = /** @type {HTMLInputElement} */ (query('.search-input'));
  const memoList = query('.memo-list');
  const mainContent = query('.main-content');
  const secretLabel = /** @type {HTMLElement} */ (query('.secret-label'));
  const titleDisplay = query('.title-display');
  const contentInput = /** @type {HTMLTextAreaElement} */ (
    query('.content-input')
  );
  const highlightLayer = query('.editor-highlight');
  const copyBtn = query('.copy-btn');
  const saveBtn = query('.save-btn');
  const deleteBtn = query('.delete-btn');
  const logMessage = /** @type {HTMLElement} */ (query('.log-message'));
  const container = /** @type {HTMLElement} */ (query('.container'));
  const mainHeader = /** @type {HTMLElement} */ (query('.main-header'));
  const editor = /** @type {HTMLElement} */ (query('.editor'));
  const settingsBtn = query('.settings-btn');
  const settingsPanel = /** @type {HTMLElement} */ (query('.settings-panel'));
  const settingsCloseBtn = query('.settings-close-btn');
  const exportBtn = query('.export-btn');
  const importBtn = query('.import-btn');
  const deleteAllBtn = query('.delete-all-btn');
  const importInput = /** @type {HTMLInputElement} */ (query('.import-input'));
  const autoSaveInput = /** @type {HTMLInputElement} */ (
    query('.auto-save-input')
  );
  const autoSaveDelayInput = /** @type {HTMLSelectElement} */ (
    query('.auto-save-delay-input')
  );
  const fontSizeInput = /** @type {HTMLSelectElement} */ (
    query('.font-size-input')
  );
  const titleLengthInput = /** @type {HTMLSelectElement} */ (
    query('.title-length-input')
  );
  const themeInput = /** @type {HTMLSelectElement} */ (query('.theme-input'));

  let memos = loadMemos(storage, sessionStorage);
  const settings = loadSettings(storage);
  /** @type {number | null} */
  let currentId = null;
  let lastContent = '';
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let autoSaveTimer;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let logTimer;

  function renderMemoList() {
    memoList.innerHTML = '';
    for (const memo of filterMemos(memos, searchInput.value)) {
      const memoItem = document.createElement('div');
      memoItem.className = 'memo-item';
      if (memo.id === currentId) {
        memoItem.classList.add('active');
      }
      if (memo.secret) {
        memoItem.classList.add('secret');
      }
      memoItem.textContent =
        (memo.secret ? '🔒 ' : '') + (memo.title || '無題のメモ');
      // 一覧では先頭20文字しか見えないので、ツールチップで1行目を全部見せる
      memoItem.title = memo.content.split('\n')[0];
      memoItem.addEventListener('click', () => loadMemo(memo.id));
      memoList.appendChild(memoItem);
    }
  }

  /** @param {number} id */
  function loadMemo(id) {
    const memo = memos.find((m) => m.id === id);
    if (!memo) return;
    currentId = id;
    mainContent.classList.toggle('secret', Boolean(memo.secret));
    secretLabel.hidden = !memo.secret;
    contentInput.value = memo.content;
    updateHighlight();
    updateTitleDisplay(memo.content);
    lastContent = memo.content;
    renderMemoList();
  }

  function updateHighlight() {
    highlightLayer.innerHTML = highlightMarkdown(contentInput.value);
    highlightLayer.scrollTop = contentInput.scrollTop;
  }

  /** @param {string} content */
  function updateTitleDisplay(content) {
    titleDisplay.textContent =
      titleOf(content, settings.titleLength) || '新しいメモ';
  }

  /**
   * @param {string} message
   * @param {'save' | 'delete' | 'copy'} [kind] 色分け用。なければ灰色
   */
  function showLogMessage(message, kind) {
    clearTimeout(logTimer);
    logMessage.textContent = message;
    logMessage.dataset.kind = kind ?? '';
    logMessage.classList.add('show');
    logTimer = setTimeout(() => {
      logMessage.classList.remove('show');
    }, LOG_DISPLAY_MS);
  }

  /** @param {boolean} secret */
  function createNewMemo(secret) {
    const newMemo = createMemo(new Date(), secret);
    memos = [newMemo, ...memos];
    loadMemo(newMemo.id);
  }

  function persistCurrentContent() {
    if (currentId === null) return;
    memos = updateContent(
      memos,
      currentId,
      contentInput.value,
      settings.titleLength,
    );
    saveMemos(storage, sessionStorage, memos);
    renderMemoList();
    lastContent = contentInput.value;
  }

  function saveMemo() {
    if (currentId === null) return;
    // 空白のみを反映すると、保存済みのメモがリロードで消える
    if (contentInput.value.trim() === '') {
      showLogMessage('内容が空のため保存しませんでした');
      return;
    }
    persistCurrentContent();
    showLogMessage('メモを保存しました', 'save');
  }

  function deleteMemo() {
    const memo = memos.find((m) => m.id === currentId);
    if (!memo) return;
    if (
      !confirm(`"${memo.title || '無題のメモ'}" を削除します。よろしいですか？`)
    ) {
      return;
    }
    memos = removeMemo(memos, memo.id);
    saveMemos(storage, sessionStorage, memos);
    currentId = null;
    if (memos.length > 0) {
      loadMemo(memos[0].id);
    } else {
      createNewMemo(false);
    }
    showLogMessage('メモを削除しました', 'delete');
  }

  function deleteAllMemos() {
    // 書き始める前の空メモは保存されていないので、件数に数えない
    const count = memos.filter(
      (memo) => !memo.secret && memo.content.trim() !== '',
    ).length;
    if (count === 0) {
      showLogMessage('削除するメモがありません');
      return;
    }
    if (
      !confirm(
        `通常メモ${count}件をすべて削除します（シークレットメモは残ります）。よろしいですか？`,
      )
    ) {
      return;
    }
    memos = memos.filter((memo) => memo.secret);
    saveMemos(storage, sessionStorage, memos);
    currentId = null;
    if (memos.length > 0) {
      loadMemo(memos[0].id);
    } else {
      createNewMemo(false);
    }
    showLogMessage(`${count}件のメモを削除しました`, 'delete');
  }

  function handleContentInput() {
    updateHighlight();
    updateTitleDisplay(contentInput.value);
    clearTimeout(autoSaveTimer);
    if (!settings.autoSave) return;
    autoSaveTimer = setTimeout(() => {
      // 空白のみのメモは保存しない
      if (
        currentId !== null &&
        contentInput.value !== lastContent &&
        contentInput.value.trim() !== ''
      ) {
        persistCurrentContent();
      }
    }, settings.autoSaveDelayMs);
  }

  function copyContent() {
    contentInput.select();
    copy();
    showLogMessage('コンテンツをコピーしました', 'copy');
  }

  function exportToFile() {
    const count = memos.filter((memo) => !memo.secret).length;
    if (count === 0) {
      showLogMessage('エクスポートするメモがありません');
      return;
    }
    const now = new Date();
    const stamp = now.toISOString().slice(0, 19).replace(/\D/g, '');
    download(`simple-note-${stamp}.json`, exportMemos(memos, now));
    showLogMessage(`${count}件をエクスポートしました`);
  }

  /**
   * 設定を開いている間は、メモのタイトル行とエディタを隠す
   * @param {boolean} open
   */
  function setSettingsOpen(open) {
    settingsPanel.hidden = !open;
    mainHeader.hidden = open;
    editor.hidden = open;
    settingsBtn.setAttribute('aria-expanded', String(open));
  }

  function applySettings() {
    container.dataset.theme = settings.theme;
    container.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
    autoSaveDelayInput.disabled = !settings.autoSave;
    // 文字サイズが変わると折り返しも変わるので、表示層を作り直す
    updateHighlight();
  }

  function showSettings() {
    autoSaveInput.checked = settings.autoSave;
    autoSaveDelayInput.value = String(settings.autoSaveDelayMs);
    fontSizeInput.value = String(settings.fontSize);
    titleLengthInput.value = String(settings.titleLength);
    themeInput.value = settings.theme;
    applySettings();
  }

  // タイトルは本文から作るので、文字数の設定と保存済みのタイトルをそろえる
  function retitleAll() {
    const retitled = retitle(memos, settings.titleLength);
    if (retitled.every((memo, i) => memo === memos[i])) return;
    memos = retitled;
    saveMemos(storage, sessionStorage, memos);
  }

  function changeSettings() {
    settings.autoSave = autoSaveInput.checked;
    settings.autoSaveDelayMs = Number(autoSaveDelayInput.value);
    settings.fontSize = Number(fontSizeInput.value);
    settings.titleLength = Number(titleLengthInput.value);
    settings.theme = themeInput.value === 'dark' ? 'dark' : 'light';
    if (!settings.autoSave) clearTimeout(autoSaveTimer);
    saveSettings(storage, settings);
    applySettings();
    retitleAll();
    renderMemoList();
    updateTitleDisplay(contentInput.value);
  }

  /** @param {File[]} files */
  async function importFiles(files) {
    let added = 0;
    let skipped = 0;
    let succeeded = 0;
    /** @type {string[]} */
    const failures = [];
    for (const file of files) {
      try {
        const result = mergeMemos(
          memos,
          parseImport(await file.text(), settings.titleLength),
        );
        memos = result.memos;
        added += result.added;
        skipped += result.skipped;
        succeeded++;
      } catch (error) {
        const message = /** @type {Error} */ (error).message;
        // ファイルが1つなら、理由だけを出す
        failures.push(
          files.length === 1 ? message : `${file.name}: ${message}`,
        );
      }
    }
    if (succeeded > 0) {
      // ファイルに書かれたタイトルは、今の文字数に作り直す
      memos = retitle(memos, settings.titleLength);
      saveMemos(storage, sessionStorage, memos);
      renderMemoList();
    }
    const summary = `${added}件をインポートしました（${skipped}件は同じIDのためスキップ）`;
    showLogMessage(
      succeeded > 0 ? [summary, ...failures].join(' / ') : failures.join(' / '),
    );
  }

  async function importFromInput() {
    const files = [...(importInput.files ?? [])];
    // 同じファイルをもう一度選んでも change が起きるようにする
    importInput.value = '';
    if (files.length > 0) await importFiles(files);
  }

  /** @param {DragEvent} event */
  const hasFiles = (event) =>
    Boolean(event.dataTransfer?.types.includes('Files'));

  /** @param {Event} event */
  const inPanel = (event) =>
    settingsPanel.contains(/** @type {Node | null} */ (event.target));

  newMemoBtn.addEventListener('click', () => createNewMemo(false));
  secretMemoBtn.addEventListener('click', () => createNewMemo(true));
  searchInput.addEventListener('input', renderMemoList);
  contentInput.addEventListener('input', handleContentInput);
  contentInput.addEventListener('scroll', () => {
    highlightLayer.scrollTop = contentInput.scrollTop;
  });
  copyBtn.addEventListener('click', copyContent);
  saveBtn.addEventListener('click', saveMemo);
  deleteBtn.addEventListener('click', deleteMemo);
  settingsBtn.addEventListener('click', () =>
    setSettingsOpen(settingsPanel.hidden === true),
  );
  settingsCloseBtn.addEventListener('click', () => setSettingsOpen(false));
  for (const input of [
    autoSaveInput,
    autoSaveDelayInput,
    fontSizeInput,
    titleLengthInput,
    themeInput,
  ]) {
    input.addEventListener('change', changeSettings);
  }
  exportBtn.addEventListener('click', exportToFile);
  importBtn.addEventListener('click', () => importInput.click());
  deleteAllBtn.addEventListener('click', deleteAllMemos);
  importInput.addEventListener('change', importFromInput);
  // 設定パネルの外にドロップすると、Chrome がタブをファイル表示に切り替えてしまうので止める
  root.addEventListener('dragover', (event) => {
    const dragEvent = /** @type {DragEvent} */ (event);
    if (!hasFiles(dragEvent)) return;
    event.preventDefault();
    settingsPanel.classList.toggle('drop-active', inPanel(event));
  });
  root.addEventListener('dragleave', (event) => {
    const related = /** @type {DragEvent} */ (event).relatedTarget;
    if (!settingsPanel.contains(/** @type {Node | null} */ (related))) {
      settingsPanel.classList.remove('drop-active');
    }
  });
  root.addEventListener('drop', (event) => {
    const dragEvent = /** @type {DragEvent} */ (event);
    if (!hasFiles(dragEvent)) return;
    event.preventDefault();
    settingsPanel.classList.remove('drop-active');
    if (inPanel(event)) importFiles([...(dragEvent.dataTransfer?.files ?? [])]);
  });

  showSettings();
  retitleAll();
  if (memos.length > 0) {
    loadMemo(memos[0].id);
  } else {
    createNewMemo(false);
  }
}
