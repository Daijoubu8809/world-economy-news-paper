/**
 * "New since your last visit" and read tracking. A visit ends after SESSION_GAP_MS of no use, so
 * badges survive refreshes within a sitting and reset the next time you come back.
 */
import type { Story } from './schema.ts';
import { createStore, readJSON, writeJSON } from './storage.ts';

export const SESSION_GAP_MS = 30 * 60_000;

interface VisitState {
  lastActiveAt: number;
  baseline: number;
}

/** Returns the baseline: stories published after it are NEW. First-ever visit: nothing is NEW. */
export function nextVisit(prev: VisitState | null, now: number): VisitState {
  if (!prev) return { lastActiveAt: now, baseline: now };
  const baseline = now - prev.lastActiveAt > SESSION_GAP_MS ? prev.lastActiveAt : prev.baseline;
  return { lastActiveAt: now, baseline };
}

let baseline = 0;

export function startVisit() {
  const state = nextVisit(readJSON<VisitState | null>('visit', null), Date.now());
  baseline = state.baseline;
  writeJSON('visit', state);
  setInterval(() => {
    if (document.visibilityState === 'visible') writeJSON('visit', { lastActiveAt: Date.now(), baseline });
  }, 60_000);
}

/** storyId -> the story's updatedAt when you read it. */
export const readStore = createStore<Record<string, string>>('read', {});

export type Freshness = 'new' | 'updated' | 'read' | 'seen';

export function freshness(story: Story, read: Record<string, string>, since = baseline): Freshness {
  const readAt = read[story.id];
  if (readAt) return Date.parse(story.updatedAt) > Date.parse(readAt) ? 'updated' : 'read';
  if (since && Date.parse(story.publishedAt) > since) return 'new';
  if (since && Date.parse(story.updatedAt) > since) return 'updated';
  return 'seen';
}

export function markRead(story: Story) {
  readStore.set((r) => (r[story.id] === story.updatedAt ? r : { ...r, [story.id]: story.updatedAt }));
}
