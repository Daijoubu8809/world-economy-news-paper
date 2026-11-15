/**
 * The editor's desk tool. It does the bookkeeping so a run only has to research and write.
 *
 *   npm run desk                 what is in the paper now and what this run owes (read this, not edition.json)
 *   npm run file -- <patch.json> merge a patch into the edition, stamp it, prune, validate and archive it
 *   npm run quiet                nothing new: only bump checkedAt / nextRunAt
 *
 * Patch format: see EDITOR.md.
 */
import { readFileSync } from 'node:fs';
import { EditionSchema, StorySchema, type Edition, type Story } from '../src/lib/schema.ts';
import { PRUNE_HOURS, checkEdition, editionFor, et, etIso, nextRun } from './lib.ts';
import { DATA, archive, loadTopics, previousEdition, printReport, readJson, writeEdition, zodIssues } from './store.ts';

const HOUR = 3600_000;
const now = new Date();
const [cmd = 'digest', arg] = process.argv.slice(2);

function current(): Edition {
  return EditionSchema.parse(readJson(new URL('edition.json', DATA)));
}

function when(d: Date): string {
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
}

function digest() {
  const ed = current();
  const run = editionFor(now);
  const same = ed.id === run.id;
  const out: string[] = [];
  out.push(`NOW ${when(now)}. This run files edition ${run.id}${same ? ' (already filed once; filing again replaces it)' : ` (No. ${ed.number + 1})`}. Next run: ${when(nextRun(now))}.`);
  out.push(`IN THE PAPER: ${ed.id} (No. ${ed.number}), published ${when(new Date(ed.publishedAt))}.`);
  const lead = ed.stories.find((s) => s.id === ed.lead);
  out.push(`LAST LEAD — may not lead again unless it has a real new development AND a new headline:\n  ${ed.lead} — ${lead?.headline ?? '(gone)'}`);
  const feat = ed.feature && ed.feature.date === run.date ? `already written today (${ed.feature.kind}: ${ed.feature.title}) — leave it` : `none yet today — write one`;
  out.push(`FEATURE due today: ${run.feature} — ${feat}`);
  out.push('STORIES  (hours since update · importance · depth · beat · id — headline)');
  for (const s of [...ed.stories].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
    const age = Math.round((now.getTime() - Date.parse(s.updatedAt)) / HOUR);
    const flag = age >= PRUNE_HOURS ? '  ✂ auto-dropped on filing unless you report something new' : age >= 24 ? '  (off the front page: over 24h)' : '';
    out.push(`  ${String(age).padStart(3)}h · ${s.importance} · ${s.depth} · ${s.beat} · ${s.id} — ${s.headline}${flag}`);
  }
  out.push('STORYLINES  (id | title | last line)');
  for (const l of ed.storylines) out.push(`  ${l.id} | ${l.title} | ${l.line}${l.storyId ? ` → ${l.storyId}` : ''}`);
  if (!ed.storylines.length) out.push('  (none)');
  if (ed.tape) out.push(`TAPE as of ${ed.tape.asOf}: ${ed.tape.items.map((t) => `${t.label} ${t.value}${t.change ? ` (${t.change})` : ''}`).join(' · ')}`);
  else out.push('TAPE: none');
  out.push(`CALENDAR: ${ed.calendar.map((c) => `${c.date} ${c.label}`).join(' · ') || '(empty)'}`);
  out.push(`BEATS: ${loadTopics().filter((t) => t.enabled).map((t) => t.id).join(', ')}`);
  console.log(out.join('\n'));
}

type StoryPatch = Partial<Story> & { id: string; minor?: boolean };
interface Patch {
  lead?: string;
  frontLayout?: Edition['frontLayout'] | null;
  drop?: string[];
  stories?: StoryPatch[];
  brief?: Edition['brief'];
  tape?: Edition['tape'] | null;
  storylines?: Edition['storylines'];
  calendar?: Edition['calendar'];
  feature?: (Omit<NonNullable<Edition['feature']>, 'date'> & { date?: string }) | null;
  numberOfDay?: Edition['numberOfDay'] | null;
  belowFold?: Edition['belowFold'] | null;
}

function readMinutes(s: Partial<Story>): number {
  const words = JSON.stringify(s).split(/\s+/).length;
  return Math.min(8, Math.max(1, Math.round(words / 230)));
}

function file(path: string | undefined) {
  if (!path) throw new Error('usage: npm run file -- <patch.json>');
  const patch = JSON.parse(readFileSync(path, 'utf8')) as Patch;
  const ed = current();
  const run = editionFor(now);
  const fresh = ed.id !== run.id;
  const stamp = etIso(now);
  const notes: string[] = [];
  const problems: string[] = [];

  const drop = new Set(patch.drop ?? []);
  let stories = ed.stories.filter((s) => !drop.has(s.id));
  for (const id of drop) if (!ed.stories.some((s) => s.id === id)) notes.push(`drop: "${id}" was not in the paper`);

  for (const { minor, ...p } of patch.stories ?? []) {
    const i = stories.findIndex((s) => s.id === p.id);
    if (i >= 0) {
      const merged = { ...stories[i], ...p, publishedAt: stories[i].publishedAt, updatedAt: minor ? stories[i].updatedAt : stamp } as Story;
      if (!p.readMinutes) merged.readMinutes = readMinutes(merged);
      if (!minor && !p.updateNote) delete merged.updateNote;
      stories[i] = merged;
    } else {
      const made = { developing: false, depth: 'brief', importance: 3, ...p, publishedAt: stamp, updatedAt: stamp } as Story;
      if (!p.readMinutes) made.readMinutes = readMinutes(made);
      stories.push(made);
    }
  }
  stories.forEach((s, i) => {
    const parsed = StorySchema.safeParse(s);
    if (!parsed.success) problems.push(`story "${s.id}":\n${zodIssues(parsed.error)}`);
    else stories[i] = parsed.data;
  });

  const cutoff = now.getTime() - PRUNE_HOURS * HOUR;
  const stale = stories.filter((s) => Date.parse(s.updatedAt) < cutoff);
  if (stale.length) notes.push(`auto-dropped (over ${PRUNE_HOURS}h old): ${stale.map((s) => s.id).join(', ')}`);
  stories = stories.filter((s) => !stale.includes(s));
  const live = new Set(stories.map((s) => s.id));

  if (fresh) {
    if (!patch.lead) problems.push('a new edition needs "lead"');
    if (!patch.brief) problems.push('a new edition needs "brief"');
    if (!patch.storylines) problems.push('a new edition needs "storylines" (repeat the list; one line each on what changed)');
  }
  const pick = <T,>(given: T | null | undefined, kept: T | undefined): T | undefined => (given === null ? undefined : given ?? kept);
  const featureToday = ed.feature && ed.feature.date === run.date ? ed.feature : undefined;

  const next: Edition = {
    version: 2,
    id: run.id,
    number: fresh ? ed.number + 1 : ed.number,
    editionType: run.type,
    publishedAt: stamp,
    checkedAt: stamp,
    nextRunAt: etIso(nextRun(now)),
    lead: patch.lead ?? ed.lead,
    frontLayout: pick(patch.frontLayout, fresh ? undefined : ed.frontLayout),
    brief: patch.brief ?? ed.brief,
    tape: pick(patch.tape, ed.tape),
    storylines: (patch.storylines ?? ed.storylines).map((l) => (l.storyId && !live.has(l.storyId) ? { ...l, storyId: undefined } : l)),
    feature: patch.feature ? { ...patch.feature, date: run.date } : pick(patch.feature, featureToday),
    // Per-edition items do not carry over into a new edition.
    numberOfDay: pick(patch.numberOfDay, fresh ? undefined : ed.numberOfDay),
    belowFold: pick(patch.belowFold, fresh ? undefined : ed.belowFold),
    calendar: (patch.calendar ?? ed.calendar).filter((c) => c.date >= run.date),
    stories,
  };

  const parsed = EditionSchema.safeParse(JSON.parse(JSON.stringify(next)));
  if (!parsed.success) problems.push(`edition:\n${zodIssues(parsed.error)}`);
  const report = parsed.success
    ? checkEdition(parsed.data, new Map(loadTopics().map((t) => [t.id, t.enabled])), previousEdition(run.id), now.getTime())
    : { errors: [], warnings: [] };
  report.errors.unshift(...problems);
  for (const n of notes) console.log(`note: ${n}`);
  if (!printReport(report) || !parsed.success) process.exit(1);

  const done = parsed.data;
  if (run.feature && !done.feature) console.warn(`warning: no feature today (${run.feature} is due)`);
  writeEdition(done);
  archive(done);
  const lead = done.stories.find((s) => s.id === done.lead)!;
  const p = et(now);
  const label = now.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
  console.log(`✓ filed ${done.id} (No. ${done.number}) — ${done.stories.length} stories, lead: ${lead.headline}`);
  console.log(`commit with:\n  git add public/data && git commit -m "Edition ${label} ${p.hour < 12 ? 'AM' : 'PM'}: ${lead.headline.replace(/"/g, "'").slice(0, 60)}" && git push origin main`);
}

function quiet() {
  const ed = current();
  const stamp = etIso(now);
  const next = { ...ed, checkedAt: stamp, nextRunAt: etIso(nextRun(now)) };
  writeEdition(next);
  archive(next);
  console.log(`✓ quiet run: checkedAt ${stamp}. Commit with:\n  git add public/data && git commit -m "Quiet run ${when(now)}" && git push origin main`);
}

if (cmd === 'digest') digest();
else if (cmd === 'file') file(arg);
else if (cmd === 'quiet') quiet();
else throw new Error(`unknown command "${cmd}"`);
