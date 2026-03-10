import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { captureAuthCallback, getAuthData, type AuthData } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that checks for authentication before rendering children.
 * Redirects unauthenticated users to /auth (in-app login page).
 * Navigates to /onboarding on first visit (no grudge_onboarded in localStorage).
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Capture auth data from URL params (after OAuth callback)
    captureAuthCallback();

    // Check if we have auth data (either from URL capture or prior session)
    const authData = getAuthData();
    
    if (!authData) {
      // No auth — redirect to in-app auth page
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/auth?return=${returnUrl}`, { replace: true });
      setLoading(false);
      return;
    }
    
    setAuth(authData);
    setLoading(false);

    // If user hasn't completed onboarding, navigate client-side
    const onboarded = localStorage.getItem('grudge_onboarded');
    if (!onboarded && !window.location.pathname.startsWith('/onboarding')) {
      navigate('/onboarding');
    }
  }, [navigate]);
  
  if (loading || !auth) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-semibold">Grudge Warlords</p>
            <p className="text-sm text-muted-foreground">Loading your battle station...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // User is authenticated, render the app
  return <>{children}</>;
}
