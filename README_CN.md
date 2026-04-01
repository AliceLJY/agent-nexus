# agent-nexus

一键安装 [RecallNest](https://github.com/AliceLJY/recallnest) + [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge)，让你的 Claude Code / Codex / Gemini CLI 拥有共享记忆和 Telegram 远程控制。

## 你会得到什么

- **共享记忆** -- 所有 AI agent 共享同一个大脑（RecallNest）
- **Telegram 遥控** -- 手机上控制你的 agent
- **零配置** -- MCP 自动注入，无需手动编辑配置文件

## 前置条件

- [Bun](https://bun.sh) >= 1.3
- 至少安装一个：[Claude Code](https://claude.ai/code)、[Codex CLI](https://github.com/openai/codex)、[Gemini CLI](https://github.com/google-gemini/gemini-cli)
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

## 工作原理

```
agent-nexus init
  |
  v
检测 CC / Codex / Gemini
  |
  v
收集 Telegram token + Jina key
  |
  v
向各工具配置文件注入 RecallNest MCP
  (~/.claude.json, ~/.codex/config.toml, ~/.gemini/settings.json)
  |
  v
生成 bridge 配置
  |
  v
agent-nexus start --> RecallNest API (:4318) + Telegram bridge
```

## 配置

所有配置集中在 `~/.agent-nexus/config.json`：

```json
{
  "telegram": { "botToken": "...", "ownerId": 123456 },
  "memory": { "jinaApiKey": "...", "dbPath": "~/.recallnest/data/lancedb" },
  "agents": { "claude": true, "codex": true, "gemini": false }
}
```

## 相关项目

- [RecallNest](https://github.com/AliceLJY/recallnest) -- 跨 agent 共享记忆层
- [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) -- Telegram 远程控制 AI 编程 agent
- [Claude Code Studio](https://github.com/AliceLJY/claude-code-studio) -- Claude Code 多会话协作平台

## License

MIT
