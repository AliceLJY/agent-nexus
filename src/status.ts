import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { PIDS_DIR, LOGS_DIR } from "./paths.js";

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

async function fetchJson(url: string, timeoutMs = 3000): Promise<Record<string, any> | null> {
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

function checkBridgeLog(): { healthy: boolean; detail: string } {
  const logPath = join(LOGS_DIR, "bridge.log");
  if (!existsSync(logPath)) return { healthy: true, detail: "no log yet" };

  try {
    const stat = statSync(logPath);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageSec = Math.floor(ageMs / 1000);

    // Read last 2KB of log to check for errors
    const content = readFileSync(logPath, "utf-8");
    const tail = content.slice(-2048);
    const lines = tail.split("\n").filter(Boolean);
    const lastLine = lines[lines.length - 1] || "";

    const hasError = /\b(FATAL|ECONNREFUSED|ETELEGRAM|401 Unauthorized|invalid.*token)/i.test(tail.slice(-1024));
    if (hasError) {
      return { healthy: false, detail: lastLine.slice(0, 80) };
    }

    if (ageSec < 60) return { healthy: true, detail: "active" };
    const ageMin = Math.floor(ageSec / 60);
    return { healthy: true, detail: `last activity ${ageMin}m ago` };
  } catch {
    return { healthy: true, detail: "log unreadable" };
  }
}

export async function showStatus(): Promise<void> {
  console.log("\n📊 agent-nexus status\n");

  const rn = isRunning("recallnest");
  if (rn.running) {
    const stats = await fetchJson("http://localhost:4318/v1/stats");
    const memCount = stats?.totalMemories ?? "?";
    console.log(`  RecallNest: ✅ running (PID ${rn.pid}, ${memCount} memories)`);
  } else {
    console.log("  RecallNest: ⬚ stopped");
  }

  const br = isRunning("bridge");
  if (br.running) {
    const log = checkBridgeLog();
    if (log.healthy) {
      console.log(`  TG Bridge:  ✅ running (PID ${br.pid}, ${log.detail})`);
    } else {
      console.log(`  TG Bridge:  ⚠️  running but unhealthy (PID ${br.pid})`);
      console.log(`              └─ ${log.detail}`);
    }
  } else {
    console.log("  TG Bridge:  ⬚ stopped");
  }

  console.log("");
}
