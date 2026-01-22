import { useRef, useEffect, memo } from "react";
import type { LayerCamera } from "./LayerHost";

export interface WorldItem {
  id: string;
  type: "gold" | "potion" | "weapon" | "armor" | "gem" | "scroll";
  x: number;
  y: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  quantity?: number;
}

interface ItemsLayerProps {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  camera: LayerCamera;
  items: WorldItem[];
  onItemClick?: (item: WorldItem) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#ffffff",
  uncommon: "#1eff00",
  rare: "#0070dd",
  epic: "#a335ee",
  legendary: "#ff8000"
};

const RARITY_GLOW: Record<string, string> = {
  common: "rgba(255,255,255,0.3)",
  uncommon: "rgba(30,255,0,0.4)",
  rare: "rgba(0,112,221,0.5)",
  epic: "rgba(163,53,238,0.5)",
  legendary: "rgba(255,128,0,0.6)"
};

export const ItemsLayer = memo(({ 
  width, 
  height, 
  mapWidth, 
  mapHeight, 
  camera, 
  items,
  onItemClick 
}: ItemsLayerProps) => {
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
    
    for (const item of items) {
      const x = item.x - mapWidth / 2;
      const y = item.y - mapHeight / 2;
      const bobOffset = Math.sin(time * 3 + item.x * 0.1) * 2;
      const pulseScale = 1 + Math.sin(time * 4 + item.y * 0.1) * 0.1;
      
      ctx.save();
      ctx.translate(x, y + bobOffset);
      ctx.scale(pulseScale, pulseScale);
      
      const glowColor = RARITY_GLOW[item.rarity];
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      
      const color = RARITY_COLORS[item.rarity];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      if (item.type === "gold") {
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (item.type === "potion") {
        ctx.fillStyle = "#ff4444";
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, -2);
        ctx.lineTo(4, 4);
        ctx.arc(0, 4, 4, 0, Math.PI, false);
        ctx.lineTo(-4, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === "weapon") {
        ctx.fillStyle = "#c0c0c0";
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(3, 4);
        ctx.lineTo(0, 2);
        ctx.lineTo(-3, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === "armor") {
        ctx.fillStyle = "#4a90d9";
        ctx.beginPath();
        ctx.moveTo(-5, -4);
        ctx.lineTo(5, -4);
        ctx.lineTo(6, 4);
        ctx.lineTo(0, 6);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === "gem") {
        ctx.fillStyle = "#ff69b4";
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (item.type === "scroll") {
        ctx.fillStyle = "#f5deb3";
        ctx.beginPath();
        ctx.roundRect(-4, -6, 8, 12, 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#8b4513";
        ctx.lineWidth = 0.5;
        for (let i = -3; i < 4; i += 2) {
          ctx.beginPath();
          ctx.moveTo(-2, i);
          ctx.lineTo(2, i);
          ctx.stroke();
        }
      }
      
      ctx.restore();
    }

    ctx.restore();
  }, [width, height, mapWidth, mapHeight, camera, items]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onItemClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (clickX - centerX) / camera.zoom + camera.x + mapWidth / 2;
    const worldY = (clickY - centerY) / camera.zoom + camera.y + mapHeight / 2;
    
    for (const item of items) {
      const dx = item.x - worldX;
      const dy = item.y - worldY;
      if (dx * dx + dy * dy < 100) {
        onItemClick(item);
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
        zIndex: 2,
        pointerEvents: "auto",
        cursor: "pointer"
      }}
      data-testid="items-layer"
    />
  );
});

ItemsLayer.displayName = "ItemsLayer";
