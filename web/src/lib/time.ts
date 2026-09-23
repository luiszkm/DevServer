const pad = (n: number) => String(n).padStart(2, "0");

/** Remaining time as mm:ss, or h:mm:ss from one hour up; never negative. */
export function formatRemaining(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Catalog minutes as the prototype shows them: 15min, 1h, 1h30m. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${m}m` : `${h}h`;
}
