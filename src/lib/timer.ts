/**
 * Reading time that only counts real attention: the tab is visible AND focused AND there was
 * input (mouse, touch, scroll, keys) within the last IDLE_MS. Pure helpers are exported for tests.
 */
import { readJSON, writeJSON } from './storage.ts';

export const IDLE_MS = 60_000;
export const GOAL_SEC = 20 * 60;
export const STRETCH_SEC = 30 * 60;
/** A tick longer than this (laptop asleep, throttled background tab) is not counted. */
const MAX_TICK_MS = 2_500;
const KEY = 'time';

export type TimeLog = Record<string, number>;

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shouldCount(s: { visible: boolean; focused: boolean; lastInput: number; now: number }): boolean {
  return s.visible && s.focused && s.now - s.lastInput < IDLE_MS;
}

/** Consecutive days meeting the goal. Today counts once met; until then the streak runs to yesterday. */
export function streak(log: TimeLog, today: Date = new Date(), goal = GOAL_SEC): number {
  const d = new Date(today);
  if ((log[dayKey(d)] ?? 0) < goal) d.setDate(d.getDate() - 1);
  let n = 0;
  while ((log[dayKey(d)] ?? 0) >= goal) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function lastNDays(log: TimeLog, n: number, today: Date = new Date()): { key: string; date: Date; sec: number }[] {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const key = dayKey(date);
    out.push({ key, date, sec: log[key] ?? 0 });
  }
  return out;
}

export function formatClock(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

// ---- live tracker (browser only) ----

interface Snapshot {
  log: TimeLog;
  today: number;
  active: boolean;
}

let pendingMs = 0;
let pendingDay = dayKey();
let lastInput = Date.now();
let lastTick = Date.now();
let active = false;
let snapshot: Snapshot = { log: readJSON<TimeLog>(KEY, {}), today: 0, active: false };
const listeners = new Set<() => void>();

function rebuild() {
  const log = readJSON<TimeLog>(KEY, {});
  const day = dayKey();
  const today = (log[day] ?? 0) + (pendingDay === day ? pendingMs / 1000 : 0);
  snapshot = { log, today, active };
  listeners.forEach((fn) => fn());
}

/** Read-modify-write so two tabs never overwrite each other's time. */
function flush() {
  if (pendingMs < 1000) return;
  const whole = Math.floor(pendingMs / 1000);
  const log = readJSON<TimeLog>(KEY, {});
  log[pendingDay] = (log[pendingDay] ?? 0) + whole;
  writeJSON(KEY, log);
  pendingMs -= whole * 1000;
}

function tick() {
  const now = Date.now();
  const delta = now - lastTick;
  lastTick = now;
  const day = dayKey();
  if (day !== pendingDay) {
    flush();
    pendingMs = 0;
    pendingDay = day;
  }
  active = shouldCount({
    visible: document.visibilityState === 'visible',
    focused: document.hasFocus(),
    lastInput,
    now,
  });
  if (active && delta <= MAX_TICK_MS) pendingMs += delta;
  if (pendingMs >= 5000) flush();
  rebuild();
}

let started = false;
export function startTimer() {
  if (started) return;
  started = true;
  const onInput = () => {
    lastInput = Date.now();
  };
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) {
    window.addEventListener(ev, onInput, { passive: true, capture: true });
  }
  const pause = () => {
    tick();
    flush();
    rebuild();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      lastTick = Date.now();
      lastInput = Date.now();
    } else pause();
  });
  window.addEventListener('pagehide', pause);
  window.addEventListener('blur', pause);
  window.addEventListener('focus', () => {
    lastTick = Date.now();
    lastInput = Date.now();
  });
  window.addEventListener('storage', (e) => {
    if (e.key === `wenp.${KEY}`) rebuild();
  });
  setInterval(tick, 1000);
  rebuild();
}

export const timerStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => snapshot,
};
