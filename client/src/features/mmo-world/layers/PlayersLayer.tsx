import { useRef, useEffect, memo } from "react";
import type { LayerCamera } from "./LayerHost";

export interface Player {
  id: string;
  name: string;
  characterClass: string;
  x: number;
  y: number;
  direction: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  level: number;
  isLocalPlayer?: boolean;
  state: "idle" | "walking" | "attacking" | "casting";
}

interface PlayersLayerProps {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  camera: LayerCamera;
  players: Player[];
  onPlayerClick?: (player: Player) => void;
}

const CLASS_COLORS: Record<string, { primary: string; secondary: string }> = {
  warrior: { primary: "#b8860b", secondary: "#ffd700" },
  mage: { primary: "#4169e1", secondary: "#87ceeb" },
  ranger: { primary: "#228b22", secondary: "#90ee90" },
  rogue: { primary: "#4a4a4a", secondary: "#808080" },
  priest: { primary: "#f0e68c", secondary: "#fffacd" },
  default: { primary: "#8b4513", secondary: "#deb887" }
};

export const PlayersLayer = memo(({ 
  width, 
  height, 
  mapWidth, 
  mapHeight, 
  camera, 
  players,
  onPlayerClick 
}: PlayersLayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const time = Date.now() / 1000;
    
    for (const player of players) {
      const x = player.x - mapWidth / 2;
      const y = player.y - mapHeight / 2;
      const size = 16;
      const colors = CLASS_COLORS[player.characterClass] || CLASS_COLORS.default;
      
      ctx.save();
      ctx.translate(x, y);
      
      if (player.isLocalPlayer) {
        const pulseScale = 1 + Math.sin(time * 3) * 0.1;
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8 * pulseScale, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = colors.secondary;
      ctx.beginPath();
      ctx.arc(-size * 0.15, -size * 0.15, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      
      const dirX = Math.cos(player.direction) * size * 0.35;
      const dirY = Math.sin(player.direction) * size * 0.35;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dirX, dirY);
      ctx.stroke();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      const barWidth = size * 1.8;
      const barHeight = 4;
      const barY = -size * 0.5 - 12;
      
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
      ctx.fillStyle = "#ff3333";
      ctx.fillRect(-barWidth / 2, barY, barWidth * (player.health / player.maxHealth), barHeight);
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
      
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-barWidth / 2, barY + barHeight + 1, barWidth, barHeight - 1);
      ctx.fillStyle = "#3366ff";
      ctx.fillRect(-barWidth / 2, barY + barHeight + 1, barWidth * (player.mana / player.maxMana), barHeight - 1);
      ctx.strokeRect(-barWidth / 2, barY + barHeight + 1, barWidth, barHeight - 1);
      
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.strokeText(player.name, 0, size * 0.5 + 14);
      ctx.fillText(player.name, 0, size * 0.5 + 14);
      
      ctx.font = "8px Arial";
      ctx.fillStyle = "#aaaaaa";
      ctx.fillText(`Lv.${player.level}`, 0, size * 0.5 + 22);
      
      ctx.restore();
    }

    ctx.restore();
  }, [width, height, mapWidth, mapHeight, camera, players]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPlayerClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (clickX - centerX) / camera.zoom + camera.x + mapWidth / 2;
    const worldY = (clickY - centerY) / camera.zoom + camera.y + mapHeight / 2;
    
    for (const player of players) {
      const dx = player.x - worldX;
      const dy = player.y - worldY;
      if (dx * dx + dy * dy < 400) {
        onPlayerClick(player);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 5,
        pointerEvents: "auto",
        cursor: "pointer"
      }}
      data-testid="players-layer"
    />
  );
});

PlayersLayer.displayName = "PlayersLayer";
