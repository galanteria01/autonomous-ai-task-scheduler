import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import {
  TASK_QUEUE_NAME,
  type TaskJobPayload,
  type TaskMetadata,
  type ToolCallLog,
} from "@ai-kanban/types";
import { env } from "./env.js";
import { runAgent } from "./agent.js";
import { getTask, updateTask } from "./api.js";
import {
  getCodeTools,
  getMacTools,
  startMcpProviders,
  stopMcpProviders,
} from "./mcp.js";

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on("error", (err) => {
  console.error("[worker] redis error", err.message);
});

async function processJob(job: Job<TaskJobPayload>) {
  const { taskId } = job.data;
  const attempt = job.attemptsMade + 1;
  console.log(`[worker] picked up task ${taskId} (attempt ${attempt})`);

  const startedAt = new Date();
  const startMs = Date.now();
  const toolCalls: ToolCallLog[] = [];

  await updateTask(taskId, {
    status: "in_progress",
    metadata: {
      startedAt: startedAt.toISOString(),
      attempts: attempt,
      model: env.OPENAI_MODEL,
    } satisfies TaskMetadata,
  });

  const task = await getTask(taskId);

  // Gate MCP tool surfaces strictly by task type so prompt-injected
  // `summarize` / `research` tasks can't reach AppleScript, EventKit, FS, or
  // git — each surface is opt-in via its own task type.
  const macTools =
    task.type === env.MAC_TOOLS_TASK_TYPE ? getMacTools() : null;
  const codeTools =
    task.type === env.CODE_TASK_TYPE ? getCodeTools() : null;
  const extraTools =
    macTools || codeTools
      ? { ...(macTools ?? {}), ...(codeTools ?? {}) }
      : undefined;

  // Coding loops need many more tool calls than other task types — bump the
  // step budget when the task is gated for code tools.
  const maxSteps =
    task.type === env.CODE_TASK_TYPE
      ? env.AGENT_MAX_STEPS_CODE
      : env.AGENT_MAX_STEPS;

  try {
    const result = await runAgent(task, {
      toolCalls,
      model: env.OPENAI_MODEL,
      extraTools,
      maxSteps,
    });
    const finishedAt = new Date();
    const durationMs = Date.now() - startMs;

    console.log(
      `[worker] task ${taskId} done in ${result.steps} step(s), ${result.toolCalls.length} tool call(s), ${durationMs}ms`,
    );
    if (result.usage) {
      console.log(
        `[worker] tokens in=${result.usage.inputTokens ?? "?"} out=${result.usage.outputTokens ?? "?"}`,
      );
    }

    const metadata: TaskMetadata = {
      model: result.model,
      steps: result.steps,
      durationMs,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      attempts: attempt,
      toolCalls: result.toolCalls,
      usage: result.usage,
      finishReason: result.finishReason,
    };

    await updateTask(taskId, {
      status: "done",
      output: result.text || "(agent returned empty output)",
      metadata,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : undefined;
    const finishedAt = new Date();
    const durationMs = Date.now() - startMs;
    console.error(`[worker] task ${taskId} failed:`, name, message);

    const isLastAttempt = attempt >= (job.opts.attempts ?? 1);
    if (isLastAttempt) {
      const metadata: TaskMetadata = {
        model: env.OPENAI_MODEL,
        durationMs,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        attempts: attempt,
        toolCalls,
        error: { message, name },
      };
      await updateTask(taskId, {
        status: "failed",
        output: `Error: ${message}`,
        metadata,
      });
    } else {
      // intermediate failure: record what we have so the UI can show progress
      await updateTask(taskId, {
        metadata: {
          model: env.OPENAI_MODEL,
          attempts: attempt,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs,
          toolCalls,
          error: { message, name },
        } satisfies TaskMetadata,
      });
    }
    throw err;
  }
}

await startMcpProviders();

if (env.ENABLE_CODE_TOOLS && env.WORKER_CONCURRENCY > 1) {
  console.warn(
    `[worker] WARNING: ENABLE_CODE_TOOLS=true with WORKER_CONCURRENCY=${env.WORKER_CONCURRENCY}. ` +
      "Concurrent coding tasks share CODE_WORKSPACE_DIR and will race on the filesystem. " +
      "Set WORKER_CONCURRENCY=1 or implement a per-task git worktree before running real workloads.",
  );
}

const worker = new Worker<TaskJobPayload>(TASK_QUEUE_NAME, processJob, {
  connection,
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("ready", () => {
  const macStatus = env.ENABLE_MAC_TOOLS
    ? getMacTools()
      ? `mac_tools=on(type=${env.MAC_TOOLS_TASK_TYPE})`
      : "mac_tools=requested-but-unavailable"
    : "mac_tools=off";
  const codeStatus = env.ENABLE_CODE_TOOLS
    ? getCodeTools()
      ? `code_tools=on(type=${env.CODE_TASK_TYPE}, dir=${env.CODE_WORKSPACE_DIR ?? "?"})`
      : "code_tools=requested-but-unavailable"
    : "code_tools=off";
  console.log(
    `[worker] ready (concurrency=${env.WORKER_CONCURRENCY}, model=${env.OPENAI_MODEL}, max_steps=${env.AGENT_MAX_STEPS}/${env.AGENT_MAX_STEPS_CODE}, ${macStatus}, ${codeStatus})`,
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
  await stopMcpProviders();
  await connection.quit();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
