import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  BACKEND_URL: z.string().url().default("http://localhost:4000"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(3),
  AGENT_MAX_STEPS: z.coerce.number().int().min(1).max(20).default(5),
  AGENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("[worker] Invalid env:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
