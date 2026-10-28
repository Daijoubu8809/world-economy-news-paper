import { useState } from 'react';
import { dueCards, glossaryStore, review, type GlossaryEntry } from '../lib/glossary.ts';
import { useStore } from '../lib/storage.ts';
import { href } from '../lib/router.ts';
import { Rich } from '../components/ui.tsx';

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Training() {
  const glossary = useStore(glossaryStore);
  const total = Object.keys(glossary).length;
  // The deck is fixed when a round starts so cards don't reshuffle under you as you answer.
  const [deck, setDeck] = useState<string[]>(() => dueCards(glossary).map((e) => e.key));
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ got: 0, again: 0 });

  const card: GlossaryEntry | undefined = glossary[deck[i]];

  function answer(gotIt: boolean) {
    if (!card) return;
    glossaryStore.set((g) => ({ ...g, [card.key]: review(card, gotIt) }));
    setTally((t) => (gotIt ? { ...t, got: t.got + 1 } : { ...t, again: t.again + 1 }));
    // Missed cards come back at the end of this round.
    if (!gotIt) setDeck((d) => [...d, card.key]);
    setI((n) => n + 1);
    setRevealed(false);
  }

  function practiceAll() {
    setDeck(shuffle(Object.keys(glossary)));
    setI(0);
    setRevealed(false);
    setTally({ got: 0, again: 0 });
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Training</h1>
        <p className="page-sub">Haki training: drill the terms until you use them without thinking.</p>
      </header>

      {total === 0 ? (
        <p className="empty">
          No cards yet. <a href={href.today}>Read a story</a> and its key terms become flashcards.
        </p>
      ) : !card ? (
        <div className="done-card">
          <h2>{deck.length ? 'Round complete.' : 'Nothing due today.'}</h2>
          {deck.length > 0 && (
            <p>
              {tally.got} got it · {tally.again} again
            </p>
          )}
          <p className="muted">Cards you know well come back less often: 1, 3, 7, 16, then 35 days.</p>
          <button type="button" className="btn btn-primary" onClick={practiceAll}>
            Practice all {total} anyway
          </button>
        </div>
      ) : (
        <div className="flash-wrap">
          <p className="muted flash-count">
            Card {i + 1} of {deck.length}
          </p>
          <div className={`flashcard ${revealed ? 'is-revealed' : ''}`}>
            <p className="flash-term">{card.term}</p>
            {revealed ? (
              <div className="flash-back">
                <p>
                  <Rich text={card.definition} />
                </p>
                {card.example && (
                  <p className="term-example">
                    <Rich text={card.example} />
                  </p>
                )}
              </div>
            ) : (
              <p className="muted">Say the definition out loud like you’re in the interview, then flip.</p>
            )}
          </div>
          {revealed ? (
            <div className="flash-actions">
              <button type="button" className="btn btn-quiet" onClick={() => answer(false)}>
                Again
              </button>
              <button type="button" className="btn btn-primary" onClick={() => answer(true)}>
                Got it
              </button>
            </div>
          ) : (
            <div className="flash-actions">
              <button type="button" className="btn btn-primary btn-wide" onClick={() => setRevealed(true)}>
                Flip
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
