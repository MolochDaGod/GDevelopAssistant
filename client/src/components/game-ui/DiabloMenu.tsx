import { useState } from "react";
import { X, Zap, Sword, Shield, Heart, Star, Book, Settings, LogOut, Volume2, VolumeX, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  level: number;
  maxLevel: number;
  unlocked: boolean;
  manaCost: number;
  cooldown: number;
  type: "active" | "passive";
}

interface DiabloMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: "skills" | "settings" | "help";
  skills: Skill[];
  skillPoints: number;
  onUpgradeSkill?: (skillId: string) => void;
  onLogout?: () => void;
}

const DEFAULT_SKILLS: Skill[] = [
  { id: "slash", name: "Slash", description: "A quick sword attack that deals physical damage", icon: Sword, level: 1, maxLevel: 10, unlocked: true, manaCost: 5, cooldown: 0.5, type: "active" },
  { id: "shield_bash", name: "Shield Bash", description: "Bash enemies with your shield, stunning them", icon: Shield, level: 0, maxLevel: 5, unlocked: true, manaCost: 15, cooldown: 4, type: "active" },
  { id: "fireball", name: "Fireball", description: "Hurl a ball of fire at enemies", icon: Zap, level: 0, maxLevel: 10, unlocked: true, manaCost: 20, cooldown: 1.5, type: "active" },
  { id: "heal", name: "Heal", description: "Restore health over time", icon: Heart, level: 0, maxLevel: 5, unlocked: true, manaCost: 30, cooldown: 10, type: "active" },
  { id: "vitality", name: "Vitality", description: "Increase maximum health", icon: Heart, level: 0, maxLevel: 10, unlocked: true, manaCost: 0, cooldown: 0, type: "passive" },
  { id: "strength", name: "Power Strike", description: "Increase physical damage", icon: Sword, level: 0, maxLevel: 10, unlocked: true, manaCost: 0, cooldown: 0, type: "passive" },
];

export function DiabloMenu({
  isOpen,
  onClose,
  activeTab: initialTab = "skills",
  skills = DEFAULT_SKILLS,
  skillPoints = 5,
  onUpgradeSkill,
  onLogout,
}: DiabloMenuProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [soundVolume, setSoundVolume] = useState([70]);
  const [musicVolume, setMusicVolume] = useState([50]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);
  const [screenShake, setScreenShake] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" data-testid="diablo-menu-overlay">
      <div
        className="w-full max-w-2xl bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-800/50 rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23422006\" fill-opacity=\"0.1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
        }}
      >
        <div className="flex items-center justify-between p-3 border-b border-amber-900/50 bg-gradient-to-r from-amber-950/50 via-transparent to-amber-950/50">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={activeTab === "skills" ? "default" : "ghost"}
              onClick={() => setActiveTab("skills")}
              className="text-xs"
              data-testid="menu-tab-skills"
            >
              <Star className="w-4 h-4 mr-1" />
              Skills
            </Button>
            <Button
              size="sm"
              variant={activeTab === "settings" ? "default" : "ghost"}
              onClick={() => setActiveTab("settings")}
              className="text-xs"
              data-testid="menu-tab-settings"
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
            <Button
              size="sm"
              variant={activeTab === "help" ? "default" : "ghost"}
              onClick={() => setActiveTab("help")}
              className="text-xs"
              data-testid="menu-tab-help"
            >
              <Book className="w-4 h-4 mr-1" />
              Help
            </Button>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-menu">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="min-h-[400px] p-4">
          {activeTab === "skills" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-amber-200">Skill Tree</h3>
                <div className="text-sm text-amber-400">
                  Available Points: <span className="font-bold">{skillPoints}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Active Skills</h4>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-2 pr-2">
                      {skills.filter(s => s.type === "active").map(skill => {
                        const Icon = skill.icon;
                        const canUpgrade = skillPoints > 0 && skill.level < skill.maxLevel && skill.unlocked;
                        return (
                          <div
                            key={skill.id}
                            className={`p-3 rounded border ${skill.level > 0 ? "bg-amber-900/20 border-amber-700/50" : "bg-gray-900/50 border-gray-700/50"} transition-all`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded border-2 ${skill.level > 0 ? "border-amber-500 bg-amber-900/30" : "border-gray-600 bg-gray-800"} flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${skill.level > 0 ? "text-amber-400" : "text-gray-500"}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className={`font-semibold text-sm ${skill.level > 0 ? "text-amber-200" : "text-gray-400"}`}>{skill.name}</span>
                                  <span className="text-xs text-gray-400">{skill.level}/{skill.maxLevel}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{skill.description}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs">
                                  <span className="text-blue-400">Mana: {skill.manaCost}</span>
                                  <span className="text-yellow-400">CD: {skill.cooldown}s</span>
                                </div>
                              </div>
                              {canUpgrade && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => onUpgradeSkill?.(skill.id)}
                                  data-testid={`upgrade-skill-${skill.id}`}
                                >
                                  +
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <div>
                  <h4 className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Passive Skills</h4>
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-2 pr-2">
                      {skills.filter(s => s.type === "passive").map(skill => {
                        const Icon = skill.icon;
                        const canUpgrade = skillPoints > 0 && skill.level < skill.maxLevel && skill.unlocked;
                        return (
                          <div
                            key={skill.id}
                            className={`p-3 rounded border ${skill.level > 0 ? "bg-green-900/20 border-green-700/50" : "bg-gray-900/50 border-gray-700/50"} transition-all`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded border-2 ${skill.level > 0 ? "border-green-500 bg-green-900/30" : "border-gray-600 bg-gray-800"} flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 ${skill.level > 0 ? "text-green-400" : "text-gray-500"}`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className={`font-semibold text-sm ${skill.level > 0 ? "text-green-200" : "text-gray-400"}`}>{skill.name}</span>
                                  <span className="text-xs text-gray-400">{skill.level}/{skill.maxLevel}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">{skill.description}</p>
                              </div>
                              {canUpgrade && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7"
                                  onClick={() => onUpgradeSkill?.(skill.id)}
                                  data-testid={`upgrade-skill-${skill.id}`}
                                >
                                  +
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-amber-200 mb-4">Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-gray-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm">Sound Effects</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={soundVolume}
                      onValueChange={setSoundVolume}
                      max={100}
                      step={1}
                      className="w-32"
                      disabled={!soundEnabled}
                    />
                    <span className="text-xs text-gray-400 w-8">{soundVolume}%</span>
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} data-testid="toggle-sound" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Music Volume</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={musicVolume}
                      onValueChange={setMusicVolume}
                      max={100}
                      step={1}
                      className="w-32"
                    />
                    <span className="text-xs text-gray-400 w-8">{musicVolume}%</span>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {darkMode ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
                      <span className="text-sm">Dark Mode</span>
                    </div>
                    <Switch checked={darkMode} onCheckedChange={setDarkMode} data-testid="toggle-darkmode" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Show Damage Numbers</span>
                  <Switch checked={showDamageNumbers} onCheckedChange={setShowDamageNumbers} data-testid="toggle-damage-numbers" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Screen Shake</span>
                  <Switch checked={screenShake} onCheckedChange={setScreenShake} data-testid="toggle-screen-shake" />
                </div>
              </div>

              <div className="border-t border-gray-800 pt-4">
                <Button variant="destructive" className="w-full" onClick={onLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Exit to Main Menu
                </Button>
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div>
              <h3 className="text-lg font-bold text-amber-200 mb-4">How to Play</h3>
              <ScrollArea className="h-[320px]">
                <div className="space-y-4 text-sm text-gray-300 pr-4">
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Movement</h4>
                    <p>Use <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">W</kbd> <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">A</kbd> <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">S</kbd> <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">D</kbd> or arrow keys to move your character around the world.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Combat</h4>
                    <p>Click on enemies to attack them. Use skills from your skill bar (1-4 keys) to deal extra damage or heal yourself.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Inventory</h4>
                    <p>Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">I</kbd> to open your inventory. Drag items to equipment slots to equip them, or right-click to use consumables.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Skills</h4>
                    <p>Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">K</kbd> to open the skill tree. Spend skill points to unlock and upgrade abilities.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Chat</h4>
                    <p>Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Enter</kbd> to open chat and communicate with other players in your world.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-200 mb-1">Trading</h4>
                    <p>Approach NPC merchants or other players to trade items and gold.</p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
