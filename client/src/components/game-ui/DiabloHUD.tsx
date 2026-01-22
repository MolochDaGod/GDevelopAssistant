import { Package, Star, Settings, MessageSquare, Map, Swords, Shield, Flame, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiabloHUDProps {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  experience: number;
  experienceToLevel: number;
  level: number;
  skillCooldowns?: Record<string, number>;
  onOpenInventory?: () => void;
  onOpenSkills?: () => void;
  onOpenSettings?: () => void;
  onOpenChat?: () => void;
  onOpenMap?: () => void;
}

function HealthOrb({ current, max, type }: { current: number; max: number; type: "health" | "mana" }) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const colorClass = type === "health" 
    ? "from-red-700 via-red-500 to-red-400" 
    : "from-blue-700 via-blue-500 to-blue-400";
  const glowClass = type === "health" ? "shadow-red-500/50" : "shadow-blue-500/50";
  const borderClass = type === "health" ? "border-red-900" : "border-blue-900";

  return (
    <div className="relative flex-shrink-0" data-testid={`orb-${type}`}>
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 ${borderClass} bg-gray-900 overflow-hidden shadow-lg ${glowClass}`}>
        <div className="absolute inset-0 flex items-end justify-center">
          <div
            className={`w-full bg-gradient-to-t ${colorClass} transition-all duration-300`}
            style={{ height: `${percentage}%` }}
          />
        </div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/10 via-transparent to-black/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-xs sm:text-sm drop-shadow-lg">{Math.floor(current)}</span>
        </div>
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-400">
        {type === "health" ? "HP" : "MP"}
      </div>
    </div>
  );
}

const SKILL_ICONS = [Swords, Shield, Flame, Heart];

function SkillSlot({ 
  index, 
  cooldown
}: { 
  index: number; 
  cooldown?: number; 
}) {
  const isOnCooldown = cooldown && cooldown > 0;
  const Icon = SKILL_ICONS[index - 1] || Swords;

  return (
    <div 
      className={`w-10 h-10 sm:w-12 sm:h-12 border-2 ${isOnCooldown ? "border-gray-600 bg-gray-800" : "border-amber-700 bg-amber-950/50"} rounded flex items-center justify-center relative cursor-pointer hover:brightness-125 transition-all`}
      data-testid={`skill-slot-${index}`}
    >
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
      {isOnCooldown && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded">
          <span className="text-white text-sm font-bold">{Math.ceil(cooldown)}</span>
        </div>
      )}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 font-bold">
        {index}
      </div>
    </div>
  );
}

export function DiabloHUD({
  health,
  maxHealth,
  mana,
  maxMana,
  experience,
  experienceToLevel,
  level,
  skillCooldowns = {},
  onOpenInventory,
  onOpenSkills,
}: DiabloHUDProps) {
  const expPercentage = (experience / experienceToLevel) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none" data-testid="diablo-hud">
      <div className="mx-auto max-w-3xl px-2 sm:px-4 pb-2">
        <div className="w-full h-1.5 bg-gray-900 rounded-full mb-1 border border-gray-700 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 transition-all duration-500"
            style={{ width: `${expPercentage}%` }}
          />
        </div>
        <div className="text-center text-xs text-gray-400 mb-1">
          Lv.{level} - {Math.floor(experience)}/{experienceToLevel} XP
        </div>

        <div 
          className="relative bg-gradient-to-t from-gray-950 via-gray-900 to-gray-800 border-t-2 border-amber-800/50 rounded-t-xl px-2 sm:px-4 py-2 pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <HealthOrb current={health} max={maxHealth} type="health" />

            <div className="flex-1 flex items-center justify-center gap-1 sm:gap-2">
              <SkillSlot index={1} cooldown={skillCooldowns["1"]} />
              <SkillSlot index={2} cooldown={skillCooldowns["2"]} />
              <SkillSlot index={3} cooldown={skillCooldowns["3"]} />
              <SkillSlot index={4} cooldown={skillCooldowns["4"]} />
              
              <div className="w-px h-8 bg-amber-800/50 mx-1 sm:mx-2 hidden sm:block" />
              
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 sm:w-10 sm:h-10 border border-amber-800/50 hover:bg-amber-900/30 hidden sm:flex"
                onClick={onOpenInventory}
                data-testid="hud-button-inventory"
              >
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 sm:w-10 sm:h-10 border border-amber-800/50 hover:bg-amber-900/30 hidden sm:flex"
                onClick={onOpenSkills}
                data-testid="hud-button-skills"
              >
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
              </Button>
            </div>

            <HealthOrb current={mana} max={maxMana} type="mana" />
          </div>
        </div>
      </div>
    </div>
  );
}
