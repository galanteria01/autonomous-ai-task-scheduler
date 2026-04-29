import { Router } from "express";
import { z } from "zod";
import {
  TASK_STATUSES,
  TASK_TYPES,
  type Task,
  type TaskStatus,
  type TaskType,
} from "@ai-kanban/types";
import type { Task as PrismaTask } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { enqueueTask } from "../queue/taskQueue.js";
import { emitTaskCreated, emitTaskUpdated } from "../socket/server.js";

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
  })
  .refine((d) => d.status !== undefined || d.output !== undefined, {
    message: "Provide at least one of: status, output",
  });

export function serializeTask(task: PrismaTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    type: task.type as TaskType,
    status: task.status as TaskStatus,
    output: task.output,
    createdAt: task.createdAt.toISOString(),
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
  try {
    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    const task = serializeTask(updated);
    emitTaskUpdated(task);
    res.json(task);
  } catch {
    res.status(404).json({ error: "Task not found" });
  }
});
