/**
 * Tiny inline markup used in edition text. Deliberately small so it renders as React elements
 * (never innerHTML):
 *   **bold**   *italic*   [[term]]   [[shown text|term]]   [label](https://url)
 * [[...]] links to a key term defined on the same story.
 */
export type Token =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'term'; text: string; term: string }
  | { kind: 'link'; text: string; href: string };

const PATTERN = /\*\*(.+?)\*\*|\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]|\[([^\]]+?)\]\((https:\/\/[^)\s]+)\)|\*(.+?)\*/g;

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of input.matchAll(PATTERN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', text: input.slice(last, at) });
    if (m[1] !== undefined) out.push({ kind: 'bold', text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: 'term', text: m[2], term: (m[3] ?? m[2]).trim() });
    else if (m[4] !== undefined) out.push({ kind: 'link', text: m[4], href: m[5] });
    else if (m[6] !== undefined) out.push({ kind: 'italic', text: m[6] });
    last = at + m[0].length;
  }
  if (last < input.length) out.push({ kind: 'text', text: input.slice(last) });
  return out;
}

/** Normalized key for matching [[term]] references and glossary entries. */
export function termKey(term: string): string {
  return term
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function termRefs(input: string): string[] {
  return tokenize(input).flatMap((t) => (t.kind === 'term' ? [t.term] : []));
}

/** Plain text (markup stripped), for search and previews. */
export function plain(input: string): string {
  return tokenize(input)
    .map((t) => t.text)
    .join('');
}
