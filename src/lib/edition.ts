/**
 * Loads data/edition.json and keeps it fresh: polls while the tab is visible, re-checks the moment
 * you come back to the tab, and keeps the last copy for an instant (and offline) first paint.
 */
import { useEffect, useRef, useState } from 'react';
import type { ArchiveIndex, Edition, Topic } from './schema.ts';
import { readJSON, writeJSON } from './storage.ts';

const POLL_MS = 3 * 60_000;
const URL_BASE = `${import.meta.env.BASE_URL}data/edition.json`;

/** Editions from before the current format (cached copies, mid-deploy) are ignored. */
function usable(e: Edition | null): Edition | null {
  return e && e.version === 2 ? e : null;
}

export interface Delivery {
  newCount: number;
  at: number;
}

export function useEdition() {
  const [edition, setEdition] = useState<Edition | null>(() => usable(readJSON<Edition | null>('edition-cache', null)));
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
        const next = usable((await res.json()) as Edition);
        if (cancelled) return;
        if (!next) throw new Error('this page is out of date — refresh');
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

const ARCHIVE_URL = `${import.meta.env.BASE_URL}data/editions/`;

type Loaded<T> = { data: T | null; error: string | null };

function useJson<T>(url: string | null): Loaded<T> {
  const [state, setState] = useState<Loaded<T> & { url: string | null }>({ data: null, error: null, url });
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: T) => !cancelled && setState({ data, error: null, url }))
      .catch((e: Error) => !cancelled && setState({ data: null, error: e.message, url }));
    return () => {
      cancelled = true;
    };
  }, [url]);
  // Never show one edition's data under another's address.
  return state.url === url ? state : { data: null, error: null };
}

/** The list of past editions, newest first. */
export function useArchive(enabled: boolean): Loaded<ArchiveIndex> {
  return useJson<ArchiveIndex>(enabled ? `${ARCHIVE_URL}index.json` : null);
}

/** One archived edition by id. */
export function usePastEdition(id: string | undefined): Loaded<Edition> {
  return useJson<Edition>(id && /^[0-9a-z-]+$/.test(id) ? `${ARCHIVE_URL}${id}.json` : null);
}
