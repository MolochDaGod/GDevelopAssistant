import { GrudgeEmbed } from '@/components/GrudgeEmbed';

const GAME_URL = 'https://armada.grudge-studio.com';

/**
 * Armada Saga tab — embeds the Gruda Armada space RTS in GrudgeDotBox.
 * Uses GrudgeEmbed for auth forwarding, fullscreen, and error handling.
 */
export default function ArmadaSagaTab() {
  return (
    <GrudgeEmbed
      src={GAME_URL}
      title="Armada Saga — Gruda Armada"
      allowFullscreen
      showExternalLink
      minHeight="100vh"
    />
  );
}
