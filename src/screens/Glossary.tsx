import { useMemo, useState } from 'react';
import type { Edition } from '../lib/schema.ts';
import { glossaryStore, dueCards } from '../lib/glossary.ts';
import { useStore } from '../lib/storage.ts';
import { href } from '../lib/router.ts';
import { plain } from '../lib/markup.ts';
import { Rich } from '../components/ui.tsx';

export function GlossaryPage({ edition }: { edition: Edition | null }) {
  const glossary = useStore(glossaryStore);
  const [q, setQ] = useState('');
  const live = useMemo(() => new Set(edition?.stories.map((s) => s.id) ?? []), [edition]);

  const entries = Object.values(glossary).sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? entries.filter((e) => e.term.toLowerCase().includes(needle) || plain(e.definition).toLowerCase().includes(needle))
    : entries;
  const due = dueCards(glossary).length;

  const groups = new Map<string, typeof shown>();
  for (const e of shown) {
    const letter = /[a-z]/i.test(e.term[0]) ? e.term[0].toUpperCase() : '#';
    groups.set(letter, [...(groups.get(letter) ?? []), e]);
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Glossary</h1>
        <p className="page-sub">
          Your poneglyph decoder. Every key term from a story you open lands here, so the desk jargon is yours to keep.
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="empty">Open any story and its key terms will show up here.</p>
      ) : (
        <>
          <div className="glossary-tools">
            <input
              type="search"
              className="search"
              placeholder={`Search ${entries.length} terms`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <a className="btn btn-primary" href={href.training}>
              Train {due > 0 ? `${due} due` : 'anyway'}
            </a>
          </div>
          {[...groups].map(([letter, list]) => (
            <section key={letter} className="glossary-group">
              <h2 className="glossary-letter">{letter}</h2>
              <dl>
                {list.map((e) => (
                  <div key={e.key} className="term">
                    <dt>
                      {e.term}
                      <span className="boxes" title={`Mastery ${e.box}/5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <i key={n} className={n <= e.box ? 'on' : ''} />
                        ))}
                      </span>
                    </dt>
                    <dd>
                      <Rich text={e.definition} />
                      {e.example && (
                        <span className="term-example">
                          <Rich text={e.example} />
                        </span>
                      )}
                      <span className="term-from">
                        From{' '}
                        {live.has(e.storyId) ? <a href={href.story(e.storyId)}>{e.headline}</a> : <em>{e.headline}</em>}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {shown.length === 0 && <p className="muted">No terms match “{q}”.</p>}
        </>
      )}
    </div>
  );
}
