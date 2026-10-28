import { useSyncExternalStore } from 'react';

const PREFIX = 'wenp.';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Private mode / storage full: the app still works, it just won't remember.
  }
}

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: () => void): () => void;
}

/** A localStorage-backed value that React components can subscribe to; syncs across tabs. */
export function createStore<T>(key: string, initial: T): Store<T> {
  let value = readJSON(key, initial);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === PREFIX + key) {
        value = readJSON(key, initial);
        emit();
      }
    });
  }

  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      writeJSON(key, value);
      emit();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
