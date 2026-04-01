import { createInterface } from "readline/promises";
import { mkdirSync, writeFileSync } from "fs";
import { detectEnvironment, printDetectResult } from "./detect.js";
import { NEXUS_DIR, CONFIG_PATH, PIDS_DIR, LOGS_DIR } from "./paths.js";
import { injectAllMcpConfigs } from "./configure.js";

interface NexusConfig {
  telegram: { botToken: string; ownerId: number };
  memory: { jinaApiKey: string; dbPath: string };
  agents: { claude: boolean; codex: boolean; gemini: boolean };
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

  // 2. Collect credentials
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n  📝 Credentials\n");
  const botToken = await ask(rl, "Telegram Bot Token");
  if (!botToken) { console.log("  ❌ Bot token is required."); process.exit(1); }

  const ownerIdStr = await ask(rl, "Your Telegram User ID");
  const ownerId = parseInt(ownerIdStr, 10);
  if (isNaN(ownerId)) { console.log("  ❌ Invalid Telegram ID."); process.exit(1); }

  const jinaApiKey = await ask(rl, "Jina API Key (for RecallNest embeddings)");
  if (!jinaApiKey) { console.log("  ❌ Jina API key is required."); process.exit(1); }

  rl.close();

  // 3. Build config
  const config: NexusConfig = {
    telegram: { botToken, ownerId },
    memory: { jinaApiKey, dbPath: "~/.recallnest/data/lancedb" },
    agents: {
      claude: env.claude,
      codex: env.codex,
      gemini: env.gemini,
    },
  };

  // 4. Write dirs + config
  mkdirSync(NEXUS_DIR, { recursive: true });
  mkdirSync(PIDS_DIR, { recursive: true });
  mkdirSync(LOGS_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
  console.log(`\n  ✅ Config written to ${CONFIG_PATH}`);

  // 5. Inject MCP configs
  injectAllMcpConfigs(config);

  // 6. Done
  console.log(`
  ✅ agent-nexus setup complete!

  Run: agent-nexus start
  `);
}
