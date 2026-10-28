/**
 * Personal glossary: every key term from a story you open is saved here (stories roll off the
 * paper after a few days; your terms don't). Flashcards use a simple Leitner schedule.
 */
import type { KeyTerm, Story } from './schema.ts';
import { termKey } from './markup.ts';
import { createStore } from './storage.ts';
import { dayKey } from './timer.ts';

export interface GlossaryEntry {
  key: string;
  term: string;
  definition: string;
  example?: string;
  storyId: string;
  headline: string;
  firstSeen: string;
  /** Leitner box 0–5; higher = known better, reviewed less often. */
  box: number;
  /** Local date (YYYY-MM-DD) the card is next due. */
  due: string;
}

export type Glossary = Record<string, GlossaryEntry>;

/** Days until next review after landing in box i. */
export const INTERVALS = [0, 1, 3, 7, 16, 35];

export const glossaryStore = createStore<Glossary>('glossary', {});

export function addTerms(g: Glossary, story: Pick<Story, 'id' | 'headline'>, terms: KeyTerm[], now = new Date()): Glossary {
  let changed = false;
  const next = { ...g };
  for (const t of terms) {
    const key = termKey(t.term);
    if (next[key]) continue;
    next[key] = {
      key,
      term: t.term,
      definition: t.definition,
      example: t.example,
      storyId: story.id,
      headline: story.headline,
      firstSeen: now.toISOString(),
      box: 0,
      due: dayKey(now),
    };
    changed = true;
  }
  return changed ? next : g;
}

export function review(entry: GlossaryEntry, gotIt: boolean, now = new Date()): GlossaryEntry {
  const box = gotIt ? Math.min(entry.box + 1, INTERVALS.length - 1) : 0;
  const due = new Date(now);
  due.setDate(due.getDate() + INTERVALS[box]);
  return { ...entry, box, due: dayKey(due) };
}

export function dueCards(g: Glossary, now = new Date()): GlossaryEntry[] {
  const today = dayKey(now);
  return Object.values(g)
    .filter((e) => e.due <= today)
    .sort((a, b) => a.box - b.box || a.firstSeen.localeCompare(b.firstSeen));
}
