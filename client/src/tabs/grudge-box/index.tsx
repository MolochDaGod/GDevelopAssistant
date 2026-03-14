import React from 'react';

const GAME_URL = 'https://standalone-grudge.vercel.app/grudge-box';

export default function GrudgeBoxTab() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', position: 'relative' }}>
      <iframe
        src={GAME_URL}
        title="GrudgeBox"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="autoplay; fullscreen; gamepad"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
      />
    </div>
  );
}
