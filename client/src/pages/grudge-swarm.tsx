// Grudge Swarm uses the working Swarm RTS game
import SwarmRTS from './swarm-rts';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

export default function GrudgeSwarmPage() {
  return (
    <GrudgeGameWrapper gameSlug="grudge-swarm" gameName="Grudge Swarm" xpPerThousand={12} goldPerGame={8}>
      {(session) => <GrudgeSwarmPageInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function GrudgeSwarmPageInner({ session }: { session: GrudgeGameSession }) {
  return <SwarmRTS />;
}
