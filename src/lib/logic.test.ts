import { describe, expect, it } from 'vitest';
import { plain, termKey, termRefs, tokenize } from './markup.ts';
import { IDLE_MS, dayKey, formatClock, shouldCount, streak } from './timer.ts';
import { addTerms, dueCards, review } from './glossary.ts';
import { SESSION_GAP_MS, freshness, nextVisit } from './visits.ts';
import type { Story } from './schema.ts';

describe('markup', () => {
  it('tokenizes bold, italic, terms, aliases and links', () => {
    expect(tokenize('A **big** *move* in [[term premium]] and [[the curve|yield curve]] per [Fed](https://federalreserve.gov).')).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'bold', text: 'big' },
      { kind: 'text', text: ' ' },
      { kind: 'italic', text: 'move' },
      { kind: 'text', text: ' in ' },
      { kind: 'term', text: 'term premium', term: 'term premium' },
      { kind: 'text', text: ' and ' },
      { kind: 'term', text: 'the curve', term: 'yield curve' },
      { kind: 'text', text: ' per ' },
      { kind: 'link', text: 'Fed', href: 'https://federalreserve.gov' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('ignores non-https links', () => {
    expect(tokenize('[x](javascript:alert(1))')).toEqual([{ kind: 'text', text: '[x](javascript:alert(1))' }]);
  });

  it('normalizes term keys and extracts refs', () => {
    expect(termKey('Fed Funds Futures')).toBe(termKey('fed funds  futures'));
    expect(termKey("Warsh's put")).toBe('warshs-put');
    expect(termRefs('see [[bp|basis point]] and [[QT]]')).toEqual(['basis point', 'QT']);
    expect(plain('**Hawks** win [[dot plot]]')).toBe('Hawks win dot plot');
  });
});

describe('timer', () => {
  const now = 1_000_000;
  it('counts only when visible, focused and recently active', () => {
    expect(shouldCount({ visible: true, focused: true, lastInput: now - 1000, now })).toBe(true);
    expect(shouldCount({ visible: false, focused: true, lastInput: now, now })).toBe(false);
    expect(shouldCount({ visible: true, focused: false, lastInput: now, now })).toBe(false);
    expect(shouldCount({ visible: true, focused: true, lastInput: now - IDLE_MS, now })).toBe(false);
  });

  it('computes streaks that include today only once the goal is met', () => {
    const today = new Date(2026, 9, 28);
    const d = (offset: number) => dayKey(new Date(2026, 9, 28 - offset));
    expect(streak({ [d(1)]: 1300, [d(2)]: 1500, [d(3)]: 100 }, today)).toBe(2);
    expect(streak({ [d(0)]: 1200, [d(1)]: 1300, [d(2)]: 1500 }, today)).toBe(3);
    expect(streak({ [d(0)]: 500, [d(2)]: 1500 }, today)).toBe(0);
  });

  it('formats clocks', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});

describe('glossary', () => {
  const story = { id: 's1', headline: 'Fed holds' };
  it('adds new terms once and keeps the original', () => {
    const g1 = addTerms({}, story, [{ term: 'Dot plot', definition: 'a' }]);
    const g2 = addTerms(g1, { id: 's2', headline: 'x' }, [{ term: 'dot plot', definition: 'b' }]);
    expect(g2).toBe(g1);
    expect(Object.values(g2)[0].storyId).toBe('s1');
  });

  it('schedules reviews on a Leitner ladder and resets on a miss', () => {
    const now = new Date(2026, 9, 28);
    const [e] = Object.values(addTerms({}, story, [{ term: 'QT', definition: 'x' }], now));
    const r1 = review(e, true, now);
    expect(r1.box).toBe(1);
    expect(r1.due).toBe(dayKey(new Date(2026, 9, 29)));
    const r2 = review(review(r1, true, now), false, now);
    expect(r2.box).toBe(0);
    expect(dueCards({ [r2.key]: r2 }, now)).toHaveLength(1);
    expect(dueCards({ [r1.key]: r1 }, now)).toHaveLength(0);
  });
});

describe('visits', () => {
  it('keeps the baseline within a sitting and moves it after a gap', () => {
    const first = nextVisit(null, 1000);
    expect(first.baseline).toBe(1000);
    const sameSitting = nextVisit({ lastActiveAt: 5000, baseline: 1000 }, 5000 + SESSION_GAP_MS - 1);
    expect(sameSitting.baseline).toBe(1000);
    const later = nextVisit({ lastActiveAt: 5000, baseline: 1000 }, 5000 + SESSION_GAP_MS + 1);
    expect(later.baseline).toBe(5000);
  });

  it('marks new, updated and read stories', () => {
    const s = { id: 'a', publishedAt: '2026-10-28T18:00:00Z', updatedAt: '2026-10-28T20:00:00Z' } as Story;
    const since = Date.parse('2026-10-28T19:00:00Z');
    expect(freshness(s, {}, since)).toBe('updated');
    expect(freshness(s, {}, Date.parse('2026-10-28T17:00:00Z'))).toBe('new');
    expect(freshness(s, { a: s.updatedAt }, since)).toBe('read');
    expect(freshness(s, { a: '2026-10-28T18:00:00Z' }, since)).toBe('updated');
  });
});
