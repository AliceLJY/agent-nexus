# agent-nexus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-click installer that bundles RecallNest + telegram-ai-bridge, auto-configures MCP for CC/Codex/Gemini, and manages both services.

**Architecture:** Thin CLI wrapper (~500 LOC) that depends on RecallNest and telegram-ai-bridge via GitHub deps. Provides interactive setup wizard, process manager, and health checks. All config centralized at `~/.agent-nexus/`.

**Tech Stack:** Bun, TypeScript, no frameworks (built-in `readline` for prompts, `Bun.spawn` for process management)

---

## File Map

```
agent-nexus/
  ├── package.json                 ← package metadata + GitHub deps
  ├── tsconfig.json                ← TypeScript config
  ├── bin/
  │   └── agent-nexus.ts           ← CLI entry, arg dispatch (~40 LOC)
  ├── src/
  │   ├── detect.ts                ← detect bun/CC/Codex/Gemini in PATH (~50 LOC)
  │   ├── wizard.ts                ← interactive init prompts (~80 LOC)
  │   ├── configure.ts             ← read/merge/write MCP configs for 3 tools (~120 LOC)
  │   ├── launcher.ts              ← spawn/stop background processes, PID mgmt (~80 LOC)
  │   ├── status.ts                ← health check via HTTP + PID check (~50 LOC)
  │   └── paths.ts                 ← shared path constants (~20 LOC)
  ├── templates/
  │   └── bridge-config.json       ← bridge config template
  ├── README.md
  └── README_CN.md
```

---

### Task 1: Project Scaffold + package.json

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bin/agent-nexus.ts`
- Create: `src/paths.ts`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/anxianjingya/Projects/agent-nexus
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "agent-nexus",
  "version": "0.1.0",
  "description": "One-click installer for RecallNest + telegram-ai-bridge. Shared memory + TG remote for CC/Codex/Gemini.",
  "license": "MIT",
  "type": "module",
  "bin": {
    "agent-nexus": "bin/agent-nexus.ts"
  },
  "dependencies": {
    "recallnest": "github:AliceLJY/recallnest",
    "telegram-ai-bridge": "github:AliceLJY/telegram-ai-bridge"
  },
  "engines": {
    "bun": ">=1.3.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/AliceLJY/agent-nexus.git"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["bun-types"]
  },
  "include": ["bin", "src"]
}
```

- [ ] **Step 4: Create src/paths.ts**

```typescript
import { homedir } from "os";
import { join } from "path";

export const NEXUS_DIR = join(homedir(), ".agent-nexus");
export const CONFIG_PATH = join(NEXUS_DIR, "config.json");
export const PIDS_DIR = join(NEXUS_DIR, "pids");
export const LOGS_DIR = join(NEXUS_DIR, "logs");

export const CLAUDE_JSON = join(homedir(), ".claude.json");
export const CODEX_TOML = join(homedir(), ".codex", "config.toml");
export const GEMINI_JSON = join(homedir(), ".gemini", "settings.json");
```

- [ ] **Step 5: Create bin/agent-nexus.ts (CLI entry)**

```typescript
#!/usr/bin/env bun

const command = process.argv[2];

switch (command) {
  case "init":
    await (await import("../src/wizard.js")).runWizard();
    break;
  case "start":
    await (await import("../src/launcher.js")).start();
    break;
  case "stop":
    await (await import("../src/launcher.js")).stop();
    break;
  case "status":
    await (await import("../src/status.js")).showStatus();
    break;
  default:
    console.log(`agent-nexus v0.1.0

Usage:
  agent-nexus init      Setup wizard (detect tools, collect keys, write configs)
  agent-nexus start     Start RecallNest + Telegram bridge
  agent-nexus stop      Stop all services
  agent-nexus status    Health check`);
}
```

- [ ] **Step 6: Install dependencies**

```bash
bun install
```

- [ ] **Step 7: Verify CLI entry works**

```bash
bun bin/agent-nexus.ts
```
Expected: prints usage help text.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json bin/agent-nexus.ts src/paths.ts bun.lock
git commit -m "feat: project scaffold with CLI entry and path constants"
```

---

### Task 2: Environment Detection (`detect.ts`)

**Files:**
- Create: `src/detect.ts`

- [ ] **Step 1: Create src/detect.ts**

```typescript
import { $ } from "bun";

export interface DetectResult {
  bun: boolean;
  claude: boolean;
  codex: boolean;
  gemini: boolean;
}

async function inPath(cmd: string): Promise<boolean> {
  try {
    await $`which ${cmd}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function detectEnvironment(): Promise<DetectResult> {
  const [bun, claude, codex, gemini] = await Promise.all([
    inPath("bun"),
    inPath("claude"),
    inPath("codex"),
    inPath("gemini"),
  ]);
  return { bun, claude, codex, gemini };
}

export function printDetectResult(r: DetectResult): void {
  console.log("\n  Detecting environment...");
  console.log(`  ${r.bun ? "✅" : "❌"} Bun`);
  console.log(`  ${r.claude ? "✅" : "⬚"} Claude Code`);
  console.log(`  ${r.codex ? "✅" : "⬚"} Codex CLI`);
  console.log(`  ${r.gemini ? "✅" : "⬚"} Gemini CLI`);

  if (!r.bun) {
    console.log("\n  ❌ Bun is required. Install: https://bun.sh");
    process.exit(1);
  }
  if (!r.claude && !r.codex && !r.gemini) {
    console.log("\n  ❌ No AI CLI tool detected. Install at least one of: claude, codex, gemini");
    process.exit(1);
  }
}
```

- [ ] **Step 2: Quick smoke test**

```bash
bun -e "import { detectEnvironment, printDetectResult } from './src/detect.ts'; printDetectResult(await detectEnvironment())"
```
Expected: shows checkmarks for bun, claude, codex (whatever's installed).

- [ ] **Step 3: Commit**

```bash
git add src/detect.ts
git commit -m "feat: environment detection for bun/CC/Codex/Gemini"
```

---

### Task 3: Interactive Wizard (`wizard.ts`)

**Files:**
- Create: `src/wizard.ts`

- [ ] **Step 1: Create src/wizard.ts**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

```bash
bun build --no-bundle src/wizard.ts --outdir /dev/null 2>&1 || echo "Expected: needs configure.ts"
```
Expected: fails because configure.ts doesn't exist yet. That's fine — we build it next.

- [ ] **Step 3: Commit**

```bash
git add src/wizard.ts
git commit -m "feat: interactive init wizard with credential collection"
```

---

### Task 4: MCP Config Injection (`configure.ts`)

**Files:**
- Create: `src/configure.ts`
- Create: `templates/bridge-config.json`

This is the most critical file — it writes MCP entries into CC/Codex/Gemini configs without destroying existing entries.

- [ ] **Step 1: Create src/configure.ts**

```typescript
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { CLAUDE_JSON, CODEX_TOML, GEMINI_JSON, NEXUS_DIR } from "./paths.js";

interface NexusConfig {
  telegram: { botToken: string; ownerId: number };
  memory: { jinaApiKey: string; dbPath: string };
  agents: { claude: boolean; codex: boolean; gemini: boolean };
}

function resolveRecallnestMcp(): string {
  // Find recallnest's mcp-server.ts relative to this package
  const candidates = [
    join(NEXUS_DIR, "node_modules", "recallnest", "src", "mcp-server.ts"),
    join(dirname(dirname(import.meta.dir)), "node_modules", "recallnest", "src", "mcp-server.ts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // Global install fallback
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

  // Check if recallnest already configured
  if (content.includes("[mcp_servers.recallnest]")) {
    console.log("  ⏭️  Codex MCP already configured — skipping");
    return;
  }

  const bunPath = process.execPath; // path to bun binary
  const tomlBlock = `
[mcp_servers.recallnest]
type = "stdio"
command = "${bunPath}"
args = ["run", "${mcpEntry}"]

[mcp_servers.recallnest.env]
JINA_API_KEY = "${jinaApiKey}"
`;
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
```

- [ ] **Step 2: Create templates/bridge-config.json (reference only)**

```json
{
  "_comment": "Template reference. Actual config is generated by agent-nexus init.",
  "shared": {
    "ownerTelegramId": "",
    "cwd": "",
    "defaultVerboseLevel": 1,
    "executor": "direct",
    "enableGroupSharedContext": true,
    "sharedContextBackend": "sqlite"
  },
  "backends": {
    "claude": { "enabled": false, "telegramBotToken": "", "sessionsDb": "sessions.db", "model": "claude-sonnet-4-6" },
    "codex": { "enabled": false, "telegramBotToken": "", "sessionsDb": "sessions-codex.db", "model": "" },
    "gemini": { "enabled": false, "telegramBotToken": "", "sessionsDb": "sessions-gemini.db", "model": "gemini-2.5-pro" }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/configure.ts templates/bridge-config.json
git commit -m "feat: MCP config injection for CC/Codex/Gemini + bridge config generation"
```

---

### Task 5: Process Launcher (`launcher.ts`)

**Files:**
- Create: `src/launcher.ts`

- [ ] **Step 1: Create src/launcher.ts**

```typescript
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { CONFIG_PATH, PIDS_DIR, LOGS_DIR, NEXUS_DIR } from "./paths.js";

function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.log("  ❌ No config found. Run: agent-nexus init");
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
}

function writePid(name: string, pid: number): void {
  mkdirSync(PIDS_DIR, { recursive: true });
  writeFileSync(join(PIDS_DIR, `${name}.pid`), String(pid));
}

function readPid(name: string): number | null {
  const pidFile = join(PIDS_DIR, `${name}.pid`);
  if (!existsSync(pidFile)) return null;
  const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
  try {
    process.kill(pid, 0); // check if alive
    return pid;
  } catch {
    unlinkSync(pidFile); // stale PID
    return null;
  }
}

function findModule(name: string): string {
  const candidates = [
    join(NEXUS_DIR, "node_modules", name),
    join(import.meta.dir, "..", "node_modules", name),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(`Cannot find ${name}. Run: bun install`);
}

export async function start(): Promise<void> {
  const config = readConfig();
  mkdirSync(LOGS_DIR, { recursive: true });

  console.log("\n🚀 Starting agent-nexus services...\n");

  // 1. Start RecallNest API server
  if (readPid("recallnest")) {
    console.log("  ⏭️  RecallNest already running");
  } else {
    const recallnestDir = findModule("recallnest");
    const apiEntry = join(recallnestDir, "src", "api-server.ts");
    const logFile = Bun.file(join(LOGS_DIR, "recallnest.log"));
    const writer = logFile.writer();

    const proc = Bun.spawn(["bun", "run", apiEntry], {
      env: { ...process.env, JINA_API_KEY: config.memory.jinaApiKey },
      stdout: writer,
      stderr: writer,
    });
    writePid("recallnest", proc.pid);
    console.log(`  ✅ RecallNest started (PID ${proc.pid}, port 4318)`);
  }

  // 2. Start telegram-ai-bridge
  if (readPid("bridge")) {
    console.log("  ⏭️  Telegram bridge already running");
  } else {
    const bridgeDir = findModule("telegram-ai-bridge");
    const bridgeEntry = join(bridgeDir, "start.js");
    const bridgeConfig = join(NEXUS_DIR, "bridge-config.json");
    const logFile = Bun.file(join(LOGS_DIR, "bridge.log"));
    const writer = logFile.writer();

    const proc = Bun.spawn(["bun", bridgeEntry, "start"], {
      env: { ...process.env, BRIDGE_CONFIG: bridgeConfig },
      cwd: bridgeDir,
      stdout: writer,
      stderr: writer,
    });
    writePid("bridge", proc.pid);
    console.log(`  ✅ Telegram bridge started (PID ${proc.pid})`);
  }

  // 3. Health check after 2s
  await Bun.sleep(2000);
  const { showStatus } = await import("./status.js");
  await showStatus();
}

export async function stop(): Promise<void> {
  console.log("\n🛑 Stopping agent-nexus services...\n");

  for (const name of ["recallnest", "bridge"]) {
    const pid = readPid(name);
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
        unlinkSync(join(PIDS_DIR, `${name}.pid`));
        console.log(`  ✅ ${name} stopped (PID ${pid})`);
      } catch {
        console.log(`  ⚠️  ${name} (PID ${pid}) already dead`);
      }
    } else {
      console.log(`  ⬚ ${name} not running`);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/launcher.ts
git commit -m "feat: process launcher with PID management (start/stop)"
```

---

### Task 6: Status Check (`status.ts`)

**Files:**
- Create: `src/status.ts`

- [ ] **Step 1: Create src/status.ts**

```typescript
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PIDS_DIR } from "./paths.js";

function isRunning(name: string): { running: boolean; pid: number | null } {
  const pidFile = join(PIDS_DIR, `${name}.pid`);
  if (!existsSync(pidFile)) return { running: false, pid: null };
  const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
  try {
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    return { running: false, pid };
  }
}

async function fetchJson(url: string, timeoutMs = 3000): Promise<any> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return await res.json();
  } catch {
    return null;
  }
}

export async function showStatus(): Promise<void> {
  console.log("\n📊 agent-nexus status\n");

  // RecallNest
  const rn = isRunning("recallnest");
  if (rn.running) {
    const stats = await fetchJson("http://localhost:4318/v1/stats");
    const memCount = stats?.totalMemories ?? "?";
    console.log(`  RecallNest: ✅ running (PID ${rn.pid}, ${memCount} memories)`);
  } else {
    console.log("  RecallNest: ⬚ stopped");
  }

  // Bridge
  const br = isRunning("bridge");
  if (br.running) {
    console.log(`  TG Bridge:  ✅ running (PID ${br.pid})`);
  } else {
    console.log("  TG Bridge:  ⬚ stopped");
  }

  console.log("");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/status.ts
git commit -m "feat: status command with RecallNest health check"
```

---

### Task 7: End-to-End Test + README

**Files:**
- Create: `README.md`
- Create: `README_CN.md`
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
*.log
```

- [ ] **Step 2: Verify full init flow works**

```bash
bun bin/agent-nexus.ts init
```
Expected: prompts for token/key, writes config, injects MCP entries.

- [ ] **Step 3: Verify start/stop works**

```bash
bun bin/agent-nexus.ts start
bun bin/agent-nexus.ts status
bun bin/agent-nexus.ts stop
```

- [ ] **Step 4: Create README.md**

```markdown
# agent-nexus

One-click installer for [RecallNest](https://github.com/AliceLJY/recallnest) + [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge). Gives your Claude Code / Codex / Gemini CLI shared memory and Telegram remote control.

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- At least one of: Claude Code, Codex CLI, Gemini CLI
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A Jina API key (from [jina.ai](https://jina.ai))

## Install

```bash
bun add -g agent-nexus
```

## Setup

```bash
agent-nexus init
```

The wizard will:
1. Detect which AI CLI tools you have installed
2. Ask for your Telegram bot token and Jina API key
3. Auto-configure MCP for all detected tools
4. Generate bridge config

## Usage

```bash
agent-nexus start    # Start RecallNest + Telegram bridge
agent-nexus status   # Check service health
agent-nexus stop     # Stop all services
```

## What You Get

- **Shared Memory** — All your AI agents share one brain via RecallNest
- **Telegram Remote** — Control your agents from your phone
- **Zero Config** — MCP entries auto-injected, no manual editing

## License

MIT
```

- [ ] **Step 5: Create README_CN.md**

```markdown
# agent-nexus

一键安装 [RecallNest](https://github.com/AliceLJY/recallnest) + [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge)。让你的 Claude Code / Codex / Gemini CLI 拥有共享记忆和 Telegram 远程控制。

## 前置条件

- [Bun](https://bun.sh) >= 1.3
- 至少安装一个：Claude Code、Codex CLI、Gemini CLI
- Telegram Bot Token（从 [@BotFather](https://t.me/BotFather) 获取）
- Jina API Key（从 [jina.ai](https://jina.ai) 获取）

## 安装

```bash
bun add -g agent-nexus
```

## 初始化

```bash
agent-nexus init
```

向导会自动：
1. 检测你安装了哪些 AI CLI 工具
2. 收集 Telegram bot token 和 Jina API key
3. 为所有检测到的工具自动配置 MCP
4. 生成 bridge 配置文件

## 使用

```bash
agent-nexus start    # 启动 RecallNest + Telegram bridge
agent-nexus status   # 查看服务状态
agent-nexus stop     # 停止所有服务
```

## 你会得到

- **共享记忆** — 所有 AI agent 共享同一个大脑（RecallNest）
- **Telegram 遥控** — 手机上控制你的 agent
- **零配置** — MCP 自动注入，无需手动编辑配置文件

## License

MIT
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore README.md README_CN.md
git commit -m "feat: README (EN + CN) and gitignore"
```

- [ ] **Step 7: Create GitHub repo and push**

```bash
cd /Users/anxianjingya/Projects/agent-nexus
gh repo create AliceLJY/agent-nexus --public --source=. --push
```

---

## Self-Review

- **Spec coverage:** All v0.1 commands (init/start/stop/status) have tasks. Config backup ✅. Non-destructive merge ✅. Bridge config generation ✅.
- **Placeholder scan:** All code blocks complete, no TBD/TODO.
- **Type consistency:** `NexusConfig` interface used consistently in wizard.ts and configure.ts. Same fields in both.
- **Missing from spec:** `.gitignore` was not in spec — added in Task 7. No other gaps found.
