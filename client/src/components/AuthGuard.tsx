import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { captureAuthCallback, getAuthData, storeAuth, type AuthData } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that checks for authentication before rendering children.
 * Auto-creates a guest session if no auth data exists (no external redirect).
 * Navigates to /onboarding on first visit (no grudge_onboarded in localStorage).
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Capture auth data from URL params (after auth-gateway redirect)
    captureAuthCallback();

    // Then check if we have auth data (either from URL or prior session)
    let authData = getAuthData();
    
    if (!authData) {
      // No auth data — auto-create a guest session locally
      // This prevents the redirect loop to auth-gateway
      const guestId = `guest-${crypto.randomUUID().slice(0, 12)}`;
      storeAuth({
        token: `local-guest-${Date.now()}`,
        grudgeId: guestId,
        userId: guestId,
        username: 'Guest Warlord',
      });
      authData = getAuthData();
    }
    
    if (authData) {
      setAuth(authData);
      setLoading(false);

      // If user hasn't completed onboarding, navigate client-side (no full reload)
      const onboarded = localStorage.getItem('grudge_onboarded');
      if (!onboarded && !window.location.pathname.startsWith('/onboarding')) {
        navigate('/onboarding');
      }
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
