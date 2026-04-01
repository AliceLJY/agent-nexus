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

  Telegram Bot Token: ********
  你的 Telegram ID: 123456
  Jina API Key: jina_****

  🔌 配置 MCP...

  📋 已备份 ~/.claude.json
  ✅ Claude Code MCP 已配置
  ✅ Codex MCP 已配置
  ✅ Bridge 配置已生成

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

## 配置

所有配置集中在 `~/.agent-nexus/config.json`：

```jsonc
{
  "telegram": { "botToken": "...", "ownerId": 123456 },
  "memory": { "jinaApiKey": "...", "dbPath": "~/.recallnest/data/lancedb" },
  "agents": { "claude": true, "codex": true, "gemini": false }
}
```

## 生态

agent-nexus 是一个 AI Agent 工具生态的安装入口：

| 项目 | 角色 | Stars |
|------|------|-------|
| [RecallNest](https://github.com/AliceLJY/recallnest) | 共享记忆层（LanceDB + 混合检索） | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/recallnest) |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram 远程控制 + 多 agent 编排 | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/telegram-ai-bridge) |
| [Claude Code Studio](https://github.com/AliceLJY/claude-code-studio) | Claude Code 多会话协作平台 | ![GitHub stars](https://img.shields.io/github/stars/AliceLJY/claude-code-studio) |

## License

MIT
