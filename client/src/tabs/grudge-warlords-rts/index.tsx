import React, { useRef, useCallback, useEffect } from 'react';

const GAME_URL = 'https://grudge-warlords-rts.vercel.app/play';
const GAME_ORIGIN = 'https://grudge-warlords-rts.vercel.app';

/**
 * Grudge Warlords RTS tab — embeds the standalone RTS in an iframe
 * and exposes a postMessage bridge for asset/config injection from the
 * GDevelop parent frame.
 *
 * PostMessage API (send to iframe):
 *   { type: 'asset:override-sprite', unitType, action, src }
 *   { type: 'asset:override-model', unitType, modelUrl }
 *   { type: 'game:set-faction', faction: 'kingdom' | 'legion' }
 *   { type: 'game:set-map', mapIndex: number }
 *   { type: 'game:start' }
 */
export default function GrudgeWarlordsRtsTab() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /** Send a command to the RTS iframe */
  const sendCommand = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(msg, GAME_ORIGIN);
  }, []);

  // Listen for messages FROM the RTS (e.g. asset requests, game events)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== GAME_ORIGIN) return;
      const { type, ...payload } = e.data ?? {};
      switch (type) {
        case 'rts:ready':
          console.log('[GDevelop] RTS iframe ready, can send asset overrides');
          break;
        case 'rts:game-event':
          console.log('[GDevelop] RTS game event:', payload);
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
      <iframe
        ref={iframeRef}
        src={GAME_URL}
        title="Grudge Warlords RTS"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allow="autoplay; fullscreen; gamepad"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
