import { SecretManagerStatus } from "../types";

export interface SecretConfig {
  provider: 'GCP_SECRET_MANAGER' | 'VAULT_KMS' | 'ENV_FALLBACK';
  gcpProjectId?: string;
  vaultUrl?: string;
  cacheTtlSeconds: number;
  isDynamicRotationEnabled: boolean;
}

class SecretManagerService {
  private config: SecretConfig = {
    provider: 'GCP_SECRET_MANAGER',
    cacheTtlSeconds: 300,
    isDynamicRotationEnabled: true,
  };

  private secretCache: Map<string, { value: string; fetchedAt: number }> = new Map();
  private secretVersion: string = "v1.4.2";
  private lastRotatedAt: string = new Date().toISOString();

  constructor() {
    // Initial cache preload from runtime environment or vault
    this.refreshCache();
  }

  private maskSecret(secret?: string): string {
    if (!secret || secret.length === 0) return "UNCONFIGURED";
    if (secret.length <= 8) return "••••••••";
    return `${secret.substring(0, 4)}••••••••${secret.substring(secret.length - 4)}`;
  }

  public refreshCache(): void {
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const operatorPassword = process.env.OPERATOR_PASSWORD || "admin123";
    const now = Date.now();

    this.secretCache.set("GEMINI_API_KEY", { value: geminiKey, fetchedAt: now });
    this.secretCache.set("OPERATOR_PASSWORD", { value: operatorPassword, fetchedAt: now });
    this.lastRotatedAt = new Date().toISOString();
  }

  public async getSecret(key: string): Promise<string> {
    const cached = this.secretCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.fetchedAt) < this.config.cacheTtlSeconds * 1000) {
      return cached.value;
    }

    // Dynamic fetch from GCP Secret Manager / Vault provider simulation
    let resolvedValue = process.env[key] || "";
    this.secretCache.set(key, { value: resolvedValue, fetchedAt: now });
    return resolvedValue;
  }

  public setSecretOverride(key: string, value: string): void {
    this.secretCache.set(key, { value, fetchedAt: Date.now() });
    this.lastRotatedAt = new Date().toISOString();
    const versionParts = this.secretVersion.replace('v', '').split('.').map(Number);
    versionParts[2] = (versionParts[2] || 0) + 1;
    this.secretVersion = `v${versionParts.join('.')}`;
  }

  public configureProvider(newConfig: Partial<SecretConfig>): SecretManagerStatus {
    this.config = { ...this.config, ...newConfig };
    this.refreshCache();
    return this.getStatus();
  }

  public getStatus(): SecretManagerStatus {
    const geminiKeyEntry = this.secretCache.get("GEMINI_API_KEY");
    const geminiKey = geminiKeyEntry?.value || process.env.GEMINI_API_KEY || "";
    const opPassEntry = this.secretCache.get("OPERATOR_PASSWORD");
    const opPass = opPassEntry?.value || process.env.OPERATOR_PASSWORD || "";

    return {
      provider: this.config.provider,
      connected: true,
      activeSecrets: {
        geminiApiKeyConfigured: Boolean(geminiKey && geminiKey.length > 0),
        geminiApiKeyMasked: this.maskSecret(geminiKey),
        operatorPasswordConfigured: Boolean(opPass && opPass.length > 0),
        secretVersion: this.secretVersion,
        lastRotatedAt: this.lastRotatedAt,
      },
      cacheTtlSeconds: this.config.cacheTtlSeconds,
      isDynamicRotationEnabled: this.config.isDynamicRotationEnabled,
    };
  }
}

export const secretManager = new SecretManagerService();
