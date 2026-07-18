# 🎮 Timepass

A **static** website that hosts a collection of browser games. No runtime server —
it's plain HTML/CSS/JS that deploys to GitHub Pages. Each game is a self-contained
folder under `games/`.

## How it works

```
timepass/
├── index.html          # landing page — fetches games.json and renders game cards
├── style.css           # landing page styles
├── games.json          # GENERATED catalog of games (do not edit by hand)
├── build.js            # scans games/*/game.json → writes games.json
├── preview.js          # local static server (dev only; not deployed)
├── games/
│   ├── _template/      # copy this to start a new game (ignored by the build)
│   └── reaction/       # example game — a working reference
└── .github/workflows/deploy.yml   # auto-deploys to GitHub Pages on push to main
```

Because GitHub Pages can't run code, `build.js` bakes the list of games into
`games.json` ahead of time. The static `index.html` just fetches that file.

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
| `tags`        | no       | `[]`          | array of strings                       |
| `hidden`      | no       | `false`       | if `true`, kept off the home page      |

Folders starting with `_` or `.` are ignored by the build (that's why `_template`
doesn't show up).

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

Push to `main`. The GitHub Actions workflow runs `build.js` and publishes the
whole folder to GitHub Pages. Enable it once under **Settings → Pages → Source:
GitHub Actions**.

> Note: keep game asset links **relative** (`./sprite.png`, `../../` for the arcade)
> so they work under the project subpath (`https://<user>.github.io/timepass/`).
