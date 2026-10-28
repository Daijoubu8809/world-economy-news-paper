import { useEffect, useState } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'story'; id: string }
  | { name: 'glossary' }
  | { name: 'training' }
  | { name: 'log' };

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
    default:
      return { name: 'today' };
  }
}

export const href = {
  today: '#/',
  story: (id: string) => `#/story/${encodeURIComponent(id)}`,
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
