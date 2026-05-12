import { Router } from "express";
import { z } from "zod";
import {
  TASK_STATUSES,
  TASK_TYPES,
  type Task,
  type TaskMetadata,
  type TaskStatus,
  type TaskType,
} from "@ai-kanban/types";
import type { Task as PrismaTask } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { enqueueTask } from "../queue/taskQueue.js";
import {
  emitTaskCreated,
  emitTaskDeleted,
  emitTaskUpdated,
} from "../socket/server.js";

export const tasksRouter = Router();

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4_000),
  type: z.enum(TASK_TYPES as readonly [TaskType, ...TaskType[]]),
});

const updateSchema = z
  .object({
    status: z.enum(TASK_STATUSES as readonly [TaskStatus, ...TaskStatus[]]).optional(),
    output: z.string().nullable().optional(),
    metadata: z.unknown().nullable().optional(),
  })
  .refine(
    (d) => d.status !== undefined || d.output !== undefined || d.metadata !== undefined,
    { message: "Provide at least one of: status, output, metadata" },
  );

export function serializeTask(task: PrismaTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type as TaskType,
    status: task.status as TaskStatus,
    output: task.output,
    metadata: (task.metadata ?? null) as TaskMetadata | null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

tasksRouter.get("/", async (_req, res) => {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  res.json(tasks.map(serializeTask));
});

tasksRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const created = await prisma.task.create({ data: parsed.data });
  const task = serializeTask(created);

  await enqueueTask(task.id);
  emitTaskCreated(task);

  res.status(201).json(task);
});

tasksRouter.patch("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  // Prisma's Json input type expects `InputJsonValue | null`. We've already
  // validated that metadata is JSON-serializable on the client side, so cast.
  const data = parsed.data as {
    status?: TaskStatus;
    output?: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any;
  };
  try {
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });
    const task = serializeTask(updated);
    emitTaskUpdated(task);
    res.json(task);
  } catch {
    res.status(404).json({ error: "Task not found" });
  }
});

tasksRouter.post("/:id/retry", async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Task not found" });
  // Block while a worker is actively running the task to avoid double-execution.
  // All other states (todo / done / failed) are safe to reset and re-enqueue.
  if (existing.status === "in_progress") {
    return res
      .status(409)
      .json({ error: "Cannot rerun a task that is currently in progress" });
  }

  const previousAttempts =
    typeof (existing.metadata as TaskMetadata | null)?.attempts === "number"
      ? ((existing.metadata as TaskMetadata).attempts as number)
      : 0;

  const updated = await prisma.task.update({
    where: { id: existing.id },
    data: {
      status: "todo",
      output: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: { attempts: previousAttempts } as any,
    },
  });
  const task = serializeTask(updated);

  await enqueueTask(task.id);
  emitTaskUpdated(task);

  res.json(task);
});

tasksRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
  } catch {
    return res.status(404).json({ error: "Task not found" });
  }
  emitTaskDeleted(req.params.id);
  res.status(204).send();
});
