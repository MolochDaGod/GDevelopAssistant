import { useEffect, useState } from 'react';
import { checkAuth, getAuthData, type AuthData } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that checks for authentication before rendering children
 * Redirects to auth-gateway-flax.vercel.app if not authenticated
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // First check if we have auth data without redirecting
    const authData = getAuthData();
    
    if (authData) {
      // User is authenticated
      setAuth(authData);
      setLoading(false);
    } else {
      // No auth data, redirect to login
      // Give a brief moment to show loading state
      const timer = setTimeout(() => {
        checkAuth(); // This will redirect to auth gateway
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  if (loading || !auth) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-semibold">Grudge Warlords</p>
            <p className="text-sm text-muted-foreground">
              {auth ? 'Loading your battle station...' : 'Redirecting to login...'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // User is authenticated, render the app
  return <>{children}</>;
}
