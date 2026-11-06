/**
 * Small hand-drawn line art with a One Piece flavor (original drawings, not show assets).
 * Everything strokes in currentColor so it picks up the surrounding text color.
 */
import type { CSSProperties } from 'react';

type ArtProps = { size?: number; className?: string; style?: CSSProperties };

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** A News Coo: a seagull in a delivery cap with a satchel of papers. */
export function NewsCoo({ size = 40, className, style }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} style={style} aria-hidden="true" {...line}>
      <path d="M6 22c6-6 12-6 16-1 4-5 10-5 16 1" />
      <path d="M22 21c0 6 3 10 8 11" />
      <path d="M30 32c3 0 6-1 8-4" />
      <path d="M20 14c0-3 3-5 6-5s5 2 5 5h-11Z" />
      <path d="M18.5 14h14" />
      <path d="M31 16.5l4 1-4 1" />
      <circle cx="27.5" cy="17" r="0.9" fill="currentColor" stroke="none" />
      <rect x="22" y="33" width="10" height="7" rx="1.2" />
      <path d="M24 35.5h6M24 37.8h4" />
    </svg>
  );
}

/** A straw hat: brim, crown and a band. */
export function StrawHat({ size = 18, className, style }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" {...line}>
      <ellipse cx="12" cy="15" rx="10" ry="3.2" />
      <path d="M6.5 14c0-4.5 2.4-7 5.5-7s5.5 2.5 5.5 7" />
      <path d="M6.7 12.3c3.6 1.2 7 1.2 10.6 0" stroke="var(--hat-band, #b53d2e)" strokeWidth="2" />
    </svg>
  );
}

/** A Log Pose: a wrist compass whose needle points to the next island. */
export function LogPoseIcon({ size = 16, className, style }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" {...line}>
      <circle cx="12" cy="13" r="7" />
      <path d="M9 5.5h6" />
      <path d="M12 8.5l1.4 4.5L12 17.5l-1.4-4.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A wanted-poster frame header, used as the bounty-board mark. */
export function WantedMark({ size = 16, className, style }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" {...line}>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <rect x="8" y="7" width="8" height="7" rx="0.6" />
      <path d="M8 17h8M9.5 19h5" />
    </svg>
  );
}

/** A thin wave line to sit under the masthead. */
export function Waves({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 10" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 5 Q 10 0 20 5 T 40 5 T 60 5 T 80 5 T 100 5 T 120 5 T 140 5 T 160 5 T 180 5 T 200 5 T 220 5 T 240 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A small glyph per beat; unknown beats get none. */
export function BeatGlyph({ beat, size = 13 }: { beat: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, className: 'beat-glyph', ...line, strokeWidth: 2 };
  switch (beat) {
    case 'fed-macro': // an anchor: the central bank holds the ship in place
      return (
        <svg {...p}>
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v13M8 11h8M5 14c0 4 3 6 7 6s7-2 7-6" />
        </svg>
      );
    case 'markets': // a ship's wheel
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="1.6" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
        </svg>
      );
    case 'policy': // a rolled treaty scroll
      return (
        <svg {...p}>
          <path d="M7 4h11a2 2 0 0 1 0 4H7" />
          <path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11V8" />
          <path d="M9 12h6M9 15.5h4" />
        </svg>
      );
    case 'energy': // a barrel of cola fuel
      return (
        <svg {...p}>
          <ellipse cx="12" cy="5" rx="6" ry="2" />
          <path d="M6 5v14c0 1.1 2.7 2 6 2s6-.9 6-2V5M6 10c0 1.1 2.7 2 6 2s6-.9 6-2M6 15c0 1.1 2.7 2 6 2s6-.9 6-2" />
        </svg>
      );
    case 'industrials': // a shipwright's gear
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        </svg>
      );
    case 'world': // a globe with the Grand Line around the middle
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
      );
    default:
      return null;
  }
}

/** A small sailing ship, used as a quiet divider. */
export function Ship({ size = 36, className, style }: ArtProps) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 48 29" className={className} style={style} aria-hidden="true" {...line}>
      <path d="M24 3v15" />
      <path d="M24 5c6 2 9 6 9 11H24Z" />
      <path d="M24 3l5 1.5-5 1.5" />
      <path d="M7 18h34l-5 6H12Z" />
      <path d="M2 27q3-2 6 0t6 0t6 0t6 0t6 0t6 0t6 0" />
    </svg>
  );
}

/** A Den Den Mushi: the snail phone that carries news. */
export function DenDenMushi({ size = 20, className, style }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" {...line}>
      <circle cx="9" cy="10" r="5.5" />
      <path d="M9 10m-2.4 0a2.4 2.4 0 1 1 2.4 2.4" />
      <path d="M3 19c3-2.5 11-2.5 16 0" />
      <path d="M17 15l2-5M20 15l2-3" />
      <circle cx="19" cy="9.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="22" cy="11.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A tiny Jolly Roger in a straw hat, with crossed bones. */
export function JollyRoger({ size = 22, className, style }: ArtProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true" {...line}>
      <path d="M3.5 8.5c4-2 13-2 17 0" />
      <path d="M7 8c0-3 2-4.6 5-4.6S17 5 17 8" />
      <path d="M7.5 12.5c0-2 2-3.5 4.5-3.5s4.5 1.5 4.5 3.5c0 1.3-.7 2.2-1.5 2.8v1.7h-6v-1.7c-.8-.6-1.5-1.5-1.5-2.8Z" />
      <circle cx="10.3" cy="12.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="13.7" cy="12.4" r="0.9" fill="currentColor" stroke="none" />
      <path d="M4.5 21l15-3M19.5 21l-15-3" />
    </svg>
  );
}
