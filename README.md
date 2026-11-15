# The World Economy News Paper

A private markets briefing for S&T recruiting: the Fed, macro, markets and policy, condensed into headlines with a
one-line dek. Open any story for the full rundown:

- what happened
- the backstory
- why markets care
- the competing views
- key terms
- an interview answer
- a trade idea

Live at **https://daijoubu8809.github.io/world-economy-news-paper/**. It works on a phone (add it to your Home Screen)
and on a computer.

## How it stays current

A scheduled Claude session (the "editor") files a morning and an evening edition on weekdays (about 7am and 5pm ET)
and one edition a day on weekends (about noon ET). Each run follows [`EDITOR.md`](EDITOR.md):

1. `npm run desk` prints what is in the paper and what the run owes (which feature is due, what led last time).
2. The editor searches, cross-checks the numbers, and writes a small patch file.
3. `npm run file -- .desk/patch.json` merges the patch, stamps the times, drops stories over 48 hours old,
   validates the result against the previous edition, and saves a copy to the archive.
4. The editor commits `public/data` and pushes to `main`, which triggers the GitHub Pages deploy.

An open page checks for a new edition every 3 minutes and whenever you come back to the tab.

The tooling does the bookkeeping so a run stays cheap: the editor never has to read or rewrite the whole edition.

### Why the front page changes every edition

The validator (`scripts/lib.ts`) refuses an edition when:

- the lead also led the previous edition and has no new development;
- the lead was not updated in the 24 hours before the edition;
- a story was updated but kept its old headline (updates need a second-day headline);
- a story was last updated more than 60 hours before the edition.

Long-running sagas live in the **Storylines** strip, one line each, and only return to the news columns when
something happens. The page ranks stories by importance decayed by age (half-life 12 hours).

| File | What it is |
|---|---|
| `public/data/edition.json` | The current paper. Written by `npm run file`, never by hand. |
| `public/data/editions/` | The archive: the last 40 editions and an index, shown under "Past editions". |
| `public/data/topics.json` | The beats. Set `"enabled"` to switch one on or off, or add a new one. |
| `EDITOR.md` | The editor's playbook: the run, the budget, front-page rules, verification, the patch format. |
| `ONE_PIECE.md` | Lore and vetted analogies, so the One Piece references are accurate. |
| `src/lib/schema.ts` | The edition's data contract. |
| `scripts/desk.ts`, `scripts/lib.ts` | The desk tool and the edition rules. The run schedule is in `scripts/lib.ts`. |

## Features

- **A front page that changes**: market tape, a lead and two seconds, the 60-second version, Storylines, a
  rotating daily feature (week ahead, desk school, debate, sector spotlight, week in review with a quiz, weekend
  read), number of the day, interview question of the day, beat desks, and a below-the-fold item.
- **Past editions.** Browse back issues from the link under the calendar.
- Stories added since your last visit get a NEW badge, changed stories get UPDATED, and read stories are dimmed.
- **Log Pose timer.** It counts only while the tab is in front, focused, and you've interacted in the last 60
  seconds. The goal is 20 minutes, with a 30-minute stretch ring, a day streak and a 14-day chart.
- **Glossary.** Every key term from stories you open is saved, searchable, and kept after the story rolls off.
- **Training.** Flashcards on a spaced-repetition schedule (1, 3, 7, 16, 35 days).

Reading time, glossary and read history are stored on your device only.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run validate   # check the edition
npm run desk       # the editor's view of the paper
npm test
npm run build
```
