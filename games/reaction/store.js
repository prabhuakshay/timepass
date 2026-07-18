// Shared localStorage store for the Reaction Test. Both the game and the stats
// page import this so the schema stays in one place.
//
// Schema:  localStorage["timepass.reaction.v1"] = JSON array of attempts,
//          each { t: <epoch ms>, ms: <reaction time, rounded> }.
// Only valid attempts are stored — "too soon" mistakes are not recorded.

const KEY = "timepass.reaction.v1";

export function loadAttempts() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((a) => a && typeof a.ms === "number") : [];
  } catch {
    return [];
  }
}

export function recordAttempt(ms, when) {
  const attempts = loadAttempts();
  attempts.push({ t: when ?? Date.now(), ms: Math.round(ms) });
  try {
    localStorage.setItem(KEY, JSON.stringify(attempts));
  } catch {
    /* storage full or blocked — ignore, the game still plays */
  }
  return attempts;
}

export function clearAttempts() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Derived records/summary for the stats page. */
export function summarize(attempts) {
  if (!attempts.length) return null;
  const times = attempts.map((a) => a.ms);
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((s, n) => s + n, 0);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Average of the 5 most recent, as a "current form" number.
  const recent = times.slice(-5);
  const recentAvg = recent.reduce((s, n) => s + n, 0) / recent.length;

  return {
    count: attempts.length,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    average: sum / times.length,
    median,
    last: times[times.length - 1],
    recentAvg,
  };
}
