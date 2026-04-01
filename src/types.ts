export interface BackendConfig {
  enabled: boolean;
  botToken: string;
}

export interface GeminiConfig extends BackendConfig {
  oauthClientId: string;
  oauthClientSecret: string;
}

export interface NexusConfig {
  telegram: { ownerId: number; httpProxy: string };
  memory: { jinaApiKey: string };
  agents: { claude: BackendConfig; codex: BackendConfig; gemini: GeminiConfig };
  crossAgent: { ccToCodex: "plugin" | "mcp" | "both" };
  groupChat: { enabled: boolean; sharedContextBackend: "sqlite" | "redis"; redisUrl: string };
}
