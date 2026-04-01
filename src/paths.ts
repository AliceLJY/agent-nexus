import { homedir } from "os";
import { join } from "path";

export const NEXUS_DIR = join(homedir(), ".agent-nexus");
export const CONFIG_PATH = join(NEXUS_DIR, "config.json");
export const BRIDGE_CONFIG_PATH = join(NEXUS_DIR, "bridge-config.json");
export const PIDS_DIR = join(NEXUS_DIR, "pids");
export const LOGS_DIR = join(NEXUS_DIR, "logs");

export const CLAUDE_JSON = join(homedir(), ".claude.json");
export const CLAUDE_MD = join(homedir(), ".claude", "CLAUDE.md");
export const CODEX_TOML = join(homedir(), ".codex", "config.toml");
export const CODEX_AGENTS_MD = join(homedir(), ".codex", "AGENTS.md");
export const GEMINI_JSON = join(homedir(), ".gemini", "settings.json");
export const GEMINI_MD = join(homedir(), ".gemini", "GEMINI.md");
