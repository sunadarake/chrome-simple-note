import { initMemoApp } from './memo.js';
import { initSidebarResize } from './sidebar.js';

initMemoApp({
  root: document,
  storage: localStorage,
  sessionStorage,
  confirm: (message) => confirm(message),
  copy: () => document.execCommand('copy'),
});

initSidebarResize({ root: document, storage: localStorage });
