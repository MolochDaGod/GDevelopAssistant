import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mountain, 
  Waves, 
  Trees, 
  Brush, 
  Eraser,
  ArrowUp,
  ArrowDown,
  Minus,
  Grid3X3,
  Save,
  Download,
  RotateCcw,
  Eye,
  Layers,
  Maximize2
} from "lucide-react";

interface TerrainCell {
  type: TerrainType;
  height: number;
}

type TerrainType = "grass" | "dirt" | "water" | "rock" | "sand" | "snow" | "forest" | "void";

type EditorTool = "paint" | "raise" | "lower" | "flatten" | "smooth" | "eraser";

interface MapEditorProps {
  width: number;
  height: number;
  onSave?: (mapData: { tiles: TerrainCell[][]; heightmap: number[][] }) => void;
  initialTiles?: TerrainCell[][];
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: "#4ade80",
  dirt: "#a16207",
  water: "#3b82f6",
  rock: "#71717a",
  sand: "#fbbf24",
  snow: "#f1f5f9",
  forest: "#166534",
  void: "#18181b",
};

const TERRAIN_ICONS: Record<TerrainType, React.ReactNode> = {
  grass: <Trees className="h-4 w-4" />,
  dirt: <Mountain className="h-4 w-4" />,
  water: <Waves className="h-4 w-4" />,
  rock: <Mountain className="h-4 w-4" />,
  sand: <Waves className="h-4 w-4" />,
  snow: <Mountain className="h-4 w-4" />,
  forest: <Trees className="h-4 w-4" />,
  void: <Grid3X3 className="h-4 w-4" />,
};

const TOOL_ICONS: Record<EditorTool, React.ReactNode> = {
  paint: <Brush className="h-4 w-4" />,
  raise: <ArrowUp className="h-4 w-4" />,
  lower: <ArrowDown className="h-4 w-4" />,
  flatten: <Minus className="h-4 w-4" />,
  smooth: <Layers className="h-4 w-4" />,
  eraser: <Eraser className="h-4 w-4" />,
};

export function RTSMapEditor({ width, height, onSave, initialTiles }: MapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heightmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tiles, setTiles] = useState<TerrainCell[][]>(() => {
    if (initialTiles) return initialTiles;
    return Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => ({ type: "grass" as TerrainType, height: 0.5 }))
    );
  });
  
  const [selectedTool, setSelectedTool] = useState<EditorTool>("paint");
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>("grass");
  const [brushSize, setBrushSize] = useState(1);
  const [brushStrength, setBrushStrength] = useState(0.1);
  const [showHeightmap, setShowHeightmap] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  const cellSize = Math.max(8, Math.min(16, Math.floor(600 / Math.max(width, height)))) * zoom;

  const initializeMap = useCallback(() => {
    const newTiles = Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => ({ type: "grass" as TerrainType, height: 0.5 }))
    );
    setTiles(newTiles);
  }, [width, height]);

  const applyBrush = useCallback((centerX: number, centerY: number) => {
    setTiles(prevTiles => {
      const newTiles = prevTiles.map(row => row.map(cell => ({ ...cell })));
      
      for (let dy = -brushSize + 1; dy < brushSize; dy++) {
        for (let dx = -brushSize + 1; dx < brushSize; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x < 0 || x >= width || y < 0 || y >= height) continue;
          
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= brushSize) continue;
          
          const falloff = 1 - (distance / brushSize);
          
          switch (selectedTool) {
            case "paint":
              newTiles[y][x].type = selectedTerrain;
              break;
            case "raise":
              newTiles[y][x].height = Math.min(1, newTiles[y][x].height + brushStrength * falloff);
              break;
            case "lower":
              newTiles[y][x].height = Math.max(0, newTiles[y][x].height - brushStrength * falloff);
              break;
            case "flatten":
              newTiles[y][x].height = 0.5;
              break;
            case "smooth": {
              let sum = 0;
              let count = 0;
              for (let sy = -1; sy <= 1; sy++) {
                for (let sx = -1; sx <= 1; sx++) {
                  const nx = x + sx;
                  const ny = y + sy;
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    sum += prevTiles[ny][nx].height;
                    count++;
                  }
                }
              }
              newTiles[y][x].height = sum / count;
              break;
            }
            case "eraser":
              newTiles[y][x].type = "void";
              newTiles[y][x].height = 0;
              break;
          }
        }
      }
      
      return newTiles;
    });
  }, [selectedTool, selectedTerrain, brushSize, brushStrength, width, height]);

  const handleMouseEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>, isDown: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    if (isDown || isDrawing) {
      applyBrush(x, y);
    }
  }, [cellSize, width, height, isDrawing, applyBrush]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;
    
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = tiles[y][x];
        const baseColor = TERRAIN_COLORS[cell.type];
        
        const heightFactor = 0.5 + cell.height * 0.5;
        ctx.fillStyle = showHeightmap 
          ? `rgb(${Math.floor(cell.height * 255)}, ${Math.floor(cell.height * 255)}, ${Math.floor(cell.height * 255)})`
          : baseColor;
        
        ctx.globalAlpha = showHeightmap ? 1 : heightFactor;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.globalAlpha = 1;
        
        if (showGrid) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [tiles, cellSize, width, height, showHeightmap, showGrid]);

  const renderHeightmapPreview = useCallback(() => {
    const canvas = heightmapCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = width;
    canvas.height = height;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const heightVal = Math.floor(tiles[y][x].height * 255);
        ctx.fillStyle = `rgb(${heightVal}, ${heightVal}, ${heightVal})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [tiles, width, height]);

  useEffect(() => {
    renderCanvas();
    renderHeightmapPreview();
  }, [renderCanvas, renderHeightmapPreview]);

  const exportHeightmap = () => {
    const canvas = heightmapCanvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement("a");
    link.download = "heightmap.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const exportMapData = () => {
    const heightmap = tiles.map(row => row.map(cell => cell.height));
    const mapData = {
      width,
      height,
      tiles: tiles.map(row => row.map(cell => ({ type: cell.type, height: cell.height }))),
      heightmap,
    };
    
    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = "map_data.json";
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const handleSave = () => {
    if (onSave) {
      const heightmap = tiles.map(row => row.map(cell => cell.height));
      onSave({ tiles, heightmap });
    }
  };

  const generatePerlinNoise = () => {
    const mapWidth = width;
    const mapHeight = height;
    const newTiles = tiles.map((row, y) => 
      row.map((cell, x) => {
        const nx = x / mapWidth;
        const ny = y / mapHeight;
        const noise = Math.sin(nx * 10) * Math.cos(ny * 10) * 0.5 + 0.5;
        const elevationValue = (Math.sin(nx * 4 + ny * 3) * 0.3 + noise * 0.7);
        
        let type: TerrainType = "grass";
        if (elevationValue < 0.3) type = "water";
        else if (elevationValue < 0.4) type = "sand";
        else if (elevationValue < 0.6) type = "grass";
        else if (elevationValue < 0.75) type = "forest";
        else if (elevationValue < 0.85) type = "rock";
        else type = "snow";
        
        return { type, height: Math.max(0, Math.min(1, elevationValue)) };
      })
    );
    setTiles(newTiles);
  };

  return (
    <div className="flex gap-4" data-testid="rts-map-editor">
      <div className="flex-1">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Terrain Editor</CardTitle>
                <CardDescription>{width}x{height} grid</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant={showGrid ? "default" : "outline"}
                  onClick={() => setShowGrid(!showGrid)}
                  data-testid="button-toggle-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant={showHeightmap ? "default" : "outline"}
                  onClick={() => setShowHeightmap(!showHeightmap)}
                  data-testid="button-toggle-heightmap"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Height
                </Button>
                <Select value={String(zoom)} onValueChange={(v) => setZoom(Number(v))}>
                  <SelectTrigger className="w-20" data-testid="select-zoom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">50%</SelectItem>
                    <SelectItem value="1">100%</SelectItem>
                    <SelectItem value="1.5">150%</SelectItem>
                    <SelectItem value="2">200%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className="overflow-auto border border-border rounded-lg bg-black p-2"
              style={{ maxHeight: "500px" }}
            >
              <canvas
                ref={canvasRef}
                className="cursor-crosshair"
                onMouseDown={(e) => {
                  setIsDrawing(true);
                  handleMouseEvent(e, true);
                }}
                onMouseMove={(e) => handleMouseEvent(e, false)}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                data-testid="canvas-map-editor"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-72 space-y-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={selectedTool} onValueChange={(v) => setSelectedTool(v as EditorTool)}>
              <TabsList className="grid grid-cols-3 gap-1">
                {(["paint", "raise", "lower", "flatten", "smooth", "eraser"] as EditorTool[]).map((tool) => (
                  <TabsTrigger 
                    key={tool} 
                    value={tool}
                    className="text-xs capitalize"
                    data-testid={`tool-${tool}`}
                  >
                    {TOOL_ICONS[tool]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {selectedTool === "paint" && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Terrain Type</label>
                <div className="grid grid-cols-4 gap-1">
                  {(Object.keys(TERRAIN_COLORS) as TerrainType[]).map((terrain) => (
                    <Button
                      key={terrain}
                      size="sm"
                      variant={selectedTerrain === terrain ? "default" : "outline"}
                      className="h-8 w-8 p-0"
                      style={{ 
                        backgroundColor: selectedTerrain === terrain ? TERRAIN_COLORS[terrain] : undefined,
                        borderColor: TERRAIN_COLORS[terrain]
                      }}
                      onClick={() => setSelectedTerrain(terrain)}
                      title={terrain}
                      data-testid={`terrain-${terrain}`}
                    >
                      <div 
                        className="w-4 h-4 rounded-sm" 
                        style={{ backgroundColor: TERRAIN_COLORS[terrain] }}
                      />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Brush Size</span>
                <Badge variant="outline">{brushSize}</Badge>
              </div>
              <Slider
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                min={1}
                max={10}
                step={1}
                data-testid="slider-brush-size"
              />
            </div>

            {(selectedTool === "raise" || selectedTool === "lower") && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Strength</span>
                  <Badge variant="outline">{(brushStrength * 100).toFixed(0)}%</Badge>
                </div>
                <Slider
                  value={[brushStrength]}
                  onValueChange={([v]) => setBrushStrength(v)}
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  data-testid="slider-brush-strength"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Heightmap Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <canvas 
              ref={heightmapCanvasRef}
              className="w-full border border-border rounded"
              style={{ imageRendering: "pixelated" }}
            />
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full bg-red-600 hover:bg-red-700" 
              onClick={handleSave}
              data-testid="button-save-map"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Map
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={generatePerlinNoise}
              data-testid="button-generate-terrain"
            >
              <Mountain className="h-4 w-4 mr-2" />
              Generate Terrain
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={exportHeightmap}
                data-testid="button-export-heightmap"
              >
                <Download className="h-4 w-4 mr-1" />
                PNG
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={exportMapData}
                data-testid="button-export-json"
              >
                <Download className="h-4 w-4 mr-1" />
                JSON
              </Button>
            </div>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={initializeMap}
              data-testid="button-reset-map"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Map
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
