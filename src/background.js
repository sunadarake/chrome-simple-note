const MEMO_URL = chrome.runtime.getURL('src/memo.html');
let queue = Promise.resolve();

const openMemo = async () => {
  const [tab] = await chrome.tabs.query({ url: MEMO_URL });
  if (tab?.id === undefined) {
    await chrome.tabs.create({ url: MEMO_URL });
    return;
  }
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
};

chrome.action.onClicked.addListener(
  () => (queue = queue.then(openMemo, openMemo)),
);
