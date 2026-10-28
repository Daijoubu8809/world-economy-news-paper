/**
 * Loads data/edition.json and keeps it fresh: polls while the tab is visible, re-checks the moment
 * you come back to the tab, and keeps the last copy for an instant (and offline) first paint.
 */
import { useEffect, useRef, useState } from 'react';
import type { Edition, Topic } from './schema.ts';
import { readJSON, writeJSON } from './storage.ts';

const POLL_MS = 3 * 60_000;
const URL_BASE = `${import.meta.env.BASE_URL}data/edition.json`;

export interface Delivery {
  newCount: number;
  at: number;
}

export function useEdition() {
  const [edition, setEdition] = useState<Edition | null>(() => readJSON<Edition | null>('edition-cache', null));
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const current = useRef(edition);
  const lastFetch = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      lastFetch.current = Date.now();
      try {
        const res = await fetch(`${URL_BASE}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as Edition;
        if (cancelled) return;
        setError(null);
        const prev = current.current;
        if (prev && prev.checkedAt === next.checkedAt) return;
        if (prev && Date.parse(next.publishedAt) > Date.parse(prev.publishedAt)) {
          const known = new Set(prev.stories.map((s) => s.id));
          const changed = next.stories.filter((s) => {
            const old = prev.stories.find((p) => p.id === s.id);
            return !known.has(s.id) || (old && old.updatedAt !== s.updatedAt);
          }).length;
          if (changed) setDelivery({ newCount: changed, at: Date.now() });
        }
        current.current = next;
        setEdition(next);
        writeJSON('edition-cache', next);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.current > 30_000) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { edition, error, delivery, dismissDelivery: () => setDelivery(null) };
}

const TOPICS_URL = `${import.meta.env.BASE_URL}data/topics.json`;

export function useTopics(): Topic[] {
  const [topics, setTopics] = useState<Topic[]>(() => readJSON<Topic[]>('topics-cache', []));
  useEffect(() => {
    fetch(`${TOPICS_URL}?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((f: { topics: Topic[] }) => {
        setTopics(f.topics);
        writeJSON('topics-cache', f.topics);
      })
      .catch(() => {});
  }, []);
  return topics;
}
