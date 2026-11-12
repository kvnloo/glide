/**
 * A sheet without comments or spare whitespace, strings left as written. Tern fails a whole surface
 * past 256 KiB of stylesheets, every sheet on it counted (euiCards.test.ts), so every sheet ships
 * through here. A colon inside parentheses keeps its space: `(prefers-reduced-motion: reduce)`.
 */
export const minifyCss = (sheet: string): string => sheet
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/)
  .map((part, i) => i % 2 ? part : part
    .replace(/\s+/g, ' ')
    .replace(/ ?([{};,>]) ?/g, '$1')
    .replace(/: (?![^(]*\))/g, ':'))
  .join('')
  .trim()
