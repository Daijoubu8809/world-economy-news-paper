/**
 * Checks public/data/edition.json and public/data/topics.json before anything is committed or
 * deployed. Run with `npm run validate`. Exits non-zero on any error; warnings are advisory.
 * The rules live in scripts/lib.ts; the previous edition comes from public/data/editions/.
 */
import { loadAll, printReport } from './store.ts';
import { checkEdition } from './lib.ts';

const { edition, beats, prev, errors } = loadAll();
const report = edition && beats ? checkEdition(edition, beats, prev) : { errors: [], warnings: [] };
report.errors.unshift(...errors);
if (!printReport(report)) process.exit(1);
console.log(`✓ edition ${edition?.id} valid — ${edition?.stories.length ?? 0} stories, ${report.warnings.length} warning(s)`);
