export { fetchUrlTool } from "./fetchUrl.js";
export { summarizeTool } from "./summarize.js";
export { runJsTool } from "./runJs.js";

import { fetchUrlTool } from "./fetchUrl.js";
import { summarizeTool } from "./summarize.js";
import { runJsTool } from "./runJs.js";

export const agentTools = {
  fetch_url: fetchUrlTool,
  summarize: summarizeTool,
  run_js: runJsTool,
} as const;

export type AgentToolName = keyof typeof agentTools;
