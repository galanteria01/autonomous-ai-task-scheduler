import { tool } from "ai";
import { z } from "zod";

const MAX_BYTES = 200_000;
const FETCH_TIMEOUT_MS = 10_000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const fetchUrlTool = tool({
  description:
    "Fetch the visible text content of a webpage by URL. Returns plain text with HTML stripped. Use this to research articles, docs, or any public web page.",
  inputSchema: z.object({
    url: z.string().url().describe("The fully-qualified https URL to fetch"),
  }),
  execute: async ({ url }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "ai-kanban-agent/0.1" },
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status} ${res.statusText}` };
      }
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const trimmed = raw.length > MAX_BYTES ? raw.slice(0, MAX_BYTES) : raw;
      const text = contentType.includes("html") ? stripHtml(trimmed) : trimmed;
      return {
        ok: true,
        url,
        contentType,
        truncated: raw.length > MAX_BYTES,
        text,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});
