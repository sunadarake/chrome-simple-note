import { initMemoApp } from './memo.js';

initMemoApp({
  root: document,
  storage: localStorage,
  confirm: (message) => confirm(message),
  copy: () => document.execCommand('copy'),
});
