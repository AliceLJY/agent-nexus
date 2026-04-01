# agent-nexus Design Spec

> One-click installer that bundles RecallNest + telegram-ai-bridge for CC/Codex/Gemini users.

## Problem

Users who want the full "remote AI agent with shared memory" experience currently need to:
1. Clone and configure telegram-ai-bridge
2. Clone and configure RecallNest
3. Manually write MCP config for each tool (CC, Codex, Gemini)
4. Manage multiple processes

agent-nexus reduces this to `bun add -g agent-nexus && agent-nexus init`.

## Architecture

```
agent-nexus (thin CLI wrapper, ~500 LOC)
  ├── depends on: recallnest (GitHub dependency)
  ├── depends on: telegram-ai-bridge (GitHub dependency)
  └── provides: init wizard + process manager + health check

User's machine:
  ~/.agent-nexus/
    ├── config.json          ← unified config (tokens, keys, agent toggles)
    ├── pids/                ← PID files for running services
    │   ├── recallnest.pid
    │   └── bridge.pid
    └── logs/                ← service logs
        ├── recallnest.log
        └── bridge.log

MCP injection targets:
  ~/.claude.json             ← CC MCP config
  ~/.codex/config.toml       ← Codex MCP config
  ~/.gemini/settings.json    ← Gemini MCP config
```

## Unified Config

```jsonc
// ~/.agent-nexus/config.json
{
  "telegram": {
    "botToken": "xxx",
    "ownerId": 123456
  },
  "memory": {
    "jinaApiKey": "jina_xxx",
    "dbPath": "~/.recallnest/data/lancedb"
  },
  "agents": {
    "claude": true,
    "codex": true,
    "gemini": false
  }
}
```

## CLI Commands

### v0.1 Scope

| Command | Description |
|---------|-------------|
| `agent-nexus init` | Interactive wizard: detect tools, collect tokens/keys, write all configs |
| `agent-nexus start` | Start RecallNest + bridge as background processes, write PIDs |
| `agent-nexus stop` | Kill processes by PID |
| `agent-nexus status` | Health check: service status, memory count, session count |

### Future (post-v0.1)

| Command | Description |
|---------|-------------|
| `agent-nexus doctor` | Diagnose issues (MCP config validation, port conflicts, key expiry) |
| `agent-nexus update` | Update RecallNest + bridge to latest (`bun update`) |
| `agent-nexus launchd` | Generate macOS LaunchAgent plist for auto-start on boot |
| `agent-nexus systemd` | Generate Linux systemd unit for auto-start on boot |

## `init` Wizard Flow

```
1. Detect environment
   - Check: bun installed?
   - Check: claude (CC CLI) in PATH?
   - Check: codex in PATH?
   - Check: gemini in PATH?
   - Report findings, abort if bun missing

2. Collect credentials
   - Telegram bot token (required)
   - Telegram owner ID (required)
   - Jina API key (required, for RecallNest embeddings)

3. Choose agents
   - Auto-enable detected tools
   - Confirm with user

4. Write unified config
   - ~/.agent-nexus/config.json

5. Inject MCP configs
   - For each enabled agent, read existing config → merge RecallNest MCP entry → write back
   - Preserve existing MCP servers (don't overwrite)
   - Backup original config before modifying

6. Generate bridge config
   - Write ~/.agent-nexus/bridge-config.json from template
   - Map token/key from unified config

7. Done
   - Print summary
   - Suggest: agent-nexus start
```

## `start` / `stop` Flow

```
start:
  1. Read ~/.agent-nexus/config.json
  2. Spawn: bun run <recallnest>/src/mcp-server.ts (with env vars from config)
     - Also start HTTP API server on :4318
  3. Spawn: bun run <bridge>/start.js start (with bridge-config.json)
  4. Write PIDs to ~/.agent-nexus/pids/
  5. Wait 2s, health check both
  6. Print status

stop:
  1. Read PIDs from ~/.agent-nexus/pids/
  2. Kill processes
  3. Clean PID files
```

## Package Structure

```
agent-nexus/
  ├── package.json
  │     name: "agent-nexus"
  │     bin: { "agent-nexus": "bin/agent-nexus.ts" }
  │     dependencies:
  │       "recallnest": "github:AliceLJY/recallnest"
  │       "telegram-ai-bridge": "github:AliceLJY/telegram-ai-bridge"
  ├── bin/
  │   └── agent-nexus.ts        ← CLI entry (commander.js or simple arg parsing)
  ├── src/
  │   ├── detect.ts             ← detect CC/Codex/Gemini installation
  │   ├── wizard.ts             ← interactive prompts (use @inquirer/prompts or built-in)
  │   ├── configure.ts          ← read/write MCP configs for each tool
  │   ├── launcher.ts           ← spawn/kill background processes
  │   └── status.ts             ← health check via HTTP calls
  ├── templates/
  │   ├── claude-mcp.json       ← MCP entry template for CC
  │   ├── codex-mcp.toml        ← MCP entry template for Codex
  │   └── bridge-config.json    ← bridge config template
  ├── README.md
  └── README_CN.md
```

## Key Design Decisions

1. **GitHub deps, not npm (for now)** — RecallNest and bridge aren't published to npm yet. Use `github:AliceLJY/repo` in package.json. Publish to npm later when stable.

2. **Config backup before injection** — `init` backs up existing ~/.claude.json etc. before modifying. User can always revert.

3. **No daemon, just processes** — `start` spawns child processes and writes PIDs. No fancy daemon framework. Keep it simple.

4. **RecallNest HTTP API for status** — `status` command calls RecallNest's `GET /v1/health` and `GET /v1/stats` to report memory count. No direct LanceDB access.

5. **Bridge stays independent** — bridge runs its own process with its own config. agent-nexus just generates the config and manages the lifecycle. No code changes to bridge needed.

6. **No A2A in v0.1** — A2A Gateway is a separate concern for cross-machine scenarios. Add in a future version if needed.

## Out of Scope (v0.1)

- Docker anything
- Web dashboard
- A2A Gateway integration
- npm publish
- Auto-update mechanism
- claude-code-studio integration (different product)
- Modifying RecallNest or bridge source code

## Success Criteria

- [ ] New user with CC + Codex installed can go from zero to working TG remote control + shared memory in under 5 minutes
- [ ] `agent-nexus init` is fully non-destructive (backups, merge-not-overwrite)
- [ ] `agent-nexus start/stop` reliably manages both services
- [ ] `agent-nexus status` gives clear picture of what's running
- [ ] Zero changes required to RecallNest or bridge codebases
