import { createInterface } from "readline/promises";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { detectEnvironment, printDetectResult } from "./detect.js";
import { NEXUS_DIR, CONFIG_PATH, PIDS_DIR, LOGS_DIR } from "./paths.js";
import { injectAllMcpConfigs } from "./configure.js";

interface BackendConfig {
  enabled: boolean;
  botToken: string;
}

interface GeminiConfig extends BackendConfig {
  oauthClientId: string;
  oauthClientSecret: string;
}

interface NexusConfig {
  telegram: { ownerId: number; httpProxy: string };
  memory: { jinaApiKey: string };
  agents: { claude: BackendConfig; codex: BackendConfig; gemini: GeminiConfig };
  crossAgent: { ccToCodex: "plugin" | "mcp" | "both" };
  groupChat: { enabled: boolean; sharedContextBackend: "sqlite" | "redis"; redisUrl: string };
}

async function ask(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  const answer = await rl.question(`  ${prompt}: `);
  return answer.trim();
}

export async function runWizard(): Promise<void> {
  console.log("\n🔧 agent-nexus init\n");

  // 1. Detect
  const env = await detectEnvironment();
  printDetectResult(env);

  // 2. Check existing config
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  if (existsSync(CONFIG_PATH)) {
    const overwrite = (await ask(rl, "Config already exists. Overwrite? [y/N]") || "n").toLowerCase();
    if (overwrite !== "y" && overwrite !== "yes") {
      console.log("  ⏭️  Keeping existing config. Done.");
      rl.close();
      return;
    }
  }

  // 3. Collect credentials
  console.log("\n  📝 Credentials\n");

  const ownerIdStr = await ask(rl, "Your Telegram User ID");
  const ownerId = parseInt(ownerIdStr, 10);
  if (isNaN(ownerId)) { console.log("  ❌ Invalid Telegram ID."); process.exit(1); }

  const jinaApiKey = await ask(rl, "Jina API Key (for RecallNest embeddings)");
  if (!jinaApiKey) { console.log("  ❌ Jina API key is required."); process.exit(1); }

  const httpProxy = await ask(rl, "HTTPS Proxy (optional, Enter to skip)");

  // 4. Per-backend bot tokens
  console.log("\n  🤖 Bot Tokens (each backend needs its own @BotFather token)\n");

  const agents: NexusConfig["agents"] = {
    claude: { enabled: false, botToken: "" },
    codex: { enabled: false, botToken: "" },
    gemini: { enabled: false, botToken: "", oauthClientId: "", oauthClientSecret: "" },
  };

  const detected: [string, boolean][] = [["claude", env.claude], ["codex", env.codex], ["gemini", env.gemini]];
  for (const [name, found] of detected) {
    if (!found) { console.log(`  ⬚ ${name} not detected, skipping`); continue; }
    const token = await ask(rl, `${name} Bot Token (Enter to skip)`);
    if (!token) { console.log(`  ⏭️  ${name} skipped`); continue; }
    (agents as any)[name].enabled = true;
    (agents as any)[name].botToken = token;
    if (name === "gemini") {
      agents.gemini.oauthClientId = await ask(rl, "Gemini OAuth Client ID");
      agents.gemini.oauthClientSecret = await ask(rl, "Gemini OAuth Client Secret");
    }
  }

  // 5. CC ↔ Codex communication
  let ccToCodex: NexusConfig["crossAgent"]["ccToCodex"] = "mcp";
  if (env.claude && env.codex) {
    console.log("\n  🔗 CC ↔ Codex Communication\n");
    console.log("  How should Claude Code call Codex?");
    console.log("    1. Official Codex Plugin (codex@openai-codex)");
    console.log("    2. Shared RecallNest MCP (already configured)");
    console.log("    3. Both (recommended)");
    const choice = await ask(rl, "Choose [3]") || "3";
    ccToCodex = choice === "1" ? "plugin" : choice === "2" ? "mcp" : "both";
  }

  // 6. Group chat (multi-bot in same Telegram group)
  const enabledCount = Object.values(agents).filter(a => a.enabled).length;
  let groupChat: NexusConfig["groupChat"] = { enabled: false, sharedContextBackend: "sqlite", redisUrl: "" };
  if (enabledCount >= 2) {
    console.log("\n  👥 Group Chat\n");
    const wantGroup = (await ask(rl, "Put multiple bots in the same Telegram group? [y/N]") || "n").toLowerCase();
    if (wantGroup === "y" || wantGroup === "yes") {
      console.log("  Shared context backend:");
      console.log("    1. SQLite (local, single machine)");
      console.log("    2. Redis (recommended for multi-bot groups)");
      const backendChoice = await ask(rl, "Choose [2]") || "2";
      const backend = backendChoice === "1" ? "sqlite" as const : "redis" as const;
      let redisUrl = "";
      if (backend === "redis") {
        redisUrl = await ask(rl, "Redis URL [redis://localhost:6379]") || "redis://localhost:6379";
      }
      groupChat = { enabled: true, sharedContextBackend: backend, redisUrl };
    }
  }

  rl.close();

  const anyEnabled = Object.values(agents).some(a => a.enabled);
  if (!anyEnabled) { console.log("  ❌ At least one backend needs a bot token."); process.exit(1); }

  // 7. Build config
  const config: NexusConfig = {
    telegram: { ownerId, httpProxy: httpProxy || "" },
    memory: { jinaApiKey },
    agents,
    crossAgent: { ccToCodex },
    groupChat,
  };

  // 8. Write dirs + config
  mkdirSync(NEXUS_DIR, { recursive: true });
  mkdirSync(PIDS_DIR, { recursive: true });
  mkdirSync(LOGS_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  console.log(`\n  ✅ Config written to ${CONFIG_PATH}`);

  // 9. Inject MCP configs
  injectAllMcpConfigs(config);

  // 10. Cross-agent setup hints
  if (ccToCodex === "plugin" || ccToCodex === "both") {
    console.log("  🔗 CC → Codex: Install the official plugin in Claude Code:");
    console.log("     claude /install-plugin codex@openai-codex\n");
  }
  if (ccToCodex === "mcp" || ccToCodex === "both") {
    console.log("  🔗 CC → Codex via RecallNest: ✅ Already configured above\n");
  }
  if (env.claude && env.codex) {
    console.log("  🔗 Codex → CC: Codex can call Claude Code directly:");
    console.log('     claude -p "your prompt"');
    console.log("     (no extra config needed)\n");
  }

  // 11. Done
  console.log(`  ✅ agent-nexus setup complete!

  Run: agent-nexus start
  `);
}
