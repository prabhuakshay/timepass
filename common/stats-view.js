// Drop-in stats page for any game. Give it a container and a store, get record
// tiles, a progress-over-time chart, and a history table — all styled by ui.css.
//
//   import { createStore } from "../../common/stats-store.js";
//   import { renderStatsPage } from "../../common/stats-view.js";
//   const store = createStore("reaction", { lowerIsBetter: true, unit: "ms" });
//   renderStatsPage(document.body, {
//     store,
//     title: "Reaction Test",
//     thumb: "⚡",
//     metricLabel: "Reaction time",
//     playHref: "index.html",
//     homeHref: "../../",
//   });

const fmt = (n) => Math.round(n).toLocaleString();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function renderStatsPage(root, cfg) {
  const { store } = cfg;
  const unit = store.unit ? ` <span class="unit">${esc(store.unit)}</span>` : "";
  const metric = cfg.metricLabel || "Score";
  const entries = store.load();

  root.innerHTML = `
    <div class="topbar">
      <a class="brand" href="${esc(cfg.homeHref || "../../")}">
        <span class="logo">${cfg.thumb || "🎮"}</span> ${esc(cfg.title || "Stats")}
      </a>
      <nav class="topnav">
        <a class="btn" href="${esc(cfg.homeHref || "../../")}">← Arcade</a>
        <a class="btn btn-primary" href="${esc(cfg.playHref || "index.html")}">▶ Play</a>
      </nav>
    </div>
    <main class="container" id="statsMain"></main>
    <p class="footer">Your history lives only in this browser.</p>`;

  const main = root.querySelector("#statsMain");

  if (!entries.length) {
    main.innerHTML = `
      <header class="hero" style="padding-bottom:1.5rem">
        <div class="eyebrow"><span class="dot"></span> Stats</div>
        <h1>No runs <span class="grad">yet</span></h1>
      </header>
      <div class="empty">
        <span class="big">📊</span>
        Play a round and your ${esc(metric.toLowerCase())} history shows up here.
        <div style="margin-top:1.2rem"><a class="btn btn-primary" href="${esc(cfg.playHref || "index.html")}">▶ Play now</a></div>
      </div>`;
    return;
  }

  const s = store.summarize(entries);
  const better = store.lowerIsBetter ? "lower is better" : "higher is better";

  main.innerHTML = `
    <header class="hero" style="padding-bottom:1.4rem">
      <div class="eyebrow"><span class="dot"></span> ${esc(s.count)} run${s.count === 1 ? "" : "s"} · ${better}</div>
      <h1>Your <span class="grad">progress</span></h1>
    </header>

    <section class="tiles">
      <div class="tile hero-tile"><div class="label">Best</div><div class="value">${fmt(s.best)}${unit}</div></div>
      <div class="tile"><div class="label">Recent avg</div><div class="value">${fmt(s.recentAvg)}${unit}</div></div>
      <div class="tile"><div class="label">Average</div><div class="value">${fmt(s.average)}${unit}</div></div>
      <div class="tile"><div class="label">Median</div><div class="value">${fmt(s.median)}${unit}</div></div>
      <div class="tile"><div class="label">Runs</div><div class="value">${fmt(s.count)}</div></div>
      <div class="tile"><div class="label">Last</div><div class="value">${fmt(s.last)}${unit}</div></div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div><h2>${esc(metric)} over time</h2><div class="sub">${esc(store.unit || "")}${store.unit ? " · " : ""}${better}</div></div>
        <div class="legend">
          <span style="color:var(--chart-data)"><i class="swatch" style="background:var(--chart-data)"></i>each run</span>
          <span style="color:var(--chart-best)"><i class="swatch dashed"></i>best so far</span>
        </div>
      </div>
      <div class="chart-wrap">
        <canvas id="chart" role="img" aria-label="Line chart of ${esc(metric)} across ${s.count} runs."></canvas>
        <div class="tooltip" id="tooltip"></div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>History</h2><div class="sub">most recent first</div></div>
      <table class="table">
        <thead><tr><th>#</th><th>When</th><th class="num">${esc(metric)}</th></tr></thead>
        <tbody>${historyRows(entries, store)}</tbody>
      </table>
    </section>

    <div style="display:flex;justify-content:flex-end;margin-bottom:2rem">
      <button id="clear" class="btn btn-danger">Clear all data</button>
    </div>`;

  const chart = new ProgressChart(main.querySelector("#chart"), main.querySelector("#tooltip"), entries, store);
  chart.draw();
  new ResizeObserver(() => chart.draw()).observe(main.querySelector(".chart-wrap"));

  wireClear(main.querySelector("#clear"), store);
}

function historyRows(entries, store) {
  const best = store.best(entries);
  return entries.slice(-15).reverse().map((e, i) => {
    const n = entries.length - i;
    const when = e.t ? new Date(e.t).toLocaleString() : "—";
    const rec = e.v === best;
    return `<tr>
      <td>${n}</td>
      <td>${esc(when)}</td>
      <td class="num ${rec ? "record" : ""}">${fmt(e.v)}${store.unit ? " " + esc(store.unit) : ""}${rec ? " 🏆" : ""}</td>
    </tr>`;
  }).join("");
}

function wireClear(btn, store) {
  let armed = false, timer = null;
  btn.onclick = () => {
    if (!armed) {
      armed = true; btn.classList.add("armed"); btn.textContent = "Click again to erase everything";
      timer = setTimeout(() => { armed = false; btn.classList.remove("armed"); btn.textContent = "Clear all data"; }, 3000);
      return;
    }
    clearTimeout(timer);
    store.clear();
    location.reload();
  };
}

// ---- Chart: data series + running-best reference, with hover crosshair -------
class ProgressChart {
  constructor(canvas, tooltip, entries, store) {
    this.canvas = canvas;
    this.tooltip = tooltip;
    this.entries = entries;
    this.store = store;
    this.geom = null;
    canvas.addEventListener("pointermove", (e) => this.onMove(e));
    canvas.addEventListener("pointerleave", () => { this.tooltip.style.opacity = "0"; this.draw(); });
  }

  cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  draw(hoverIdx = null) {
    const c = this.canvas;
    const cssW = c.clientWidth || 760;
    const cssH = 300;
    const dpr = window.devicePixelRatio || 1;
    c.width = cssW * dpr; c.height = cssH * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const pad = { l: 52, r: 18, t: 16, b: 30 };
    const w = cssW - pad.l - pad.r, h = cssH - pad.t - pad.b;
    const times = this.entries.map((e) => e.v);
    const rbest = this.store.runningBest(this.entries);
    const n = times.length;

    const dataMax = Math.max(...times), dataMin = Math.min(...times);
    const span = Math.max(1, dataMax - dataMin);
    const maxY = dataMax + span * 0.12;
    const minY = Math.max(0, dataMin - span * 0.18);
    const x = (i) => pad.l + (n === 1 ? w / 2 : (i / (n - 1)) * w);
    const y = (v) => pad.t + h - ((v - minY) / (maxY - minY)) * h;

    // grid + y labels
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = minY + (i / ticks) * (maxY - minY), yy = y(v);
      ctx.strokeStyle = this.cssVar("--grid"); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(pad.l + w, yy); ctx.stroke();
      ctx.fillStyle = this.cssVar("--muted"); ctx.textAlign = "right";
      ctx.fillText(fmt(v), pad.l - 10, yy);
    }

    // area fill under data line
    const dataColor = this.cssVar("--chart-data");
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + h);
    grad.addColorStop(0, "rgba(139,124,255,0.28)");
    grad.addColorStop(1, "rgba(139,124,255,0.01)");
    ctx.beginPath();
    times.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.lineTo(x(n - 1), pad.t + h); ctx.lineTo(x(0), pad.t + h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // running-best reference (dashed)
    ctx.strokeStyle = this.cssVar("--chart-best"); ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath();
    rbest.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.stroke(); ctx.setLineDash([]);

    // data line
    ctx.strokeStyle = dataColor; ctx.lineWidth = 2.5; ctx.lineJoin = "round";
    ctx.beginPath();
    times.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.stroke();

    // markers when sparse
    if (n <= 45) {
      ctx.fillStyle = dataColor;
      times.forEach((v, i) => { ctx.beginPath(); ctx.arc(x(i), y(v), 2.6, 0, Math.PI * 2); ctx.fill(); });
    }

    // x-axis endpoints
    ctx.fillStyle = this.cssVar("--faint");
    ctx.textAlign = "left"; ctx.fillText("run 1", pad.l, pad.t + h + 16);
    ctx.textAlign = "right"; ctx.fillText("run " + n, pad.l + w, pad.t + h + 16);

    this.geom = { pad, w, h, x, y, times, rbest, n };

    if (hoverIdx != null) this.drawHover(ctx, hoverIdx);
  }

  drawHover(ctx, i) {
    const { pad, h, x, y, times, rbest } = this.geom;
    const px = x(i), py = y(times[i]);
    ctx.strokeStyle = this.cssVar("--border-str"); ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, pad.t + h); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = this.cssVar("--chart-data");
    ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this.cssVar("--bg"); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.stroke();

    const u = this.store.unit ? " " + this.store.unit : "";
    this.tooltip.style.left = px + "px";
    this.tooltip.style.top = py + "px";
    this.tooltip.style.opacity = "1";
    this.tooltip.innerHTML =
      `<b>Run ${i + 1}</b> · ${fmt(times[i])}${u}<br>` +
      `<span style="color:var(--chart-best)">best ${fmt(rbest[i])}${u}</span>`;
  }

  onMove(e) {
    if (!this.geom) return;
    const rect = this.canvas.getBoundingClientRect();
    const { pad, w, n } = this.geom;
    let i = n === 1 ? 0 : Math.round(((e.clientX - rect.left - pad.l) / w) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    this.draw(i);
  }
}
