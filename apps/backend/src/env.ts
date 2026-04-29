import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
