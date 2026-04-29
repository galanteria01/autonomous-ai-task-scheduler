import { tool } from "ai";
import { z } from "zod";
import vm from "node:vm";

const EXEC_TIMEOUT_MS = 2_000;

export const runJsTool = tool({
  description:
    "Execute a small, self-contained JavaScript snippet in a sandboxed VM (no network, no fs, no require). The snippet's last expression value is returned. Use this for math, string manipulation, JSON shaping, or quick algorithmic checks.",
  inputSchema: z.object({
    code: z
      .string()
      .min(1)
      .max(4_000)
      .describe(
        "JavaScript expression or short program. The value of the final expression is returned.",
      ),
  }),
  execute: async ({ code }) => {
    try {
      const script = new vm.Script(`(function(){ ${code} })()`, {
        filename: "agent-tool.js",
      });
      const sandbox: Record<string, unknown> = {};
      const context = vm.createContext(sandbox, {
        codeGeneration: { strings: false, wasm: false },
      });
      const result = script.runInContext(context, {
        timeout: EXEC_TIMEOUT_MS,
        breakOnSigint: true,
      });
      return {
        ok: true,
        result: result === undefined ? null : JSON.parse(JSON.stringify(result)),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});
