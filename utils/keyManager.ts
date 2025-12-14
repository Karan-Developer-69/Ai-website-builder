
import { GoogleGenAI } from '@google/genai';

// LocalStorage keys
const STORAGE_KEYS = {
  AGENT_KEY: 'lysis_agent_api_key',
  WORKER1_KEY: 'lysis_worker1_api_key',
  WORKER2_KEY: 'lysis_worker2_api_key',
  // Track current index for each role
  AGENT_INDEX: 'lysis_agent_key_index',
  WORKER1_INDEX: 'lysis_worker1_key_index',
  WORKER2_INDEX: 'lysis_worker2_key_index',
};

// Fallback keys for development (will be removed when user sets their own)
const FALLBACK_KEYS = [
  "AIzaSyCa_4HF6raAn5zVmLaPoJAkp36-S7wsYAQ",
  "AIzaSyA4zDlWgeafYb14Hmx5BKQrIfLBlhOUwBk",
  "AIzaSyAOWAuXRClOElozr58miOJ5ibGak4dTL-E",
];

type ApiKeyRole = 'agent' | 'worker1' | 'worker2';

class ApiKeyManager {
  private clientCache: Map<string, GoogleGenAI>;
  private currentContext: ApiKeyRole;
  private keyIndices: Map<ApiKeyRole, number>;
  // Temporary emergency keys entered by user at runtime. These are kept in-memory and
  // prepended to the list of keys for the given role while present.
  private emergencyKeys: Map<ApiKeyRole, string | null> = new Map([
    ['agent', null], ['worker1', null], ['worker2', null]
  ]);

  constructor() {
    this.clientCache = new Map();
    this.currentContext = 'agent';
    this.keyIndices = new Map([
      ['agent', this.getStoredIndex('agent')],
      ['worker1', this.getStoredIndex('worker1')],
      ['worker2', this.getStoredIndex('worker2')],
    ]);
  }

  /**
   * Get stored index for a role
   */
  private getStoredIndex(role: ApiKeyRole): number {
    const indexKey = role === 'agent' ? STORAGE_KEYS.AGENT_INDEX :
      role === 'worker1' ? STORAGE_KEYS.WORKER1_INDEX :
        STORAGE_KEYS.WORKER2_INDEX;
    const stored = localStorage.getItem(indexKey);
    return stored ? parseInt(stored, 10) : 0;
  }

  /**
   * Save index for a role
   */
  private saveIndex(role: ApiKeyRole, index: number): void {
    const indexKey = role === 'agent' ? STORAGE_KEYS.AGENT_INDEX :
      role === 'worker1' ? STORAGE_KEYS.WORKER1_INDEX :
        STORAGE_KEYS.WORKER2_INDEX;
    localStorage.setItem(indexKey, index.toString());
    this.keyIndices.set(role, index);
  }

  /**
   * Parse comma-separated API keys
   */
  private parseKeys(keysString: string): string[] {
    if (!keysString) return [];
    return keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  /**
   * Set the context for which role is currently making API calls
   */
  public setContext(role: ApiKeyRole): void {
    this.currentContext = role;
  }

  /**
   * Get all API keys for a specific role
   */
  private getKeysForRole(role: ApiKeyRole): string[] {
    let keysString = '';

    switch (role) {
      case 'agent':
        keysString = localStorage.getItem(STORAGE_KEYS.AGENT_KEY) || '';
        break;
      case 'worker1':
        keysString = localStorage.getItem(STORAGE_KEYS.WORKER1_KEY) || '';
        break;
      case 'worker2':
        keysString = localStorage.getItem(STORAGE_KEYS.WORKER2_KEY) || '';
        break;
    }

    const keys = this.parseKeys(keysString);
    // If an emergency key is present for this role, prefer it first
    const emergency = this.emergencyKeys.get(role);
    if (emergency && emergency.length > 0) {
      return [emergency, ...keys.filter(k => k !== emergency)];
    }
    // Fallback to development keys if user hasn't configured
    if (keys.length === 0 && FALLBACK_KEYS.length > 0) {
      console.warn(`[KeyManager] No API keys configured for ${role}. Using fallback keys.`);
      return FALLBACK_KEYS;
    }

    return keys;
  }

  /**
   * Set a temporary emergency API key for a specific role (not persisted).
   * The emergency key will be used first until cleared.
   */
  public setEmergencyKey(role: ApiKeyRole, key: string | null): void {
    if (key === null) this.emergencyKeys.set(role, null);
    else this.emergencyKeys.set(role, key.trim());
    console.log(`[KeyManager] Emergency key for ${role} set: ${key ? 'YES' : 'CLEARED'}`);
    // Clear client cache so next getClient will construct new client with emergency key
    this.clientCache.clear();
  }

  /**
   * Get the current active API Key based on context and index
   */
  public getActiveKey(): string {
    const keys = this.getKeysForRole(this.currentContext);
    if (keys.length === 0) return '';

    const index = this.keyIndices.get(this.currentContext) || 0;
    return keys[index % keys.length];
  }

  /**
   * Get all configured keys (first key from each role for display)
   */
  public getAllKeys(): { agent: string; worker1: string; worker2: string } {
    return {
      agent: localStorage.getItem(STORAGE_KEYS.AGENT_KEY) || '',
      worker1: localStorage.getItem(STORAGE_KEYS.WORKER1_KEY) || '',
      worker2: localStorage.getItem(STORAGE_KEYS.WORKER2_KEY) || '',
    };
  }

  /**
   * Set API keys for all roles (supports comma-separated keys)
   */
  public setKeys(agentKey: string, worker1Key: string, worker2Key: string): void {
    localStorage.setItem(STORAGE_KEYS.AGENT_KEY, agentKey);
    localStorage.setItem(STORAGE_KEYS.WORKER1_KEY, worker1Key);
    localStorage.setItem(STORAGE_KEYS.WORKER2_KEY, worker2Key);

    // Reset indices
    this.saveIndex('agent', 0);
    this.saveIndex('worker1', 0);
    this.saveIndex('worker2', 0);

    // Clear cache to force new clients with new keys
    this.clientCache.clear();

    console.log('[KeyManager] API keys updated successfully');
  }

  /**
   * Check if all required keys are configured
   */
  public hasAllKeys(): boolean {
    const keys = this.getAllKeys();
    return !!(keys.agent && keys.worker1 && keys.worker2);
  }

  /**
   * Get a GoogleGenAI client instance for the current context.
   * Caches instances to avoid memory leaks.
   */
  public getClient(): GoogleGenAI {
    const key = this.getActiveKey();

    if (!key) {
      throw new Error(`No API key configured for ${this.currentContext}. Please configure your API keys in Settings.`);
    }

    if (!this.clientCache.has(key)) {
      this.clientCache.set(key, new GoogleGenAI({ apiKey: key }));
    }
    return this.clientCache.get(key)!;
  }

  /**
   * Get a client for a specific role (useful for workers)
   */
  public getClientForRole(role: ApiKeyRole): GoogleGenAI {
    const previousContext = this.currentContext;
    this.setContext(role);
    const client = this.getClient();
    this.setContext(previousContext);
    return client;
  }

  /**
   * Rotate to the next available API key for current context
   */
  public rotateKey(): void {
    const keys = this.getKeysForRole(this.currentContext);
    if (keys.length <= 1) {
      console.warn(`[KeyManager] Only 1 key available for ${this.currentContext}. Cannot rotate. Add more keys separated by commas.`);
      return;
    }

    const currentIndex = this.keyIndices.get(this.currentContext) || 0;
    const newIndex = (currentIndex + 1) % keys.length;
    this.saveIndex(this.currentContext, newIndex);

    const oldKey = keys[currentIndex];
    const newKey = keys[newIndex];

    console.warn(`[KeyManager] 🔄 Rotating ${this.currentContext} API Key.\nOld: ...${oldKey.slice(-6)}\nNew: ...${newKey.slice(-6)}`);
  }

  /**
   * Helper to execute a function with automatic retry and load balancing
   */
  public async executeWithRetry<T>(
    operation: (client: GoogleGenAI) => Promise<T>,
    maxRetries: number = 3,
    role?: ApiKeyRole
  ): Promise<T> {
    // Set context if role is provided
    if (role) {
      this.setContext(role);
    }

    const keys = this.getKeysForRole(this.currentContext);
    const maxAttempts = Math.min(maxRetries, keys.length * 2); // Try each key twice
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const client = this.getClient();
        const result = await operation(client);

        // Success! Return result
        return result;
      } catch (error: any) {
        attempts++;
        const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
        const isServerErr = error.status >= 500;

        if ((isRateLimit || isServerErr) && attempts < maxAttempts) {
          if (isRateLimit && keys.length > 1) {
            console.warn(`[KeyManager] ⚠️ Rate limit hit for ${this.currentContext}. Switching to next API key...`);
            this.rotateKey();
            // Small delay before retry
            await new Promise(r => setTimeout(r, 500));
          } else {
            console.warn(`[KeyManager] Operation failed for ${this.currentContext} (Attempt ${attempts}/${maxAttempts}). Retrying...`);
            // Exponential backoff
            await new Promise(r => setTimeout(r, 1000 * Math.min(attempts, 5)));
          }
        } else {
          // Max retries exceeded or non-retryable error
          if (isRateLimit) {
            // Dispatch a global event so UI can prompt user for an emergency key
            try {
              window.dispatchEvent(new CustomEvent('lysis-rate-limit', { detail: { role: this.currentContext, message: 'Rate limit exceeded' } }));
            } catch (e) { /* ignore in non-browser env */ }

            throw new Error(`⚠️ Rate limit exceeded for ${this.currentContext}.\n\n💡 Solutions:\n1. Wait a few minutes\n2. Add more API keys (comma-separated in Settings)\n3. Use a different Google account`);
          }
          throw error;
        }
      }
    }
    throw new Error(`Max retries exceeded for ${this.currentContext} after ${maxAttempts} attempts with ${keys.length} key(s).`);
  }
}

// Singleton instance
export const keyManager = new ApiKeyManager();
