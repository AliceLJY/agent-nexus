#!/usr/bin/env bun

import { readFileSync } from "fs";
import { join } from "path";

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf-8"));
const command = process.argv[2];
const arg = process.argv[3];

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
  case "logs":
    await (await import("../src/logs.js")).showLogs(arg);
    break;
  default:
    console.log(`agent-nexus v${pkg.version}

Usage:
  agent-nexus init      Setup wizard (detect tools, collect keys, write configs)
  agent-nexus start     Start RecallNest + Telegram bridge
  agent-nexus stop      Stop all services
  agent-nexus status    Health check
  agent-nexus logs [backend]  Show logs (recallnest|claude|codex|gemini)`);
}
