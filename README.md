# 🎮 Timepass

A **static** website that hosts a collection of browser games. No runtime server —
it's plain HTML/CSS/JS that deploys to GitHub Pages. Each game is a self-contained
folder under `games/`.

## How it works

```
timepass/
├── index.html          # landing page — fetches games.json and renders game cards
├── games.json          # GENERATED catalog of games (do not edit by hand)
├── build.js            # scans games/*/game.json → writes games.json
├── preview.js          # local static server (dev only; not deployed)
├── common/             # SHARED, reusable across every game
│   ├── ui.css          #   design system (tokens, cards, tiles, buttons, tables)
│   ├── stats-store.js  #   per-game localStorage score store
│   └── stats-view.js   #   drop-in stats page (tiles + progress chart + history)
├── games/
│   ├── _template/      # copy this to start a new game (ignored by the build)
│   └── reaction/       # example game — a working reference (game + stats page)
└── .github/workflows/deploy.yml   # deploys to GitHub Pages on version-tag push
```

Because GitHub Pages can't run code, `build.js` bakes the list of games into
`games.json` ahead of time. The static `index.html` just fetches that file.

The `common/` folder is the shared toolkit — use it so every game looks like part
of the same site and gets persistent stats for free (see below).

## Adding a game

1. Copy `games/_template/` to `games/<your-game-id>/` (the folder name is the URL slug).
2. Build your game in that folder. It can be:
   - a single `index.html` with inline `<script>`/`<canvas>`, or
   - an HTML file plus its own JS/CSS/asset files, or
   - a pre-built React/Vite app (run its build, drop the `dist/` contents in the folder).
3. Edit `game.json` — set the `title`, `description`, `tags`, etc.
4. Run `npm run build` to regenerate `games.json`.

That's it. The game appears on the home page and is playable at `games/<your-game-id>/`.

### game.json fields

| field         | required | default       | notes                                  |
|---------------|----------|---------------|----------------------------------------|
| `title`       | no       | folder name   | shown on the card                      |
| `description` | no       | `""`          | one-line pitch                         |
| `entry`       | no       | `index.html`  | the file opened for the game           |
| `author`      | no       | `""`          |                                        |
| `icon`        | no       | `🎮`          | emoji shown on the home page card      |
| `tags`        | no       | `[]`          | array of strings                       |
| `hidden`      | no       | `false`       | if `true`, kept off the home page      |

Folders starting with `_` or `.` are ignored by the build (that's why `_template`
doesn't show up).

## Shared toolkit (`common/`)

Games are self-contained, but they don't have to reinvent everything. Two helpers
give a new game persistent history + a polished stats page with almost no code.

### Recording scores — `common/stats-store.js`

```js
import { createStore } from "../../common/stats-store.js";

const store = createStore("my-game", { lowerIsBetter: true, unit: "ms" });
store.record(1234);        // save a score (namespaced per game, in localStorage)
store.best();              // best score so far, or null
store.isRecord(1200);      // would this be a new personal best?
store.summarize();         // { count, best, average, median, last, recentAvg, ... }
```

Pass `{ lowerIsBetter: false }` for score-more-is-better games (e.g. points).

### A stats page for free — `common/stats-view.js`

Create `games/<id>/stats.html` with just this:

```html
<link rel="stylesheet" href="../../common/ui.css">
<script type="module">
  import { createStore } from "../../common/stats-store.js";
  import { renderStatsPage } from "../../common/stats-view.js";
  const store = createStore("my-game", { lowerIsBetter: true, unit: "ms" });
  renderStatsPage(document.body, {
    store, title: "My Game", thumb: "🎯",
    metricLabel: "Score", playHref: "index.html", homeHref: "../../",
  });
</script>
```

You get record tiles, a progress-over-time chart (with a running-best reference
line and hover tooltips), a history table, and a "clear data" button — all styled
to match the site. Link to it from your game (see `games/reaction/` for the full
example). Chart colors are validated colorblind-safe.

### A "How to play" overlay — `common/how-to.js`

Give players the rules without cluttering the screen. One call adds a "How to
play" button and a modal describing the game and its controls:

```js
import { mountHelp } from "../../common/how-to.js";
mountHelp({
  title: "My Game", emoji: "🎯",
  tagline: "One-line hook.",
  rules: ["Do this.", "Then that.", "Beat your best."],
  controls: [["Arrow keys", "Move"], ["Space", "Action"]],
});
```

It's self-contained (injects its own styles), and while the modal is open it
swallows keystrokes and pointer events so they don't drive the game underneath.

### Consistent look — `common/ui.css`

Link it and use its classes (`.container`, `.card`, `.tile`, `.panel`, `.btn`,
`.btn-primary`, `.table`, `.hero`, `.eyebrow` …) for any page that frames a game.
The game canvas itself can still be whatever you want.

## Local development

```bash
npm run dev      # build games.json, then serve at http://172.25.1.22:8003
```

Or separately:

```bash
npm run build    # regenerate games.json
npm run preview  # serve the static files (HOST/PORT env vars override the defaults)
```

No dependencies to install — it's all pure Node built-ins.

## Deploying

Push a **version tag** and the GitHub Actions workflow runs `build.js` and
publishes the whole folder to GitHub Pages:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Any tag matching `v*` triggers a release (you can also run it by hand from the
Actions tab — it has a `workflow_dispatch` trigger). Enable Pages once under
**Settings → Pages → Source: GitHub Actions**.

> Note: keep game asset links **relative** (`./sprite.png`, `../../` for the arcade)
> so they work under the project subpath (`https://<user>.github.io/timepass/`).
