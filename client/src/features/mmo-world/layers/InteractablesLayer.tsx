import { useRef, useEffect, memo } from "react";
import type { LayerCamera } from "./LayerHost";

export interface Interactable {
  id: string;
  type: "chest" | "door" | "shrine" | "portal" | "sign" | "vendor";
  x: number;
  y: number;
  state: "closed" | "open" | "active" | "inactive";
  name?: string;
}

interface InteractablesLayerProps {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  camera: LayerCamera;
  interactables: Interactable[];
  highlightedId?: string;
  onInteract?: (interactable: Interactable) => void;
}

export const InteractablesLayer = memo(({ 
  width, 
  height, 
  mapWidth, 
  mapHeight, 
  camera, 
  interactables,
  highlightedId,
  onInteract 
}: InteractablesLayerProps) => {
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
    
    for (const obj of interactables) {
      const x = obj.x - mapWidth / 2;
      const y = obj.y - mapHeight / 2;
      const isHighlighted = obj.id === highlightedId;
      
      ctx.save();
      ctx.translate(x, y);
      
      if (isHighlighted) {
        const pulseAlpha = 0.3 + Math.sin(time * 5) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 0, ${pulseAlpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      
      if (obj.type === "chest") {
        const isOpen = obj.state === "open";
        ctx.fillStyle = "#8b4513";
        ctx.strokeStyle = "#daa520";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(-10, isOpen ? -8 : -5, 20, 12, 2);
        ctx.fill();
        ctx.stroke();
        
        if (!isOpen) {
          ctx.fillStyle = "#daa520";
          ctx.beginPath();
          ctx.arc(0, 2, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "#8b4513";
          ctx.beginPath();
          ctx.roundRect(-8, -14, 16, 8, 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (obj.type === "door") {
        const isOpen = obj.state === "open";
        ctx.fillStyle = isOpen ? "#5c4033" : "#8b4513";
        ctx.strokeStyle = "#2c1810";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.roundRect(-8, -12, 16, 24, [3, 3, 0, 0]);
        ctx.fill();
        ctx.stroke();
        
        if (!isOpen) {
          ctx.fillStyle = "#daa520";
          ctx.beginPath();
          ctx.arc(4, 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obj.type === "shrine") {
        const active = obj.state === "active";
        ctx.fillStyle = "#4a4a4a";
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, 8);
        ctx.lineTo(-10, 8);
        ctx.closePath();
        ctx.fill();
        
        if (active) {
          const glowIntensity = 0.5 + Math.sin(time * 2) * 0.3;
          const gradient = ctx.createRadialGradient(0, -4, 0, 0, -4, 15);
          gradient.addColorStop(0, `rgba(100, 200, 255, ${glowIntensity})`);
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, -4, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (obj.type === "portal") {
        const active = obj.state === "active";
        const rotation = time * 2;
        
        if (active) {
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
          gradient.addColorStop(0, "rgba(128, 0, 255, 0.8)");
          gradient.addColorStop(0.5, "rgba(200, 100, 255, 0.4)");
          gradient.addColorStop(1, "transparent");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = "rgba(200, 150, 255, 0.8)";
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            const r = 8 + i * 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, rotation + i, rotation + i + Math.PI * 1.5);
            ctx.stroke();
          }
        } else {
          ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (obj.type === "sign") {
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(-1, 0, 2, 10);
        
        ctx.fillStyle = "#deb887";
        ctx.strokeStyle = "#5c4033";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 12, 2);
        ctx.fill();
        ctx.stroke();
      } else if (obj.type === "vendor") {
        ctx.fillStyle = "#c0c0c0";
        ctx.strokeStyle = "#808080";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(-12, -4);
        ctx.lineTo(0, -10);
        ctx.lineTo(12, -4);
        ctx.lineTo(12, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(-4, 0, 8, 8);
      }
      
      ctx.restore();
    }

    ctx.restore();
  }, [width, height, mapWidth, mapHeight, camera, interactables, highlightedId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onInteract) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const worldX = (clickX - centerX) / camera.zoom + camera.x + mapWidth / 2;
    const worldY = (clickY - centerY) / camera.zoom + camera.y + mapHeight / 2;
    
    for (const obj of interactables) {
      const dx = obj.x - worldX;
      const dy = obj.y - worldY;
      if (dx * dx + dy * dy < 225) {
        onInteract(obj);
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
        zIndex: 3,
        pointerEvents: "auto",
        cursor: "pointer"
      }}
      data-testid="interactables-layer"
    />
  );
});

InteractablesLayer.displayName = "InteractablesLayer";
