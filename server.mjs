import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 8000);
const host = "0.0.0.0";
const root = process.cwd();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".md":   "text/markdown; charset=utf-8",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
};

// Headers per path pattern
function extraHeaders(filePath) {
  if (filePath.endsWith("sw.js")) {
    // Service workers must not be cached
    return { "Cache-Control": "no-cache, no-store, must-revalidate", "Service-Worker-Allowed": "/" };
  }
  if (filePath.includes("/icons/")) {
    return { "Cache-Control": "public, max-age=86400" };
  }
  return { "Cache-Control": "no-cache" };
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, decodeURIComponent(requestedPath)));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const contentType = types[extname(filePath)] || "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      ...extraHeaders(filePath),
    });
    response.end(file);
  } catch {
    // SPA fallback — serve index.html for unknown paths
    try {
      const index = await readFile(join(root, "index.html"));
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
      response.end(index);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  }
}).listen(port, host, () => {
  console.log(`ANAI PWA running at http://${host}:${port}`);
  console.log(`Share on your local network at http://0.0.0.0:${port}`);
});
