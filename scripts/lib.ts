/**
 * Shared by the validator and the desk tool: Eastern-time helpers, the run schedule, and every
 * rule an edition has to pass. Keeping the rules in code (not in the editor's head) is what makes
 * runs cheap and the front page change every edition.
 */
import { termKey, termRefs } from '../src/lib/markup.ts';
import type { Edition, EditionType, FeatureKind, Story } from '../src/lib/schema.ts';

export const TZ = 'America/New_York';
/** Scheduled runs in ET, [hour, minute]. Keep in step with the scheduled tasks. */
export const SCHEDULE = { weekday: [[6, 52], [16, 52]], weekend: [[11, 52]] } as const;
/** Stories older than this (since their last update) are dropped automatically when an edition is filed. */
export const PRUNE_HOURS = 48;
/** Hard limit the validator enforces, measured from the edition's publishedAt. */
export const MAX_AGE_HOURS = 60;
export const LEAD_MAX_AGE_HOURS = 24;
export const ARCHIVE_KEEP = 40;

const PAYWALLED = ['wsj.com', 'ft.com', 'bloomberg.com', 'barrons.com', 'economist.com', 'nytimes.com'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FEATURE_BY_DAY: FeatureKind[] = ['long-read', 'week-ahead', 'explainer', 'debate', 'sector-spotlight', 'week-in-review', 'long-read'];

export interface EtParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday. */
  weekday: number;
  /** e.g. "-05:00". */
  offset: string;
  /** YYYY-MM-DD. */
  date: string;
}

export function et(d: Date): EtParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    timeZoneName: 'longOffset',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const offset = get('timeZoneName').replace('GMT', '') || '+00:00';
  return {
    year: +get('year'),
    month: +get('month'),
    day: +get('day'),
    hour: +get('hour'),
    minute: +get('minute'),
    weekday: WEEKDAYS.indexOf(get('weekday')),
    offset,
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO 8601 with the ET offset, to the minute. */
export function etIso(d: Date): string {
  const p = et(d);
  return `${p.date}T${pad(p.hour)}:${pad(p.minute)}:00${p.offset}`;
}

/** The instant of an ET wall-clock time on the ET calendar day `daysAhead` after `from`. */
function etInstant(from: Date, daysAhead: number, hour: number, minute: number): Date {
  const p = et(from);
  const wall = Date.UTC(p.year, p.month - 1, p.day + daysAhead, hour, minute);
  const guess = new Date(`${new Date(wall).toISOString().slice(0, 16)}:00${p.offset}`);
  // Re-resolve with the offset in force at that instant (handles a DST change in between).
  return new Date(`${new Date(wall).toISOString().slice(0, 16)}:00${et(guess).offset}`);
}

export function nextRun(now: Date): Date {
  for (let day = 0; day < 8; day++) {
    const probe = etInstant(now, day, 12, 0);
    const wd = et(probe).weekday;
    for (const [h, m] of wd === 0 || wd === 6 ? SCHEDULE.weekend : SCHEDULE.weekday) {
      const at = etInstant(now, day, h, m);
      // A run that fires a few minutes early still points at the slot after its own.
      if (at.getTime() > now.getTime() + 20 * 60_000) return at;
    }
  }
  throw new Error('no next run found');
}

export function editionFor(now: Date): { id: string; type: EditionType; date: string; feature: FeatureKind } {
  const p = et(now);
  const type: EditionType = p.weekday === 0 || p.weekday === 6 ? 'weekend' : p.hour < 12 ? 'am' : 'pm';
  return { id: `${p.date}-${type}`, type, date: p.date, feature: FEATURE_BY_DAY[p.weekday] };
}

export function storyText(s: Story): string[] {
  return [
    ...s.tldr,
    ...s.whatHappened,
    ...(s.background ?? []),
    ...s.whyItMatters,
    ...(s.grandLine ? [s.grandLine.body] : []),
    ...(s.views ?? []).flatMap((v) => [v.thesis, v.argument]),
    ...(s.interview ? [s.interview.question, s.interview.answer, s.interview.followUp.question, s.interview.followUp.answer] : []),
    ...(s.trade ? [s.trade.expression, s.trade.rationale, ...s.trade.risks] : []),
    ...(s.watchNext ?? []).map((w) => w.what),
    ...(s.keyTerms ?? []).flatMap((k) => [k.definition, k.example ?? '']),
  ];
}

export interface Report {
  errors: string[];
  warnings: string[];
}

/**
 * @param beats  beat id -> enabled
 * @param prev   the previous edition (a different id), if the archive has one
 * @param now    wall clock, for "timestamp in the future" checks
 */
export function checkEdition(ed: Edition, beats: Map<string, boolean>, prev: Edition | undefined, now = Date.now()): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const future = (iso: string) => Date.parse(iso) > now + 10 * 60_000;
  const published = Date.parse(ed.publishedAt);
  const ids = new Set<string>();

  if (Date.parse(ed.checkedAt) < published) errors.push('checkedAt is earlier than publishedAt');
  if (future(ed.publishedAt) || future(ed.checkedAt)) errors.push('edition timestamps are in the future');
  if (!ed.id.endsWith(`-${ed.editionType}`)) errors.push(`id "${ed.id}" does not match editionType "${ed.editionType}"`);

  const noTerms = [
    ...ed.brief.bullets,
    ed.brief.mood ?? '',
    ...ed.calendar.map((c) => c.why),
    ...ed.storylines.map((s) => s.line),
    ...(ed.feature ? [ed.feature.title, ...ed.feature.body, ...(ed.feature.quiz ?? []).flatMap((q) => [q.q, q.explain, ...q.options])] : []),
    ...(ed.numberOfDay ? [ed.numberOfDay.why] : []),
    ...(ed.belowFold ? [ed.belowFold.text] : []),
  ];
  for (const s of ed.stories) noTerms.push(s.headline, s.dek);
  for (const t of noTerms)
    if (termRefs(t).length) errors.push(`[[term]] markup is only allowed in story bodies: "${t.slice(0, 60)}…"`);

  for (const s of ed.stories) {
    const where = `story "${s.id}"`;
    if (ids.has(s.id)) errors.push(`${where}: duplicate id`);
    ids.add(s.id);

    if (!beats.has(s.beat)) errors.push(`${where}: unknown beat "${s.beat}" (add it to topics.json)`);
    else if (!beats.get(s.beat)) errors.push(`${where}: beat "${s.beat}" is disabled in topics.json`);

    if (Date.parse(s.updatedAt) < Date.parse(s.publishedAt)) errors.push(`${where}: updatedAt earlier than publishedAt`);
    if (future(s.publishedAt) || future(s.updatedAt)) errors.push(`${where}: timestamp in the future`);
    if (published - Date.parse(s.updatedAt) > MAX_AGE_HOURS * 3600_000)
      errors.push(`${where}: last updated more than ${MAX_AGE_HOURS}h before this edition — drop it or report what is new`);

    const defined = new Set<string>();
    for (const k of s.keyTerms ?? []) {
      const key = termKey(k.term);
      if (defined.has(key)) errors.push(`${where}: key term "${k.term}" defined twice`);
      defined.add(key);
    }
    const text = storyText(s);
    const refs = text.flatMap(termRefs);
    for (const t of refs) if (!defined.has(termKey(t))) errors.push(`${where}: [[${t}]] is used but not defined in keyTerms`);
    const used = new Set(refs.map(termKey));
    for (const k of s.keyTerms ?? [])
      if (!used.has(termKey(k.term))) warnings.push(`${where}: key term "${k.term}" is never marked with [[...]] in the text`);
    if (/\b(TODO|TK|lorem ipsum)\b/i.test(text.join(' '))) errors.push(`${where}: placeholder text left in`);

    if (s.depth === 'full') {
      if (!s.background) errors.push(`${where}: full stories need background`);
      if (!s.views) errors.push(`${where}: full stories need views (the debate)`);
      if (!s.interview) errors.push(`${where}: full stories need an interview question`);
      if ((s.keyTerms ?? []).length < 2) errors.push(`${where}: full stories need at least 2 key terms`);
      if (s.sources.length < 2) errors.push(`${where}: full stories need at least 2 sources`);
    }
    for (const src of s.sources) {
      const host = new URL(src.url).hostname;
      if (PAYWALLED.some((d) => host === d || host.endsWith(`.${d}`)) && !src.paywalled)
        warnings.push(`${where}: ${host} source should be marked "paywalled": true`);
    }

    // A story that was really updated has something new to say, so it gets a new headline.
    const before = prev?.stories.find((p) => p.id === s.id);
    if (before && prev && Date.parse(s.updatedAt) > Date.parse(prev.publishedAt) && before.headline === s.headline)
      errors.push(`${where}: updated since the last edition but the headline is unchanged — write a second-day headline about what is new (or patch it with "minor": true)`);
  }

  const lead = ed.stories.find((s) => s.id === ed.lead);
  if (!lead) errors.push(`lead references missing story "${ed.lead}"`);
  else {
    if (published - Date.parse(lead.updatedAt) > LEAD_MAX_AGE_HOURS * 3600_000)
      errors.push(`lead "${lead.id}" was not updated in the ${LEAD_MAX_AGE_HOURS}h before this edition — lead with something that happened today`);
    if (prev && prev.id !== ed.id && prev.lead === ed.lead && Date.parse(lead.updatedAt) <= Date.parse(prev.publishedAt))
      errors.push(`lead "${lead.id}" also led the last edition (${prev.id}) and has no new development — pick a different lead`);
    if (lead.depth !== 'full') warnings.push(`lead "${lead.id}" is a brief — the lead usually deserves full depth`);
    if (!lead.interview) warnings.push(`lead "${lead.id}" has no interview question (it feeds the question of the day)`);
  }

  for (const line of ed.storylines) {
    if (line.storyId && !ids.has(line.storyId)) errors.push(`storyline "${line.id}" links to missing story "${line.storyId}"`);
  }
  if (new Set(ed.storylines.map((l) => l.id)).size !== ed.storylines.length) errors.push('storylines has duplicate ids');
  for (const q of ed.feature?.quiz ?? []) if (q.answer >= q.options.length) errors.push(`feature quiz "${q.q.slice(0, 40)}…": answer index out of range`);

  const full = ed.stories.filter((s) => s.depth === 'full').length;
  if (full > 4) warnings.push(`${full} full stories — 1–3 is plenty; briefs keep runs cheap`);
  for (const [beat, enabled] of beats)
    if (enabled && !ed.stories.some((s) => s.beat === beat)) warnings.push(`no story on the "${beat}" beat`);

  return { errors, warnings };
}
