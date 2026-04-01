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
