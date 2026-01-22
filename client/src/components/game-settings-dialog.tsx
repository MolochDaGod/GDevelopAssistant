import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface GameSettings {
  startingResources?: { gold: number; wood: number; food: number };
  maxPlayers?: number;
  fogOfWar?: boolean;
  winConditions?: string[];
  gameSpeed?: number;
  populationLimit?: number;
  heroesEnabled?: boolean;
  creepsEnabled?: boolean;
}

interface GameSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: GameSettings;
  onSave: (settings: GameSettings) => void;
}

export function GameSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: GameSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<GameSettings>({
    startingResources: { gold: 0, wood: 0, food: 0 },
    gameSpeed: 1.0,
    populationLimit: 100,
    fogOfWar: true,
    heroesEnabled: true,
    creepsEnabled: true,
    ...settings,
  });

  useEffect(() => {
    if (open) {
      setLocalSettings({
        startingResources: { gold: 0, wood: 0, food: 0 },
        gameSpeed: 1.0,
        populationLimit: 100,
        fogOfWar: true,
        heroesEnabled: true,
        creepsEnabled: true,
        ...settings,
      });
    }
  }, [open, settings]);

  const handleSave = () => {
    onSave(localSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[500px]" data-testid="dialog-game-settings">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Customize your RTS game experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="font-medium">Starting Resources</h4>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gold">Gold</Label>
                <Input
                  id="gold"
                  type="number"
                  value={localSettings.startingResources?.gold || 0}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      startingResources: {
                        ...(localSettings.startingResources || { gold: 0, wood: 0, food: 0 }),
                        gold: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-starting-gold"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wood">Wood</Label>
                <Input
                  id="wood"
                  type="number"
                  value={localSettings.startingResources?.wood || 0}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      startingResources: {
                        ...(localSettings.startingResources || { gold: 0, wood: 0, food: 0 }),
                        wood: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-starting-wood"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="food">Food</Label>
                <Input
                  id="food"
                  type="number"
                  value={localSettings.startingResources?.food || 0}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      startingResources: {
                        ...(localSettings.startingResources || { gold: 0, wood: 0, food: 0 }),
                        food: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  data-testid="input-starting-food"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-speed">Game Speed: {localSettings.gameSpeed?.toFixed(1) || "1.0"}x</Label>
            <Slider
              id="game-speed"
              min={0.5}
              max={3}
              step={0.1}
              value={[localSettings.gameSpeed || 1.0]}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, gameSpeed: value[0] })
              }
              data-testid="slider-game-speed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="population-limit">Population Limit: {localSettings.populationLimit || 100}</Label>
            <Slider
              id="population-limit"
              min={50}
              max={200}
              step={10}
              value={[localSettings.populationLimit || 100]}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, populationLimit: value[0] })
              }
              data-testid="slider-population-limit"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="fog-of-war">Fog of War</Label>
            <Switch
              id="fog-of-war"
              checked={localSettings.fogOfWar !== false}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, fogOfWar: checked })
              }
              data-testid="switch-fog-of-war"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="heroes-enabled">Heroes Enabled</Label>
            <Switch
              id="heroes-enabled"
              checked={localSettings.heroesEnabled !== false}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, heroesEnabled: checked })
              }
              data-testid="switch-heroes-enabled"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="creeps-enabled">Creeps Enabled</Label>
            <Switch
              id="creeps-enabled"
              checked={localSettings.creepsEnabled !== false}
              onCheckedChange={(checked) =>
                setLocalSettings({ ...localSettings, creepsEnabled: checked })
              }
              data-testid="switch-creeps-enabled"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-settings">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
