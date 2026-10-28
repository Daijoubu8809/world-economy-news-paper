import type { Edition } from '../lib/schema.ts';
import { GOAL_SEC, IDLE_MS, STRETCH_SEC, dayKey, formatClock, lastNDays, streak } from '../lib/timer.ts';
import { clockTime } from '../lib/time.ts';
import { Ring, useTimer } from '../components/ui.tsx';

export function LogPosePage({ edition }: { edition: Edition | null }) {
  const { today, active, log } = useTimer();
  const merged = { ...log, [dayKey()]: today };
  const days = lastNDays(merged, 14);
  const run = streak(merged);
  const maxSec = Math.max(STRETCH_SEC, ...days.map((d) => d.sec));
  const toGoal = Math.max(0, GOAL_SEC - today);

  const status =
    today >= STRETCH_SEC
      ? 'Stretch goal cleared. You’ve done the full 30.'
      : today >= GOAL_SEC
        ? `Log set. The needle’s locked on. ${formatClock(STRETCH_SEC - today)} to the 30-minute stretch.`
        : `${formatClock(toGoal)} until the Log Pose sets.`;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Log Pose</h1>
        <p className="page-sub">
          On the Grand Line a Log Pose has to stay on an island long enough to record its field before it points to the next
          one. Your island is 20 minutes of real reading.
        </p>
      </header>

      <section className="pose">
        <Ring sec={today} size={168} stroke={11} />
        <div className="pose-text">
          <p className="pose-time">{formatClock(today)}</p>
          <p className={`pose-state ${active ? 'is-active' : ''}`}>{active ? '● Recording' : '❚❚ Paused'}</p>
          <p>{status}</p>
          <p className="muted">
            Streak: <strong>{run}</strong> {run === 1 ? 'day' : 'days'} at 20+ min
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="section-label">Last 14 days</h2>
        <div className="bars" role="img" aria-label="Minutes read per day for the last 14 days">
          <div className="bars-goal" style={{ bottom: `${(GOAL_SEC / maxSec) * 100}%` }}>
            <span>20</span>
          </div>
          {days.map((d) => (
            <div key={d.key} className="bar-col">
              <div
                className={`bar ${d.sec >= GOAL_SEC ? 'is-met' : ''}`}
                style={{ height: `${Math.max(2, (d.sec / maxSec) * 100)}%` }}
                title={`${d.key}: ${Math.round(d.sec / 60)} min`}
              />
              <span className="bar-label">{d.date.toLocaleDateString([], { weekday: 'narrow' })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section how">
        <h2 className="section-label">How it counts</h2>
        <p>
          Time only counts while this tab is in front, the window is focused, and you’ve scrolled, tapped, typed or moved the
          mouse in the last {IDLE_MS / 1000} seconds. Switch tabs, lock your phone or walk away and it pauses. Two open tabs
          never double-count. Everything is stored on this device only.
        </p>
        <h2 className="section-label">How the paper works</h2>
        <p>
          A scheduled Claude editor runs every two hours from about 6am to midnight ET. Each run searches across outlets
          (Reuters, AP, CNBC, WSJ, FT, Bloomberg, central bank releases), cross-checks the numbers, and rewrites the paper. The
          page picks up a new edition on its own within a few minutes, with no refresh needed.
          {edition && <> Last check: {clockTime(edition.checkedAt)}.</>}
        </p>
      </section>
    </div>
  );
}
