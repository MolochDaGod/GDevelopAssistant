import { createContext, useContext, useState, useCallback, useRef } from "react";
import { LoadingOverlay } from "@/components/loading-video";

interface LoadingContextType {
  isLoading: boolean;
  message: string;
  progress: number;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  setProgress: (value: number) => void;
  setMessage: (message: string) => void;
  withLoading: <T>(promise: Promise<T>, message?: string) => Promise<T>;
  trackProgress: (items: number, message?: string) => { increment: () => void; complete: () => void };
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Loading...");
  const [progress, setProgress] = useState(0);
  const minDisplayTimeRef = useRef<number>(0);

  const showLoading = useCallback((msg: string = "Loading...") => {
    setMessage(msg);
    setProgress(0);
    setIsLoading(true);
    minDisplayTimeRef.current = Date.now();
  }, []);

  const hideLoading = useCallback(() => {
    const elapsed = Date.now() - minDisplayTimeRef.current;
    const minTime = 500;
    if (elapsed < minTime) {
      setTimeout(() => setIsLoading(false), minTime - elapsed);
    } else {
      setIsLoading(false);
    }
  }, []);

  const withLoading = useCallback(async <T,>(promise: Promise<T>, msg: string = "Loading..."): Promise<T> => {
    showLoading(msg);
    try {
      const result = await promise;
      return result;
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  const trackProgress = useCallback((totalItems: number, msg: string = "Loading...") => {
    let completed = 0;
    showLoading(msg);
    
    return {
      increment: () => {
        completed++;
        setProgress(Math.min(100, (completed / totalItems) * 100));
      },
      complete: () => {
        setProgress(100);
        hideLoading();
      }
    };
  }, [showLoading, hideLoading]);

  return (
    <LoadingContext.Provider value={{ 
      isLoading, 
      message, 
      progress,
      showLoading, 
      hideLoading,
      setProgress,
      setMessage,
      withLoading,
      trackProgress
    }}>
      {children}
      <LoadingOverlay message={message} isVisible={isLoading} progress={progress} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
