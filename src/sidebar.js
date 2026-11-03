const STORAGE_KEY = 'sidebarWidth';
const COLLAPSED_KEY = 'sidebarCollapsed';
const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 280;

/** @param {number} width */
const clamp = (width) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));

/**
 * @param {ParentNode} root
 * @param {string} selector
 */
function query(root, selector) {
  const element = /** @type {HTMLElement | null} */ (
    root.querySelector(selector)
  );
  if (!element) throw new Error(`要素が見つかりません: ${selector}`);
  return element;
}

/**
 * サイドバーの右端のドラッグで幅を変え、変えた幅を保存する
 * @param {object} deps
 * @param {ParentNode} deps.root
 * @param {Pick<Storage, 'getItem' | 'setItem'>} deps.storage
 */
export function initSidebarResize({ root, storage }) {
  const container = query(root, '.container');
  const sidebar = query(root, '.sidebar');
  const resizer = query(root, '.sidebar-resizer');

  // 保存値が無い・数値でないときは NaN や 0 になり、既定値を使う
  let width = clamp(Number(storage.getItem(STORAGE_KEY)) || DEFAULT_WIDTH);
  sidebar.style.width = `${width}px`;

  /** @param {MouseEvent} event */
  function handleMouseMove(event) {
    // .container は画面が広いと中央寄せになるため、左端からの距離で求める
    width = clamp(event.clientX - container.getBoundingClientRect().left);
    sidebar.style.width = `${width}px`;
  }

  function handleMouseUp() {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    storage.setItem(STORAGE_KEY, String(width));
  }

  resizer.addEventListener('mousedown', (event) => {
    event.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });
}

/**
 * ボタンでサイドバーを開閉し、状態を保存する
 * @param {object} deps
 * @param {ParentNode} deps.root
 * @param {Pick<Storage, 'getItem' | 'setItem'>} deps.storage
 */
export function initSidebarToggle({ root, storage }) {
  const container = query(root, '.container');
  // 開いている間は「SimpleNote」の横、閉じている間はメイン画面の左上のボタンを使う
  const toggles = root.querySelectorAll('.sidebar-toggle');

  /** @param {boolean} collapsed */
  function setCollapsed(collapsed) {
    container.classList.toggle('sidebar-collapsed', collapsed);
    for (const toggle of toggles) {
      toggle.setAttribute('aria-expanded', String(!collapsed));
    }
  }

  setCollapsed(storage.getItem(COLLAPSED_KEY) === 'true');

  for (const toggle of toggles) {
    toggle.addEventListener('click', () => {
      const collapsed = !container.classList.contains('sidebar-collapsed');
      setCollapsed(collapsed);
      storage.setItem(COLLAPSED_KEY, String(collapsed));
    });
  }
}
