import { homedir } from "os";
import { join } from "path";

export const NEXUS_DIR = join(homedir(), ".agent-nexus");
export const CONFIG_PATH = join(NEXUS_DIR, "config.json");
export const PIDS_DIR = join(NEXUS_DIR, "pids");
export const LOGS_DIR = join(NEXUS_DIR, "logs");

export const CLAUDE_JSON = join(homedir(), ".claude.json");
export const CODEX_TOML = join(homedir(), ".codex", "config.toml");
export const GEMINI_JSON = join(homedir(), ".gemini", "settings.json");
