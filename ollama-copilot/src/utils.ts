/**
 * Simple markdown-to-HTML for chat bubbles. Handles:
 * - Fenced code blocks (with language) → pre/code + Copy/Insert buttons
 * - Inline code
 * - Bold, italic
 * - h1, h2, h3
 * - Unordered lists
 * - Line breaks
 */
export function renderMarkdownToHtml(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);

  // Code blocks (```lang ... ```) - must run before other transforms
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_: string, lang: string, code: string) => {
      const codeEscaped = escapeHtml(code.trim());
      const langLabel = lang ? lang : 'plaintext';
      return `<div class="code-block"><div class="code-block-header"><span class="code-lang">${escapeHtml(langLabel)}</span><div class="code-actions"><button class="code-btn copy-btn" data-code="${escapeAttr(code.trim())}">Copy</button><button class="code-btn insert-btn" data-code="${escapeAttr(code.trim())}">Insert</button></div></div><pre><code>${codeEscaped}</code></pre></div>`;
    }
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold **text** or __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Headings (at line start)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Unordered lists - lines starting with - or *
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Line breaks
  html = html.replace(/\n/g, '<br>\n');

  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/**
 * Strip markdown code fences and trim; remove any prefix that looks like echoed prompt.
 */
export function cleanCompletionText(raw: string, prefixHint?: string): string {
  let out = raw.trim();
  // Remove leading ``` and optional language
  out = out.replace(/^```[\w]*\s*\n?/, '').replace(/\n?```\s*$/, '');
  out = out.trim();
  if (prefixHint && out.startsWith(prefixHint)) {
    out = out.slice(prefixHint.length).trim();
  }
  return out;
}
