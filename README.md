# agent-nexus

One-click installer for [RecallNest](https://github.com/AliceLJY/recallnest) + [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge). Gives your Claude Code / Codex / Gemini CLI shared memory and Telegram remote control.

## What You Get

- **Shared Memory** -- All your AI agents share one brain via RecallNest
- **Telegram Remote** -- Control your agents from your phone
- **Zero Config** -- MCP entries auto-injected, no manual editing

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- At least one of: [Claude Code](https://claude.ai/code), [Codex CLI](https://github.com/openai/codex), [Gemini CLI](https://github.com/google-gemini/gemini-cli)
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

## How It Works

```
agent-nexus init
  |
  v
Detects CC / Codex / Gemini
  |
  v
Collects Telegram token + Jina key
  |
  v
Injects RecallNest MCP into each tool's config
  (~/.claude.json, ~/.codex/config.toml, ~/.gemini/settings.json)
  |
  v
Generates bridge config
  |
  v
agent-nexus start --> RecallNest API (:4318) + Telegram bridge
```

## Config

All configuration is stored in `~/.agent-nexus/config.json`:

```json
{
  "telegram": { "botToken": "...", "ownerId": 123456 },
  "memory": { "jinaApiKey": "...", "dbPath": "~/.recallnest/data/lancedb" },
  "agents": { "claude": true, "codex": true, "gemini": false }
}
```

## Related Projects

- [RecallNest](https://github.com/AliceLJY/recallnest) -- MCP-native shared memory for AI agents
- [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) -- Telegram remote control for AI coding agents
- [Claude Code Studio](https://github.com/AliceLJY/claude-code-studio) -- Multi-session collaboration for Claude Code

## License

MIT
