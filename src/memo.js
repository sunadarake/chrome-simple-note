import { highlightMarkdown } from './markdown-highlight.js';
import { exportMemos, mergeMemos, parseImport } from './memo-transfer.js';
import {
  createMemo,
  filterMemos,
  removeMemo,
  titleOf,
  updateContent,
} from './memo-store.js';
import { loadMemos, saveMemos } from './storage.js';

const AUTO_SAVE_DELAY_MS = 1000;
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
  const logMessage = query('.log-message');
  const menuBtn = query('.sidebar-menu-btn');
  const menu = /** @type {HTMLElement} */ (query('.sidebar-menu'));
  const exportBtn = query('.export-btn');
  const importBtn = query('.import-btn');
  const importInput = /** @type {HTMLInputElement} */ (query('.import-input'));

  let memos = loadMemos(storage, sessionStorage);
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
    titleDisplay.textContent = titleOf(content) || '新しいメモ';
  }

  /** @param {string} message */
  function showLogMessage(message) {
    clearTimeout(logTimer);
    logMessage.textContent = message;
    logMessage.classList.add('show');
    logTimer = setTimeout(() => {
      logMessage.classList.remove('show');
    }, LOG_DISPLAY_MS);
  }

  /** @param {boolean} secret */
  function createNewMemo(secret) {
    const newMemo = createMemo(new Date(), secret);
    memos = [newMemo, ...memos];
    saveMemos(storage, sessionStorage, memos);
    loadMemo(newMemo.id);
  }

  function persistCurrentContent() {
    if (currentId === null) return;
    memos = updateContent(memos, currentId, contentInput.value);
    saveMemos(storage, sessionStorage, memos);
    renderMemoList();
    lastContent = contentInput.value;
  }

  function saveMemo() {
    if (currentId === null) return;
    persistCurrentContent();
    showLogMessage('メモを保存しました');
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
    showLogMessage('メモを削除しました');
  }

  function handleContentInput() {
    updateHighlight();
    updateTitleDisplay(contentInput.value);
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      // 空白のみのメモは保存しない
      if (
        currentId !== null &&
        contentInput.value !== lastContent &&
        contentInput.value.trim() !== ''
      ) {
        persistCurrentContent();
        showLogMessage('メモを自動保存しました');
      }
    }, AUTO_SAVE_DELAY_MS);
  }

  function copyContent() {
    contentInput.select();
    copy();
    showLogMessage('コンテンツをコピーしました');
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

  /** @param {boolean} open */
  function setMenuOpen(open) {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  async function importFromFile() {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const result = mergeMemos(memos, parseImport(await file.text()));
      memos = result.memos;
      saveMemos(storage, sessionStorage, memos);
      renderMemoList();
      showLogMessage(
        `${result.added}件をインポートしました（${result.skipped}件は同じIDのためスキップ）`,
      );
    } catch (error) {
      showLogMessage(/** @type {Error} */ (error).message);
    } finally {
      // 同じファイルをもう一度選んでも change が起きるようにする
      importInput.value = '';
    }
  }

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
  menuBtn.addEventListener('click', () => setMenuOpen(menu.hidden === true));
  root.addEventListener('click', (event) => {
    const target = /** @type {Node} */ (event.target);
    if (!menu.contains(target) && !menuBtn.contains(target)) {
      setMenuOpen(false);
    }
  });
  exportBtn.addEventListener('click', () => {
    setMenuOpen(false);
    exportToFile();
  });
  importBtn.addEventListener('click', () => {
    setMenuOpen(false);
    importInput.click();
  });
  importInput.addEventListener('change', importFromFile);

  if (memos.length > 0) {
    loadMemo(memos[0].id);
  } else {
    createNewMemo(false);
  }
}
