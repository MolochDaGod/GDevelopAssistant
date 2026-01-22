import { useRef, useEffect, memo } from "react";
import type { LayerCamera } from "./LayerHost";

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  type: "damage" | "heal" | "critical" | "miss" | "xp";
  createdAt: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
  duration: number;
}

export interface TargetIndicator {
  x: number;
  y: number;
  type: "friendly" | "enemy" | "neutral";
}

interface UILayerProps {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  camera: LayerCamera;
  damageNumbers: DamageNumber[];
  floatingTexts: FloatingText[];
  targetIndicator?: TargetIndicator;
  cursorWorldPos?: { x: number; y: number };
}

const DAMAGE_COLORS: Record<string, string> = {
  damage: "#ff4444",
  heal: "#44ff44",
  critical: "#ff8800",
  miss: "#aaaaaa",
  xp: "#ffff00"
};

const TARGET_COLORS: Record<string, string> = {
  friendly: "#44ff44",
  enemy: "#ff4444",
  neutral: "#ffff44"
};

export const UILayer = memo(({ 
  width, 
  height, 
  mapWidth, 
  mapHeight, 
  camera, 
  damageNumbers,
  floatingTexts,
  targetIndicator,
  cursorWorldPos
}: UILayerProps) => {
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

    const now = Date.now();

    if (targetIndicator) {
      const tx = targetIndicator.x - mapWidth / 2;
      const ty = targetIndicator.y - mapHeight / 2;
      const time = now / 1000;
      const pulse = 1 + Math.sin(time * 5) * 0.1;
      const rotation = time * 2;
      
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(rotation);
      
      ctx.strokeStyle = TARGET_COLORS[targetIndicator.type];
      ctx.lineWidth = 2;
      
      const corners = [
        [-12 * pulse, -12 * pulse],
        [12 * pulse, -12 * pulse],
        [12 * pulse, 12 * pulse],
        [-12 * pulse, 12 * pulse]
      ];
      
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        if (cx < 0 && cy < 0) {
          ctx.moveTo(cx + 6, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + 6);
        } else if (cx > 0 && cy < 0) {
          ctx.moveTo(cx - 6, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + 6);
        } else if (cx > 0 && cy > 0) {
          ctx.moveTo(cx - 6, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy - 6);
        } else {
          ctx.moveTo(cx + 6, cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy - 6);
        }
        ctx.stroke();
      }
      
      ctx.restore();
    }

    for (const dmg of damageNumbers) {
      const age = (now - dmg.createdAt) / 1000;
      if (age > 1.5) continue;
      
      const x = dmg.x - mapWidth / 2;
      const y = dmg.y - mapHeight / 2 - age * 30;
      const alpha = Math.max(0, 1 - age / 1.5);
      const scale = dmg.type === "critical" ? 1.5 : 1;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      
      ctx.font = dmg.type === "critical" ? "bold 16px Arial" : "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      const color = DAMAGE_COLORS[dmg.type];
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
      ctx.fillText(dmg.type === "miss" ? "MISS" : `${dmg.value}`, 1, 1);
      
      ctx.fillStyle = color.replace(")", `, ${alpha})`).replace("rgb", "rgba").replace("#", "");
      if (color.startsWith("#")) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      
      ctx.fillText(dmg.type === "miss" ? "MISS" : dmg.type === "xp" ? `+${dmg.value} XP` : `${dmg.value}`, 0, 0);
      
      ctx.restore();
    }

    for (const text of floatingTexts) {
      const age = (now - text.createdAt) / 1000;
      if (age > text.duration) continue;
      
      const x = text.x - mapWidth / 2;
      const y = text.y - mapHeight / 2 - age * 20;
      const alpha = Math.max(0, 1 - age / text.duration);
      
      ctx.save();
      ctx.translate(x, y);
      
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.strokeText(text.text, 0, 0);
      
      const color = text.color;
      if (color.startsWith("#")) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillText(text.text, 0, 0);
      
      ctx.restore();
    }

    if (cursorWorldPos) {
      const cx = cursorWorldPos.x - mapWidth / 2;
      const cy = cursorWorldPos.y - mapHeight / 2;
      
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    }

    ctx.restore();
  }, [width, height, mapWidth, mapHeight, camera, damageNumbers, floatingTexts, targetIndicator, cursorWorldPos]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 10,
        pointerEvents: "none"
      }}
      data-testid="ui-layer"
    />
  );
});

UILayer.displayName = "UILayer";
