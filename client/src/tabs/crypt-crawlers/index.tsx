import React from 'react';

const GAME_URL = 'https://standalone-grudge.vercel.app/dungeon-crawler';

export default function CryptCrawlersTab() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', position: 'relative' }}>
      <iframe
        src={GAME_URL}
        title="Crypt Crawlers"
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
