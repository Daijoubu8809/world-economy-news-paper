/**
 * The contract between the editor (a scheduled Claude session that writes public/data/edition.json)
 * and the site. `npm run validate` checks the edition against this before every deploy, so a
 * malformed edition never reaches the page. The app imports only the inferred types (no zod at runtime).
 */
import { z } from 'zod';

const isoDateTime = z.iso.datetime({ offset: true });
const text = (max: number) => z.string().trim().min(1).max(max);
const paragraphs = (min: number, max: number) => z.array(text(1400)).min(min).max(max);

export const TopicSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: text(40),
  enabled: z.boolean(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  /** What the editor should hunt for on this beat. */
  covers: text(800),
  /** The angle to write from (e.g. "how a rates desk reads it"). */
  lens: text(400),
  /** Suggested search queries for the editor. */
  queries: z.array(text(160)).min(1).max(12),
});

export const TopicsFileSchema = z.object({
  topics: z.array(TopicSchema).min(1),
});

export const KeyTermSchema = z.object({
  term: text(60),
  definition: text(600),
  example: text(400).optional(),
});

export const ViewSchema = z.object({
  /** Short label for the camp, e.g. "The hawks", "Bond bears". */
  camp: text(60),
  /** One-line claim. */
  thesis: text(240),
  /** The reasoning: why this camp believes it. */
  argument: text(1200),
  /** Who actually holds it — only named if a source attributes it. */
  who: text(240).optional(),
});

export const StorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(80),
  beat: z.string().regex(/^[a-z0-9-]+$/),
  headline: text(120),
  dek: text(240),
  importance: z.number().int().min(1).max(5),
  depth: z.enum(['full', 'brief']),
  developing: z.boolean().default(false),
  publishedAt: isoDateTime,
  updatedAt: isoDateTime,
  updateNote: text(240).optional(),
  readMinutes: z.number().int().min(1).max(8),
  tldr: z.array(text(260)).min(2).max(4),
  whatHappened: paragraphs(1, 5),
  background: paragraphs(1, 4),
  whyItMatters: paragraphs(1, 4),
  marketReaction: z
    .array(
      z.object({
        asset: text(40),
        move: text(60),
        direction: z.enum(['up', 'down', 'flat']),
      }),
    )
    .max(8)
    .optional(),
  grandLine: z.object({ title: text(80), body: text(900) }).optional(),
  views: z.array(ViewSchema).min(2).max(4),
  interview: z.object({
    question: text(240),
    answer: text(1400),
    followUp: z.object({ question: text(240), answer: text(1000) }),
  }),
  trade: z
    .object({
      idea: text(120),
      expression: text(300),
      rationale: text(900),
      risks: z.array(text(300)).min(1).max(4),
    })
    .optional(),
  keyTerms: z.array(KeyTermSchema).min(1).max(8),
  watchNext: z.array(z.object({ when: text(60).optional(), what: text(300) })).max(5),
  sources: z
    .array(
      z.object({
        name: text(100),
        url: z.url({ protocol: /^https$/ }),
        paywalled: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(10),
});

export const EditionSchema = z.object({
  version: z.literal(1),
  /** When story content last changed. */
  publishedAt: isoDateTime,
  /** When the editor last ran (even if nothing changed). */
  checkedAt: isoDateTime,
  nextRunAt: isoDateTime.optional(),
  brief: z.object({
    title: text(120),
    bullets: z.array(text(320)).min(3).max(5),
    mood: text(160).optional(),
  }),
  /** Exactly three story ids, in order, for the "Must-know" strip. */
  mustKnow: z.array(z.string()).length(3),
  calendar: z
    .array(
      z.object({
        date: z.iso.date(),
        time: text(20).optional(),
        label: text(120),
        why: text(300),
      }),
    )
    .max(10),
  stories: z.array(StorySchema).min(3).max(30),
});

export type Topic = z.infer<typeof TopicSchema>;
export type KeyTerm = z.infer<typeof KeyTermSchema>;
export type View = z.infer<typeof ViewSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Edition = z.infer<typeof EditionSchema>;
