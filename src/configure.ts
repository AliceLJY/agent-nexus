import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { CLAUDE_JSON, CODEX_TOML, GEMINI_JSON, NEXUS_DIR } from "./paths.js";

interface NexusConfig {
  telegram: { botToken: string; ownerId: number };
  memory: { jinaApiKey: string; dbPath: string };
  agents: { claude: boolean; codex: boolean; gemini: boolean };
}

function resolveRecallnestMcp(): string {
  const candidates = [
    join(NEXUS_DIR, "node_modules", "recallnest", "src", "mcp-server.ts"),
    join(dirname(dirname(import.meta.dir)), "node_modules", "recallnest", "src", "mcp-server.ts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  const global = join(process.env.HOME || "", "node_modules", "recallnest", "src", "mcp-server.ts");
  if (existsSync(global)) return global;
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
  const config = JSON.parse(readFileSync(CLAUDE_JSON, "utf-8"));
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

  const bunPath = process.execPath;
  const tomlBlock = `\n[mcp_servers.recallnest]\ntype = "stdio"\ncommand = "${bunPath}"\nargs = ["run", "${mcpEntry}"]\n\n[mcp_servers.recallnest.env]\nJINA_API_KEY = "${jinaApiKey}"\n`;
  writeFileSync(CODEX_TOML, content + tomlBlock);
  console.log("  ✅ Codex MCP configured");
}

function injectGemini(mcpEntry: string, jinaApiKey: string): void {
  const dir = dirname(GEMINI_JSON);
  mkdirSync(dir, { recursive: true });

  let config: any = {};
  if (existsSync(GEMINI_JSON)) {
    backup(GEMINI_JSON);
    config = JSON.parse(readFileSync(GEMINI_JSON, "utf-8"));
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

function generateBridgeConfig(config: NexusConfig): void {
  const bridgeConfig = {
    shared: {
      ownerTelegramId: String(config.telegram.ownerId),
      cwd: process.env.HOME || "/tmp",
      defaultVerboseLevel: 1,
      executor: "direct",
      enableGroupSharedContext: true,
      sharedContextBackend: "sqlite",
    },
    backends: {
      claude: {
        enabled: config.agents.claude,
        telegramBotToken: config.agents.claude ? config.telegram.botToken : "",
        sessionsDb: "sessions.db",
        model: "claude-sonnet-4-6",
        permissionMode: "default",
      },
      codex: {
        enabled: config.agents.codex,
        telegramBotToken: config.agents.codex ? config.telegram.botToken : "",
        sessionsDb: "sessions-codex.db",
        model: "",
      },
      gemini: {
        enabled: config.agents.gemini,
        telegramBotToken: config.agents.gemini ? config.telegram.botToken : "",
        sessionsDb: "sessions-gemini.db",
        model: "gemini-2.5-pro",
      },
    },
  };
  const bridgePath = join(NEXUS_DIR, "bridge-config.json");
  writeFileSync(bridgePath, JSON.stringify(bridgeConfig, null, 2) + "\n");
  console.log(`  ✅ Bridge config written to ${bridgePath}`);
}

export function injectAllMcpConfigs(config: NexusConfig): void {
  console.log("\n  🔌 Configuring MCP...\n");
  const mcpEntry = resolveRecallnestMcp();
  if (config.agents.claude) injectClaude(mcpEntry, config.memory.jinaApiKey);
  if (config.agents.codex) injectCodex(mcpEntry, config.memory.jinaApiKey);
  if (config.agents.gemini) injectGemini(mcpEntry, config.memory.jinaApiKey);
  generateBridgeConfig(config);
}
