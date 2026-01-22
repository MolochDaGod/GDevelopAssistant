import puterStorage from "./puterStorage";

export type PuterUser = {
  username: string;
  email?: string;
  uuid?: string;
};

export type StorageCategory =
  | "cache"
  | "save"
  | "settings"
  | "session"
  | "custom";

const PUTER_CDN = "https://js.puter.com/v2/";
const STORAGE_PREFIX = "grudge_";

class PuterService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private loadingCallback:
    | ((loading: boolean, message?: string) => void)
    | null = null;

  setLoadingCallback(callback: (loading: boolean, message?: string) => void) {
    this.loadingCallback = callback;
  }

  private showLoading(message?: string) {
    this.loadingCallback?.(true, message);
  }

  private hideLoading() {
    this.loadingCallback?.(false);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.showLoading("Initializing Grudge Cloud...");

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.puter) {
        this.initialized = true;
        this.hideLoading();
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = PUTER_CDN;
      script.async = true;

      script.onload = () => {
        this.initialized = true;
        this.hideLoading();
        resolve();
      };

      script.onerror = () => {
        this.initPromise = null;
        this.hideLoading();
        reject(new Error("Failed to load Puter.js"));
      };

      document.head.appendChild(script);
    });

    return this.initPromise;
  }

  isReady(): boolean {
    return this.initialized && puterStorage.isAvailable;
  }

  async ensureReady(): Promise<void> {
    if (!this.isReady()) {
      await this.init();
    }
  }

  async isSignedIn(): Promise<boolean> {
    await this.ensureReady();
    return puterStorage.isSignedIn();
  }

  async signIn(): Promise<PuterUser | null> {
    await this.ensureReady();
    this.showLoading("Signing in...");
    try {
      await puterStorage.signIn();
      const user = await puterStorage.getUser();
      return user as PuterUser | null;
    } finally {
      this.hideLoading();
    }
  }

  async signOut(): Promise<void> {
    await this.ensureReady();
    this.showLoading("Signing out...");
    try {
      await puterStorage.signOut();
    } finally {
      this.hideLoading();
    }
  }

  async getUser(): Promise<PuterUser | null> {
    if (!this.isReady()) return null;
    const user = await puterStorage.getUser();
    return user as PuterUser | null;
  }

  private prefixKey(key: string, category: string): string {
    return `${STORAGE_PREFIX}${category}_${key}`;
  }

  async set(
    key: string,
    value: any,
    category: StorageCategory = "custom",
  ): Promise<void> {
    await this.ensureReady();
    const prefixedKey = this.prefixKey(key, category);
    const data = JSON.stringify({ value, timestamp: Date.now() });
    await window.puter.kv.set(prefixedKey, data);
  }

  async get<T = any>(
    key: string,
    category: StorageCategory = "custom",
  ): Promise<T | null> {
    await this.ensureReady();
    try {
      const prefixedKey = this.prefixKey(key, category);
      const data = await window.puter.kv.get(prefixedKey);
      if (!data) return null;
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return parsed?.value ?? null;
    } catch {
      return null;
    }
  }

  async delete(
    key: string,
    category: StorageCategory = "custom",
  ): Promise<void> {
    await this.ensureReady();
    const prefixedKey = this.prefixKey(key, category);
    await window.puter.kv.del(prefixedKey);
  }

  async setCache(key: string, value: any, ttlMs?: number): Promise<void> {
    const data = { value, expires: ttlMs ? Date.now() + ttlMs : null };
    await this.set(key, data, "cache");
  }

  async getCache<T = any>(key: string): Promise<T | null> {
    const data = await this.get<{ value: T; expires: number | null }>(
      key,
      "cache",
    );
    if (!data) return null;
    if (data.expires && Date.now() > data.expires) {
      await this.delete(key, "cache");
      return null;
    }
    return data.value;
  }

  async saveGame(saveId: string, gameData: any): Promise<void> {
    this.showLoading("Saving game...");
    try {
      await this.set(saveId, gameData, "save");
    } finally {
      this.hideLoading();
    }
  }

  async loadGame<T = any>(saveId: string): Promise<T | null> {
    this.showLoading("Loading save...");
    try {
      return await this.get<T>(saveId, "save");
    } finally {
      this.hideLoading();
    }
  }

  async listSaves(): Promise<string[]> {
    await this.ensureReady();
    const allKeys = await window.puter.kv.list();
    const savePrefix = `${STORAGE_PREFIX}save_`;
    return allKeys
      .filter((key: string) => key.startsWith(savePrefix))
      .map((key: string) => key.replace(savePrefix, ""));
  }

  async deleteSave(saveId: string): Promise<void> {
    await this.delete(saveId, "save");
  }

  async setSettings(settings: Record<string, any>): Promise<void> {
    await this.set("user_settings", settings, "settings");
  }

  async getSettings<T = Record<string, any>>(): Promise<T | null> {
    return await this.get<T>("user_settings", "settings");
  }

  async setSession(key: string, value: any): Promise<void> {
    await this.set(key, value, "session");
  }

  async getSession<T = any>(key: string): Promise<T | null> {
    return await this.get<T>(key, "session");
  }

  async clearSession(): Promise<void> {
    await this.ensureReady();
    const allKeys = await window.puter.kv.list();
    const sessionPrefix = `${STORAGE_PREFIX}session_`;
    for (const key of allKeys.filter((k: string) =>
      k.startsWith(sessionPrefix),
    )) {
      await window.puter.kv.del(key);
    }
  }

  async uploadFile(
    path: string,
    content: Blob | File | string,
  ): Promise<string> {
    await this.ensureReady();
    this.showLoading("Uploading file...");
    try {
      const result = await window.puter.fs.write(path, content, {
        createMissingParents: true,
      });
      return result.path;
    } finally {
      this.hideLoading();
    }
  }

  async downloadFile(path: string): Promise<Blob> {
    await this.ensureReady();
    this.showLoading("Downloading file...");
    try {
      return await puterStorage.readFile(path);
    } finally {
      this.hideLoading();
    }
  }

  async listFiles(path: string = ""): Promise<any[]> {
    await this.ensureReady();
    return await puterStorage.listFiles(path);
  }

  async deleteFile(path: string): Promise<void> {
    await this.ensureReady();
    await puterStorage.deleteFile(path);
  }

  async createFolder(path: string): Promise<void> {
    await this.ensureReady();
    await window.puter.fs.mkdir(path, { createMissingParents: true });
  }

  async clearAllData(): Promise<void> {
    await this.ensureReady();
    this.showLoading("Clearing data...");
    try {
      const allKeys = await window.puter.kv.list();
      const grudgeKeys = allKeys.filter((key: string) =>
        key.startsWith(STORAGE_PREFIX),
      );
      for (const key of grudgeKeys) {
        await window.puter.kv.del(key);
      }
    } finally {
      this.hideLoading();
    }
  }

  getStorage() {
    return puterStorage;
  }
}

export const puterService = new PuterService();
export default puterService;
