// Scans games/*/game.json and writes games.json, the catalog the static
// landing page (index.html) fetches at runtime. GitHub Pages can't run code,
// so this build step is how the site "discovers" games.
//
// Run it whenever you add or edit a game:  npm run build
//
// game.json shape (all fields optional; sensible defaults are filled in):
// {
//   "title":       "Human readable name",   // defaults to the folder name
//   "description": "One line pitch",          // shown on the home page card
//   "entry":       "index.html",              // page opened at games/<id>/
//   "author":      "Someone",
//   "icon":        "🎮",                        // emoji shown on the home card
//   "tags":        ["puzzle", "arcade"],
//   "hidden":      false                       // if true, omitted from the list
// }
//
// Folders whose name starts with "_" or "." are ignored, so scaffolding such
// as games/_template lives happily next to real games.

import { readdirSync, readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = join(__dirname, "games");
const OUT = join(__dirname, "games.json");

function loadGames() {
  if (!existsSync(GAMES_DIR)) return [];
  const games = [];

  for (const name of readdirSync(GAMES_DIR)) {
    if (name.startsWith("_") || name.startsWith(".")) continue;

    const dir = join(GAMES_DIR, name);
    if (!statSync(dir).isDirectory()) continue;

    const manifestPath = join(dir, "game.json");
    let manifest = {};
    if (existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      } catch (err) {
        console.warn(`  ! skipping ${name}: invalid game.json (${err.message})`);
        continue;
      }
    }

    const entry = manifest.entry || "index.html";
    if (!existsSync(join(dir, entry))) {
      console.warn(`  ! skipping ${name}: entry file "${entry}" not found`);
      continue;
    }

    games.push({
      id: name,
      title: manifest.title || name,
      description: manifest.description || "",
      author: manifest.author || "",
      icon: manifest.icon || "🎮",
      tags: Array.isArray(manifest.tags) ? manifest.tags : [],
      hidden: manifest.hidden === true,
      path: `games/${name}/${entry === "index.html" ? "" : entry}`,
    });
  }

  games.sort((a, b) => a.title.localeCompare(b.title));
  return games;
}

const games = loadGames();
writeFileSync(OUT, JSON.stringify(games, null, 2) + "\n");
const visible = games.filter((g) => !g.hidden).length;
console.log(`Wrote games.json — ${games.length} game(s), ${visible} visible.`);
