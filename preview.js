// Tiny static file server for local preview ONLY. Production is GitHub Pages,
// which serves these same files statically — this script is never deployed.
//   npm run dev       (build + preview)
//   npm run preview   (preview whatever is already built)

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || "172.25.1.22";
const PORT = process.env.PORT || 8003;

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".ico": "image/x-icon",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".txt": "text/plain",
};

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    // Keep requests inside root.
    let rel = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, rel);
    if (!filePath.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }

    let info = await stat(filePath).catch(() => null);
    if (info && info.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }
    if (!info) { res.writeHead(404).end("Not found"); return; }

    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": TYPES[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch (err) {
    res.writeHead(500).end("Server error: " + err.message);
  }
}).listen(PORT, HOST, () => {
  console.log(`Preview at http://${HOST}:${PORT}  (static — same as GitHub Pages)`);
});
