<div align="center">

# agent-nexus

**One Command. All Your AI Agents United.**

*Shared memory + Telegram remote control for Claude Code, Codex, and Gemini CLI -- installed in 60 seconds.*

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)
[![npm version](https://img.shields.io/npm/v/@aliceljy/agent-nexus)](https://www.npmjs.com/package/@aliceljy/agent-nexus)

**English** | [简体中文](README_CN.md)

</div>

---

## The Problem

You have Claude Code, Codex, maybe Gemini CLI. They're powerful individually. But right now:

- **They don't share memory.** Tell Claude your coding style, Codex has no idea.
- **They can't be controlled remotely.** Step away from your desk? Your agents are unreachable.
- **Setting up shared infrastructure is painful.** Clone this, configure that, edit three different config files...

You *could* spend an afternoon installing [RecallNest](https://github.com/AliceLJY/recallnest) for shared memory, [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) for remote control, and manually wiring MCP configs for each tool.

Or:

```bash
npm i -g @aliceljy/agent-nexus && agent-nexus init
```

## What Happens When You Run `init`

```
$ agent-nexus init

  Detecting environment...
  ✅ Bun
  ✅ Claude Code
  ✅ Codex CLI
  ⬚ Gemini CLI (not installed, skipping)

  📝 Credentials

  Your Telegram User ID: 123456
  Jina API Key: jina_****
  HTTPS Proxy: (skipped)

  🤖 Bot Tokens (each backend needs its own @BotFather token)

  claude Bot Token: 111:AAA****
  codex Bot Token: 222:BBB****

  🔗 CC ↔ Codex Communication

  Choose [3]: 3  (Both)

  🔌 Configuring MCP...

  📋 Backed up ~/.claude.json
  ✅ Claude Code MCP configured
  ✅ Codex MCP configured
  ✅ Bridge config generated

  🔗 CC → Codex: Install the official plugin in Claude Code:
     claude /install-plugin codex@openai-codex

  🔗 CC → Codex via RecallNest: ✅ Already configured
  🔗 Codex → CC: claude -p "your prompt" (no extra config needed)

  ✅ agent-nexus setup complete!
  Run: agent-nexus start
```

**That's it.** Your Claude Code and Codex now share one brain. Your phone is now the remote.

## Before / After

| | Before agent-nexus | After agent-nexus |
|---|---|---|
| **Memory** | Each agent starts from zero every session | All agents share persistent memory via RecallNest |
| **Remote control** | Must be at your desk | Full control from Telegram on your phone |
| **Setup time** | 30+ min (clone, configure, debug MCP paths...) | 60 seconds |
| **Config files to edit** | 3-5 (per tool, per service) | 0 (auto-injected) |
| **Processes to manage** | Start each service manually | `agent-nexus start` / `stop` |

## Install

```bash
npm i -g @aliceljy/agent-nexus
```

> Requires [Bun](https://bun.sh) >= 1.3 and at least one of: Claude Code, Codex CLI, or Gemini CLI.

## Usage

```bash
agent-nexus init      # Interactive wizard -- detects tools, collects keys, writes all configs
agent-nexus start     # Start RecallNest + Telegram bridge in background
agent-nexus stop      # Stop all services
agent-nexus status    # Health check with memory stats
```

## How It Works

```
                    agent-nexus init
                         |
          +--------------+--------------+
          |              |              |
     ~/.claude.json  ~/.codex/     ~/.gemini/
     (MCP injected)  config.toml   settings.json
          |              |              |
          v              v              v
     Claude Code     Codex CLI    Gemini CLI
          |              |              |
          +------+-------+------+------+
                 |              |
            RecallNest    telegram-ai-bridge
            (memory)      (remote control)
                 |              |
            LanceDB         Telegram
          (your brain)    (your phone)
```

**agent-nexus doesn't replace anything.** It's the glue that makes your existing tools work as a team.

## Cross-Agent Communication

Beyond shared memory, your agents can call each other directly.

### Claude Code → Codex

During `agent-nexus init`, choose one or both:

| Method | How It Works | Best For |
|--------|-------------|----------|
| **Official Plugin** | `codex@openai-codex` plugin for Claude Code | Direct task delegation, rescue debugging |
| **Shared MCP** | Both agents read/write RecallNest | Context sharing, async handoffs |

**Official Plugin** -- Claude Code can spawn Codex as a subagent for parallel tasks, second opinions, or rescue debugging:
```
claude /install-plugin codex@openai-codex
```

**Shared MCP** -- RecallNest is auto-configured as an MCP server for both tools. Claude Code writes context, Codex reads it (and vice versa). No extra setup needed.

### Codex → Claude Code

Codex can call Claude Code directly via CLI -- no plugin or MCP required:

```bash
claude -p "analyze this function for security issues"
```

> If you hit TTY issues in non-interactive environments: `script -q /dev/null claude -p "prompt"`

### Group Chat (Multi-Bot in One Telegram Group)

Put your CC bot and Codex bot in the same Telegram group and they'll share context automatically. During `agent-nexus init`, if 2+ backends are enabled, you'll be asked:

```
👥 Group Chat

Put multiple bots in the same Telegram group? [y/N]: y

Shared context backend:
  1. SQLite (local, single machine)
  2. Redis (recommended for multi-bot groups)
  Choose [2]: 2

Redis URL [redis://localhost:6379]:
```

**Why Redis?** Each bot runs as a separate process. SQLite works for single-machine setups, but Redis gives you:
- Real-time cross-process context sharing (no file locks)
- TTL-based auto-cleanup (no stale messages piling up)
- Ready for multi-machine deployment if you scale later

> Telegram bots can't see each other's messages natively. The shared context layer works around this by syncing messages through the backend store.

### Why Not A2A?

The telegram-ai-bridge project includes an A2A bus for multi-bot auto-broadcast in Telegram group chats. agent-nexus intentionally skips A2A because:

- **MCP already covers it.** RecallNest gives all agents shared memory, and cross-agent communication goes through MCP/CLI directly.
- **A2A is group-chat-only.** Most users run 1:1 private chats with their bots. A2A adds complexity with no benefit for that use case.
- **DMs don't need a bridge.** Bots talk to each other directly via terminal-level MCP, no Telegram middleman.

## What Gets Installed

| Component | What It Does | Already Have It? |
|-----------|-------------|-----------------|
| [RecallNest](https://github.com/AliceLJY/recallnest) | Shared memory across all agents (MCP + HTTP API) | Keeps yours, adds if missing |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram remote control for AI agents | Keeps yours, adds if missing |
| MCP configs | RecallNest auto-registered in each tool | Non-destructive merge (backup first) |

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- At least one AI CLI tool:
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 
  - [Codex CLI](https://github.com/openai/codex) 
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- A Telegram bot token (free, from [@BotFather](https://t.me/BotFather))
- A Jina API key (free tier available at [jina.ai](https://jina.ai))

## Config

Configuration lives in `~/.agent-nexus/`:

**config.json** -- nexus-only settings:
```jsonc
{
  "jinaApiKey": "jina_...",
  "crossAgent": { "ccToCodex": "both" }
}
```

**bridge-config.json** -- auto-generated from [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge)'s config API, no manual sync needed:
```jsonc
{
  "shared": { "ownerTelegramId": "123456", "sharedContextBackend": "redis", ... },
  "backends": {
    "claude": { "enabled": true, "telegramBotToken": "111:AAA..." },
    "codex": { "enabled": true, "telegramBotToken": "222:BBB..." },
    "gemini": { "enabled": false }
  }
}
```

> Each backend needs its own bot token from [@BotFather](https://t.me/BotFather).

## Ecosystem

agent-nexus is the installer for a larger ecosystem of AI agent tools:

| Project | Role | Stars |
|---------|------|-------|
| [RecallNest](https://github.com/AliceLJY/recallnest) | Shared memory layer (LanceDB + hybrid retrieval) | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/recallnest) |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram remote control + multi-agent orchestration | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/telegram-ai-bridge) |
| [Claude Code Studio](https://github.com/AliceLJY/claude-code-studio) | Multi-session collaboration platform for Claude Code | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/claude-code-studio) |

## License

MIT
