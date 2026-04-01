import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { CONFIG_PATH, PIDS_DIR, LOGS_DIR, NEXUS_DIR } from "./paths.js";

function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.log("  ❌ No config found. Run: agent-nexus init");
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch (e) {
    console.log(`  ❌ Config file is malformed: ${CONFIG_PATH}`);
    console.log(`     ${(e as Error).message}`);
    process.exit(1);
  }
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
    process.kill(pid, 0);
    return pid;
  } catch {
    unlinkSync(pidFile);
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
      env: { ...process.env, BRIDGE_CONFIG_PATH: bridgeConfig },
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
