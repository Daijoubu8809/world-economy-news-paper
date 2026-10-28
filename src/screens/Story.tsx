import { useEffect, useState } from 'react';
import type { Edition, Topic } from '../lib/schema.ts';
import { href } from '../lib/router.ts';
import { ago, clockTime } from '../lib/time.ts';
import { markRead, freshness, readStore } from '../lib/visits.ts';
import { addTerms, glossaryStore } from '../lib/glossary.ts';
import { termKey } from '../lib/markup.ts';
import { BeatTag, FreshBadge, Paragraphs, PaywallMark, Rich, Section } from '../components/ui.tsx';

interface Props {
  edition: Edition;
  id: string;
  topics: Map<string, Topic>;
}

export function StoryPage({ edition, id, topics }: Props) {
  const story = edition.stories.find((s) => s.id === id);
  // Freshness as it was when you opened the story (before this visit marks it read).
  const [openedAs] = useState(() => (story ? freshness(story, readStore.get()) : 'seen'));
  const [showFollowUp, setShowFollowUp] = useState(false);

  useEffect(() => {
    if (!story) return;
    markRead(story);
    glossaryStore.set((g) => addTerms(g, story, story.keyTerms));
  }, [story]);

  if (!story) {
    return (
      <div className="story">
        <a href={href.today} className="back">
          ← Today’s paper
        </a>
        <p className="empty">This story has sailed off the front page. Its key terms are still in your glossary.</p>
      </div>
    );
  }

  const wasUpdated = story.updatedAt !== story.publishedAt;

  return (
    <article className="story">
      <a href={href.today} className="back">
        ← Today’s paper
      </a>

      <header className="story-head">
        <p className="meta">
          <BeatTag topic={topics.get(story.beat)} fallback={story.beat} />
          <FreshBadge f={openedAs} />
          {story.developing && <span className="badge badge-dev">Developing</span>}
        </p>
        <h1 className="story-title">{story.headline}</h1>
        <p className="story-dek">{story.dek}</p>
        <p className="meta meta-foot">
          {story.readMinutes} min read · Published {clockTime(story.publishedAt)}
          {story.updatedAt !== story.publishedAt && <> · Updated {ago(story.updatedAt)}</>}
        </p>
        {story.updateNote && wasUpdated && (
          <p className="update-note">
            <strong>What’s new:</strong> {story.updateNote}
          </p>
        )}
      </header>

      <section className="tldr" aria-label="The short version">
        <h2 className="section-label">The short version</h2>
        <ul>
          {story.tldr.map((t, i) => (
            <li key={i}>
              <Rich text={t} />
            </li>
          ))}
        </ul>
      </section>

      <Section label="What happened">
        <Paragraphs items={story.whatHappened} />
      </Section>

      {story.marketReaction && story.marketReaction.length > 0 && (
        <div className="tape" aria-label="Market reaction">
          {story.marketReaction.map((m, i) => (
            <div key={i} className={`tape-item is-${m.direction}`}>
              <span className="tape-asset">{m.asset}</span>
              <span className="tape-move">
                {m.direction === 'up' ? '▲' : m.direction === 'down' ? '▼' : '■'} {m.move}
              </span>
            </div>
          ))}
        </div>
      )}

      <Section label="The backstory">
        <Paragraphs items={story.background} />
      </Section>

      {story.grandLine && (
        <aside className="grandline">
          <p className="grandline-kicker">Grand Line translation</p>
          <h3>{story.grandLine.title}</h3>
          <p>
            <Rich text={story.grandLine.body} />
          </p>
        </aside>
      )}

      <Section label="Why markets care">
        <Paragraphs items={story.whyItMatters} />
      </Section>

      <Section label="The debate" className="debate">
        <div className={`views views-${story.views.length}`}>
          {story.views.map((v, i) => (
            <div key={i} className={`view view-${i}`}>
              <p className="view-camp">{v.camp}</p>
              <p className="view-thesis">
                <Rich text={v.thesis} />
              </p>
              <p className="view-arg">
                <Rich text={v.argument} />
              </p>
              {v.who && <p className="view-who">{v.who}</p>}
            </div>
          ))}
        </div>
      </Section>

      {story.trade && (
        <Section label="On the desk: pitch me a trade" className="trade">
          <div className="trade-card">
            <h3>{story.trade.idea}</h3>
            <p className="trade-expr">
              <Rich text={story.trade.expression} />
            </p>
            <p>
              <Rich text={story.trade.rationale} />
            </p>
            <p className="trade-risks-label">What kills it</p>
            <ul>
              {story.trade.risks.map((r, i) => (
                <li key={i}>
                  <Rich text={r} />
                </li>
              ))}
            </ul>
            <p className="fine">How a trader might frame it in an interview. Not investment advice.</p>
          </div>
        </Section>
      )}

      <Section label="Interview mode" className="interview">
        <div className="interview-card">
          <p className="interview-q">“{story.interview.question}”</p>
          <p className="interview-label">Your 30-second answer</p>
          <p>
            <Rich text={story.interview.answer} />
          </p>
          <div className="followup">
            <p className="interview-label">Likely follow-up</p>
            <p className="interview-q small">“{story.interview.followUp.question}”</p>
            {showFollowUp ? (
              <p>
                <Rich text={story.interview.followUp.answer} />
              </p>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={() => setShowFollowUp(true)}>
                Try it yourself first, then show the answer
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section label="Key terms" className="terms">
        <dl>
          {story.keyTerms.map((k) => (
            <div key={k.term} id={`term-${termKey(k.term)}`} className="term">
              <dt>{k.term}</dt>
              <dd>
                <Rich text={k.definition} />
                {k.example && (
                  <span className="term-example">
                    <Rich text={k.example} />
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="fine">
          Saved to your <a href={href.glossary}>glossary</a> for <a href={href.training}>training</a>.
        </p>
      </Section>

      {story.watchNext.length > 0 && (
        <Section label="What to watch next">
          <ul className="watch">
            {story.watchNext.map((w, i) => (
              <li key={i}>
                {w.when && <span className="watch-when">{w.when}</span>}
                <span>
                  <Rich text={w.what} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section label="Sources" className="sources">
        <ul>
          {story.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
              {s.paywalled && <PaywallMark />}
            </li>
          ))}
        </ul>
      </Section>

      <a href={href.today} className="back back-bottom">
        ← Back to today’s paper
      </a>
    </article>
  );
}
