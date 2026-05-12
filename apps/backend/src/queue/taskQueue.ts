import { Queue } from "bullmq";
import {
  TASK_JOB_NAME,
  TASK_QUEUE_NAME,
  type TaskJobPayload,
} from "@ai-kanban/types";
import { redisConnection } from "./redis.js";

export const taskQueue = new Queue<TaskJobPayload>(TASK_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

export async function enqueueTask(taskId: string) {
  await taskQueue.add(TASK_JOB_NAME, { taskId });
}
