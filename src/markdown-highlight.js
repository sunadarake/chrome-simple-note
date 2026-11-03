const INLINE_PATTERN =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\([^)\n]+\))/g;
const INLINE_CLASSES = ['code', 'bold', 'italic', 'link'];

/** @param {string} text */
const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * @param {string} className
 * @param {string} text
 */
const wrap = (className, text) =>
  `<span class="md-${className}">${escapeHtml(text)}</span>`;

/** @param {string} text */
function highlightInline(text) {
  let html = '';
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    html += escapeHtml(text.slice(lastIndex, match.index));
    const group = match.findIndex((value, i) => i > 0 && value !== undefined);
    html += wrap(INLINE_CLASSES[group - 1], match[0]);
    lastIndex = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(lastIndex));
}

/** @param {string} line */
function highlightLine(line) {
  if (/^#{1,6}\s/.test(line)) return wrap('heading', line);
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return wrap('hr', line);
  if (line.startsWith('>')) return wrap('quote', line);
  const list = line.match(/^(\s*(?:[-*+]|\d+\.)\s)(.*)$/);
  if (list) return wrap('list', list[1]) + highlightInline(list[2]);
  return highlightInline(line);
}

/**
 * textarea の背面に重ねて表示する HTML を作る。
 * 文字は増減させない（textarea と表示位置がずれないようにするため）
 * @param {string} text
 * @returns {string}
 */
export function highlightMarkdown(text) {
  let inCodeBlock = false;
  const html = text
    .split('\n')
    .map((line) => {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return wrap('codeblock', line);
      }
      return inCodeBlock ? wrap('codeblock', line) : highlightLine(line);
    })
    .join('\n');
  // 末尾の改行だけだと pre に最後の空行が表示されず、textarea と高さがずれる
  return text.endsWith('\n') ? `${html} ` : html;
}
