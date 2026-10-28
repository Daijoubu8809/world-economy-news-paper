import { useEffect, useMemo, useRef } from 'react';
import { useEdition, useTopics } from './lib/edition.ts';
import { href, useRoute, type Route } from './lib/router.ts';
import { clockTime, editionName, longDate } from './lib/time.ts';
import { LogPoseChip } from './components/ui.tsx';
import { Today } from './screens/Today.tsx';
import { StoryPage } from './screens/Story.tsx';
import { GlossaryPage } from './screens/Glossary.tsx';
import { Training } from './screens/Training.tsx';
import { LogPosePage } from './screens/LogPose.tsx';
import type { Topic } from './lib/schema.ts';

const NAV: { name: Route['name']; label: string; to: string }[] = [
  { name: 'today', label: 'Today', to: href.today },
  { name: 'glossary', label: 'Glossary', to: href.glossary },
  { name: 'training', label: 'Training', to: href.training },
  { name: 'log', label: 'Log Pose', to: href.log },
];

export function App() {
  const route = useRoute();
  const { edition, error, delivery, dismissDelivery } = useEdition();
  const topicList = useTopics();
  const topics = useMemo(() => new Map<string, Topic>(topicList.map((t) => [t.id, t])), [topicList]);
  const todayScroll = useRef(0);
  const prevRoute = useRef(route);

  // Story pages open at the top; coming back to Today restores where you were.
  useEffect(() => {
    const prev = prevRoute.current;
    prevRoute.current = route;
    if (prev === route) return;
    if (route.name === 'today') requestAnimationFrame(() => window.scrollTo(0, todayScroll.current));
    else window.scrollTo(0, 0);
  }, [route]);
  useEffect(() => {
    const on = () => {
      if (prevRoute.current.name === 'today') todayScroll.current = window.scrollY;
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    if (!delivery) return;
    const id = setTimeout(dismissDelivery, 12_000);
    return () => clearTimeout(id);
  }, [delivery, dismissDelivery]);

  const active = route.name === 'story' ? 'today' : route.name;

  return (
    <div className="app">
      <header className={`masthead ${route.name === 'today' ? '' : 'is-compact'}`}>
        <div className="masthead-bar">
          <nav className="topnav" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.name} href={n.to} className={active === n.name ? 'is-current' : ''}>
                {n.label}
              </a>
            ))}
          </nav>
          <LogPoseChip />
        </div>
        <a href={href.today} className="nameplate">
          <span className="nameplate-the">The</span> World Economy News Paper
        </a>
        <div className="dateline">
          <span>{longDate()}</span>
          {edition && (
            <>
              <span className="dot">·</span>
              <span>{editionName(edition.publishedAt)}</span>
              <span className="dot">·</span>
              <span>Updated {clockTime(edition.publishedAt)}</span>
            </>
          )}
        </div>
      </header>

      <main className="main">
        {!edition && !error && <p className="empty">The News Coo is on its way…</p>}
        {!edition && error && <p className="empty">Couldn’t load the paper ({error}). Check your connection and refresh.</p>}
        {edition && route.name === 'today' && <Today edition={edition} topics={topics} />}
        {edition && route.name === 'story' && <StoryPage key={route.id} edition={edition} id={route.id} topics={topics} />}
        {route.name === 'glossary' && <GlossaryPage edition={edition} />}
        {route.name === 'training' && <Training />}
        {route.name === 'log' && <LogPosePage edition={edition} />}
      </main>

      {edition && (
        <footer className="footer">
          <p>
            Checked {clockTime(edition.checkedAt)}
            {edition.nextRunAt && <> · next delivery around {clockTime(edition.nextRunAt)}</>}
          </p>
          <p>Written by Claude from public reporting. Check the linked sources before quoting a number.</p>
        </footer>
      )}

      {delivery && (
        <div className="toast" role="status">
          <span>
            <strong>News Coo delivery:</strong> {delivery.newCount} new or updated {delivery.newCount === 1 ? 'story' : 'stories'}
          </span>
          <a
            href={href.today}
            onClick={() => {
              dismissDelivery();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Show
          </a>
          <button type="button" aria-label="Dismiss" onClick={dismissDelivery}>
            ×
          </button>
        </div>
      )}

      <nav className="tabbar" aria-label="Sections">
        {NAV.map((n) => (
          <a key={n.name} href={n.to} className={active === n.name ? 'is-current' : ''}>
            <TabIcon name={n.name} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function TabIcon({ name }: { name: Route['name'] }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'today':
      return (
        <svg {...common}>
          <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z" />
          <path d="M17 9h3v8a2 2 0 0 1-2 2h-1" />
          <path d="M7 9h7M7 12.5h7M7 16h4" />
        </svg>
      );
    case 'glossary':
      return (
        <svg {...common}>
          <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
          <path d="M5 17a3 3 0 0 1 3-3h10" />
          <path d="M9 8h5" />
        </svg>
      );
    case 'training':
      return (
        <svg {...common}>
          <rect x="3.5" y="6" width="13" height="13" rx="2" />
          <path d="M8 3.5h10.5a2 2 0 0 1 2 2V16" />
          <path d="M7.5 12.5l2 2 3.5-4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5l1.6 4.5-1.6 4.5-1.6-4.5L12 7.5Z" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
