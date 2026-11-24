/**
 * @param {ParentNode} root
 * @param {string} selector
 */
export function query(root, selector) {
  const element = /** @type {HTMLElement | null} */ (
    root.querySelector(selector)
  );
  if (!element) throw new Error(`要素が見つかりません: ${selector}`);
  return element;
}
