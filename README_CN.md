<div align="center">

# agent-nexus

**一条命令，所有 AI Agent 融为一体**

*共享记忆 + Telegram 远程遥控，Claude Code / Codex / Gemini CLI 一键搞定，60 秒完事。*

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)
[![npm version](https://img.shields.io/npm/v/@aliceljy/agent-nexus)](https://www.npmjs.com/package/@aliceljy/agent-nexus)

[English](README.md) | **简体中文**

</div>

---

## 痛点

你有 Claude Code、Codex，可能还有 Gemini CLI。它们单打独斗都很强，但是：

- **记忆不互通。** 跟 Claude 说了你的代码风格，Codex 一无所知。
- **离开电脑就断了。** 出门在外？你的 agent 无法触达。
- **配置太折腾。** 要 clone 这个、装那个、手动编辑三个不同的配置文件...

你可以花一下午分别装 [RecallNest](https://github.com/AliceLJY/recallnest)（共享记忆）和 [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge)（远程控制），然后手动给每个工具配 MCP。

或者：

```bash
npm i -g @aliceljy/agent-nexus && agent-nexus init
```

## 运行 `init` 会发生什么

```
$ agent-nexus init

  检测环境...
  ✅ Bun
  ✅ Claude Code
  ✅ Codex CLI
  ⬚ Gemini CLI（未安装，跳过）

  📝 填写凭证

  你的 Telegram ID: 123456
  Jina API Key: jina_****
  HTTPS Proxy:（跳过）

  🤖 Bot Tokens（每个 backend 需要独立的 @BotFather token）

  claude Bot Token: 111:AAA****
  codex Bot Token: 222:BBB****

  🔗 CC ↔ Codex 通信方式

  选择 [3]: 3（都要）

  🔌 配置 MCP...

  📋 已备份 ~/.claude.json
  ✅ Claude Code MCP 已配置
  ✅ Codex MCP 已配置
  ✅ Bridge 配置已生成

  🔗 CC → Codex: 在 Claude Code 中安装官方插件：
     claude /install-plugin codex@openai-codex

  🔗 CC → Codex via RecallNest: ✅ 已配置
  🔗 Codex → CC: claude -p "你的指令"（无需额外配置）

  ✅ 搞定！运行 agent-nexus start 启动服务
```

**就这样。** 你的 Claude Code 和 Codex 现在共享一个大脑，你的手机就是遥控器。

## 安装前 vs 安装后

| | 安装前 | 安装后 |
|---|---|---|
| **记忆** | 每个 agent 每次从零开始 | 所有 agent 共享持久记忆 |
| **远程控制** | 必须在电脑前 | 手机上用 Telegram 全权掌控 |
| **配置时间** | 30+ 分钟 | 60 秒 |
| **要编辑的配置文件** | 3-5 个 | 0 个（全自动注入） |
| **进程管理** | 各服务手动启动 | `agent-nexus start` / `stop` |

## 安装

```bash
npm i -g @aliceljy/agent-nexus
```

> 需要 [Bun](https://bun.sh) >= 1.3，以及至少一个：Claude Code、Codex CLI 或 Gemini CLI。

## 使用

```bash
agent-nexus init      # 交互式向导 -- 检测工具、收集密钥、写入所有配置
agent-nexus start     # 后台启动 RecallNest + Telegram bridge
agent-nexus stop      # 停止所有服务
agent-nexus status    # 健康检查 + 记忆统计
```

## 工作原理

```
                    agent-nexus init
                         |
          +--------------+--------------+
          |              |              |
     ~/.claude.json  ~/.codex/     ~/.gemini/
     (自动注入 MCP)  config.toml   settings.json
          |              |              |
          v              v              v
     Claude Code     Codex CLI    Gemini CLI
          |              |              |
          +------+-------+------+------+
                 |              |
            RecallNest    telegram-ai-bridge
            （记忆层）     （远程控制）
                 |              |
            LanceDB         Telegram
          （你的大脑）     （你的手机）
```

**agent-nexus 不替代任何东西。** 它是让你现有工具协同作战的粘合剂。

## 跨 Agent 通信

除了共享记忆，你的 agent 还能直接互相调用。

### Claude Code → Codex

`agent-nexus init` 时可选其一或两个都要：

| 方式 | 原理 | 适用场景 |
|------|------|---------|
| **官方插件** | 在 Claude Code 中安装 `codex@openai-codex` 插件 | 直接派活、救火式调试 |
| **共享 MCP** | 两个 agent 共读共写 RecallNest 记忆 | 上下文共享、异步交接 |

**官方插件** -- Claude Code 可以把 Codex 当子 agent 使唤，并行干活、二次验证、救场：
```
claude /install-plugin codex@openai-codex
```

**共享 MCP** -- RecallNest 自动注入两个工具的 MCP 配置。Claude Code 写上下文，Codex 读；反过来也行。开箱即用。

### Codex → Claude Code

Codex 可以直接通过 CLI 调用 Claude Code，不需要额外配置：

```bash
claude -p "帮我分析这个函数的安全问题"
```

> TTY 环境报错时：`script -q /dev/null claude -p "prompt"`

### 群聊模式（多 Bot 同群）

把 CC bot 和 Codex bot 拉进同一个 Telegram 群，它们会自动共享上下文。`agent-nexus init` 时如果启用了 2 个以上 backend，会问你：

```
👥 Group Chat

把多个 bot 放进同一个 Telegram 群？ [y/N]: y

共享上下文后端：
  1. SQLite（本地，单机）
  2. Redis（推荐，多 bot 群聊）
  选择 [2]: 2

Redis URL [redis://localhost:6379]:
```

**为什么推荐 Redis？** 每个 bot 跑在独立进程里。SQLite 单机能用，但 Redis 优势在于：
- 跨进程实时共享上下文（无文件锁竞争）
- TTL 自动清理过期消息（不堆垃圾）
- 以后要多机部署也直接能用

> Telegram bot 天生看不到其他 bot 的消息。共享上下文层通过后端存储同步消息，绕过这个限制。

### 为什么不用 A2A？

telegram-ai-bridge 有个 A2A 总线，用于 Telegram 群聊里多 bot 互传消息。agent-nexus 故意不接 A2A，因为：

- **MCP 已经够用。** RecallNest 给了所有 agent 共享记忆，不需要消息总线。
- **Codex 原生支持 HTTP。** 叫 Codex 干活？走插件或 MCP，不用绕 Telegram 转发。
- **A2A 只在群聊有意义。** 大部分用户都是跟 bot 一对一私聊，A2A 白加复杂度。

## 配置

配置文件在 `~/.agent-nexus/`：

**config.json** -- nexus 专属设置：
```jsonc
{
  "jinaApiKey": "jina_...",
  "crossAgent": { "ccToCodex": "both" }
}
```

**bridge-config.json** -- 由 [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) 的配置 API 自动生成，不需要手动同步：
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

> 每个 backend 需要独立的 bot token（从 [@BotFather](https://t.me/BotFather) 创建）。

## 生态

agent-nexus 是一个 AI Agent 工具生态的安装入口：

| 项目 | 角色 | Stars |
|------|------|-------|
| [RecallNest](https://github.com/AliceLJY/recallnest) | 共享记忆层（LanceDB + 混合检索） | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/recallnest) |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram 远程控制 + 多 agent 编排 | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/telegram-ai-bridge) |
| [Claude Code Studio](https://github.com/AliceLJY/claude-code-studio) | Claude Code 多会话协作平台 | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/claude-code-studio) |

## License

MIT
