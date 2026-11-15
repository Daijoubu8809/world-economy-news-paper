/** File access for the validator and the desk tool: the live edition, topics and the archive. */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { ArchiveIndexSchema, EditionSchema, TopicsFileSchema, type ArchiveIndex, type Edition, type Topic } from '../src/lib/schema.ts';
import { ARCHIVE_KEEP, type Report } from './lib.ts';

export const DATA = new URL('../public/data/', import.meta.url);
export const ARCHIVE = new URL('editions/', DATA);

export function readJson(url: URL): unknown {
  return JSON.parse(readFileSync(url, 'utf8'));
}

export function zodIssues(err: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return err.issues.map((i) => `  - ${i.path.map(String).join('.') || '(root)'}: ${i.message}`).join('\n');
}

export function readIndex(): ArchiveIndex {
  const url = new URL('index.json', ARCHIVE);
  if (!existsSync(url)) return { editions: [] };
  return ArchiveIndexSchema.parse(readJson(url));
}

/** The newest archived edition whose id differs from `notId`. */
export function previousEdition(notId: string | undefined): Edition | undefined {
  const entry = readIndex().editions.find((e) => e.id !== notId);
  if (!entry) return undefined;
  const parsed = EditionSchema.safeParse(readJson(new URL(`${entry.id}.json`, ARCHIVE)));
  return parsed.success ? parsed.data : undefined;
}

export function loadTopics(): Topic[] {
  return TopicsFileSchema.parse(readJson(new URL('topics.json', DATA))).topics;
}

export function loadAll(): { edition?: Edition; beats?: Map<string, boolean>; prev?: Edition; errors: string[] } {
  const errors: string[] = [];
  let edition: Edition | undefined;
  let beats: Map<string, boolean> | undefined;
  try {
    const t = TopicsFileSchema.safeParse(readJson(new URL('topics.json', DATA)));
    if (t.success) beats = new Map(t.data.topics.map((x) => [x.id, x.enabled]));
    else errors.push(`topics.json:\n${zodIssues(t.error)}`);
    const e = EditionSchema.safeParse(readJson(new URL('edition.json', DATA)));
    if (e.success) edition = e.data;
    else errors.push(`edition.json:\n${zodIssues(e.error)}`);
  } catch (e) {
    errors.push(`cannot read/parse JSON — ${(e as Error).message}`);
  }
  let prev: Edition | undefined;
  try {
    prev = previousEdition(edition?.id);
  } catch (e) {
    errors.push(`archive: ${(e as Error).message}`);
  }
  return { edition, beats, prev, errors };
}

export function writeEdition(ed: Edition): void {
  writeFileSync(new URL('edition.json', DATA), `${JSON.stringify(ed, null, 2)}\n`);
}

/** Saves the edition under its id and keeps the newest ARCHIVE_KEEP editions. */
export function archive(ed: Edition): void {
  mkdirSync(ARCHIVE, { recursive: true });
  writeFileSync(new URL(`${ed.id}.json`, ARCHIVE), `${JSON.stringify(ed)}\n`);
  const lead = ed.stories.find((s) => s.id === ed.lead);
  const entry = { id: ed.id, number: ed.number, editionType: ed.editionType, publishedAt: ed.publishedAt, lead: lead?.headline ?? ed.lead, stories: ed.stories.length };
  const editions = [entry, ...readIndex().editions.filter((e) => e.id !== ed.id)].sort((a, b) => b.number - a.number).slice(0, ARCHIVE_KEEP);
  writeFileSync(new URL('index.json', ARCHIVE), `${JSON.stringify({ editions }, null, 2)}\n`);
  const keep = new Set(editions.map((e) => `${e.id}.json`));
  for (const f of readdirSync(ARCHIVE)) if (f !== 'index.json' && !keep.has(f)) rmSync(new URL(f, ARCHIVE));
}

/** Prints warnings and errors; returns true when there are no errors. */
export function printReport(r: Report): boolean {
  for (const w of r.warnings) console.warn(`warning: ${w}`);
  for (const e of r.errors) console.error(`error: ${e}`);
  if (r.errors.length) console.error(`\n✗ ${r.errors.length} error(s). Nothing was written; fix them and run again.`);
  return r.errors.length === 0;
}
