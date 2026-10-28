import { useMemo, useState, type CSSProperties } from 'react';
import type { Edition, Story, Topic } from '../lib/schema.ts';
import { href } from '../lib/router.ts';
import { ago, shortDate } from '../lib/time.ts';
import { freshness, readStore } from '../lib/visits.ts';
import { useStore } from '../lib/storage.ts';
import { plain } from '../lib/markup.ts';
import { BeatTag, FreshBadge, Rich } from '../components/ui.tsx';

interface Props {
  edition: Edition;
  topics: Map<string, Topic>;
}

const byRank = (a: Story, b: Story) => b.importance - a.importance || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

export function Today({ edition, topics }: Props) {
  const read = useStore(readStore);
  const [beat, setBeat] = useState<string | null>(null);
  const byId = useMemo(() => new Map(edition.stories.map((s) => [s.id, s])), [edition]);

  const mustKnow = edition.mustKnow.map((id) => byId.get(id)).filter((s): s is Story => !!s);
  const beats = [...new Set(edition.stories.map((s) => s.beat))];
  const rest = (beat ? edition.stories.filter((s) => s.beat === beat) : edition.stories.filter((s) => !edition.mustKnow.includes(s.id))).sort(byRank);
  const dayAgo = Date.now() - 24 * 3600_000;
  const latest = rest.filter((s) => Date.parse(s.updatedAt) >= dayAgo);
  const earlier = rest.filter((s) => Date.parse(s.updatedAt) < dayAgo);
  const unread = edition.stories.filter((s) => freshness(s, read) !== 'read').length;

  return (
    <div className="today">
      <div className="today-main">
        <section className="brief" aria-labelledby="brief-title">
          <p className="kicker">The 60-second version</p>
          <h1 id="brief-title" className="brief-title">
            <Rich text={edition.brief.title} />
          </h1>
          <ul className="brief-list">
            {edition.brief.bullets.map((b, i) => (
              <li key={i}>
                <Rich text={b} />
              </li>
            ))}
          </ul>
          {edition.brief.mood && (
            <p className="brief-mood">
              <span>Desk mood</span> {edition.brief.mood}
            </p>
          )}
        </section>

        {!beat && (
          <section aria-labelledby="must-title">
            <h2 id="must-title" className="rule-label">
              Must-know today
            </h2>
            <ol className="must">
              {mustKnow.map((s, i) => (
                <li key={s.id}>
                  <StoryLink story={s} topics={topics} read={read} rank={i + 1} big />
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="rule-label rule-label-row">
          <h2>{beat ? topics.get(beat)?.label ?? beat : 'The rest of the paper'}</h2>
          <span className="muted">{unread} unread</span>
        </div>
        <div className="chips" role="group" aria-label="Filter by beat">
          <button type="button" className={!beat ? 'chip is-on' : 'chip'} onClick={() => setBeat(null)}>
            All
          </button>
          {beats.map((b) => (
            <button
              key={b}
              type="button"
              className={beat === b ? 'chip is-on' : 'chip'}
              style={{ '--chip': topics.get(b)?.color } as CSSProperties}
              onClick={() => setBeat(beat === b ? null : b)}
            >
              {topics.get(b)?.label ?? b}
            </button>
          ))}
        </div>

        <ul className="list">
          {latest.map((s) => (
            <li key={s.id}>
              <StoryLink story={s} topics={topics} read={read} />
            </li>
          ))}
        </ul>
        {earlier.length > 0 && (
          <>
            <h3 className="list-sub">Earlier this week</h3>
            <ul className="list">
              {earlier.map((s) => (
                <li key={s.id}>
                  <StoryLink story={s} topics={topics} read={read} />
                </li>
              ))}
            </ul>
          </>
        )}
        {rest.length === 0 && <p className="muted">Nothing else on this beat right now.</p>}
      </div>

      <aside className="today-side">
        <section className="horizon" aria-labelledby="horizon-title">
          <h2 id="horizon-title" className="rule-label">
            On the horizon
          </h2>
          <ul>
            {edition.calendar.map((c, i) => (
              <li key={i}>
                <p className="horizon-when">
                  {shortDate(c.date)}
                  {c.time && ` · ${c.time}`}
                </p>
                <p className="horizon-what">{c.label}</p>
                <p className="horizon-why">
                  <Rich text={c.why} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

function StoryLink({
  story,
  topics,
  read,
  rank,
  big,
}: {
  story: Story;
  topics: Map<string, Topic>;
  read: Record<string, string>;
  rank?: number;
  big?: boolean;
}) {
  const f = freshness(story, read);
  return (
    <a href={href.story(story.id)} className={`story-link ${big ? 'is-big' : ''} ${f === 'read' ? 'is-read' : ''}`}>
      {rank && <span className="rank">{rank}</span>}
      <span className="story-link-body">
        <span className="meta">
          <BeatTag topic={topics.get(story.beat)} fallback={story.beat} />
          <FreshBadge f={f} />
          {story.developing && <span className="badge badge-dev">Developing</span>}
        </span>
        <span className="headline">{story.headline}</span>
        <span className="dek">{plain(story.dek)}</span>
        <span className="meta meta-foot">
          {story.readMinutes} min read · {ago(story.updatedAt)}
        </span>
      </span>
    </a>
  );
}
