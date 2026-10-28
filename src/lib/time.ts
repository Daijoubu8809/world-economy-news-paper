export function ago(iso: string, now = Date.now()): string {
  const min = Math.round((now - Date.parse(iso)) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function longDate(d: Date = new Date()): string {
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function shortDate(isoDate: string): string {
  // isoDate is YYYY-MM-DD (a calendar date, not an instant): build it in local time.
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function editionName(iso: string): string {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return 'Morning edition';
  if (h >= 12 && h < 17) return 'Afternoon edition';
  if (h >= 17 && h < 22) return 'Evening edition';
  return 'Late edition';
}
