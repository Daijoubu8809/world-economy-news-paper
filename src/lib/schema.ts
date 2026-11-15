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

const SourceSchema = z.object({
  name: text(100),
  url: z.url({ protocol: /^https$/ }),
  paywalled: z.boolean().optional(),
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
  /** Required for full stories; briefs may leave it out. */
  background: paragraphs(1, 4).optional(),
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
  /** Required for full stories; briefs may leave views and interview out. */
  views: z.array(ViewSchema).min(2).max(4).optional(),
  interview: z
    .object({
      question: text(240),
      answer: text(1400),
      followUp: z.object({ question: text(240), answer: text(1000) }),
    })
    .optional(),
  trade: z
    .object({
      idea: text(120),
      expression: text(300),
      rationale: text(900),
      risks: z.array(text(300)).min(1).max(4),
    })
    .optional(),
  keyTerms: z.array(KeyTermSchema).max(8).optional(),
  watchNext: z.array(z.object({ when: text(60).optional(), what: text(300) })).max(5).optional(),
  sources: z.array(SourceSchema).min(1).max(10),
});

export const EDITION_TYPES = ['am', 'pm', 'weekend'] as const;
export const FEATURE_KINDS = ['week-ahead', 'explainer', 'debate', 'sector-spotlight', 'week-in-review', 'long-read'] as const;

/** One line of the market tape at the top of the front page. */
export const TapeItemSchema = z.object({
  label: text(20),
  value: text(20),
  change: text(20).optional(),
  direction: z.enum(['up', 'down', 'flat']),
});

/** A long-running saga, tracked in one line so it doesn't have to lead the paper every day. */
export const StorylineSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(60),
  title: text(60),
  /** What changed since the last edition, or a plain "no change" line. */
  line: text(220),
  changed: z.boolean(),
  /** A live story to link to, if there is one. */
  storyId: z.string().optional(),
});

export const FeatureSchema = z.object({
  kind: z.enum(FEATURE_KINDS),
  /** The ET calendar date this feature was written for. */
  date: z.iso.date(),
  title: text(120),
  body: paragraphs(1, 8),
  quiz: z
    .array(
      z.object({
        q: text(240),
        options: z.array(text(160)).min(2).max(4),
        /** Index of the right option. */
        answer: z.number().int().min(0).max(3),
        explain: text(400),
      }),
    )
    .min(1)
    .max(5)
    .optional(),
});

export const EditionSchema = z.object({
  version: z.literal(2),
  /** YYYY-MM-DD-am | -pm | -weekend. One id per scheduled edition; also the archive file name. */
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}-(am|pm|weekend)$/),
  /** Running issue number. */
  number: z.number().int().min(1),
  editionType: z.enum(EDITION_TYPES),
  /** When story content last changed. */
  publishedAt: isoDateTime,
  /** When the editor last ran (even if nothing changed). */
  checkedAt: isoDateTime,
  nextRunAt: isoDateTime.optional(),
  /** The story that leads the front page. It must change from edition to edition (see the validator). */
  lead: z.string(),
  /** "banner": one story dominates. "split": the lead shares the top with two others. Default: by lead importance. */
  frontLayout: z.enum(['banner', 'split']).optional(),
  brief: z.object({
    bullets: z.array(text(320)).min(3).max(5),
    mood: text(160).optional(),
  }),
  tape: z.object({ asOf: text(60), items: z.array(TapeItemSchema).min(1).max(10) }).optional(),
  storylines: z.array(StorylineSchema).max(8),
  feature: FeatureSchema.optional(),
  numberOfDay: z.object({ value: text(24), label: text(120), why: text(320) }).optional(),
  /** One offbeat item for the bottom of the page. */
  belowFold: z.object({ headline: text(120), text: text(600), source: SourceSchema }).optional(),
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

/** public/data/editions/index.json: the archive, newest first. */
export const ArchiveIndexSchema = z.object({
  editions: z.array(
    z.object({
      id: z.string(),
      number: z.number().int(),
      editionType: z.enum(EDITION_TYPES),
      publishedAt: isoDateTime,
      lead: text(120),
      stories: z.number().int(),
    }),
  ),
});

export type Topic = z.infer<typeof TopicSchema>;
export type KeyTerm = z.infer<typeof KeyTermSchema>;
export type View = z.infer<typeof ViewSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Edition = z.infer<typeof EditionSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type Storyline = z.infer<typeof StorylineSchema>;
export type TapeItem = z.infer<typeof TapeItemSchema>;
export type ArchiveIndex = z.infer<typeof ArchiveIndexSchema>;
export type EditionType = (typeof EDITION_TYPES)[number];
export type FeatureKind = (typeof FEATURE_KINDS)[number];
