import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load the enhanced RTS game component
const SwarmRTSEnhanced = lazy(() => import('./swarm-rts-enhanced'));

function GameLoader() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
        <p className="text-sm text-slate-300">Initializing Grudge Swarm...</p>
      </div>
    </div>
  );
}

export default function GrudgeSwarmPage() {
  return (
    <Suspense fallback={<GameLoader />}>
      <SwarmRTSEnhanced />
    </Suspense>
  );
}
