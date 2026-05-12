export type TaskStatus = "todo" | "in_progress" | "done" | "failed";
export type TaskType =
  | "summarize"
  | "research"
  | "generate"
  | "mac_action"
  | "code";

export const TASK_STATUSES: readonly TaskStatus[] = [
  "todo",
  "in_progress",
  "done",
  "failed",
] as const;

export const TASK_TYPES: readonly TaskType[] = [
  "summarize",
  "research",
  "generate",
  "mac_action",
  "code",
] as const;

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  output: string | null;
  metadata: TaskMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  type: TaskType;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  output?: string | null;
  metadata?: TaskMetadata | null;
}

export interface TaskJobPayload {
  taskId: string;
}

export interface ToolCallLog {
  tool: string;
  args: unknown;
  result?: unknown;
  error?: string;
  timestamp: string;
  durationMs?: number;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface TaskMetadata {
  model?: string;
  steps?: number;
  durationMs?: number;
  startedAt?: string;
  finishedAt?: string;
  attempts?: number;
  toolCalls?: ToolCallLog[];
  usage?: TokenUsage;
  finishReason?: string;
  error?: {
    message: string;
    name?: string;
    stack?: string;
  };
}

export const TASK_QUEUE_NAME = "tasks" as const;
export const TASK_JOB_NAME = "process-task" as const;

export const SOCKET_EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
} as const;
