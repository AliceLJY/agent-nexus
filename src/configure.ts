import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { CLAUDE_JSON, CLAUDE_MD, CODEX_TOML, CODEX_AGENTS_MD, GEMINI_JSON, GEMINI_MD, NEXUS_DIR } from "./paths.js";

function resolveRecallnestMcp(): string {
  const home = process.env.HOME || "";
  const candidates = [
    join(NEXUS_DIR, "node_modules", "recallnest", "src", "mcp-server.ts"),
    join(dirname(dirname(import.meta.dir)), "node_modules", "recallnest", "src", "mcp-server.ts"),
    join(process.cwd(), "node_modules", "recallnest", "src", "mcp-server.ts"),
    join(home, "Projects", "memory-lancedb-pro", "src", "mcp-server.ts"),
    join(home, "recallnest", "src", "mcp-server.ts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error("Cannot find recallnest/src/mcp-server.ts. Run: bun install");
}

function backup(path: string): void {
  if (existsSync(path)) {
    const backupPath = `${path}.agent-nexus-backup`;
    if (!existsSync(backupPath)) {
      copyFileSync(path, backupPath);
      console.log(`  📋 Backed up ${path}`);
    }
  }
}

function injectClaude(mcpEntry: string, jinaApiKey: string): void {
  if (!existsSync(CLAUDE_JSON)) {
    writeFileSync(CLAUDE_JSON, JSON.stringify({ mcpServers: {} }, null, 2) + "\n");
  }
  backup(CLAUDE_JSON);
  let config: Record<string, any>;
  try {
    config = JSON.parse(readFileSync(CLAUDE_JSON, "utf-8"));
  } catch {
    console.log(`  ⚠️  ${CLAUDE_JSON} is malformed, recreating`);
    config = { mcpServers: {} };
  }
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.recallnest = {
    command: "bun",
    args: ["run", mcpEntry],
    env: { JINA_API_KEY: jinaApiKey },
    type: "stdio",
  };
  writeFileSync(CLAUDE_JSON, JSON.stringify(config, null, 2) + "\n");
  console.log("  ✅ Claude Code MCP configured");
}

function injectCodex(mcpEntry: string, jinaApiKey: string): void {
  const dir = dirname(CODEX_TOML);
  mkdirSync(dir, { recursive: true });

  let content = "";
  if (existsSync(CODEX_TOML)) {
    backup(CODEX_TOML);
    content = readFileSync(CODEX_TOML, "utf-8");
  }

  if (content.includes("[mcp_servers.recallnest]")) {
    console.log("  ⏭️  Codex MCP already configured — skipping");
    return;
  }

  const tomlBlock = `\n[mcp_servers.recallnest]\ntype = "stdio"\ncommand = "bun"\nargs = ["run", "${mcpEntry}"]\n\n[mcp_servers.recallnest.env]\nJINA_API_KEY = "${jinaApiKey}"\n`;
  writeFileSync(CODEX_TOML, content + tomlBlock);
  console.log("  ✅ Codex MCP configured");
}

function injectGemini(mcpEntry: string, jinaApiKey: string): void {
  const dir = dirname(GEMINI_JSON);
  mkdirSync(dir, { recursive: true });

  let config: Record<string, any> = {};
  if (existsSync(GEMINI_JSON)) {
    backup(GEMINI_JSON);
    try {
      config = JSON.parse(readFileSync(GEMINI_JSON, "utf-8"));
    } catch {
      console.log(`  ⚠️  ${GEMINI_JSON} is malformed, recreating`);
      config = {};
    }
  }

  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.recallnest = {
    command: "bun",
    args: ["run", mcpEntry],
    env: { JINA_API_KEY: jinaApiKey },
    timeout: 60000,
  };
  writeFileSync(GEMINI_JSON, JSON.stringify(config, null, 2) + "\n");
  console.log("  ✅ Gemini CLI MCP configured");
}

function resolveSnippet(tool: "claude-code" | "codex" | "gemini-cli"): string | null {
  const home = process.env.HOME || "";
  const snippetName = tool === "codex" ? "agents-md-snippet.md" : tool === "claude-code" ? "claude-md-snippet.md" : "gemini-md-snippet.md";
  const candidates = [
    join(NEXUS_DIR, "node_modules", "recallnest", "integrations", tool, snippetName),
    join(dirname(dirname(import.meta.dir)), "node_modules", "recallnest", "integrations", tool, snippetName),
    join(process.cwd(), "node_modules", "recallnest", "integrations", tool, snippetName),
    join(home, "recallnest", "integrations", tool, snippetName),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function injectManagedBlock(targetPath: string, snippetPath: string, markerName: string): void {
  mkdirSync(dirname(targetPath), { recursive: true });

  let existing = "";
  if (existsSync(targetPath)) {
    existing = readFileSync(targetPath, "utf-8");
  }

  const startMarker = `<!-- ${markerName}:start -->`;
  const endMarker = `<!-- ${markerName}:end -->`;
  const snippet = readFileSync(snippetPath, "utf-8");

  const blockRegex = new RegExp(
    `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
  );
  const cleaned = existing.replace(blockRegex, "").trim();
  const newContent = `${startMarker}\n${snippet}\n${endMarker}\n\n${cleaned}\n`;
  writeFileSync(targetPath, newContent);
}

const TOOL_MAP: Record<string, { inject: typeof injectClaude; snippet: "claude-code" | "codex" | "gemini-cli"; mdPath: string; mdLabel: string }> = {
  claude: { inject: injectClaude, snippet: "claude-code", mdPath: CLAUDE_MD, mdLabel: "Claude Code CLAUDE.md" },
  codex: { inject: injectCodex, snippet: "codex", mdPath: CODEX_AGENTS_MD, mdLabel: "Codex AGENTS.md" },
  gemini: { inject: injectGemini, snippet: "gemini-cli", mdPath: GEMINI_JSON, mdLabel: "Gemini GEMINI.md" },
};

export function injectAllMcpConfigs(jinaApiKey: string, enabledBackends: string[]): void {
  console.log("\n  🔌 Configuring MCP...\n");
  const mcpEntry = resolveRecallnestMcp();

  for (const backend of enabledBackends) {
    const tool = TOOL_MAP[backend];
    if (tool) tool.inject(mcpEntry, jinaApiKey);
  }

  // Inject RecallNest continuity rules
  console.log("\n  📝 Injecting RecallNest continuity rules...\n");
  const snippetMap: Record<string, { tool: "claude-code" | "codex" | "gemini-cli"; mdPath: string; label: string }> = {
    claude: { tool: "claude-code", mdPath: CLAUDE_MD, label: "Claude Code CLAUDE.md" },
    codex: { tool: "codex", mdPath: CODEX_AGENTS_MD, label: "Codex AGENTS.md" },
    gemini: { tool: "gemini-cli", mdPath: GEMINI_MD, label: "Gemini GEMINI.md" },
  };

  for (const backend of enabledBackends) {
    const entry = snippetMap[backend];
    if (!entry) continue;
    const snippet = resolveSnippet(entry.tool);
    if (snippet) {
      backup(entry.mdPath);
      injectManagedBlock(entry.mdPath, snippet, "recallnest-continuity");
      console.log(`  ✅ ${entry.label} rules injected`);
    } else {
      console.log(`  ⚠️  ${entry.label} snippet not found — skipping`);
    }
  }
}
