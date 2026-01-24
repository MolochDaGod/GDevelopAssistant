import { useEffect, useState, useRef, useCallback } from 'react';
import { LayerHost, type LayerHostRef } from '@/features/mmo-world/layers/LayerHost';
import { TerrainLayer, type TerrainFeature } from '@/features/mmo-world/layers/TerrainLayer';
import { PlayersLayer, type Player } from '@/features/mmo-world/layers/PlayersLayer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function MMOTab() {
  const layerRef = useRef<LayerHostRef>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const mapWidth = 2000;
  const mapHeight = 1500;
  
  const [localPlayer, setLocalPlayer] = useState<Player>({
    id: 'local',
    name: 'You',
    characterClass: 'warrior',
    x: mapWidth / 2,
    y: mapHeight / 2,
    direction: 0,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    level: 1,
    isLocalPlayer: true,
    state: 'idle'
  });
  
  const [players, setPlayers] = useState<Player[]>([
    {
      id: 'bot1',
      name: 'Warrior',
      characterClass: 'warrior',
      x: mapWidth / 2 + 100,
      y: mapHeight / 2 + 50,
      direction: Math.PI,
      health: 85,
      maxHealth: 120,
      mana: 30,
      maxMana: 30,
      level: 2,
      state: 'idle'
    },
    {
      id: 'bot2',
      name: 'Mage',
      characterClass: 'mage',
      x: mapWidth / 2 - 80,
      y: mapHeight / 2 - 60,
      direction: Math.PI / 4,
      health: 60,
      maxHealth: 80,
      mana: 90,
      maxMana: 100,
      level: 3,
      state: 'idle'
    },
    {
      id: 'bot3',
      name: 'Ranger',
      characterClass: 'ranger',
      x: mapWidth / 2 + 50,
      y: mapHeight / 2 - 100,
      direction: -Math.PI / 2,
      health: 70,
      maxHealth: 90,
      mana: 40,
      maxMana: 60,
      level: 2,
      state: 'idle'
    }
  ]);
  
  const [terrainFeatures] = useState<TerrainFeature[]>(() => {
    const features: TerrainFeature[] = [];
    for (let i = 0; i < 50; i++) {
      features.push({
        id: `tree-${i}`,
        type: 'tree',
        x: Math.random() * mapWidth,
        y: Math.random() * mapHeight,
        size: 8 + Math.random() * 8,
        variant: Math.floor(Math.random() * 4)
      });
    }
    for (let i = 0; i < 30; i++) {
      features.push({
        id: `rock-${i}`,
        type: 'rock',
        x: Math.random() * mapWidth,
        y: Math.random() * mapHeight,
        size: 6 + Math.random() * 6,
        variant: Math.floor(Math.random() * 3)
      });
    }
    return features;
  });
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed(prev => new Set(prev).add(e.key.toLowerCase()));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useEffect(() => {
    const speed = 3;
    const interval = setInterval(() => {
      if (keysPressed.size === 0) return;
      
      setLocalPlayer(prev => {
        let dx = 0, dy = 0;
        if (keysPressed.has('w')) dy -= speed;
        if (keysPressed.has('s')) dy += speed;
        if (keysPressed.has('a')) dx -= speed;
        if (keysPressed.has('d')) dx += speed;
        
        if (dx === 0 && dy === 0) return prev;
        
        const newX = Math.max(0, Math.min(mapWidth, prev.x + dx));
        const newY = Math.max(0, Math.min(mapHeight, prev.y + dy));
        const direction = Math.atan2(dy, dx);
        
        if (layerRef.current) {
          layerRef.current.setCamera({ x: newX - mapWidth / 2, y: newY - mapHeight / 2 });
        }
        
        return { ...prev, x: newX, y: newY, direction, state: 'walking' as const };
      });
    }, 1000 / 60);
    
    return () => clearInterval(interval);
  }, [keysPressed, mapWidth, mapHeight]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => prev.map(p => {
        const time = Date.now() / 1000;
        const angle = time * 0.3 + parseInt(p.id.replace(/\D/g, ''));
        const radius = 80;
        const centerX = mapWidth / 2;
        const centerY = mapHeight / 2;
        return {
          ...p,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          direction: angle + Math.PI / 2
        };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [mapWidth, mapHeight]);
  
  const handlePlayerClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
  }, []);
  
  const handleAttack = () => {
    if (selectedPlayer && !selectedPlayer.isLocalPlayer) {
      setPlayers(prev => prev.map(p => 
        p.id === selectedPlayer.id 
          ? { ...p, health: Math.max(0, p.health - 15) }
          : p
      ));
      setLocalPlayer(prev => ({ ...prev, state: 'attacking' }));
      setTimeout(() => setLocalPlayer(prev => ({ ...prev, state: 'idle' })), 500);
    }
  };
  
  const handleCastSkill = () => {
    if (localPlayer.mana >= 20) {
      setLocalPlayer(prev => ({
        ...prev,
        mana: prev.mana - 20,
        state: 'casting'
      }));
      setTimeout(() => setLocalPlayer(prev => ({ ...prev, state: 'idle' })), 1000);
    }
  };
  
  return (
    <div ref={containerRef} className="w-full h-full flex flex-col gap-2 p-2 bg-zinc-900">
      <div className="flex-1 relative min-h-0">
        <LayerHost ref={layerRef} width={dimensions.width} height={dimensions.height - 150}>
          <TerrainLayer
            width={dimensions.width}
            height={dimensions.height - 150}
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            camera={layerRef.current?.camera || { x: 0, y: 0, zoom: 1 }}
            features={terrainFeatures}
          />
          <PlayersLayer
            width={dimensions.width}
            height={dimensions.height - 150}
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            camera={layerRef.current?.camera || { x: 0, y: 0, zoom: 1 }}
            players={[localPlayer, ...players]}
            onPlayerClick={handlePlayerClick}
          />
        </LayerHost>
        
        <div className="absolute top-4 right-4 space-y-2">
          <Card className="p-3 bg-black/80 border-zinc-700">
            <div className="text-white text-sm space-y-1">
              <div>HP: {localPlayer.health}/{localPlayer.maxHealth}</div>
              <Progress value={(localPlayer.health / localPlayer.maxHealth) * 100} className="h-2" />
              <div>MP: {localPlayer.mana}/{localPlayer.maxMana}</div>
              <Progress value={(localPlayer.mana / localPlayer.maxMana) * 100} className="h-2" />
            </div>
          </Card>
          
          {selectedPlayer && (
            <Card className="p-3 bg-black/80 border-zinc-700 text-white text-sm">
              <div className="font-bold">{selectedPlayer.name}</div>
              <div className="text-xs text-zinc-400">Lv.{selectedPlayer.level} {selectedPlayer.characterClass}</div>
              <Progress value={(selectedPlayer.health / selectedPlayer.maxHealth) * 100} className="h-1 mt-2" />
            </Card>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <Card className="flex-1 p-3 bg-zinc-800 border-zinc-700">
          <div className="text-white text-sm space-y-2">
            <div className="font-bold">Controls</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><kbd className="px-1 bg-zinc-700 rounded">WASD</kbd> Move</div>
              <div><kbd className="px-1 bg-zinc-700 rounded">Click</kbd> Select</div>
              <div><kbd className="px-1 bg-zinc-700 rounded">Mouse Wheel</kbd> Zoom</div>
              <div><kbd className="px-1 bg-zinc-700 rounded">Middle Click</kbd> Pan</div>
            </div>
          </div>
        </Card>
        
        <Card className="flex-1 p-3 bg-zinc-800 border-zinc-700">
          <div className="text-white text-sm space-y-2">
            <div className="font-bold">Actions</div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleAttack}
                disabled={!selectedPlayer || selectedPlayer.isLocalPlayer}
              >
                Attack
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={handleCastSkill}
                disabled={localPlayer.mana < 20}
              >
                Skill (20 MP)
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
