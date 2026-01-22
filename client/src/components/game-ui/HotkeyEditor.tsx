import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Keyboard, 
  Mouse, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Upload,
  Play,
  RotateCcw,
  Settings2,
  Gamepad2,
  MoveHorizontal,
  MoveVertical,
  RotateCw
} from "lucide-react";

export interface HotkeyBinding {
  id: string;
  key: string;
  keyDisplay: string;
  animation: string;
  action: "play" | "toggle" | "hold";
  category: "movement" | "combat" | "interaction" | "camera" | "custom";
}

export interface MotionBinding {
  id: string;
  input: "mouseX" | "mouseY" | "scrollY" | "wasd";
  target: "rotation" | "position" | "zoom" | "movement";
  sensitivity: number;
  inverted: boolean;
}

interface HotkeyEditorProps {
  animations: string[];
  currentAnimation: string | null;
  onPlayAnimation: (name: string) => void;
  onSaveConfig?: (config: { hotkeys: HotkeyBinding[]; motion: MotionBinding[] }) => void;
  onLoadConfig?: () => { hotkeys: HotkeyBinding[]; motion: MotionBinding[] } | null;
}

const DEFAULT_HOTKEYS: HotkeyBinding[] = [
  { id: "1", key: "KeyW", keyDisplay: "W", animation: "walk", action: "hold", category: "movement" },
  { id: "2", key: "KeyS", keyDisplay: "S", animation: "walk_back", action: "hold", category: "movement" },
  { id: "3", key: "KeyA", keyDisplay: "A", animation: "strafe_left", action: "hold", category: "movement" },
  { id: "4", key: "KeyD", keyDisplay: "D", animation: "strafe_right", action: "hold", category: "movement" },
  { id: "5", key: "Space", keyDisplay: "Space", animation: "jump", action: "play", category: "movement" },
  { id: "6", key: "ShiftLeft", keyDisplay: "Shift", animation: "run", action: "hold", category: "movement" },
  { id: "7", key: "Mouse0", keyDisplay: "LMB", animation: "attack", action: "play", category: "combat" },
  { id: "8", key: "Mouse2", keyDisplay: "RMB", animation: "block", action: "hold", category: "combat" },
  { id: "9", key: "KeyE", keyDisplay: "E", animation: "interact", action: "play", category: "interaction" },
  { id: "10", key: "KeyQ", keyDisplay: "Q", animation: "special", action: "play", category: "combat" },
];

const DEFAULT_MOTION: MotionBinding[] = [
  { id: "1", input: "mouseX", target: "rotation", sensitivity: 1.0, inverted: false },
  { id: "2", input: "mouseY", target: "rotation", sensitivity: 0.8, inverted: false },
  { id: "3", input: "scrollY", target: "zoom", sensitivity: 1.0, inverted: false },
  { id: "4", input: "wasd", target: "movement", sensitivity: 1.0, inverted: false },
];

const CATEGORIES = [
  { id: "movement", name: "Movement", color: "bg-blue-500" },
  { id: "combat", name: "Combat", color: "bg-red-500" },
  { id: "interaction", name: "Interaction", color: "bg-green-500" },
  { id: "camera", name: "Camera", color: "bg-purple-500" },
  { id: "custom", name: "Custom", color: "bg-orange-500" },
];

const ACTIONS = [
  { id: "play", name: "Play Once", description: "Triggers animation once on keypress" },
  { id: "toggle", name: "Toggle", description: "Toggle animation on/off" },
  { id: "hold", name: "Hold", description: "Play while key is held" },
];

export function HotkeyEditor({ 
  animations, 
  currentAnimation, 
  onPlayAnimation,
  onSaveConfig,
  onLoadConfig 
}: HotkeyEditorProps) {
  const [hotkeys, setHotkeys] = useState<HotkeyBinding[]>(DEFAULT_HOTKEYS);
  const [motionBindings, setMotionBindings] = useState<MotionBinding[]>(DEFAULT_MOTION);
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null);
  const [listeningForKey, setListeningForKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"hotkeys" | "motion">("hotkeys");
  const [configName, setConfigName] = useState("default");

  const handleKeyCapture = useCallback((e: KeyboardEvent) => {
    if (!listeningForKey || !editingHotkey) return;
    e.preventDefault();
    
    const keyDisplay = e.code === "Space" ? "Space" : 
                       e.code.startsWith("Key") ? e.code.replace("Key", "") :
                       e.code.startsWith("Digit") ? e.code.replace("Digit", "") :
                       e.code.replace("Left", "").replace("Right", "");
    
    setHotkeys(prev => prev.map(h => 
      h.id === editingHotkey 
        ? { ...h, key: e.code, keyDisplay } 
        : h
    ));
    setListeningForKey(false);
    setEditingHotkey(null);
  }, [listeningForKey, editingHotkey]);

  const handleMouseCapture = useCallback((e: MouseEvent) => {
    if (!listeningForKey || !editingHotkey) return;
    e.preventDefault();
    
    const keyDisplay = e.button === 0 ? "LMB" : e.button === 1 ? "MMB" : "RMB";
    const key = `Mouse${e.button}`;
    
    setHotkeys(prev => prev.map(h => 
      h.id === editingHotkey 
        ? { ...h, key, keyDisplay } 
        : h
    ));
    setListeningForKey(false);
    setEditingHotkey(null);
  }, [listeningForKey, editingHotkey]);

  useEffect(() => {
    if (listeningForKey) {
      window.addEventListener("keydown", handleKeyCapture);
      window.addEventListener("mousedown", handleMouseCapture);
      return () => {
        window.removeEventListener("keydown", handleKeyCapture);
        window.removeEventListener("mousedown", handleMouseCapture);
      };
    }
  }, [listeningForKey, handleKeyCapture, handleMouseCapture]);

  const addHotkey = () => {
    const newId = String(Date.now());
    setHotkeys(prev => [...prev, {
      id: newId,
      key: "",
      keyDisplay: "Click to bind",
      animation: animations[0] || "idle",
      action: "play",
      category: "custom"
    }]);
  };

  const removeHotkey = (id: string) => {
    setHotkeys(prev => prev.filter(h => h.id !== id));
  };

  const updateHotkey = (id: string, updates: Partial<HotkeyBinding>) => {
    setHotkeys(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const addMotionBinding = () => {
    const newId = String(Date.now());
    setMotionBindings(prev => [...prev, {
      id: newId,
      input: "mouseX",
      target: "rotation",
      sensitivity: 1.0,
      inverted: false
    }]);
  };

  const removeMotionBinding = (id: string) => {
    setMotionBindings(prev => prev.filter(m => m.id !== id));
  };

  const updateMotionBinding = (id: string, updates: Partial<MotionBinding>) => {
    setMotionBindings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const exportConfig = () => {
    const config = { hotkeys, motion: motionBindings, name: configName };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${configName}-hotkeys.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        if (config.hotkeys) setHotkeys(config.hotkeys);
        if (config.motion) setMotionBindings(config.motion);
        if (config.name) setConfigName(config.name);
      } catch (err) {
        console.error("Failed to parse config:", err);
      }
    };
    reader.readAsText(file);
  };

  const resetToDefaults = () => {
    setHotkeys(DEFAULT_HOTKEYS);
    setMotionBindings(DEFAULT_MOTION);
  };

  const testAnimation = (animation: string) => {
    onPlayAnimation(animation);
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.id === category)?.color || "bg-gray-500";
  };

  return (
    <Card className="border-2 border-primary/20 bg-background/95" data-testid="hotkey-editor">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Hotkey Editor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Input 
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              className="w-32 h-8 text-sm"
              placeholder="Config name"
              data-testid="input-config-name"
            />
            <Button size="sm" variant="outline" onClick={exportConfig} data-testid="button-export-config">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <label>
              <Button size="sm" variant="outline" asChild data-testid="button-import-config">
                <span>
                  <Upload className="w-4 h-4 mr-1" />
                  Import
                </span>
              </Button>
              <input type="file" accept=".json" onChange={importConfig} className="hidden" />
            </label>
            <Button size="sm" variant="ghost" onClick={resetToDefaults} data-testid="button-reset-defaults">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <CardDescription>Map keyboard and mouse buttons to character animations</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2 border-b pb-2">
          <Button 
            variant={activeTab === "hotkeys" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("hotkeys")}
            data-testid="tab-hotkeys"
          >
            <Keyboard className="w-4 h-4 mr-1" />
            Hotkeys
          </Button>
          <Button 
            variant={activeTab === "motion" ? "default" : "ghost"} 
            size="sm"
            onClick={() => setActiveTab("motion")}
            data-testid="tab-motion"
          >
            <Mouse className="w-4 h-4 mr-1" />
            Motion Controls
          </Button>
        </div>

        {activeTab === "hotkeys" && (
          <>
            <div className="flex flex-wrap gap-1 mb-2">
              {CATEGORIES.map(cat => (
                <Badge key={cat.id} variant="outline" className="text-xs">
                  <div className={`w-2 h-2 rounded-full ${cat.color} mr-1`} />
                  {cat.name}
                </Badge>
              ))}
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-2">
                {hotkeys.map(hotkey => (
                  <div 
                    key={hotkey.id} 
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card hover-elevate"
                    data-testid={`hotkey-row-${hotkey.id}`}
                  >
                    <div className={`w-1 h-8 rounded-full ${getCategoryColor(hotkey.category)}`} />
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className={`w-20 font-mono ${listeningForKey && editingHotkey === hotkey.id ? "ring-2 ring-primary animate-pulse" : ""}`}
                      onClick={() => {
                        setEditingHotkey(hotkey.id);
                        setListeningForKey(true);
                      }}
                      data-testid={`button-bind-key-${hotkey.id}`}
                    >
                      {hotkey.keyDisplay || "Bind"}
                    </Button>

                    <Select 
                      value={hotkey.animation} 
                      onValueChange={(v) => updateHotkey(hotkey.id, { animation: v })}
                    >
                      <SelectTrigger className="w-36 h-8" data-testid={`select-animation-${hotkey.id}`}>
                        <SelectValue placeholder="Animation" />
                      </SelectTrigger>
                      <SelectContent>
                        {animations.length > 0 ? animations.map(anim => (
                          <SelectItem key={anim} value={anim}>{anim}</SelectItem>
                        )) : (
                          <>
                            <SelectItem value="idle">idle</SelectItem>
                            <SelectItem value="walk">walk</SelectItem>
                            <SelectItem value="run">run</SelectItem>
                            <SelectItem value="attack">attack</SelectItem>
                            <SelectItem value="jump">jump</SelectItem>
                            <SelectItem value="block">block</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={hotkey.action} 
                      onValueChange={(v) => updateHotkey(hotkey.id, { action: v as HotkeyBinding["action"] })}
                    >
                      <SelectTrigger className="w-24 h-8" data-testid={`select-action-${hotkey.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map(action => (
                          <SelectItem key={action.id} value={action.id}>{action.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={hotkey.category} 
                      onValueChange={(v) => updateHotkey(hotkey.id, { category: v as HotkeyBinding["category"] })}
                    >
                      <SelectTrigger className="w-28 h-8" data-testid={`select-category-${hotkey.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => testAnimation(hotkey.animation)}
                      className="shrink-0"
                      data-testid={`button-test-${hotkey.id}`}
                    >
                      <Play className="w-4 h-4" />
                    </Button>

                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeHotkey(hotkey.id)}
                      className="shrink-0 text-destructive hover:text-destructive"
                      data-testid={`button-delete-${hotkey.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button variant="outline" onClick={addHotkey} className="w-full" data-testid="button-add-hotkey">
              <Plus className="w-4 h-4 mr-1" />
              Add Hotkey Binding
            </Button>
          </>
        )}

        {activeTab === "motion" && (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              Configure how mouse and keyboard movement controls the character
            </div>

            <ScrollArea className="h-64">
              <div className="space-y-3">
                {motionBindings.map(binding => (
                  <div 
                    key={binding.id} 
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    data-testid={`motion-row-${binding.id}`}
                  >
                    <div className="flex items-center gap-2 w-28">
                      {binding.input === "mouseX" && <MoveHorizontal className="w-4 h-4" />}
                      {binding.input === "mouseY" && <MoveVertical className="w-4 h-4" />}
                      {binding.input === "scrollY" && <Mouse className="w-4 h-4" />}
                      {binding.input === "wasd" && <Keyboard className="w-4 h-4" />}
                      
                      <Select 
                        value={binding.input} 
                        onValueChange={(v) => updateMotionBinding(binding.id, { input: v as MotionBinding["input"] })}
                      >
                        <SelectTrigger className="h-8" data-testid={`select-input-${binding.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mouseX">Mouse X</SelectItem>
                          <SelectItem value="mouseY">Mouse Y</SelectItem>
                          <SelectItem value="scrollY">Scroll</SelectItem>
                          <SelectItem value="wasd">WASD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <span className="text-muted-foreground">→</span>

                    <div className="flex items-center gap-2 w-28">
                      {binding.target === "rotation" && <RotateCw className="w-4 h-4" />}
                      {binding.target === "position" && <MoveHorizontal className="w-4 h-4" />}
                      {binding.target === "zoom" && <Settings2 className="w-4 h-4" />}
                      {binding.target === "movement" && <Gamepad2 className="w-4 h-4" />}
                      
                      <Select 
                        value={binding.target} 
                        onValueChange={(v) => updateMotionBinding(binding.id, { target: v as MotionBinding["target"] })}
                      >
                        <SelectTrigger className="h-8" data-testid={`select-target-${binding.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rotation">Rotation</SelectItem>
                          <SelectItem value="position">Position</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                          <SelectItem value="movement">Movement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Sensitivity</Label>
                      <Input 
                        type="number"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={binding.sensitivity}
                        onChange={(e) => updateMotionBinding(binding.id, { sensitivity: parseFloat(e.target.value) || 1 })}
                        className="w-16 h-8"
                        data-testid={`input-sensitivity-${binding.id}`}
                      />
                    </div>

                    <Button 
                      variant={binding.inverted ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateMotionBinding(binding.id, { inverted: !binding.inverted })}
                      data-testid={`button-invert-${binding.id}`}
                    >
                      Invert
                    </Button>

                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeMotionBinding(binding.id)}
                      className="shrink-0 text-destructive hover:text-destructive"
                      data-testid={`button-delete-motion-${binding.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button variant="outline" onClick={addMotionBinding} className="w-full" data-testid="button-add-motion">
              <Plus className="w-4 h-4 mr-1" />
              Add Motion Binding
            </Button>
          </>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {hotkeys.length} hotkeys, {motionBindings.length} motion bindings
          </div>
          <Button 
            onClick={() => onSaveConfig?.({ hotkeys, motion: motionBindings })}
            data-testid="button-save-config"
          >
            <Save className="w-4 h-4 mr-1" />
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

