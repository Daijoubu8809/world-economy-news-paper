import { useEffect, useState } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'story'; id: string }
  | { name: 'glossary' }
  | { name: 'training' }
  | { name: 'log' }
  /** The archive: the list, one past edition, or a story inside one. */
  | { name: 'past'; edition?: string; story?: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'story':
      return parts[1] ? { name: 'story', id: decodeURIComponent(parts[1]) } : { name: 'today' };
    case 'glossary':
      return { name: 'glossary' };
    case 'training':
      return { name: 'training' };
    case 'log':
      return { name: 'log' };
    case 'past':
      return {
        name: 'past',
        edition: parts[1] && decodeURIComponent(parts[1]),
        story: parts[2] === 'story' && parts[3] ? decodeURIComponent(parts[3]) : undefined,
      };
    default:
      return { name: 'today' };
  }
}

export const href = {
  today: '#/',
  /** `past` is the id of an archived edition when the story is being read from the archive. */
  story: (id: string, past?: string) => (past ? `#/past/${encodeURIComponent(past)}/story/${encodeURIComponent(id)}` : `#/story/${encodeURIComponent(id)}`),
  past: (edition?: string) => (edition ? `#/past/${encodeURIComponent(edition)}` : '#/past'),
  glossary: '#/glossary',
  training: '#/training',
  log: '#/log',
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
