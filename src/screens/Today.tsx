import { useState, type CSSProperties } from 'react';
import type { Edition, Feature, Story, Topic } from '../lib/schema.ts';
import { href } from '../lib/router.ts';
import { ago, shortDate } from '../lib/time.ts';
import { freshness, readStore } from '../lib/visits.ts';
import { useStore } from '../lib/storage.ts';
import { plain } from '../lib/markup.ts';
import { frontPage, questionOfDay } from '../lib/rank.ts';
import { BeatTag, FreshBadge, Paragraphs, PaywallMark, Rich } from '../components/ui.tsx';
import { LogPoseIcon, Ship, StrawHat, WantedMark } from '../components/art.tsx';

interface Props {
  edition: Edition;
  topics: Map<string, Topic>;
  /** Set when this is an archived edition: its id, so story links stay inside the archive. */
  past?: string;
}

const FEATURE_LABEL: Record<Feature['kind'], string> = {
  'week-ahead': 'The week ahead',
  explainer: 'Desk school',
  debate: 'The debate',
  'sector-spotlight': 'Sector spotlight',
  'week-in-review': 'The week in review',
  'long-read': 'The weekend read',
};

export function Today({ edition, topics, past }: Props) {
  const read = useStore(readStore);
  const front = frontPage(edition, [...topics.keys()]);
  const ask = questionOfDay(edition);
  const link = { topics, read, past };

  return (
    <div className="today">
      {edition.tape && (
        <div className="ticker" aria-label={`Markets as of ${edition.tape.asOf}`}>
          <span className="ticker-asof">{edition.tape.asOf}</span>
          {edition.tape.items.map((t) => (
            <span key={t.label} className={`ticker-item is-${t.direction}`}>
              <span className="ticker-label">{t.label}</span>
              <span className="ticker-value">{t.value}</span>
              {t.change && (
                <span className="ticker-change">
                  {t.direction === 'up' ? '▲' : t.direction === 'down' ? '▼' : ''} {t.change}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="today-cols">
        <div className="today-main">
          <section className={`front front-${front.layout}`} aria-label="Top stories">
            {front.lead && <Lead story={front.lead} banner={front.layout === 'banner'} {...link} />}
            {front.seconds.length > 0 && (
              <ul className="seconds">
                {front.seconds.map((s) => (
                  <li key={s.id}>
                    <StoryLink story={s} big {...link} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="brief" aria-labelledby="brief-title">
            <h2 id="brief-title" className="kicker">
              <StrawHat size={16} className="kicker-art" /> The 60-second version
            </h2>
            <ul className="brief-list">
              {edition.brief.bullets.map((b, i) => (
                <li key={i}>
                  <Rich text={b} />
                </li>
              ))}
            </ul>
            {edition.brief.mood && (
              <p className="brief-mood">
                <span>Sea conditions</span> {edition.brief.mood}
              </p>
            )}
          </section>

          {edition.storylines.length > 0 && (
            <section aria-labelledby="lines-title">
              <h2 id="lines-title" className="rule-label">
                <WantedMark className="label-art" /> Storylines · the long voyages
              </h2>
              <ul className="storylines">
                {edition.storylines.map((l) => (
                  <li key={l.id} className={l.changed ? 'is-changed' : ''}>
                    <p className="storyline-head">
                      <span className="storyline-title">{l.title}</span>
                      <span className={l.changed ? 'badge badge-new' : 'badge badge-read'}>{l.changed ? 'Moved' : 'No change'}</span>
                    </p>
                    <p className="storyline-line">
                      <Rich text={l.line} />
                      {l.storyId && (
                        <>
                          {' '}
                          <a href={href.story(l.storyId, past)}>Read the story</a>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {edition.feature && <FeatureCard key={edition.id} feature={edition.feature} />}

          {(edition.numberOfDay || ask?.interview) && (
            <div className="duo">
              {edition.numberOfDay && (
                <section className="card number-card" aria-label="Number of the day">
                  <p className="kicker">Number of the day</p>
                  <p className="number-value">{edition.numberOfDay.value}</p>
                  <p className="number-label">{edition.numberOfDay.label}</p>
                  <p className="number-why">
                    <Rich text={edition.numberOfDay.why} />
                  </p>
                </section>
              )}
              {ask?.interview && <Question key={ask.id} story={ask} past={past} />}
            </div>
          )}

          {front.desks.size > 0 && <Ship className="divider-ship" />}
          <div className="desks">
            {[...front.desks].map(([beat, stories]) => (
              <section key={beat} className="desk" style={{ '--desk': topics.get(beat)?.color } as CSSProperties}>
                <h2 className="desk-label">{topics.get(beat)?.label ?? beat}</h2>
                <ul className="list">
                  {stories.map((s) => (
                    <li key={s.id}>
                      <StoryLink story={s} hideBeat {...link} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {edition.belowFold && (
            <section className="card fold" aria-labelledby="fold-title">
              <p className="kicker">Below the fold</p>
              <h2 id="fold-title" className="fold-headline">
                {edition.belowFold.headline}
              </h2>
              <p>
                <Rich text={edition.belowFold.text} />
              </p>
              <p className="fine">
                <a href={edition.belowFold.source.url} target="_blank" rel="noreferrer">
                  {edition.belowFold.source.name}
                </a>
                {edition.belowFold.source.paywalled && <PaywallMark />}
              </p>
            </section>
          )}

          {front.earlier.length > 0 && (
            <details className="earlier">
              <summary>Earlier this week · {front.earlier.length}</summary>
              <ul className="list">
                {front.earlier.map((s) => (
                  <li key={s.id}>
                    <StoryLink story={s} {...link} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <aside className="today-side">
          <section className="horizon" aria-labelledby="horizon-title">
            <h2 id="horizon-title" className="rule-label">
              <LogPoseIcon className="label-art" /> Next islands on the Log Pose
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
          <p className="past-link">
            <a href={href.past()}>Past editions →</a>
          </p>
        </aside>
      </div>
    </div>
  );
}

interface LinkProps {
  story: Story;
  topics: Map<string, Topic>;
  read: Record<string, string>;
  past?: string;
}

function Meta({ story, topics, read, hideBeat }: Pick<LinkProps, 'story' | 'topics' | 'read'> & { hideBeat?: boolean }) {
  const f = freshness(story, read);
  return (
    <span className="meta">
      {!hideBeat && <BeatTag topic={topics.get(story.beat)} fallback={story.beat} />}
      <FreshBadge f={f} />
      {story.developing && <span className="badge badge-dev">Developing</span>}
    </span>
  );
}

function Foot({ story, past }: Pick<LinkProps, 'story' | 'past'>) {
  return (
    <span className="meta meta-foot">
      {story.readMinutes} min read{!past && <> · {ago(story.updatedAt)}</>}
    </span>
  );
}

function Lead({ story, banner, topics, read, past }: LinkProps & { banner: boolean }) {
  const isRead = freshness(story, read) === 'read';
  return (
    <a href={href.story(story.id, past)} className={`lead ${isRead ? 'is-read' : ''}`}>
      <Meta story={story} topics={topics} read={read} />
      <h1 className="lead-headline">{story.headline}</h1>
      <span className="lead-dek">{plain(story.dek)}</span>
      {banner && (
        <span className="lead-points">
          {story.tldr.slice(0, 3).map((t, i) => (
            <span key={i}>{plain(t)}</span>
          ))}
        </span>
      )}
      <Foot story={story} past={past} />
    </a>
  );
}

function StoryLink({ story, topics, read, past, big, hideBeat }: LinkProps & { big?: boolean; hideBeat?: boolean }) {
  const isRead = freshness(story, read) === 'read';
  return (
    <a href={href.story(story.id, past)} className={`story-link ${big ? 'is-big' : ''} ${isRead ? 'is-read' : ''}`}>
      <span className="story-link-body">
        <Meta story={story} topics={topics} read={read} hideBeat={hideBeat} />
        <span className="headline">{story.headline}</span>
        <span className="dek">{plain(story.dek)}</span>
        <Foot story={story} past={past} />
      </span>
    </a>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState(false);
  const long = feature.body.length > 1 || !!feature.quiz;
  return (
    <section className="card feature" aria-labelledby="feature-title">
      <p className="kicker">{FEATURE_LABEL[feature.kind]}</p>
      <h2 id="feature-title" className="feature-title">
        {feature.title}
      </h2>
      <div className="feature-body">
        <Paragraphs items={open ? feature.body : feature.body.slice(0, 1)} />
      </div>
      {open && feature.quiz && <Quiz items={feature.quiz} />}
      {long && !open && (
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(true)}>
          {feature.quiz ? `Keep reading, then take the ${feature.quiz.length}-question quiz` : 'Keep reading'}
        </button>
      )}
    </section>
  );
}

function Quiz({ items }: { items: NonNullable<Feature['quiz']> }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const answered = Object.keys(picked).length;
  const right = items.filter((q, i) => picked[i] === q.answer).length;
  return (
    <div className="quiz">
      <p className="kicker">Quiz</p>
      <ol>
        {items.map((q, i) => {
          const choice = picked[i];
          const done = choice !== undefined;
          return (
            <li key={i}>
              <p className="quiz-q">{q.q}</p>
              <div className="quiz-options">
                {q.options.map((o, j) => (
                  <button
                    key={j}
                    type="button"
                    disabled={done}
                    className={`quiz-option ${done && j === q.answer ? 'is-right' : ''} ${done && j === choice && j !== q.answer ? 'is-wrong' : ''}`}
                    onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
                  >
                    {o}
                  </button>
                ))}
              </div>
              {done && (
                <p className="quiz-explain">
                  <strong>{choice === q.answer ? 'Right.' : 'Not quite.'}</strong> <Rich text={q.explain} />
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {answered === items.length && (
        <p className="quiz-score" role="status">
          {right} of {items.length} right.
        </p>
      )}
    </div>
  );
}

function Question({ story, past }: { story: Story; past?: string }) {
  const [shown, setShown] = useState(false);
  if (!story.interview) return null;
  return (
    <section className="card question-card" aria-label="Interview question of the day">
      <p className="kicker">Interview question of the day</p>
      <p className="question-q">“{story.interview.question}”</p>
      {shown ? (
        <>
          <p className="question-a">{plain(story.interview.answer)}</p>
          <p className="fine">
            From <a href={href.story(story.id, past)}>{story.headline}</a>
          </p>
        </>
      ) : (
        <button type="button" className="btn btn-quiet" onClick={() => setShown(true)}>
          Answer it out loud, then show a model answer
        </button>
      )}
    </section>
  );
}
