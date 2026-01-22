declare global {
  interface Window {
    puter: {
      auth: {
        isSignedIn: () => boolean;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        getUser: () => Promise<{ username: string; uuid: string; email?: string }>;
      };
      fs: {
        write: (path: string, content: Blob | string | File, options?: { dedupeName?: boolean; createMissingParents?: boolean }) => Promise<{ name: string; path: string }>;
        read: (path: string) => Promise<Blob>;
        mkdir: (path: string, options?: { createMissingParents?: boolean }) => Promise<void>;
        readdir: (path: string) => Promise<Array<{ name: string; path: string; is_dir: boolean; size?: number }>>;
        delete: (path: string) => Promise<void>;
        rename: (oldPath: string, newPath: string) => Promise<void>;
        move: (source: string, destination: string) => Promise<void>;
        copy: (source: string, destination: string) => Promise<void>;
        stat: (path: string) => Promise<{ name: string; path: string; is_dir: boolean; size: number; created: string; modified: string }>;
      };
      kv: {
        set: (key: string, value: unknown) => Promise<void>;
        get: (key: string) => Promise<unknown>;
        del: (key: string) => Promise<void>;
        list: (options?: { prefix?: string }) => Promise<string[]>;
      };
    };
  }
}

export interface PuterFile {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  created?: string;
  modified?: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

/**
 * Puter Cloud Storage Service for GRUDA Platform
 * Provides serverless cloud storage for game assets, projects, and exports
 * 
 * Directory Structure:
 * - /GRUDA/assets/models/     - 3D model files (.glb, .gltf)
 * - /GRUDA/assets/textures/   - Texture files
 * - /GRUDA/assets/animations/ - Animation files
 * - /GRUDA/assets/audio/      - Audio files
 * - /GRUDA/projects/          - Saved projects and scenes
 * - /GRUDA/exports/           - Exported game levels
 * 
 * Used by: Grudge Warlords Builder, Asset Registry, Project Manager
 */
class PuterStorageService {
  private basePath = '/GRUDA';

  get puter() {
    return window.puter;
  }

  get isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.puter;
  }
  
  /** Get the base path for GRUDA storage */
  getBasePath(): string {
    return this.basePath;
  }

  async isSignedIn(): Promise<boolean> {
    if (!this.isAvailable) return false;
    return this.puter.auth.isSignedIn();
  }

  async signIn(): Promise<void> {
    if (!this.isAvailable) throw new Error('Puter SDK not available');
    await this.puter.auth.signIn();
  }

  async signOut(): Promise<void> {
    if (!this.isAvailable) return;
    await this.puter.auth.signOut();
  }

  async getUser(): Promise<{ username: string; uuid: string; email?: string } | null> {
    if (!this.isAvailable) return null;
    if (!this.puter.auth.isSignedIn()) return null;
    return await this.puter.auth.getUser();
  }

  async initializeDirectories(): Promise<void> {
    if (!this.isAvailable) return;
    
    const dirs = [
      this.basePath,
      `${this.basePath}/assets`,
      `${this.basePath}/assets/models`,
      `${this.basePath}/assets/textures`,
      `${this.basePath}/assets/animations`,
      `${this.basePath}/assets/audio`,
      `${this.basePath}/projects`,
      `${this.basePath}/exports`,
    ];

    for (const dir of dirs) {
      try {
        await this.puter.fs.mkdir(dir, { createMissingParents: true });
      } catch {
        // Directory might already exist
      }
    }
  }

  async uploadFile(
    file: File,
    folder: string = 'assets',
    onProgress?: (progress: number) => void
  ): Promise<PuterFile> {
    if (!this.isAvailable) throw new Error('Puter SDK not available');
    
    const path = `${this.basePath}/${folder}/${file.name}`;
    
    onProgress?.(10);
    
    const result = await this.puter.fs.write(path, file, {
      dedupeName: true,
      createMissingParents: true,
    });
    
    onProgress?.(100);
    
    return {
      name: result.name,
      path: result.path,
      isDir: false,
      size: file.size,
    };
  }

  async uploadMultiple(
    files: File[],
    folder: string = 'assets',
    onProgress?: (fileName: string, progress: number, index: number) => void
  ): Promise<PuterFile[]> {
    const results: PuterFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.uploadFile(file, folder, (p) => {
          onProgress?.(file.name, p, i);
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }
    
    return results;
  }

  async listFiles(folder: string = ''): Promise<PuterFile[]> {
    if (!this.isAvailable) return [];
    
    const path = folder ? `${this.basePath}/${folder}` : this.basePath;
    
    try {
      const items = await this.puter.fs.readdir(path);
      return items.map(item => ({
        name: item.name,
        path: item.path,
        isDir: item.is_dir,
        size: item.size,
      }));
    } catch {
      return [];
    }
  }

  async readFile(path: string): Promise<Blob> {
    if (!this.isAvailable) throw new Error('Puter SDK not available');
    return await this.puter.fs.read(path);
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.isAvailable) return;
    await this.puter.fs.delete(path);
  }

  async getFileUrl(path: string): Promise<string> {
    if (!this.isAvailable) throw new Error('Puter SDK not available');
    const blob = await this.puter.fs.read(path);
    return URL.createObjectURL(blob);
  }

  async saveProjectData(projectId: string, data: unknown): Promise<void> {
    if (!this.isAvailable) return;
    await this.puter.kv.set(`project:${projectId}`, data);
  }

  async loadProjectData<T>(projectId: string): Promise<T | null> {
    if (!this.isAvailable) return null;
    const data = await this.puter.kv.get(`project:${projectId}`);
    return data as T | null;
  }

  async listProjects(): Promise<string[]> {
    if (!this.isAvailable) return [];
    const keys = await this.puter.kv.list({ prefix: 'project:' });
    return keys.map(key => key.replace('project:', ''));
  }
}

export const puterStorage = new PuterStorageService();
export default puterStorage;
