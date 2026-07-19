// Reusable "How to play" overlay for any game screen.
//
// Drop a labelled help button on the screen that opens a modal describing the
// game and its controls. Fully self-contained: it injects its own styles and
// markup, so it doesn't depend on the game's own layout or classes.
//
//   import { mountHelp } from "../../common/how-to.js";
//   mountHelp({
//     title: "Snake",
//     emoji: "🐍",
//     tagline: "The classic — eat, grow, survive.",
//     rules: [
//       "Steer the snake to eat the food and grow.",
//       "Each bite scores a point and the snake speeds up.",
//       "Don't hit the walls or your own tail.",
//     ],
//     controls: [
//       ["Arrow keys / WASD", "Steer"],
//       ["Space", "Pause"],
//       ["Enter", "Restart"],
//     ],
//   });
//
// While the overlay is open, keystrokes are swallowed so they don't reach the
// game underneath, and pointer events on the button/backdrop are stopped from
// bubbling so they can't start a game that listens on the document.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function mountHelp(cfg = {}) {
  if (document.getElementById("howto-overlay")) return; // idempotent

  const emoji = cfg.emoji || "🎮";
  const rules = cfg.rules || [];
  const controls = cfg.controls || [];

  const style = document.createElement("style");
  style.textContent = `
    #howto-btn {
      position: fixed; left: 1rem; bottom: 1rem; z-index: 40;
      display: inline-flex; align-items: center; gap: 0.4rem;
      font: 600 0.85rem/1 var(--font-body, "Inter", system-ui, sans-serif);
      padding: 0.55rem 0.85rem; border-radius: 999px; cursor: pointer;
      color: #fff; background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(8px);
      transition: background .15s, transform .15s;
    }
    #howto-btn:hover { background: rgba(255,255,255,0.22); transform: translateY(-1px); }
    #howto-btn .q {
      display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%;
      font-weight: 700; font-size: 0.75rem; color: #0c0e1c;
      background: linear-gradient(135deg, #8b7cff, #c04cff);
    }
    #howto-overlay {
      position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
      padding: 1.2rem; opacity: 0; pointer-events: none; transition: opacity .18s ease;
      background: rgba(6, 8, 18, 0.62); backdrop-filter: blur(4px);
    }
    #howto-overlay.show { opacity: 1; pointer-events: auto; }
    #howto-card {
      width: min(440px, 100%); max-height: 86vh; overflow: auto;
      background: #14172b; color: #eef0ff;
      border: 1px solid rgba(255,255,255,0.12); border-radius: 20px;
      box-shadow: 0 30px 80px -20px rgba(0,0,0,0.7);
      padding: 1.6rem 1.6rem 1.8rem; position: relative;
      font-family: var(--font-body, "Inter", system-ui, sans-serif);
      transform: translateY(8px) scale(0.98); transition: transform .18s ease;
    }
    #howto-overlay.show #howto-card { transform: none; }
    #howto-card .howto-close {
      position: absolute; top: 0.9rem; right: 0.9rem; width: 32px; height: 32px;
      display: grid; place-items: center; border-radius: 9px; cursor: pointer;
      color: #eef0ff; background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14); font-size: 0.9rem;
    }
    #howto-card .howto-close:hover { background: rgba(255,255,255,0.18); }
    #howto-card .howto-emoji {
      width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center;
      font-size: 1.6rem; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12); margin-bottom: 0.9rem;
    }
    #howto-card h2 {
      margin: 0; font-family: var(--font-display, "Space Grotesk", system-ui, sans-serif);
      font-weight: 700; letter-spacing: -0.01em; font-size: 1.5rem;
    }
    #howto-card .howto-tag { margin: 0.35rem 0 0; opacity: 0.7; font-size: 0.98rem; }
    #howto-card h3 {
      margin: 1.4rem 0 0.6rem; font: 600 0.68rem/1 var(--font-body, "Inter", system-ui, sans-serif);
      letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.55;
    }
    #howto-card ul { margin: 0; padding-left: 1.1rem; display: grid; gap: 0.4rem; }
    #howto-card ul li { line-height: 1.45; }
    #howto-card .howto-keys { margin: 0; display: grid; gap: 0.45rem; }
    #howto-card .howto-keys > div { display: flex; align-items: center; gap: 0.8rem; }
    #howto-card .howto-keys dt { flex: none; }
    #howto-card .howto-keys kbd {
      display: inline-block; font: 600 0.8rem/1.4 var(--font-body, "Inter", system-ui, sans-serif);
      padding: 0.28rem 0.55rem; border-radius: 8px; color: #eef0ff;
      background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.16);
      box-shadow: inset 0 -1px 0 rgba(0,0,0,0.3);
    }
    #howto-card .howto-keys dd { margin: 0; opacity: 0.82; }
    @media (prefers-reduced-motion: reduce) {
      #howto-overlay, #howto-card, #howto-btn { transition: none; }
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement("button");
  btn.id = "howto-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "How to play");
  btn.innerHTML = `<span class="q">?</span> How to play`;
  document.body.appendChild(btn);

  const overlay = document.createElement("div");
  overlay.id = "howto-overlay";
  overlay.innerHTML = `
    <div id="howto-card" role="dialog" aria-modal="true" aria-label="How to play ${esc(cfg.title || "")}">
      <button class="howto-close" type="button" aria-label="Close">✕</button>
      <div class="howto-emoji">${esc(emoji)}</div>
      <h2>${esc(cfg.title || "How to play")}</h2>
      ${cfg.tagline ? `<p class="howto-tag">${esc(cfg.tagline)}</p>` : ""}
      ${rules.length ? `<h3>How to play</h3><ul>${rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
      ${controls.length ? `<h3>Controls</h3><dl class="howto-keys">${controls
        .map(([k, a]) => `<div><dt><kbd>${esc(k)}</kbd></dt><dd>${esc(a)}</dd></div>`)
        .join("")}</dl>` : ""}
    </div>`;
  document.body.appendChild(overlay);

  // Swallow keys while open so they don't drive the game underneath.
  function keyGuard(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return; // let browser shortcuts through
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function open() {
    overlay.classList.add("show");
    window.addEventListener("keydown", keyGuard, true);
    btn.blur();
  }
  function close() {
    overlay.classList.remove("show");
    window.removeEventListener("keydown", keyGuard, true);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  // Stop pointer events from reaching document-level game start handlers.
  const swallow = (e) => e.stopPropagation();
  btn.addEventListener("pointerdown", swallow);
  btn.addEventListener("click", (e) => { e.stopPropagation(); open(); });
  overlay.addEventListener("pointerdown", swallow);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector(".howto-close").addEventListener("click", (e) => { e.stopPropagation(); close(); });

  return { open, close };
}
