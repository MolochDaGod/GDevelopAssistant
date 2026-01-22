declare global {
  interface Window {
    GrudgeCloud: GrudgeCloudAPI;
  }
}

interface PuterAPI {
  auth: {
    signIn(): Promise<void>;
    signOut(): Promise<void>;
    isSignedIn(): boolean;
    getUser(): Promise<PuterUser>;
  };
  kv: {
    set(key: string, value: string): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    list(): Promise<string[]>;
    flush(): Promise<void>;
  };
  fs: {
    mkdir(path: string): Promise<void>;
    write(path: string, content: string | Blob | File): Promise<void>;
    read(path: string): Promise<Blob>;
    delete(path: string): Promise<void>;
    readdir(path: string): Promise<PuterFile[]>;
    stat(path: string): Promise<PuterFileStat>;
  };
  hosting: {
    create(subdomain: string, directory: string): Promise<PuterSite>;
    list(): Promise<PuterSite[]>;
    get(subdomain: string): Promise<PuterSite>;
    delete(subdomain: string): Promise<void>;
  };
  randName(): string;
  print(content: string): void;
}

interface PuterUser {
  username: string;
  uuid: string;
  email?: string;
}

interface PuterFile {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

interface PuterFileStat {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  created: number;
  modified: number;
}

interface PuterSite {
  subdomain: string;
  root_dir: { path: string };
  uid: string;
}

export interface GrudgeCloudDB {
  set<T>(key: string, value: T): Promise<boolean>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  flush(): Promise<boolean>;
}

export interface GrudgeCloudStorage {
  mkdir(path: string): Promise<boolean>;
  write(path: string, content: string): Promise<boolean>;
  read(path: string): Promise<string | null>;
  readJSON<T>(path: string): Promise<T | null>;
  writeJSON<T>(path: string, data: T): Promise<boolean>;
  delete(path: string): Promise<boolean>;
  list(path?: string): Promise<PuterFile[]>;
  exists(path: string): Promise<boolean>;
  upload(path: string, file: File): Promise<boolean>;
}

export interface GrudgeCloudSaves {
  SAVE_DIR: string;
  init(): Promise<void>;
  save<T>(slotName: string, gameData: T): Promise<boolean>;
  load<T>(slotName: string): Promise<T | null>;
  list(): Promise<string[]>;
  delete(slotName: string): Promise<boolean>;
}

export interface GrudgeCloudSettings {
  SETTINGS_KEY: string;
  get<T extends Record<string, unknown>>(): Promise<T>;
  set(settings: Record<string, unknown>): Promise<boolean>;
  reset(): Promise<boolean>;
}

export interface GrudgeCloudSession {
  SESSION_KEY: string;
  get<T extends Record<string, unknown>>(): Promise<T>;
  set(data: Record<string, unknown>): Promise<boolean>;
  clear(): Promise<boolean>;
}

export interface GrudgeCloudCache {
  CACHE_PREFIX: string;
  set<T>(key: string, value: T, ttlMs?: number): Promise<boolean>;
  get<T>(key: string): Promise<T | null>;
  invalidate(key: string): Promise<boolean>;
}

export interface GrudgeCloudAPI {
  initialized: boolean;
  user: PuterUser | null;
  init(): Promise<boolean>;
  signIn(): Promise<PuterUser | null>;
  signOut(): Promise<boolean>;
  isSignedIn(): boolean;
  getUser(): Promise<PuterUser | null>;
  db: GrudgeCloudDB;
  storage: GrudgeCloudStorage;
  saves: GrudgeCloudSaves;
  settings: GrudgeCloudSettings;
  session: GrudgeCloudSession;
  cache: GrudgeCloudCache;
}

export function useGrudgeCloud(): GrudgeCloudAPI | null {
  if (typeof window !== 'undefined' && window.GrudgeCloud) {
    return window.GrudgeCloud;
  }
  return null;
}

export function isGrudgeCloudReady(): boolean {
  return typeof window !== 'undefined' && window.GrudgeCloud?.initialized === true;
}

export async function waitForGrudgeCloud(): Promise<GrudgeCloudAPI> {
  return new Promise((resolve) => {
    if (isGrudgeCloudReady()) {
      resolve(window.GrudgeCloud);
      return;
    }
    
    window.addEventListener('grudge-cloud-ready', (event) => {
      resolve((event as CustomEvent<GrudgeCloudAPI>).detail);
    }, { once: true });
  });
}

export default {
  useGrudgeCloud,
  isGrudgeCloudReady,
  waitForGrudgeCloud
};
