/**
 * Checks public/data/edition.json and public/data/topics.json before anything is committed or
 * deployed. Run with `npm run validate`. Exits non-zero on any error; warnings are advisory.
 */
import { readFileSync } from 'node:fs';
import { EditionSchema, TopicsFileSchema, type Edition, type Story } from '../src/lib/schema.ts';
import { termKey, termRefs } from '../src/lib/markup.ts';

const root = new URL('../public/data/', import.meta.url);
const errors: string[] = [];
const warnings: string[] = [];

const PAYWALLED = ['wsj.com', 'ft.com', 'bloomberg.com', 'barrons.com', 'economist.com', 'nytimes.com'];
const MAX_AGE_HOURS = 96;

function load(name: string): unknown {
  try {
    return JSON.parse(readFileSync(new URL(name, root), 'utf8'));
  } catch (e) {
    errors.push(`${name}: cannot read/parse JSON — ${(e as Error).message}`);
    return undefined;
  }
}

function storyText(s: Story): string[] {
  return [
    ...s.tldr,
    ...s.whatHappened,
    ...s.background,
    ...s.whyItMatters,
    ...(s.grandLine ? [s.grandLine.body] : []),
    ...s.views.flatMap((v) => [v.thesis, v.argument]),
    s.interview.question,
    s.interview.answer,
    s.interview.followUp.question,
    s.interview.followUp.answer,
    ...(s.trade ? [s.trade.expression, s.trade.rationale, ...s.trade.risks] : []),
    ...s.watchNext.map((w) => w.what),
    ...s.keyTerms.flatMap((k) => [k.definition, k.example ?? '']),
  ];
}

function checkEdition(ed: Edition, beats: Map<string, boolean>) {
  const now = Date.now();
  const future = (iso: string) => Date.parse(iso) > now + 10 * 60_000;
  const ids = new Set<string>();

  if (Date.parse(ed.checkedAt) < Date.parse(ed.publishedAt)) errors.push('checkedAt is earlier than publishedAt');
  if (future(ed.publishedAt) || future(ed.checkedAt)) errors.push('edition timestamps are in the future');

  const noTerms = [ed.brief.title, ...ed.brief.bullets, ed.brief.mood ?? '', ...ed.calendar.map((c) => c.why)];
  for (const s of ed.stories) noTerms.push(s.headline, s.dek);
  for (const t of noTerms)
    if (termRefs(t).length) errors.push(`[[term]] markup is only allowed in story bodies, not in headlines/deks/brief/calendar: "${t.slice(0, 60)}…"`);

  for (const s of ed.stories) {
    const where = `story "${s.id}"`;
    if (ids.has(s.id)) errors.push(`${where}: duplicate id`);
    ids.add(s.id);

    if (!beats.has(s.beat)) errors.push(`${where}: unknown beat "${s.beat}" (add it to topics.json)`);
    else if (!beats.get(s.beat)) errors.push(`${where}: beat "${s.beat}" is disabled in topics.json`);

    if (Date.parse(s.updatedAt) < Date.parse(s.publishedAt)) errors.push(`${where}: updatedAt earlier than publishedAt`);
    if (future(s.publishedAt) || future(s.updatedAt)) errors.push(`${where}: timestamp in the future`);
    if (now - Date.parse(s.updatedAt) > MAX_AGE_HOURS * 3600_000)
      errors.push(`${where}: older than ${MAX_AGE_HOURS}h — prune it or update it with new developments`);

    const defined = new Set<string>();
    for (const k of s.keyTerms) {
      const key = termKey(k.term);
      if (defined.has(key)) errors.push(`${where}: key term "${k.term}" defined twice`);
      defined.add(key);
    }
    const text = storyText(s);
    for (const t of text.flatMap(termRefs)) {
      if (!defined.has(termKey(t))) errors.push(`${where}: [[${t}]] is used but not defined in keyTerms`);
    }
    const used = new Set(text.flatMap(termRefs).map(termKey));
    for (const k of s.keyTerms) {
      if (!used.has(termKey(k.term))) warnings.push(`${where}: key term "${k.term}" is never marked with [[...]] in the text`);
    }
    if (/\b(TODO|TK|lorem ipsum)\b/i.test(text.join(' '))) errors.push(`${where}: placeholder text left in`);

    if (s.depth === 'full' && s.sources.length < 2) errors.push(`${where}: full stories need at least 2 sources`);
    for (const src of s.sources) {
      const host = new URL(src.url).hostname;
      if (PAYWALLED.some((d) => host === d || host.endsWith(`.${d}`)) && !src.paywalled)
        warnings.push(`${where}: ${host} source should be marked "paywalled": true`);
    }
    if (s.importance >= 4 && !s.trade) warnings.push(`${where}: importance ${s.importance} story has no trade idea`);
  }

  for (const id of ed.mustKnow) if (!ids.has(id)) errors.push(`mustKnow references missing story "${id}"`);
  if (new Set(ed.mustKnow).size !== ed.mustKnow.length) errors.push('mustKnow has duplicates');

  const full = ed.stories.filter((s) => s.depth === 'full');
  const withAnalogy = full.filter((s) => s.grandLine).length;
  if (full.length && withAnalogy < Math.ceil(full.length / 2))
    warnings.push(`only ${withAnalogy}/${full.length} full stories have a Grand Line analogy (aim for at least half)`);
}

const topicsRaw = load('topics.json');
const editionRaw = load('edition.json');

const topics = TopicsFileSchema.safeParse(topicsRaw);
if (!topics.success) errors.push(`topics.json:\n${z(topics.error)}`);
const edition = EditionSchema.safeParse(editionRaw);
if (!edition.success) errors.push(`edition.json:\n${z(edition.error)}`);

if (topics.success && edition.success) {
  checkEdition(edition.data, new Map(topics.data.topics.map((t) => [t.id, t.enabled])));
}

function z(err: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return err.issues.map((i) => `  - ${i.path.map(String).join('.') || '(root)'}: ${i.message}`).join('\n');
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n✗ ${errors.length} error(s). Fix them before committing.`);
  process.exit(1);
}
const n = edition.success ? edition.data.stories.length : 0;
console.log(`✓ edition valid — ${n} stories, ${warnings.length} warning(s)`);
