import http from "node:http";
import { GEN_STATS_START, makeStore } from "./store.mjs";

const port = Number.parseInt(process.env.PORT || "8080", 10);
const store = makeStore(process.env.STATS_FILE || "/data/total.txt");

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => resolve(""));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathName = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "GET" && pathName === "/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathName === "/gen-count" || pathName === "/api/gen-count") {
    if (req.method === "GET") {
      sendJson(res, 200, { total: store.read() });
      return;
    }
    if (req.method === "POST") {
      await readBody(req);
      sendJson(res, 200, { total: store.bump(1) });
      return;
    }
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  sendJson(res, 404, { error: "not_found", start: GEN_STATS_START });
});

server.listen(port, "0.0.0.0", () => {
  store.read();
});
