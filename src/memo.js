import { query } from './dom.js';
import { highlightMarkdown } from './markdown-highlight.js';
import { exportMemos, mergeMemos, parseImport } from './memo-transfer.js';
import {
  createMemo,
  filterMemos,
  hasSavableContent,
  removeMemo,
  retitle,
  snippetFor,
  titleFor,
  updateContent,
} from './memo-store.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.js';
import { SHORTCUTS, initShortcuts } from './shortcuts.js';
import { loadMemos, saveMemos } from './storage.js';

const LOG_DISPLAY_MS = 3000;
const UNDO_LIMIT = 100;
const SECRET_ICON = '<svg aria-hidden="true"><use href="#ghost" /></svg>';

/**
 * @param {object} deps
 * @param {ParentNode} deps.root
 * @param {Pick<Storage, 'getItem' | 'setItem'>} deps.storage 通常メモの保存先
 * @param {Pick<Storage, 'getItem' | 'setItem'>} deps.sessionStorage シークレットメモの保存先
 * @param {(message: string) => boolean} deps.confirm
 * @param {() => void} deps.copy 選択中のテキストをクリップボードにコピーする
 * @param {(filename: string, text: string) => void} deps.download テキストをファイルとして保存する
 * @param {string} deps.version ヘルプに表示する拡張機能のバージョン
 */
export function initMemoApp({
  root,
  storage,
  sessionStorage,
  confirm,
  copy,
  download,
  version,
}) {
  /** @param {string} selector */
  const $ = (selector) => query(root, selector);
  const newMemoBtn = $('.new-memo-btn');
  const secretMemoBtn = $('.secret-memo-btn');
  const searchInput = /** @type {HTMLInputElement} */ ($('.search-input'));
  const memoList = $('.memo-list');
  const mainContent = $('.main-content');
  const secretLabel = /** @type {HTMLElement} */ ($('.secret-label'));
  const titleDisplay = /** @type {HTMLElement} */ ($('.title-display'));
  const titleInput = /** @type {HTMLInputElement} */ ($('.title-input'));
  const contentInput = /** @type {HTMLTextAreaElement} */ ($('.content-input'));
  const highlightLayer = $('.editor-highlight');
  const copyBtn = $('.copy-btn');
  const saveBtn = $('.save-btn');
  const deleteBtn = $('.delete-btn');
  const logMessage = /** @type {HTMLElement} */ ($('.log-message'));
  const container = /** @type {HTMLElement} */ ($('.container'));
  const mainHeader = /** @type {HTMLElement} */ ($('.main-header'));
  const editor = /** @type {HTMLElement} */ ($('.editor'));
  const settingsBtn = $('.settings-btn');
  const settingsPanel = /** @type {HTMLElement} */ ($('.settings-panel'));
  const settingsCloseBtn = $('.settings-close-btn');
  const helpBtn = $('.help-btn');
  const helpPanel = /** @type {HTMLElement} */ ($('.help-panel'));
  const helpCloseBtn = $('.help-close-btn');
  const searchPanel = /** @type {HTMLElement} */ ($('.search-panel'));
  const searchPanelInput = /** @type {HTMLInputElement} */ (
    $('.search-panel-input')
  );
  const searchResults = /** @type {HTMLElement} */ ($('.search-results'));
  const searchCloseBtn = $('.search-close-btn');
  const shortcutList = $('.shortcut-list');
  const helpVersion = /** @type {HTMLElement} */ ($('.help-version'));
  const exportBtn = $('.export-btn');
  const importBtn = $('.import-btn');
  const deleteAllBtn = $('.delete-all-btn');
  const saveSettingsBtn = $('.save-settings-btn');
  const resetSettingsBtn = $('.reset-settings-btn');
  const importInput = /** @type {HTMLInputElement} */ ($('.import-input'));
  const normalAutoSaveInput = /** @type {HTMLInputElement} */ (
    $('.normal-auto-save-input')
  );
  const normalAutoSaveDelayInput = /** @type {HTMLSelectElement} */ (
    $('.normal-auto-save-delay-input')
  );
  const secretAutoSaveInput = /** @type {HTMLInputElement} */ (
    $('.secret-auto-save-input')
  );
  const secretAutoSaveDelayInput = /** @type {HTMLSelectElement} */ (
    $('.secret-auto-save-delay-input')
  );
  const normalConfirmDeleteInput = /** @type {HTMLInputElement} */ (
    $('.normal-confirm-delete-input')
  );
  const secretConfirmDeleteInput = /** @type {HTMLInputElement} */ (
    $('.secret-confirm-delete-input')
  );
  const fontSizeInput = /** @type {HTMLSelectElement} */ (
    $('.font-size-input')
  );
  const titleLengthInput = /** @type {HTMLSelectElement} */ (
    $('.title-length-input')
  );

  let memos = loadMemos(storage, sessionStorage);
  const settings = loadSettings(storage);
  /** @type {number | null} */
  let currentId = null;
  let lastContent = '';
  // 手動タイトルは本文と同じく、保存するまでは画面上の変更として持つ
  let customTitle = '';
  let lastCustomTitle = '';
  let editingTitle = false;
  /** @type {string[]} */
  let undoHistory = [];
  /** @type {string[]} */
  let redoHistory = [];
  let undoValue = '';
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
        const icon = document.createElement('span');
        icon.className = 'secret-icon';
        icon.innerHTML = SECRET_ICON;
        memoItem.append(icon);
      }
      memoItem.append(memo.title || '無題のメモ');
      // 一覧では先頭20文字しか見えないので、ツールチップで1行目を全部見せる
      memoItem.title = memo.content.split('\n')[0];
      memoItem.addEventListener('click', () => {
        closePanels();
        loadMemo(memo.id);
      });
      memoList.appendChild(memoItem);
    }
  }

  function renderSearchResults() {
    searchResults.innerHTML = '';
    const term = searchPanelInput.value.trim();
    if (term === '') return;
    const matches = filterMemos(memos, term);
    if (matches.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = '一致するメモがありません';
      searchResults.appendChild(empty);
      return;
    }
    for (const memo of matches) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'search-result';
      const title = document.createElement('span');
      title.className = 'search-result-title';
      if (memo.secret) {
        const icon = document.createElement('span');
        icon.className = 'secret-icon';
        icon.innerHTML = SECRET_ICON;
        title.append(icon);
      }
      title.append(memo.title || '無題のメモ');
      const preview = document.createElement('span');
      preview.className = 'search-result-preview';
      const snippet = snippetFor(memo.content, term);
      if (snippet) {
        const match = document.createElement('mark');
        match.textContent = snippet.match;
        preview.append(snippet.before, match, snippet.after);
      } else {
        // タイトルだけが一致したときは、本文の1行目を出す
        preview.textContent = memo.content.trim().split('\n')[0];
      }
      row.append(title, preview);
      row.addEventListener('click', () => {
        closePanels();
        loadMemo(memo.id);
      });
      searchResults.appendChild(row);
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
    customTitle = memo.customTitle ?? '';
    lastContent = memo.content;
    lastCustomTitle = customTitle;
    undoHistory = [];
    redoHistory = [];
    undoValue = memo.content;
    editingTitle = false;
    titleInput.hidden = true;
    titleDisplay.hidden = false;
    updateTitleDisplay();
    renderMemoList();
    contentInput.focus();
  }

  function updateHighlight() {
    highlightLayer.innerHTML = highlightMarkdown(contentInput.value);
    highlightLayer.scrollTop = contentInput.scrollTop;
  }

  function updateTitleDisplay() {
    titleDisplay.textContent =
      titleFor(contentInput.value, customTitle, settings.titleLength) ||
      '新しいメモ';
  }

  function startTitleEdit() {
    editingTitle = true;
    titleInput.value = customTitle;
    // 空のまま確定すると自動に戻ることを、今の自動タイトルで示す
    titleInput.placeholder =
      titleFor(contentInput.value, '', settings.titleLength) || '新しいメモ';
    titleDisplay.hidden = true;
    titleInput.hidden = false;
    titleInput.focus();
    titleInput.select();
  }

  /** @param {boolean} commit */
  function endTitleEdit(commit) {
    // 入力欄を隠すと blur も起きるので、二重に確定しない
    if (!editingTitle) return;
    editingTitle = false;
    if (commit) customTitle = titleInput.value.trim();
    titleInput.hidden = true;
    titleDisplay.hidden = false;
    updateTitleDisplay();
    if (commit) scheduleAutoSave();
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

  function selectFirstMemoOrCreate() {
    currentId = null;
    if (memos.length > 0) {
      loadMemo(memos[0].id);
    } else {
      createNewMemo(false);
    }
  }

  function persistCurrentContent() {
    if (currentId === null) return;
    memos = updateContent(
      memos,
      currentId,
      contentInput.value,
      settings.titleLength,
      customTitle,
    );
    saveMemos(storage, sessionStorage, memos);
    renderMemoList();
    lastContent = contentInput.value;
    lastCustomTitle = customTitle;
  }

  function saveMemo() {
    if (currentId === null) return;
    // 本文もタイトルも空にすると、保存済みのメモがリロードで消える
    if (!hasSavableContent(contentInput.value, customTitle)) {
      showLogMessage('内容が空のため保存しませんでした');
      return;
    }
    persistCurrentContent();
    showLogMessage('メモを保存しました', 'save');
  }

  function saveMemoWithTitle() {
    // 保存ボタンと同じ結果になるよう、編集中のタイトルを先に確定する
    if (editingTitle) endTitleEdit(true);
    saveMemo();
  }

  function deleteMemo() {
    const memo = memos.find((m) => m.id === currentId);
    if (!memo) return;
    const kind = memo.secret ? 'secret' : 'normal';
    if (
      settings.confirmDelete[kind] &&
      !confirm(`"${memo.title || '無題のメモ'}" を削除します。よろしいですか？`)
    ) {
      return;
    }
    memos = removeMemo(memos, memo.id);
    saveMemos(storage, sessionStorage, memos);
    selectFirstMemoOrCreate();
    showLogMessage('メモを削除しました', 'delete');
  }

  function deleteAllMemos() {
    // 書き始める前の空メモは保存されていないので、件数に数えない
    const count = memos.filter(
      (memo) =>
        !memo.secret && hasSavableContent(memo.content, memo.customTitle),
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
    selectFirstMemoOrCreate();
    showLogMessage(`${count}件のメモを削除しました`, 'delete');
  }

  function handleContentInput() {
    // 入力のたびに直前の本文を積む
    if (contentInput.value !== undoValue) {
      undoHistory.push(undoValue);
      if (undoHistory.length > UNDO_LIMIT) undoHistory.shift();
      redoHistory = [];
      undoValue = contentInput.value;
    }
    updateHighlight();
    updateTitleDisplay();
    scheduleAutoSave();
  }

  function undoContent() {
    const previous = undoHistory.pop();
    if (previous === undefined) {
      showLogMessage('これ以上元に戻せません');
      return;
    }
    redoHistory.push(undoValue);
    undoValue = previous;
    contentInput.value = previous;
    updateHighlight();
    updateTitleDisplay();
    scheduleAutoSave();
  }

  function redoContent() {
    const next = redoHistory.pop();
    if (next === undefined) {
      showLogMessage('これ以上やり直せません');
      return;
    }
    undoHistory.push(undoValue);
    if (undoHistory.length > UNDO_LIMIT) undoHistory.shift();
    undoValue = next;
    contentInput.value = next;
    updateHighlight();
    updateTitleDisplay();
    scheduleAutoSave();
  }

  function hasSelection() {
    const active = document.activeElement;
    if (
      (active instanceof HTMLTextAreaElement ||
        active instanceof HTMLInputElement) &&
      active.selectionStart !== active.selectionEnd
    ) {
      return true;
    }
    const selection = document.getSelection();
    return Boolean(selection && !selection.isCollapsed);
  }

  function currentKind() {
    const memo = memos.find((m) => m.id === currentId);
    return memo?.secret ? 'secret' : 'normal';
  }

  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    const kind = currentKind();
    if (!settings.autoSave[kind]) return;
    autoSaveTimer = setTimeout(() => {
      if (
        currentId !== null &&
        (contentInput.value !== lastContent ||
          customTitle !== lastCustomTitle) &&
        hasSavableContent(contentInput.value, customTitle)
      ) {
        persistCurrentContent();
      }
    }, settings.autoSaveDelayMs[kind]);
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

  // 設定・ヘルプを開いている間は、メモのタイトル行とエディタを隠す
  function syncMainVisibility() {
    const panelOpen =
      !settingsPanel.hidden || !helpPanel.hidden || !searchPanel.hidden;
    mainContent.classList.toggle('panel-open', panelOpen);
    mainHeader.hidden = panelOpen;
    editor.hidden = panelOpen;
  }

  /**
   * 設定とヘルプは同時に開かない
   * @param {boolean} open
   */
  function setSettingsOpen(open) {
    settingsPanel.hidden = !open;
    settingsBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      helpPanel.hidden = true;
      helpBtn.setAttribute('aria-expanded', 'false');
      searchPanel.hidden = true;
    }
    syncMainVisibility();
  }

  /** @param {boolean} open */
  function setHelpOpen(open) {
    helpPanel.hidden = !open;
    helpBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      settingsPanel.hidden = true;
      settingsBtn.setAttribute('aria-expanded', 'false');
      searchPanel.hidden = true;
    }
    syncMainVisibility();
  }

  /** @param {boolean} open */
  function setSearchOpen(open) {
    searchPanel.hidden = !open;
    if (open) {
      setSettingsOpen(false);
      setHelpOpen(false);
    }
    syncMainVisibility();
  }

  // 開くたびに前の検索語を消して、入力欄から始める
  function openSearch() {
    setSearchOpen(true);
    searchPanelInput.value = '';
    renderSearchResults();
    searchPanelInput.focus();
  }

  // メモを開くときは、未保存の設定変更を捨ててパネルを閉じる
  function closePanels() {
    setSettingsOpen(false);
    setHelpOpen(false);
    setSearchOpen(false);
  }

  function focusSearch() {
    searchInput.focus();
    searchInput.select();
  }

  /** @param {number} direction */
  function moveMemo(direction) {
    // タイトル編集中に移動すると未確定の入力を失うので何もしない
    if (editingTitle) return;
    const visible = filterMemos(memos, searchInput.value);
    const index = visible.findIndex((memo) => memo.id === currentId);
    if (index === -1) return;
    const next = index + direction;
    if (next < 0 || next >= visible.length) return;
    loadMemo(visible[next].id);
  }

  /** @returns {boolean} 閉じるものがあったら true */
  function handleEscape() {
    if (!settingsPanel.hidden) {
      setSettingsOpen(false);
      contentInput.focus();
      return true;
    }
    if (!helpPanel.hidden) {
      setHelpOpen(false);
      contentInput.focus();
      return true;
    }
    if (!searchPanel.hidden) {
      setSearchOpen(false);
      contentInput.focus();
      return true;
    }
    if (editingTitle) {
      endTitleEdit(false);
      contentInput.focus();
      return true;
    }
    if (document.activeElement === searchInput) {
      contentInput.focus();
      return true;
    }
    return false;
  }

  function renderHelp() {
    shortcutList.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'shortcut-table';
    const headRow = document.createElement('tr');
    for (const label of ['キー', '動作']) {
      const head = document.createElement('th');
      head.scope = 'col';
      head.textContent = label;
      headRow.appendChild(head);
    }
    const head = document.createElement('thead');
    head.appendChild(headRow);
    const body = document.createElement('tbody');
    for (const { keys, description } of SHORTCUTS) {
      const row = document.createElement('tr');
      const key = document.createElement('th');
      key.className = 'shortcut-keys';
      key.scope = 'row';
      const keycap = document.createElement('span');
      keycap.className = 'shortcut-keycap';
      keycap.textContent = keys;
      key.appendChild(keycap);
      const text = document.createElement('td');
      text.className = 'shortcut-description';
      text.textContent = description;
      row.append(key, text);
      body.appendChild(row);
    }
    table.append(head, body);
    shortcutList.appendChild(table);
    helpVersion.textContent = `v${version}`;
  }

  function applySettings() {
    container.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
    normalAutoSaveDelayInput.disabled = !settings.autoSave.normal;
    secretAutoSaveDelayInput.disabled = !settings.autoSave.secret;
    // 文字サイズが変わると折り返しも変わるので、表示層を作り直す
    updateHighlight();
  }

  function showSettings() {
    normalAutoSaveInput.checked = settings.autoSave.normal;
    normalAutoSaveDelayInput.value = String(settings.autoSaveDelayMs.normal);
    secretAutoSaveInput.checked = settings.autoSave.secret;
    secretAutoSaveDelayInput.value = String(settings.autoSaveDelayMs.secret);
    normalConfirmDeleteInput.checked = settings.confirmDelete.normal;
    secretConfirmDeleteInput.checked = settings.confirmDelete.secret;
    fontSizeInput.value = String(settings.fontSize);
    titleLengthInput.value = String(settings.titleLength);
    applySettings();
  }

  // タイトルは本文から作るので、文字数の設定と保存済みのタイトルをそろえる
  function retitleAll() {
    const retitled = retitle(memos, settings.titleLength);
    if (retitled.every((memo, i) => memo === memos[i])) return;
    memos = retitled;
    saveMemos(storage, sessionStorage, memos);
  }

  // 変更はすぐ画面に反映し、保存ボタンで保存先に書く
  function changeSettings() {
    settings.autoSave.normal = normalAutoSaveInput.checked;
    settings.autoSave.secret = secretAutoSaveInput.checked;
    settings.autoSaveDelayMs.normal = Number(normalAutoSaveDelayInput.value);
    settings.autoSaveDelayMs.secret = Number(secretAutoSaveDelayInput.value);
    settings.confirmDelete.normal = normalConfirmDeleteInput.checked;
    settings.confirmDelete.secret = secretConfirmDeleteInput.checked;
    settings.fontSize = Number(fontSizeInput.value);
    settings.titleLength = Number(titleLengthInput.value);
    if (!settings.autoSave[currentKind()]) clearTimeout(autoSaveTimer);
    applySettings();
    retitleAll();
    renderMemoList();
    updateTitleDisplay();
  }

  function saveSettingsFromPanel() {
    saveSettings(storage, settings);
    showLogMessage('設定を保存しました');
  }

  function resetSettings() {
    if (!confirm('設定をデフォルトに戻します。よろしいですか？')) return;
    settings.autoSave = { ...DEFAULT_SETTINGS.autoSave };
    settings.autoSaveDelayMs = { ...DEFAULT_SETTINGS.autoSaveDelayMs };
    settings.confirmDelete = { ...DEFAULT_SETTINGS.confirmDelete };
    settings.fontSize = DEFAULT_SETTINGS.fontSize;
    settings.titleLength = DEFAULT_SETTINGS.titleLength;
    if (!settings.autoSave[currentKind()]) clearTimeout(autoSaveTimer);
    showSettings();
    retitleAll();
    renderMemoList();
    updateTitleDisplay();
    saveSettings(storage, settings);
    showLogMessage('設定をデフォルトに戻しました');
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

  newMemoBtn.addEventListener('click', () => {
    closePanels();
    createNewMemo(false);
  });
  secretMemoBtn.addEventListener('click', () => {
    closePanels();
    createNewMemo(true);
  });
  searchInput.addEventListener('input', renderMemoList);
  contentInput.addEventListener('input', handleContentInput);
  titleDisplay.addEventListener('click', startTitleEdit);
  titleInput.addEventListener('blur', () => endTitleEdit(true));
  titleInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') endTitleEdit(true);
    if (event.key === 'Escape') {
      endTitleEdit(false);
      contentInput.focus();
    }
  });
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
  helpBtn.addEventListener('click', () =>
    setHelpOpen(helpPanel.hidden === true),
  );
  helpCloseBtn.addEventListener('click', () => setHelpOpen(false));
  searchPanelInput.addEventListener('input', renderSearchResults);
  searchCloseBtn.addEventListener('click', () => setSearchOpen(false));
  for (const input of [
    normalAutoSaveInput,
    normalAutoSaveDelayInput,
    secretAutoSaveInput,
    secretAutoSaveDelayInput,
    normalConfirmDeleteInput,
    secretConfirmDeleteInput,
    fontSizeInput,
    titleLengthInput,
  ]) {
    input.addEventListener('change', changeSettings);
  }
  saveSettingsBtn.addEventListener('click', saveSettingsFromPanel);
  resetSettingsBtn.addEventListener('click', resetSettings);
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

  initShortcuts({
    // 画面を開き直すテストでも古いリスナーが残らないよう、文書ではなくこの画面に登録する
    root: container,
    isActive: () => !editor.hidden,
    hasSelection,
    copy: copyContent,
    save: saveMemoWithTitle,
    undo: undoContent,
    redo: redoContent,
    remove: deleteMemo,
    newMemo: () => createNewMemo(false),
    newSecretMemo: () => createNewMemo(true),
    focusSearch,
    openSearch,
    moveMemo,
    openSettings: () => setSettingsOpen(true),
    escape: handleEscape,
  });

  renderHelp();
  showSettings();
  retitleAll();
  selectFirstMemoOrCreate();
}
