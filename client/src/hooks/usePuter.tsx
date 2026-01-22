import { useState, useEffect, useCallback } from 'react';
import puterStorage, { PuterFile } from '@/lib/puterStorage';

export function usePuter() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<{ username: string; uuid: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true);
      try {
        const available = puterStorage.isAvailable;
        setIsAvailable(available);
        
        if (available) {
          const signedIn = await puterStorage.isSignedIn();
          setIsSignedIn(signedIn);
          
          if (signedIn) {
            const userData = await puterStorage.getUser();
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Puter status check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(checkStatus, 500);
    return () => clearTimeout(timer);
  }, []);

  const signIn = useCallback(async () => {
    try {
      await puterStorage.signIn();
      setIsSignedIn(true);
      const userData = await puterStorage.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Puter sign-in failed:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await puterStorage.signOut();
    setIsSignedIn(false);
    setUser(null);
  }, []);

  const initializeStorage = useCallback(async () => {
    if (!isSignedIn) {
      await signIn();
    }
    await puterStorage.initializeDirectories();
  }, [isSignedIn, signIn]);

  return {
    isAvailable,
    isSignedIn,
    isLoading,
    user,
    signIn,
    signOut,
    initializeStorage,
    storage: puterStorage,
  };
}

export function usePuterFiles(folder: string = '') {
  const { isSignedIn, storage } = usePuter();
  const [files, setFiles] = useState<PuterFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const fileList = await storage.listFiles(folder);
      setFiles(fileList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, storage, folder]);

  useEffect(() => {
    if (isSignedIn) {
      refresh();
    }
  }, [isSignedIn, refresh]);

  const uploadFile = useCallback(async (file: File, subfolder?: string) => {
    const targetFolder = subfolder ? `${folder}/${subfolder}` : folder;
    const result = await storage.uploadFile(file, targetFolder);
    await refresh();
    return result;
  }, [storage, folder, refresh]);

  const deleteFile = useCallback(async (path: string) => {
    await storage.deleteFile(path);
    await refresh();
  }, [storage, refresh]);

  return {
    files,
    isLoading,
    error,
    refresh,
    uploadFile,
    deleteFile,
  };
}

export default usePuter;
