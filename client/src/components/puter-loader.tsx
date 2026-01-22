import { useState, useEffect, useRef } from 'react';

interface PuterLoaderProps {
  isLoading: boolean;
  message?: string;
  minDisplayTime?: number;
}

export function PuterLoader({ isLoading, message = 'Loading...', minDisplayTime = 1000 }: PuterLoaderProps) {
  const [visible, setVisible] = useState(false);
  const showTimeRef = useRef<number>(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      showTimeRef.current = Date.now();
      setVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    } else if (visible) {
      const elapsed = Date.now() - showTimeRef.current;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, remaining);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isLoading, minDisplayTime, visible]);

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      data-testid="puter-loader"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-blue-900/30" />
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
        
        <div className="text-center">
          <p className="text-white text-lg font-medium animate-pulse">{message}</p>
          <p className="text-gray-400 text-sm mt-2">Grudge Studio</p>
        </div>
      </div>
    </div>
  );
}
