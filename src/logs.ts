import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { LOGS_DIR } from "./paths.js";

const VALID_TARGETS = ["recallnest", "claude", "codex", "gemini"];

function logPath(target: string): string {
  return target === "recallnest"
    ? join(LOGS_DIR, "recallnest.log")
    : join(LOGS_DIR, `bridge-${target}.log`);
}

export function showLogs(target?: string): void {
  if (!target) {
    // Show last 10 lines of each existing log
    console.log("\n📋 Recent logs\n");
    let any = false;
    for (const t of VALID_TARGETS) {
      const p = logPath(t);
      if (!existsSync(p)) continue;
      any = true;
      const lines = readFileSync(p, "utf-8").trim().split("\n");
      const tail = lines.slice(-5);
      console.log(`  ── ${t} (${lines.length} lines) ──`);
      for (const line of tail) console.log(`  ${line}`);
      console.log("");
    }
    if (!any) console.log("  No log files found. Run: agent-nexus start\n");
    return;
  }

  if (!VALID_TARGETS.includes(target)) {
    console.log(`  ❌ Unknown target: ${target}`);
    console.log(`     Valid: ${VALID_TARGETS.join(", ")}`);
    return;
  }

  const p = logPath(target);
  if (!existsSync(p)) {
    console.log(`  ⬚ No log for ${target}. Not started yet?`);
    return;
  }

  const lines = readFileSync(p, "utf-8").trim().split("\n");
  const tail = lines.slice(-30);
  console.log(`\n📋 ${target} (last ${tail.length} of ${lines.length} lines)\n`);
  for (const line of tail) console.log(line);
  console.log("");
}
