import { initMemoApp } from './memo.js';
import { initSidebarResize } from './sidebar.js';

initMemoApp({
  root: document,
  storage: localStorage,
  sessionStorage,
  confirm: (message) => confirm(message),
  copy: () => document.execCommand('copy'),
  download: (filename, text) => {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
});

initSidebarResize({ root: document, storage: localStorage });
