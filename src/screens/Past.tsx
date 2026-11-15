import type { ArchiveIndex } from '../lib/schema.ts';
import { href } from '../lib/router.ts';
import { clockTime, dayLabel, editionName } from '../lib/time.ts';

/** The archive: every edition still on file, newest first. */
export function PastPage({ index, error, liveId }: { index: ArchiveIndex | null; error: string | null; liveId?: string }) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Past editions</h1>
        <p className="page-sub">Back issues from the News Coo’s satchel. The lead changes every edition; here is what led each one.</p>
      </header>
      {!index && !error && <p className="empty">Fetching the back issues…</p>}
      {error && <p className="empty">Couldn’t load the archive ({error}).</p>}
      {index && index.editions.length === 0 && <p className="empty">No back issues yet.</p>}
      {index && (
        <ol className="past-list">
          {index.editions.map((e) => (
            <li key={e.id}>
              <a href={e.id === liveId ? href.today : href.past(e.id)}>
                <span className="meta">
                  No. {e.number} · {dayLabel(e.publishedAt)} · {editionName(e.editionType)} · {clockTime(e.publishedAt)}
                  {e.id === liveId && <span className="badge badge-new">Latest</span>}
                </span>
                <span className="headline">{e.lead}</span>
                <span className="meta meta-foot">{e.stories} stories</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
