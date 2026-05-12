import { createRequire } from "node:module";
import path from "node:path";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import type { ToolSet } from "ai";
import { env } from "./env.js";

const require = createRequire(import.meta.url);

interface ProviderHandle {
  /** Stable name for logs / namespacing. */
  name: string;
  /** All MCP clients owned by this provider (one provider may host multiple servers). */
  clients: MCPClient[];
  /** Merged tool set across this provider's clients. */
  tools: ToolSet;
}

interface ProviderRegistry {
  mac: ProviderHandle | null;
  code: ProviderHandle | null;
}

const handles: ProviderRegistry = { mac: null, code: null };

/**
 * Spawn one stdio MCP server, fetch its tools, and return the (client, tools) pair.
 * Logs but doesn't throw — caller decides how to handle a missing/broken server.
 */
async function spawnStdioServer(opts: {
  label: string;
  command: string;
  args: string[];
}): Promise<{ client: MCPClient; tools: ToolSet } | null> {
  try {
    const client = await createMCPClient({
      transport: new StdioMCPTransport({
        command: opts.command,
        args: opts.args,
        stderr: "inherit",
      }),
    });
    const rawTools = await client.tools();
    const names = Object.keys(rawTools);
    console.log(
      `[worker] mcp:${opts.label} ready (${names.length} tools): ${names.join(", ")}`,
    );
    // The MCP client's tool generic uses `unknown` for input schemas while AI
    // SDK's ToolSet uses `never` at the index signature. Runtime shape is
    // identical AI SDK tools — narrow at the boundary.
    const tools = rawTools as unknown as ToolSet;
    return { client, tools };
  } catch (err) {
    console.warn(
      `[worker] mcp:${opts.label} failed to start; tools disabled:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function tryResolve(specifier: string): string | null {
  try {
    return require.resolve(specifier);
  } catch {
    return null;
  }
}

async function startMacProvider(): Promise<ProviderHandle | null> {
  const bin = tryResolve("mcp-macos/bin/run.cjs");
  if (!bin) {
    console.warn(
      "[worker] ENABLE_MAC_TOOLS=true but `mcp-macos` is not installed; skipping",
    );
    return null;
  }
  const spawned = await spawnStdioServer({
    label: "mcp-macos",
    command: process.execPath,
    args: [bin],
  });
  if (!spawned) return null;
  return { name: "mac", clients: [spawned.client], tools: spawned.tools };
}

async function startCodeProvider(): Promise<ProviderHandle | null> {
  const workspace = env.CODE_WORKSPACE_DIR;
  if (!workspace) {
    console.warn(
      "[worker] ENABLE_CODE_TOOLS=true but CODE_WORKSPACE_DIR is unset; skipping",
    );
    return null;
  }
  const absWorkspace = path.resolve(workspace);

  const fsBin = tryResolve("@modelcontextprotocol/server-filesystem/dist/index.js");
  const gitBin = tryResolve("@cyanheads/git-mcp-server/dist/index.js");

  if (!fsBin && !gitBin) {
    console.warn(
      "[worker] ENABLE_CODE_TOOLS=true but neither filesystem nor git MCP server is installed",
    );
    return null;
  }

  const clients: MCPClient[] = [];
  const tools: ToolSet = {};

  if (fsBin) {
    const fs = await spawnStdioServer({
      label: `server-filesystem(${absWorkspace})`,
      command: process.execPath,
      args: [fsBin, absWorkspace],
    });
    if (fs) {
      clients.push(fs.client);
      Object.assign(tools, fs.tools);
    }
  }

  if (gitBin) {
    const git = await spawnStdioServer({
      label: `git-mcp-server(${absWorkspace})`,
      command: process.execPath,
      // git-mcp-server respects GIT_MCP_REPOS at the env level; passing the
      // working directory and letting git discover the repo is more portable.
      args: [gitBin],
    });
    if (git) {
      // Some git tools collide in name with FS tools (`status`, etc.) — namespace
      // git tools defensively so the model can disambiguate and we never
      // accidentally shadow a filesystem tool.
      const namespaced: ToolSet = {};
      for (const [k, v] of Object.entries(git.tools)) {
        namespaced[k.startsWith("git_") ? k : `git_${k}`] = v;
      }
      clients.push(git.client);
      Object.assign(tools, namespaced);
    }
  }

  if (clients.length === 0) return null;
  return { name: "code", clients, tools };
}

export async function startMcpProviders(): Promise<void> {
  if (env.ENABLE_MAC_TOOLS) handles.mac = await startMacProvider();
  if (env.ENABLE_CODE_TOOLS) handles.code = await startCodeProvider();
}

export function getMacTools(): ToolSet | null {
  return handles.mac?.tools ?? null;
}

export function getCodeTools(): ToolSet | null {
  return handles.code?.tools ?? null;
}

export async function stopMcpProviders(): Promise<void> {
  const all = [handles.mac, handles.code].filter(
    (h): h is ProviderHandle => h !== null,
  );
  await Promise.all(
    all.flatMap((h) =>
      h.clients.map(async (c) => {
        try {
          await c.close();
        } catch (err) {
          console.warn(
            `[worker] error closing mcp:${h.name}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }),
    ),
  );
  handles.mac = null;
  handles.code = null;
}
