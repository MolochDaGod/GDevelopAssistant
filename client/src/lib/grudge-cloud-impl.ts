/**
 * GrudgeCloud Implementation — backs the GrudgeCloudAPI interface
 * defined in grudge-cloud.ts with real Puter SDK calls.
 *
 * This is the single client-side cloud layer for the Grudge ecosystem.
 * Neon PostgreSQL remains the source of truth for all authoritative data;
 * GrudgeCloud provides fast per-user storage for saves, settings, cache, etc.
 */

import type {
  GrudgeCloudAPI,
  GrudgeCloudDB,
  GrudgeCloudStorage,
  GrudgeCloudSaves,
  GrudgeCloudSettings,
  GrudgeCloudSession,
  GrudgeCloudCache,
} from "./grudge-cloud";

const BASE_PATH = "/GRUDA";

function puter() {
  return window.puter;
}

// ── DB (KV wrapper) ──

const db: GrudgeCloudDB = {
  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await puter().kv.set(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await puter().kv.get(key);
      if (raw === null || raw === undefined) return null;
      return typeof raw === "string" ? JSON.parse(raw) : (raw as T);
    } catch {
      return null;
    }
  },

  async delete(key: string): Promise<boolean> {
    try {
      await puter().kv.del(key);
      return true;
    } catch {
      return false;
    }
  },

  async list(prefix?: string): Promise<string[]> {
    try {
      return await puter().kv.list(prefix);
    } catch {
      return [];
    }
  },

  async flush(): Promise<boolean> {
    try {
      await puter().kv.flush();
      return true;
    } catch {
      return false;
    }
  },
};

// ── Storage (FS wrapper) ──

const storage: GrudgeCloudStorage = {
  async mkdir(path: string): Promise<boolean> {
    try {
      await puter().fs.mkdir(`${BASE_PATH}/${path}`, { createMissingParents: true });
      return true;
    } catch {
      return false;
    }
  },

  async write(path: string, content: string): Promise<boolean> {
    try {
      await puter().fs.write(`${BASE_PATH}/${path}`, content, { createMissingParents: true });
      return true;
    } catch {
      return false;
    }
  },

  async read(path: string): Promise<string | null> {
    try {
      const blob = await puter().fs.read(`${BASE_PATH}/${path}`);
      return await blob.text();
    } catch {
      return null;
    }
  },

  async readJSON<T>(path: string): Promise<T | null> {
    const text = await storage.read(path);
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  },

  async writeJSON<T>(path: string, data: T): Promise<boolean> {
    return storage.write(path, JSON.stringify(data));
  },

  async delete(path: string): Promise<boolean> {
    try {
      await puter().fs.delete(`${BASE_PATH}/${path}`);
      return true;
    } catch {
      return false;
    }
  },

  async list(path?: string): Promise<any[]> {
    try {
      const fullPath = path ? `${BASE_PATH}/${path}` : BASE_PATH;
      const items = await puter().fs.readdir(fullPath);
      return items.map((item) => ({
        name: item.name,
        path: item.path,
        is_dir: item.is_dir,
        size: item.size || 0,
      }));
    } catch {
      return [];
    }
  },

  async exists(path: string): Promise<boolean> {
    try {
      await puter().fs.stat(`${BASE_PATH}/${path}`);
      return true;
    } catch {
      return false;
    }
  },

  async upload(path: string, file: File): Promise<boolean> {
    try {
      await puter().fs.write(`${BASE_PATH}/${path}`, file, {
        createMissingParents: true,
        dedupeName: true,
      });
      return true;
    } catch {
      return false;
    }
  },
};

// ── Saves (KV-backed game save slots) ──

const SAVE_PREFIX = "grudge_save_";

const saves: GrudgeCloudSaves = {
  SAVE_DIR: `${BASE_PATH}/gruda-wars/saves`,

  async init(): Promise<void> {
    try {
      await puter().fs.mkdir(saves.SAVE_DIR, { createMissingParents: true });
    } catch {
      // Already exists
    }
  },

  async save<T>(slotName: string, gameData: T): Promise<boolean> {
    try {
      const payload = JSON.stringify({ data: gameData, savedAt: Date.now() });
      await puter().kv.set(`${SAVE_PREFIX}${slotName}`, payload);
      return true;
    } catch {
      return false;
    }
  },

  async load<T>(slotName: string): Promise<T | null> {
    try {
      const raw = await puter().kv.get(`${SAVE_PREFIX}${slotName}`);
      if (!raw) return null;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return (parsed as any)?.data ?? null;
    } catch {
      return null;
    }
  },

  async list(): Promise<string[]> {
    try {
      const keys = await puter().kv.list(`${SAVE_PREFIX}*`);
      return keys.map((k) => k.replace(SAVE_PREFIX, ""));
    } catch {
      return [];
    }
  },

  async delete(slotName: string): Promise<boolean> {
    try {
      await puter().kv.del(`${SAVE_PREFIX}${slotName}`);
      return true;
    } catch {
      return false;
    }
  },
};

// ── Settings (KV-backed, can sync from/to Neon) ──

const SETTINGS_KEY = "grudge_user_settings";

const settings: GrudgeCloudSettings = {
  SETTINGS_KEY,

  async get<T extends Record<string, unknown>>(): Promise<T> {
    try {
      const raw = await puter().kv.get(SETTINGS_KEY);
      if (!raw) return {} as T;
      return typeof raw === "string" ? JSON.parse(raw) : (raw as T);
    } catch {
      return {} as T;
    }
  },

  async set(data: Record<string, unknown>): Promise<boolean> {
    try {
      const current = await settings.get();
      const merged = { ...current, ...data, updatedAt: Date.now() };
      await puter().kv.set(SETTINGS_KEY, JSON.stringify(merged));
      return true;
    } catch {
      return false;
    }
  },

  async reset(): Promise<boolean> {
    try {
      await puter().kv.del(SETTINGS_KEY);
      return true;
    } catch {
      return false;
    }
  },
};

// ── Session (KV-backed ephemeral data) ──

const SESSION_KEY = "grudge_session";

const session: GrudgeCloudSession = {
  SESSION_KEY,

  async get<T extends Record<string, unknown>>(): Promise<T> {
    try {
      const raw = await puter().kv.get(SESSION_KEY);
      if (!raw) return {} as T;
      return typeof raw === "string" ? JSON.parse(raw) : (raw as T);
    } catch {
      return {} as T;
    }
  },

  async set(data: Record<string, unknown>): Promise<boolean> {
    try {
      const current = await session.get();
      await puter().kv.set(SESSION_KEY, JSON.stringify({ ...current, ...data }));
      return true;
    } catch {
      return false;
    }
  },

  async clear(): Promise<boolean> {
    try {
      await puter().kv.del(SESSION_KEY);
      return true;
    } catch {
      return false;
    }
  },
};

// ── Cache (KV-backed with TTL) ──

const CACHE_PREFIX = "grudge_cache_";

const cache: GrudgeCloudCache = {
  CACHE_PREFIX,

  async set<T>(key: string, value: T, ttlMs?: number): Promise<boolean> {
    try {
      const entry = {
        value,
        ts: Date.now(),
        ttl: ttlMs ?? 0,
      };
      await puter().kv.set(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
      return true;
    } catch {
      return false;
    }
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await puter().kv.get(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;
      const entry = typeof raw === "string" ? JSON.parse(raw) : raw;
      const { value, ts, ttl } = entry as { value: T; ts: number; ttl: number };
      if (ttl > 0 && Date.now() - ts > ttl) {
        puter().kv.del(`${CACHE_PREFIX}${key}`).catch(() => {});
        return null;
      }
      return value;
    } catch {
      return null;
    }
  },

  async invalidate(key: string): Promise<boolean> {
    try {
      await puter().kv.del(`${CACHE_PREFIX}${key}`);
      return true;
    } catch {
      return false;
    }
  },
};

// ── GrudgeCloud Singleton ──

/**
 * Create and initialize the GrudgeCloud instance.
 * Call this after the Puter SDK is loaded and the user is optionally signed in.
 */
export function createGrudgeCloud(): GrudgeCloudAPI {
  const api: GrudgeCloudAPI = {
    initialized: false,
    user: null,

    async init(): Promise<boolean> {
      if (!window.puter) return false;
      try {
        api.initialized = true;
        // Try to get user if signed in
        try {
          if (window.puter.auth.isSignedIn()) {
            const userData = await window.puter.auth.getUser();
            api.user = userData;
          }
        } catch {
          // Not signed in — that's fine
        }
        return true;
      } catch {
        return false;
      }
    },

    async signIn() {
      try {
        await window.puter.auth.signIn();
        const user = await window.puter.auth.getUser();
        api.user = user;
        return user;
      } catch {
        return null;
      }
    },

    async signOut(): Promise<boolean> {
      try {
        await window.puter.auth.signOut();
        api.user = null;
        return true;
      } catch {
        return false;
      }
    },

    isSignedIn(): boolean {
      try {
        return window.puter?.auth?.isSignedIn() ?? false;
      } catch {
        return false;
      }
    },

    async getUser() {
      if (api.user) return api.user;
      try {
        if (!window.puter?.auth?.isSignedIn()) return null;
        const user = await window.puter.auth.getUser();
        api.user = user;
        return user;
      } catch {
        return null;
      }
    },

    db,
    storage,
    saves,
    settings,
    session,
    cache,
  };

  return api;
}
