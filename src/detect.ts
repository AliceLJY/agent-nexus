import { $ } from "bun";

export interface DetectResult {
  bun: boolean;
  claude: boolean;
  codex: boolean;
  gemini: boolean;
}

async function inPath(cmd: string): Promise<boolean> {
  try {
    await $`which ${cmd}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function detectEnvironment(): Promise<DetectResult> {
  const [bun, claude, codex, gemini] = await Promise.all([
    inPath("bun"),
    inPath("claude"),
    inPath("codex"),
    inPath("gemini"),
  ]);
  return { bun, claude, codex, gemini };
}

export function printDetectResult(r: DetectResult): void {
  console.log("\n  Detecting environment...");
  console.log(`  ${r.bun ? "✅" : "❌"} Bun`);
  console.log(`  ${r.claude ? "✅" : "⬚"} Claude Code`);
  console.log(`  ${r.codex ? "✅" : "⬚"} Codex CLI`);
  console.log(`  ${r.gemini ? "✅" : "⬚"} Gemini CLI`);

  if (!r.bun) {
    console.log("\n  ❌ Bun is required. Install: https://bun.sh");
    process.exit(1);
  }
  if (!r.claude && !r.codex && !r.gemini) {
    console.log("\n  ❌ No AI CLI tool detected. Install at least one of: claude, codex, gemini");
    process.exit(1);
  }
}
