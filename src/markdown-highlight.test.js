import { describe, expect, it } from 'vitest';
import { highlightMarkdown } from './markdown-highlight.js';

const span = (name, text) => `<span class="md-${name}">${text}</span>`;

describe('行単位の記法', () => {
  it.each([
    ['# 見出し', 'heading'],
    ['###### 見出し6', 'heading'],
    ['---', 'hr'],
    ['***', 'hr'],
  ])('%s は %s になる', (line, name) => {
    expect(highlightMarkdown(line)).toBe(span(name, line));
  });

  it('引用は > の部分もエスケープされて色が付く', () => {
    expect(highlightMarkdown('> 引用')).toBe(span('quote', '&gt; 引用'));
  });

  it('# の後ろに空白がなければ見出しにしない', () => {
    expect(highlightMarkdown('#タグ')).toBe('#タグ');
  });

  it.each(['- a', '* a', '+ a', '1. a', '  - a'])(
    'リスト %s は記号の部分だけ色が付く',
    (line) => {
      const marker = line.slice(0, line.indexOf('a'));
      expect(highlightMarkdown(line)).toBe(span('list', marker) + 'a');
    },
  );

  it('リストの本文には行内の記法が効く', () => {
    expect(highlightMarkdown('- **太字**')).toBe(
      span('list', '- ') + span('bold', '**太字**'),
    );
  });

  it('見出しの中では行内の記法を処理しない', () => {
    expect(highlightMarkdown('# **a**')).toBe(span('heading', '# **a**'));
  });
});

describe('行内の記法', () => {
  it.each([
    ['`code`', 'code'],
    ['**bold**', 'bold'],
    ['*italic*', 'italic'],
    ['[文字](https://example.com)', 'link'],
  ])('%s は %s になる', (text, name) => {
    expect(highlightMarkdown(`前${text}後`)).toBe(`前${span(name, text)}後`);
  });

  it('1 行に複数あっても、それぞれに色が付く', () => {
    expect(highlightMarkdown('`a` と **b**')).toBe(
      `${span('code', '`a`')} と ${span('bold', '**b**')}`,
    );
  });

  it('閉じていない記号には色を付けない', () => {
    expect(highlightMarkdown('**a と `b')).toBe('**a と `b');
  });
});

describe('コードブロック', () => {
  const code = (inner) => span('codeblock', inner);

  it('開始行から終了行までをコードブロックにし、中は Markdown の記法を色付けしない', () => {
    expect(highlightMarkdown('```js\nx **b**\n```\n# c')).toBe(
      [
        span('codeblock', '```js'),
        code('x **b**'),
        span('codeblock', '```'),
        span('heading', '# c'),
      ].join('\n'),
    );
  });

  it('閉じていなければ以降すべてコードブロックになる', () => {
    expect(highlightMarkdown('```\nx')).toBe(
      span('codeblock', '```') + '\n' + code('x'),
    );
  });

  it.each([
    ['// a', span('code-comment', '// a')],
    ['# a', span('code-comment', '# a')],
    ['/* a */ b', span('code-comment', '/* a */') + ' b'],
    ['"a\\"b"', span('code-string', '"a\\"b"')],
    ["'a'", span('code-string', "'a'")],
    ['`a`', span('code-string', '`a`')],
    ['x = 42', 'x = ' + span('code-number', '42')],
    ['x = 0xFF', 'x = ' + span('code-number', '0xFF')],
    ['if x', span('code-keyword', 'if') + ' x'],
    ['my $x', span('code-keyword', 'my') + ' $x'],
    ['unless x', span('code-keyword', 'unless') + ' x'],
    ['defer f()', span('code-keyword', 'defer') + ' f()'],
    [
      'for k := range m',
      span('code-keyword', 'for') +
        ' k := ' +
        span('code-keyword', 'range') +
        ' m',
    ],
    ['x := `a\\b`', 'x := ' + span('code-string', '`a\\b`')],
  ])('コード内の %s を色付けする', (line, html) => {
    expect(highlightMarkdown('```\n' + line)).toContain(code(html));
  });

  it('文字列の中の // や # はコメントにしない', () => {
    expect(highlightMarkdown('```\n"a // b" # c')).toContain(
      code(span('code-string', '"a // b"') + ' ' + span('code-comment', '# c')),
    );
  });

  it('閉じていない文字列とコメントには色を付けない', () => {
    expect(highlightMarkdown('```\n"a /* b')).toContain(code('"a /* b'));
  });

  it('識別子の一部はキーワードや数値にしない', () => {
    expect(highlightMarkdown('```\niffy a1')).toContain(code('iffy a1'));
  });
});

describe('エスケープと文字の保持', () => {
  it('< > & をエスケープする', () => {
    expect(highlightMarkdown('<b>&</b>')).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
    expect(highlightMarkdown('# <a>')).toBe(span('heading', '# &lt;a&gt;'));
  });

  it('空文字列は空文字列を返す', () => {
    expect(highlightMarkdown('')).toBe('');
  });

  it('末尾が改行のときは最後の空行用に 1 文字足す', () => {
    expect(highlightMarkdown('a\n')).toBe('a\n ');
  });

  it('タグを除いた文字列が元の文字列と一致する（末尾の追加分を除く）', () => {
    const text = [
      '# 見出し <script>',
      '> 引用 & **太字**',
      '- リスト `code` *斜体* [a](b)',
      '```',
      'if (x) { return "a<b" } // 1 & 2',
      '```',
      '---',
      '',
      '本文',
      '',
    ].join('\n');
    const container = document.createElement('div');
    container.innerHTML = highlightMarkdown(text);
    expect(container.textContent).toBe(`${text} `);
  });
});
