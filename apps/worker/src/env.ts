import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_BASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BACKEND_URL: z.string().url().default("http://localhost:4000"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(3),
  AGENT_MAX_STEPS: z.coerce.number().int().min(1).max(500).default(5),
  AGENT_MAX_STEPS_CODE: z.coerce.number().int().min(1).max(500).default(50),
  AGENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ENABLE_MAC_TOOLS: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((v) => v === "true"),
  MAC_TOOLS_TASK_TYPE: z.string().default("mac_action"),
  ENABLE_CODE_TOOLS: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((v) => v === "true"),
  CODE_TASK_TYPE: z.string().default("code"),
  CODE_WORKSPACE_DIR: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("[worker] Invalid env:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
