import { tool } from "ai";
import { z } from "zod";

const MAX_INPUT_CHARS = 30_000;

export const summarizeTool = tool({
  description:
    "Produce a concise summary of long text. Returns a short paragraph plus 3-5 bullet highlights. Use this after fetching long content to condense it before further reasoning.",
  inputSchema: z.object({
    text: z.string().min(1).describe("Text to summarize"),
    maxBullets: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe("Maximum number of bullet points to include"),
  }),
  execute: async ({ text, maxBullets }) => {
    const trimmed =
      text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;

    const sentences = trimmed
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const lead = sentences.slice(0, 2).join(" ");
    const bullets = sentences.slice(2, 2 + maxBullets);

    return {
      ok: true,
      truncated: text.length > MAX_INPUT_CHARS,
      lead: lead || trimmed.slice(0, 280),
      bullets,
    };
  },
});
