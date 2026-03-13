import { createServer } from "node:http";

const service = process.env["SERVICE_NAME"] ?? "games";
const port = Number(process.env["PORT"] ?? "4107");
const startedAt = new Date().toISOString();

const server = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ service, status: "ok", startedAt, games: ["ludo", "chess", "carrom", "sudoku"] }));
    return;
  }

  if (url === "/metrics") {
    res.writeHead(200, { "content-type": "text/plain; version=0.0.4" });
    res.end(`service_uptime_seconds{service="${service}"} ${Math.floor(process.uptime())}\n`);
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`[${service}] listening on :${port}`);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
