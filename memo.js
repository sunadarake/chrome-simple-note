// memo.js

// メモデータを保存するための配列
let memos = JSON.parse(localStorage.getItem('memos')) || [];
let currentMemoIndex = -1;
let autoSaveTimer; // オートセーブ用のタイマー
let lastContent = ''; // 最後に保存されたコンテンツ
let logTimer; // ログ表示用のタイマー

// DOM要素の取得
const newMemoBtn = document.querySelector('.new-memo-btn');
const searchInput = document.querySelector('.search-input');
const memoList = document.querySelector('.memo-list');
const titleDisplay = document.querySelector('.title-display');
const contentInput = document.querySelector('.content-input');
const copyBtn = document.querySelector('.copy-btn');
const saveBtn = document.querySelector('.save-btn');
const deleteBtn = document.querySelector('.delete-btn'); // 削除ボタン
const logMessage = document.querySelector('.log-message'); // ログ表示要素

// 初期化
function init() {
  renderMemoList();
  setupEventListeners();
  
  // メモが存在する場合は最初のメモをロード、そうでない場合は新しいメモを作成
  if (memos.length > 0) {
    loadMemo(0);
  } else {
    createNewMemo();
  }
}

// イベントリスナーの設定
function setupEventListeners() {
  newMemoBtn.addEventListener('click', createNewMemo);
  searchInput.addEventListener('input', filterMemos);
  contentInput.addEventListener('input', handleContentInput);
  copyBtn.addEventListener('click', copyContent);
  saveBtn.addEventListener('click', saveMemo);
  deleteBtn.addEventListener('click', deleteMemo); // 削除ボタンのイベントリスナー
}

// 新しいメモを作成
function createNewMemo() {
  const newMemo = {
    id: Date.now(),
    title: '',
    content: '',
    createdAt: new Date().toISOString()
  };
  
  memos.unshift(newMemo);
  currentMemoIndex = 0;
  saveMemos();
  renderMemoList();
  loadMemo(currentMemoIndex);
  lastContent = ''; // 新しいメモを作成する際にlastContentをリセット
}

// メモリストを描画
function renderMemoList() {
  memoList.innerHTML = '';
  memos.forEach((memo, index) => {
    const memoItem = document.createElement('div');
    memoItem.className = 'memo-item';
    // アクティブなメモにクラスを追加
    if (index === currentMemoIndex) {
      memoItem.classList.add('active');
    }
    memoItem.textContent = memo.title || '無題のメモ';
    memoItem.addEventListener('click', () => loadMemo(index));
    memoList.appendChild(memoItem);
  });
}

// メモを読み込む
function loadMemo(index) {
  currentMemoIndex = index;
  const memo = memos[index];
  contentInput.value = memo.content;
  updateTitleDisplay(memo.content);
  lastContent = memo.content; // メモをロードする際にlastContentを更新
  
  // メモリストを再描画してアクティブなメモを表示
  renderMemoList();
}

// タイトル表示を更新
function updateTitleDisplay(content) {
  titleDisplay.textContent = content.substring(0, 20) || '新しいメモ';
}

// ログメッセージを表示
function showLogMessage(message) {
  // 既存のタイマーをクリア
  if (logTimer) {
    clearTimeout(logTimer);
  }
  
  logMessage.textContent = message;
  logMessage.classList.add('show');
  
  // 3秒後にメッセージを非表示にする
  logTimer = setTimeout(() => {
    logMessage.classList.remove('show');
  }, 3000);
}

// メモを保存
function saveMemo() {
  if (currentMemoIndex >= 0) {
    // 本文の最初の20文字をタイトルとして使用
    memos[currentMemoIndex].title = memos[currentMemoIndex].content.substring(0, 20);
    memos[currentMemoIndex].content = contentInput.value;
    saveMemos();
    renderMemoList();
    lastContent = contentInput.value; // 保存後にlastContentを更新
    showLogMessage('メモを保存しました');
  }
}

// メモを削除
function deleteMemo() {
  if (currentMemoIndex >= 0) {
    const memoTitle = memos[currentMemoIndex].title || memos[currentMemoIndex].content.substring(0, 20) || '無題のメモ';
    
    // 確認ダイアログを表示
    if (confirm(`"${memoTitle}" を削除します。よろしいですか？`)) {
      // メモを削除
      memos.splice(currentMemoIndex, 1);
      
      // currentMemoIndexをリセット
      currentMemoIndex = -1;
      
      // ローカルストレージを更新
      saveMemos();
      
      // メモリストを再描画
      renderMemoList();
      
      // メモが残っている場合は最初のメモをロード、そうでない場合は新しいメモを作成
      if (memos.length > 0) {
        loadMemo(0);
      } else {
        createNewMemo();
      }
      
      showLogMessage('メモを削除しました');
    }
  }
}

// コンテンツ入力時の処理
function handleContentInput() {
  // タイトル表示を更新
  updateTitleDisplay(contentInput.value);
  
  // 既存のタイマーをクリア
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  // 1秒後に自動保存するタイマーを設定
  autoSaveTimer = setTimeout(() => {
    // コンテンツが変更されていて、かつ空白でない場合にのみ保存
    if (currentMemoIndex >= 0 && contentInput.value !== lastContent && contentInput.value.trim() !== '') {
      memos[currentMemoIndex].title = memos[currentMemoIndex].content.substring(0, 20);
      memos[currentMemoIndex].content = contentInput.value;
      saveMemos();
      renderMemoList();
      lastContent = contentInput.value; // 保存後にlastContentを更新
      showLogMessage('メモを自動保存しました');
    }
  }, 1000); // 1秒間入力がなければ自動保存
}

// メモをローカルストレージに保存
function saveMemos() {
  localStorage.setItem('memos', JSON.stringify(memos));
}

// コンテンツをコピー
function copyContent() {
  contentInput.select();
  document.execCommand('copy');
  showLogMessage('コンテンツをコピーしました');
}

// メモを検索
function filterMemos() {
  const searchTerm = searchInput.value.toLowerCase();
  const memoItems = document.querySelectorAll('.memo-item');
  
  memoItems.forEach((item, index) => {
    const memo = memos[index];
    if (memo.title.toLowerCase().includes(searchTerm) || memo.content.toLowerCase().includes(searchTerm)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// ページがロードされたら初期化
window.addEventListener('DOMContentLoaded', init);