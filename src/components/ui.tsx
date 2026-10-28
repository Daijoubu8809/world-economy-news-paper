import { Fragment, useSyncExternalStore, type ReactNode } from 'react';
import { termKey, tokenize } from '../lib/markup.ts';
import type { Topic } from '../lib/schema.ts';
import { GOAL_SEC, STRETCH_SEC, formatClock, timerStore } from '../lib/timer.ts';
import type { Freshness } from '../lib/visits.ts';
import { href } from '../lib/router.ts';

export function jumpToTerm(term: string) {
  const el = document.getElementById(`term-${termKey(term)}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash');
  void el.offsetWidth; // restart the animation
  el.classList.add('flash');
}

/** Renders edition markup (see lib/markup.ts) as React elements. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((t, i) => {
        switch (t.kind) {
          case 'bold':
            return <strong key={i}>{t.text}</strong>;
          case 'italic':
            return <em key={i}>{t.text}</em>;
          case 'link':
            return (
              <a key={i} href={t.href} target="_blank" rel="noreferrer">
                {t.text}
              </a>
            );
          case 'term':
            return (
              // A span (not a button) so the term wraps like normal text inside a sentence.
              <span
                key={i}
                role="button"
                tabIndex={0}
                className="term-ref"
                onClick={() => jumpToTerm(t.term)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    jumpToTerm(t.term);
                  }
                }}
              >
                {t.text}
              </span>
            );
          default:
            return <Fragment key={i}>{t.text}</Fragment>;
        }
      })}
    </>
  );
}

/** Each item is a paragraph; an item whose lines all start with "- " renders as a bullet list. */
export function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p, i) => {
        const lines = p.split('\n');
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="body-list">
              {lines.map((l, j) => (
                <li key={j}>
                  <Rich text={l.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Rich text={p} />
          </p>
        );
      })}
    </>
  );
}

export function BeatTag({ topic, fallback }: { topic?: Topic; fallback: string }) {
  return (
    <span className="beat" style={{ color: topic?.color }}>
      {topic?.label ?? fallback}
    </span>
  );
}

export function FreshBadge({ f }: { f: Freshness }) {
  if (f === 'new') return <span className="badge badge-new">New</span>;
  if (f === 'updated') return <span className="badge badge-updated">Updated</span>;
  if (f === 'read') return <span className="badge badge-read">Read</span>;
  return null;
}

export function Section({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section className={`section ${className ?? ''}`}>
      <h2 className="section-label">{label}</h2>
      {children}
    </section>
  );
}

/** The Log Pose: a ring that fills to the 20-minute goal, then a second lap toward 30. */
export function Ring({ sec, size = 34, stroke = 3.5 }: { sec: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const goal = Math.min(sec / GOAL_SEC, 1);
  const stretch = sec > GOAL_SEC ? Math.min((sec - GOAL_SEC) / (STRETCH_SEC - GOAL_SEC), 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-goal"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - goal)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {stretch > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - stroke - 1}
          className="ring-stretch"
          strokeWidth={stroke - 1}
          fill="none"
          strokeDasharray={2 * Math.PI * (r - stroke - 1)}
          strokeDashoffset={2 * Math.PI * (r - stroke - 1) * (1 - stretch)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <g transform={`translate(${size / 2} ${size / 2}) rotate(${goal * 360 - 35})`} className="ring-needle">
        <path d={`M0 ${-r * 0.5} L${r * 0.13} 0 L0 ${r * 0.5} L${-r * 0.13} 0 Z`} />
      </g>
    </svg>
  );
}

export function useTimer() {
  return useSyncExternalStore(timerStore.subscribe, timerStore.get, timerStore.get);
}

export function LogPoseChip() {
  const { today, active } = useTimer();
  const done = today >= GOAL_SEC;
  return (
    <a href={href.log} className={`logpose ${active ? 'is-active' : 'is-paused'} ${done ? 'is-done' : ''}`} title="Log Pose — active reading time today">
      <Ring sec={today} />
      <span className="logpose-text">
        <span className="logpose-time">{formatClock(today)}</span>
        <span className="logpose-state">{done ? 'Log set' : active ? 'recording' : 'paused'}</span>
      </span>
    </a>
  );
}

export function PaywallMark() {
  return (
    <span className="paywall" title="Subscriber article — opens with your login">
      subscriber
    </span>
  );
}
