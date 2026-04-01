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
    console.log(`  TG Bridge:  ✅ running (PID ${br.pid})`);
  } else {
    console.log("  TG Bridge:  ⬚ stopped");
  }

  console.log("");
}
