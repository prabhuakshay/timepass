// Generic per-game score store backed by localStorage.
//
// Any game gets persistent history + records for free:
//
//   import { createStore } from "../../common/stats-store.js";
//   const store = createStore("reaction", { lowerIsBetter: true, unit: "ms" });
//   store.record(135);                  // save a score
//   store.load();                       // -> [{ t, v }, ...]
//   store.summarize();                  // -> { best, average, median, ... }
//   store.clear();
//
// Each entry is { t: <epoch ms>, v: <numeric score> } plus any extra fields you
// pass as the second arg to record(). Data is namespaced per game id, so games
// never collide.

const NS = "timepass";

export function createStore(game, opts = {}) {
  if (!game) throw new Error("createStore(game): a game id is required");
  const lowerIsBetter = opts.lowerIsBetter !== false; // default: lower wins
  const unit = opts.unit || "";
  const key = `${NS}.${game}.v1`;

  function load() {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      // Normalize: accept legacy `ms` field as the value.
      return arr
        .map((a) => (a && typeof a.v === "number" ? a
          : a && typeof a.ms === "number" ? { ...a, v: a.ms } : null))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function record(value, meta) {
    const entries = load();
    const entry = { t: Date.now(), v: Math.round(value) };
    if (meta && typeof meta === "object") Object.assign(entry, meta);
    entries.push(entry);
    try {
      localStorage.setItem(key, JSON.stringify(entries));
    } catch {
      /* storage full/blocked — the game keeps working */
    }
    return entry;
  }

  function clear() {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  function best(entries = load()) {
    if (!entries.length) return null;
    const vals = entries.map((e) => e.v);
    return lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
  }

  /** True if `value` would be a new personal record given current history. */
  function isRecord(value, entries = load()) {
    const b = best(entries);
    if (b === null) return true;
    return lowerIsBetter ? value < b : value > b;
  }

  /** Running best after each entry — the reference line for progress charts. */
  function runningBest(entries = load()) {
    let b = lowerIsBetter ? Infinity : -Infinity;
    return entries.map((e) => {
      b = lowerIsBetter ? Math.min(b, e.v) : Math.max(b, e.v);
      return b;
    });
  }

  function summarize(entries = load()) {
    if (!entries.length) return null;
    const vals = entries.map((e) => e.v);
    const sorted = [...vals].sort((a, b) => a - b);
    const sum = vals.reduce((s, n) => s + n, 0);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const recent = vals.slice(-5);
    const recentAvg = recent.reduce((s, n) => s + n, 0) / recent.length;
    return {
      count: entries.length,
      best: lowerIsBetter ? sorted[0] : sorted[sorted.length - 1],
      worst: lowerIsBetter ? sorted[sorted.length - 1] : sorted[0],
      average: sum / vals.length,
      median,
      last: vals[vals.length - 1],
      recentAvg,
      lowerIsBetter,
      unit,
    };
  }

  return {
    key, game, unit, lowerIsBetter,
    load, record, clear, best, isRecord, runningBest, summarize,
  };
}
