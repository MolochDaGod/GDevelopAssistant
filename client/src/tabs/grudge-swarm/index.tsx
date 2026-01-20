import React, { Suspense } from 'react';
const SwarmRTSEnhanced = React.lazy(() => import('../../pages/swarm-rts-enhanced'));

export default function GrudgeSwarmTab() {
  return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <Suspense fallback={<div style={{ color: '#fff', padding: 16 }}>Loading Grudge Swarm…</div>}>
        <SwarmRTSEnhanced />
      </Suspense>
    </div>
  );
}
