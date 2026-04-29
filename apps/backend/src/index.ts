import http from "node:http";
import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { tasksRouter } from "./routes/tasks.js";
import { initSocket } from "./socket/server.js";
import { prisma } from "./db/prisma.js";
import { taskQueue } from "./queue/taskQueue.js";

async function main() {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/tasks", tasksRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[backend] error", err);
    res.status(500).json({ error: "internal_server_error" });
  });

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    console.log(`[backend] listening on http://localhost:${env.PORT}`);
    console.log(`[backend] cors origin: ${env.CORS_ORIGIN}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[backend] received ${signal}, shutting down...`);
    server.close();
    await taskQueue.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[backend] fatal", err);
  process.exit(1);
});
