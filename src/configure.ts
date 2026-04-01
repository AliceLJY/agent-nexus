import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { CLAUDE_JSON, CLAUDE_MD, CODEX_TOML, CODEX_AGENTS_MD, GEMINI_JSON, GEMINI_MD, NEXUS_DIR } from "./paths.js";
import type { NexusConfig } from "./types.js";

function resolveRecallnestMcp(): string {
  const home = process.env.HOME || "";
  const candidates = [
    // Global install (~/.agent-nexus/node_modules/)
    join(NEXUS_DIR, "node_modules", "recallnest", "src", "mcp-server.ts"),
    // Local project node_modules (symlink or real)
    join(dirname(dirname(import.meta.dir)), "node_modules", "recallnest", "src", "mcp-server.ts"),
    // CWD node_modules
    join(process.cwd(), "node_modules", "recallnest", "src", "mcp-server.ts"),
    // Common local dev paths
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

  // Remove old block if present
  const blockRegex = new RegExp(
    `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
  );
  const cleaned = existing.replace(blockRegex, "").trim();

  // Prepend new block (RecallNest rules should come first)
  const newContent = `${startMarker}\n${snippet}\n${endMarker}\n\n${cleaned}\n`;
  writeFileSync(targetPath, newContent);
}

function injectContinuityRules(config: NexusConfig): void {
  console.log("\n  📝 Injecting RecallNest continuity rules...\n");

  if (config.agents.claude.enabled) {
    const snippet = resolveSnippet("claude-code");
    if (snippet) {
      backup(CLAUDE_MD);
      injectManagedBlock(CLAUDE_MD, snippet, "recallnest-continuity");
      console.log("  ✅ Claude Code CLAUDE.md rules injected");
    } else {
      console.log("  ⚠️  Claude snippet not found — skipping CLAUDE.md");
    }
  }

  if (config.agents.codex.enabled) {
    const snippet = resolveSnippet("codex");
    if (snippet) {
      backup(CODEX_AGENTS_MD);
      injectManagedBlock(CODEX_AGENTS_MD, snippet, "recallnest-continuity");
      console.log("  ✅ Codex AGENTS.md rules injected");
    } else {
      console.log("  ⚠️  Codex snippet not found — skipping AGENTS.md");
    }
  }

  if (config.agents.gemini.enabled) {
    const snippet = resolveSnippet("gemini-cli");
    if (snippet) {
      backup(GEMINI_MD);
      injectManagedBlock(GEMINI_MD, snippet, "recallnest-continuity");
      console.log("  ✅ Gemini GEMINI.md rules injected");
    } else {
      console.log("  ⚠️  Gemini snippet not found — skipping GEMINI.md");
    }
  }
}

function generateBridgeConfig(config: NexusConfig): void {
  const bridgeConfig = {
    shared: {
      ownerTelegramId: String(config.telegram.ownerId),
      cwd: process.env.HOME || "/tmp",
      httpProxy: config.telegram.httpProxy || "",
      defaultVerboseLevel: 1,
      executor: "direct",
      tasksDb: "tasks.db",
      enableGroupSharedContext: config.groupChat.enabled,
      groupContextMaxMessages: 30,
      groupContextMaxTokens: 3000,
      groupContextTtlMs: 1200000,
      sharedContextBackend: config.groupChat.enabled ? config.groupChat.sharedContextBackend : "sqlite",
      sharedContextDb: "shared-context.db",
      sharedContextJsonPath: "shared-context.json",
      redisUrl: config.groupChat.redisUrl || "",
      triggerDedupTtlMs: 300000,
      sessionTimeoutMs: 900000,
    },
    backends: {
      claude: {
        enabled: config.agents.claude.enabled,
        telegramBotToken: config.agents.claude.botToken || "",
        sessionsDb: "sessions.db",
        model: "claude-sonnet-4-6",
        permissionMode: "default",
      },
      codex: {
        enabled: config.agents.codex.enabled,
        telegramBotToken: config.agents.codex.botToken || "",
        sessionsDb: "sessions-codex.db",
        model: "",
      },
      gemini: {
        enabled: config.agents.gemini.enabled,
        telegramBotToken: config.agents.gemini.botToken || "",
        sessionsDb: "sessions-gemini.db",
        model: "gemini-2.5-pro",
        oauthClientId: config.agents.gemini.oauthClientId || "",
        oauthClientSecret: config.agents.gemini.oauthClientSecret || "",
        googleCloudProject: "",
      },
    },
  };
  const bridgePath = join(NEXUS_DIR, "bridge-config.json");
  writeFileSync(bridgePath, JSON.stringify(bridgeConfig, null, 2) + "\n", { mode: 0o600 });
  console.log(`  ✅ Bridge config written to ${bridgePath}`);
}

export function injectAllMcpConfigs(config: NexusConfig): void {
  console.log("\n  🔌 Configuring MCP...\n");
  const mcpEntry = resolveRecallnestMcp();
  if (config.agents.claude.enabled) injectClaude(mcpEntry, config.memory.jinaApiKey);
  if (config.agents.codex.enabled) injectCodex(mcpEntry, config.memory.jinaApiKey);
  if (config.agents.gemini.enabled) injectGemini(mcpEntry, config.memory.jinaApiKey);
  generateBridgeConfig(config);
  injectContinuityRules(config);
}
