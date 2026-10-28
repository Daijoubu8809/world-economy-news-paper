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

A scheduled Claude session (the "editor") runs every two hours, at :38 past 5, 7, 9 and 11am and 1, 3, 5, 7, 9 and
11pm ET. Each run:

1. Follows [`EDITOR.md`](EDITOR.md).
2. Searches across outlets.
3. Cross-checks the numbers.
4. Rewrites `public/data/edition.json`.
5. Validates it.
6. Pushes to `main`.

The push triggers the GitHub Pages deploy. An open page checks for a new edition every 3 minutes and whenever you
come back to the tab.

| File | What it is |
|---|---|
| `public/data/edition.json` | The current paper, written by the editor. |
| `public/data/topics.json` | The beats. Flip `"enabled": true` on `energy` or `industrials` (or add a new one) to start covering it. |
| `EDITOR.md` | The editor's playbook: voice, sourcing rules, verification, structure. |
| `ONE_PIECE.md` | Lore and vetted analogies, so the One Piece references are accurate. |
| `src/lib/schema.ts` | The edition's data contract. `npm run validate` enforces it before every deploy. |

## Features

- **Must-know top 3**, then everything else ranked by importance. Stories added since your last visit get a NEW
  badge, changed stories get UPDATED, and stories you've read are dimmed.
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
npm test
npm run build
```
