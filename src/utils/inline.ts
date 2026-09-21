export type InlineSpan = { text: string; style: 'plain' | 'bold' | 'italic' };

// Tiny inline markup for resume text: **bold** and _italic_. Deliberately
// not full Markdown — just what a dense resume needs, and safe to render
// without set:html. Avoid underscores inside words (e.g. snake_case).
export function parseInline(text: string): InlineSpan[] {
  return text
    .split(/(\*\*.+?\*\*|_.+?_)/)
    .filter(Boolean)
    .map((part): InlineSpan => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return { text: part.slice(2, -2), style: 'bold' };
      }
      if (part.length > 2 && part.startsWith('_') && part.endsWith('_')) {
        return { text: part.slice(1, -1), style: 'italic' };
      }
      return { text: part, style: 'plain' };
    });
}
