/** Nexus-only settings (not bridge config — bridge config uses bridge's own API) */
export interface NexusConfig {
  jinaApiKey: string;
  crossAgent: { ccToCodex: "plugin" | "mcp" | "both" };
}
