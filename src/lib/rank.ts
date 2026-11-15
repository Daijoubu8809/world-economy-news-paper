/**
 * Front-page ranking. A story's score is its importance decayed by age, so today's importance-3
 * story outranks a two-day-old importance-5 one. Ages are measured from the edition's publishedAt
 * (not the wall clock) so an edition lays out the same whenever it is opened, including from the archive.
 */
import type { Edition, Story } from './schema.ts';

export const HALF_LIFE_HOURS = 12;
/** Stories not updated within this window never take a top slot. */
export const FRONT_MAX_AGE_HOURS = 24;

const HOUR = 3600_000;

export function ageHours(story: Pick<Story, 'updatedAt'>, at: number): number {
  return Math.max(0, (at - Date.parse(story.updatedAt)) / HOUR);
}

export function score(story: Pick<Story, 'importance' | 'updatedAt'>, at: number): number {
  return story.importance * 0.5 ** (ageHours(story, at) / HALF_LIFE_HOURS);
}

export interface FrontPage {
  layout: 'banner' | 'split';
  lead: Story | undefined;
  seconds: Story[];
  /** Remaining fresh stories grouped by beat, each group ranked. */
  desks: Map<string, Story[]>;
  /** Stories older than the front-page window. */
  earlier: Story[];
}

export function frontPage(edition: Edition, beatOrder: string[] = []): FrontPage {
  const at = Date.parse(edition.publishedAt);
  const byScore = (a: Story, b: Story) => score(b, at) - score(a, at) || a.id.localeCompare(b.id);
  const lead = edition.stories.find((s) => s.id === edition.lead);
  const others = edition.stories.filter((s) => s !== lead).sort(byScore);
  const fresh = others.filter((s) => ageHours(s, at) <= FRONT_MAX_AGE_HOURS);
  const seconds = fresh.slice(0, 2);
  const rest = fresh.slice(2);
  const order = [...beatOrder, ...new Set(rest.map((s) => s.beat))];
  const desks = new Map<string, Story[]>();
  for (const beat of order) {
    if (desks.has(beat)) continue;
    const list = rest.filter((s) => s.beat === beat);
    if (list.length) desks.set(beat, list);
  }
  return {
    layout: edition.frontLayout ?? (lead && lead.importance >= 5 ? 'banner' : 'split'),
    lead,
    seconds,
    desks,
    earlier: others.filter((s) => ageHours(s, at) > FRONT_MAX_AGE_HOURS),
  };
}

/** The interview question of the day: the lead's if it has one, else the best-ranked story's. */
export function questionOfDay(edition: Edition): Story | undefined {
  const at = Date.parse(edition.publishedAt);
  const lead = edition.stories.find((s) => s.id === edition.lead);
  if (lead?.interview) return lead;
  return edition.stories.filter((s) => s.interview).sort((a, b) => score(b, at) - score(a, at))[0];
}
