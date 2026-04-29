import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import {
  TASK_QUEUE_NAME,
  type TaskJobPayload,
} from "@ai-kanban/types";
import { env } from "./env.js";
import { runAgent } from "./agent.js";
import { getTask, updateTask } from "./api.js";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on("error", (err) => {
  console.error("[worker] redis error", err.message);
});

async function processJob(job: Job<TaskJobPayload>) {
  const { taskId } = job.data;
  console.log(`[worker] picked up task ${taskId} (attempt ${job.attemptsMade + 1})`);

  await updateTask(taskId, { status: "in_progress" });
  const task = await getTask(taskId);

  try {
    const result = await runAgent(task);
    console.log(
      `[worker] task ${taskId} done in ${result.steps} step(s), ${result.toolCalls.length} tool call(s)`,
    );
    if (result.usage) {
      console.log(
        `[worker] tokens in=${result.usage.inputTokens ?? "?"} out=${result.usage.outputTokens ?? "?"}`,
      );
    }
    await updateTask(taskId, {
      status: "done",
      output: result.text || "(agent returned empty output)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] task ${taskId} failed:`, message);

    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    if (isLastAttempt) {
      await updateTask(taskId, {
        status: "failed",
        output: `Error: ${message}`,
      });
    }
    throw err;
  }
}

const worker = new Worker<TaskJobPayload>(TASK_QUEUE_NAME, processJob, {
  connection,
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("ready", () => {
  console.log(
    `[worker] ready (concurrency=${env.WORKER_CONCURRENCY}, model=${env.OPENAI_MODEL}, max_steps=${env.AGENT_MAX_STEPS})`,
  );
});
worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed: ${err.message}`);
});
worker.on("error", (err) => {
  console.error("[worker] error", err);
});

const shutdown = async (signal: string) => {
  console.log(`[worker] received ${signal}, closing...`);
  await worker.close();
  await connection.quit();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
