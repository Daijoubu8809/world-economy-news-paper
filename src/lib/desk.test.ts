import { describe, expect, it } from 'vitest';
import { frontPage, questionOfDay, score } from './rank.ts';
import { parseHash, href } from './router.ts';
import type { Edition, Story } from './schema.ts';
import { checkEdition, editionFor, et, etIso, nextRun } from '../../scripts/lib.ts';

const story = (id: string, importance: number, updatedAt: string, extra: Partial<Story> = {}): Story => ({
  id,
  beat: 'markets',
  headline: `Headline ${id}`,
  dek: 'Dek',
  importance,
  depth: 'brief',
  developing: false,
  publishedAt: updatedAt,
  updatedAt,
  readMinutes: 1,
  tldr: ['a', 'b'],
  whatHappened: ['x'],
  whyItMatters: ['y'],
  sources: [{ name: 'Reuters', url: 'https://reuters.com/x' }],
  ...extra,
});

const edition = (id: string, publishedAt: string, lead: string, stories: Story[]): Edition => ({
  version: 2,
  id,
  number: 1,
  editionType: id.endsWith('am') ? 'am' : id.endsWith('pm') ? 'pm' : 'weekend',
  publishedAt,
  checkedAt: publishedAt,
  lead,
  brief: { bullets: ['a', 'b', 'c'] },
  storylines: [],
  calendar: [],
  stories,
});

const beats = new Map([['markets', true]]);
const at = '2026-11-16T07:00:00-05:00';
const now = Date.parse(at);

describe('rank', () => {
  it('decays importance by age: today’s 3 beats a two-day-old 5', () => {
    const t = Date.parse(at);
    expect(score(story('new', 3, '2026-11-16T06:00:00-05:00'), t)).toBeGreaterThan(score(story('old', 5, '2026-11-14T07:00:00-05:00'), t));
  });

  it('builds the front page: lead, two seconds, desks, and nothing stale on top', () => {
    const ed = edition('2026-11-16-am', at, 'lead', [
      story('stale-5', 5, '2026-11-14T18:00:00-05:00'),
      story('lead', 3, '2026-11-16T06:30:00-05:00'),
      story('b', 4, '2026-11-16T06:00:00-05:00'),
      story('c', 2, '2026-11-16T06:00:00-05:00'),
      story('d', 3, '2026-11-15T20:00:00-05:00', { beat: 'world' }),
    ]);
    const f = frontPage(ed, ['world', 'markets']);
    expect(f.lead?.id).toBe('lead');
    expect(f.layout).toBe('split');
    expect(f.seconds.map((s) => s.id)).toEqual(['b', 'c']);
    expect([...f.desks.keys()]).toEqual(['world']);
    expect(f.earlier.map((s) => s.id)).toEqual(['stale-5']);
    expect(frontPage({ ...ed, frontLayout: 'banner' }).layout).toBe('banner');
  });

  it('takes the question of the day from the lead when it has one', () => {
    const interview = { question: 'q', answer: 'a', followUp: { question: 'q2', answer: 'a2' } };
    const ed = edition('2026-11-16-am', at, 'lead', [story('lead', 3, at), story('b', 5, at, { interview })]);
    expect(questionOfDay(ed)?.id).toBe('b');
    ed.stories[0].interview = interview;
    expect(questionOfDay(ed)?.id).toBe('lead');
  });
});

describe('schedule and Eastern time', () => {
  it('formats ET with the right offset on both sides of DST', () => {
    expect(etIso(new Date('2026-11-16T12:00:00Z'))).toBe('2026-11-16T07:00:00-05:00');
    expect(etIso(new Date('2026-07-01T12:00:00Z'))).toBe('2026-07-01T08:00:00-04:00');
    expect(et(new Date('2026-11-15T16:00:00Z')).weekday).toBe(0);
  });

  it('names the edition and the feature due', () => {
    expect(editionFor(new Date('2026-11-16T11:52:00Z'))).toMatchObject({ id: '2026-11-16-am', type: 'am', feature: 'week-ahead' });
    expect(editionFor(new Date('2026-11-16T23:52:00Z'))).toMatchObject({ id: '2026-11-16-pm', type: 'pm' });
    expect(editionFor(new Date('2026-11-15T16:52:00Z'))).toMatchObject({ id: '2026-11-15-weekend', feature: 'long-read' });
  });

  it('finds the next scheduled run, across weekends and DST', () => {
    expect(etIso(nextRun(new Date('2026-11-16T11:53:00Z')))).toBe('2026-11-16T18:52:00-05:00');
    expect(etIso(nextRun(new Date('2026-11-13T23:53:00Z')))).toBe('2026-11-14T11:52:00-05:00');
    expect(etIso(nextRun(new Date('2026-11-15T16:53:00Z')))).toBe('2026-11-16T06:52:00-05:00');
    // A run that fires a minute early does not point at its own slot.
    expect(etIso(nextRun(new Date('2026-11-16T11:51:00Z')))).toBe('2026-11-16T18:52:00-05:00');
    // Saturday before the clocks go back (Nov 1, 2026) to Sunday after.
    expect(etIso(nextRun(new Date('2026-10-31T16:00:00Z')))).toBe('2026-11-01T11:52:00-05:00');
  });
});

describe('edition rules', () => {
  const prev = edition('2026-11-15-weekend', '2026-11-15T12:00:00-05:00', 'saga', [story('saga', 5, '2026-11-15T12:00:00-05:00'), story('b', 3, '2026-11-15T12:00:00-05:00')]);

  it('rejects a lead that led last time with nothing new', () => {
    const ed = edition('2026-11-16-am', at, 'saga', [prev.stories[0], story('n', 3, at)]);
    expect(checkEdition(ed, beats, prev, now).errors.join()).toMatch(/also led the last edition/);
  });

  it('rejects an updated story that kept its old headline, and accepts a second-day headline', () => {
    const same = edition('2026-11-16-am', at, 'saga', [story('saga', 5, at), story('n', 3, at)]);
    expect(checkEdition(same, beats, prev, now).errors.join()).toMatch(/headline is unchanged/);
    const fresh = edition('2026-11-16-am', at, 'saga', [story('saga', 5, at, { headline: 'What changed overnight' }), story('n', 3, at)]);
    expect(checkEdition(fresh, beats, prev, now).errors).toEqual([]);
  });

  it('rejects a stale lead and stories past the age limit', () => {
    const ed = edition('2026-11-16-am', at, 'old', [story('old', 5, '2026-11-15T06:00:00-05:00'), story('ancient', 3, '2026-11-13T06:00:00-05:00')]);
    const errors = checkEdition(ed, beats, undefined, now).errors.join();
    expect(errors).toMatch(/lead with something that happened today/);
    expect(errors).toMatch(/"ancient": last updated more than/);
  });

  it('requires the full sections only on full stories', () => {
    const ed = edition('2026-11-16-am', at, 'a', [story('a', 3, at, { depth: 'full' }), story('b', 3, at)]);
    const errors = checkEdition(ed, beats, undefined, now).errors;
    expect(errors.filter((e) => e.includes('"a"')).length).toBeGreaterThanOrEqual(4);
    expect(errors.some((e) => e.includes('"b"'))).toBe(false);
  });
});

describe('archive routes', () => {
  it('parses and builds past-edition links', () => {
    expect(parseHash('#/past')).toEqual({ name: 'past', edition: undefined, story: undefined });
    expect(parseHash(href.past('2026-11-16-am'))).toEqual({ name: 'past', edition: '2026-11-16-am', story: undefined });
    expect(parseHash(href.story('s1', '2026-11-16-am'))).toEqual({ name: 'past', edition: '2026-11-16-am', story: 's1' });
    expect(parseHash(href.story('s1'))).toEqual({ name: 'story', id: 's1' });
  });
});
