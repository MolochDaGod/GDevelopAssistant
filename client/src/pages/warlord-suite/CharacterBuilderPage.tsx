import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { deriveCombatStats, CLASS_WEAPON_RESTRICTIONS, CLASS_ARMOR_RESTRICTIONS } from "@/lib/mmo-systems";
import type { WCSHeroAttributes } from "../../../../shared/grudachain";
import { RotateCcw, User, Shield, Sword, Heart, Zap } from "lucide-react";

const RACES = [
  { id: "human", name: "Human", icon: "🧑", bonus: "Balanced — +1 to all stats" },
  { id: "elf", name: "Elf", icon: "🧝", bonus: "+3 Intellect, +2 Agility" },
  { id: "dwarf", name: "Dwarf", icon: "⛏️", bonus: "+3 Endurance, +2 Vitality" },
  { id: "orc", name: "Orc", icon: "👹", bonus: "+3 Strength, +2 Vitality" },
  { id: "undead", name: "Undead", icon: "💀", bonus: "+3 Wisdom, +2 Intellect" },
  { id: "worge", name: "Worge", icon: "🐻", bonus: "+2 Strength, +2 Agility, +1 Endurance" },
];

const CLASSES = [
  { id: "warrior", name: "Warrior", icon: "⚔️", playstyle: "Tank / Melee DPS" },
  { id: "mage", name: "Mage", icon: "🪄", playstyle: "Ranged Magic DPS" },
  { id: "rogue", name: "Rogue", icon: "🗡️", playstyle: "Melee Burst DPS" },
  { id: "ranger", name: "Ranger", icon: "🏹", playstyle: "Ranged Physical DPS" },
  { id: "cleric", name: "Cleric", icon: "✝️", playstyle: "Healer / Support" },
  { id: "worge", name: "Worge", icon: "🐻", playstyle: "Hybrid / Shape-shifter" },
];

const STAT_KEYS: (keyof WCSHeroAttributes)[] = [
  "strength", "vitality", "endurance", "intellect", "wisdom", "dexterity", "agility", "tactics",
];

const STAT_DESC: Record<string, string> = {
  strength: "Physical damage, carry capacity",
  vitality: "Max HP, HP regen",
  endurance: "Defense, stamina, max HP",
  intellect: "Spell damage, max mana",
  wisdom: "Mana regen, cast speed, defense",
  dexterity: "Crit chance, attack speed",
  agility: "Dodge, move speed, attack speed",
  tactics: "Ability cooldown reduction, combo efficiency",
};

const RACE_BONUSES: Record<string, Partial<WCSHeroAttributes>> = {
  human: { strength: 1, vitality: 1, endurance: 1, intellect: 1, wisdom: 1, dexterity: 1, agility: 1, tactics: 1 },
  elf: { intellect: 3, agility: 2 },
  dwarf: { endurance: 3, vitality: 2 },
  orc: { strength: 3, vitality: 2 },
  undead: { wisdom: 3, intellect: 2 },
  worge: { strength: 2, agility: 2, endurance: 1 },
};

const BASE_POINTS = 5;
const TOTAL_POOL = 30;

export default function CharacterBuilderPage() {
  const [race, setRace] = useState("human");
  const [classId, setClassId] = useState("warrior");
  const [level, setLevel] = useState(1);
  const [allocated, setAllocated] = useState<WCSHeroAttributes>({
    strength: 5, vitality: 5, endurance: 5, intellect: 5,
    wisdom: 5, dexterity: 5, agility: 5, tactics: 5,
  });

  const pointsUsed = Object.values(allocated).reduce((s, v) => s + (v - BASE_POINTS), 0);
  const pointsLeft = TOTAL_POOL - pointsUsed;

  const finalAttrs = useMemo<WCSHeroAttributes>(() => {
    const bonus = RACE_BONUSES[race] || {};
    const result = {} as WCSHeroAttributes;
    for (const k of STAT_KEYS) {
      result[k] = allocated[k] + (bonus[k] || 0);
    }
    return result;
  }, [allocated, race]);

  const derived = useMemo(() => deriveCombatStats(finalAttrs, level), [finalAttrs, level]);
  const weapons = CLASS_WEAPON_RESTRICTIONS[classId] || [];
  const armors = CLASS_ARMOR_RESTRICTIONS[classId] || [];

  const setStat = useCallback((key: keyof WCSHeroAttributes, val: number) => {
    setAllocated(prev => {
      const diff = val - prev[key];
      const currentUsed = Object.values(prev).reduce((s, v) => s + (v - BASE_POINTS), 0);
      if (currentUsed + diff > TOTAL_POOL) return prev;
      return { ...prev, [key]: Math.max(BASE_POINTS, val) };
    });
  }, []);

  const resetStats = () => {
    setAllocated({
      strength: 5, vitality: 5, endurance: 5, intellect: 5,
      wisdom: 5, dexterity: 5, agility: 5, tactics: 5,
    });
    setLevel(1);
  };

  return (
    <div className="p-4 space-y-4">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-4">
          {/* Race Selector */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> Race
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="grid grid-cols-3 gap-2">
                {RACES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setRace(r.id)}
                    className={`p-2 rounded border text-left text-xs transition-colors ${
                      race === r.id ? "border-primary bg-primary/10" : "border-muted hover:border-muted-foreground/50"
                    }`}
                  >
                    <span className="text-lg">{r.icon}</span>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.bonus}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Class Selector */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Sword className="h-4 w-4" /> Class
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="grid grid-cols-3 gap-2">
                {CLASSES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setClassId(c.id)}
                    className={`p-2 rounded border text-left text-xs transition-colors ${
                      classId === c.id ? "border-primary bg-primary/10" : "border-muted hover:border-muted-foreground/50"
                    }`}
                  >
                    <span className="text-lg">{c.icon}</span>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.playstyle}</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 flex-wrap mt-3 text-[10px]">
                <span className="text-muted-foreground">Weapons:</span>
                {weapons.map(w => <Badge key={w} variant="outline" className="text-[9px] capitalize">{w.replace("_", " ")}</Badge>)}
                <span className="text-muted-foreground ml-2">Armor:</span>
                {armors.map(a => <Badge key={a} variant="outline" className="text-[9px] capitalize">{a}</Badge>)}
              </div>
            </CardContent>
          </Card>

          {/* Stat Allocator */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Attributes</span>
                <span className="text-sm font-normal">
                  Points: <span className={pointsLeft === 0 ? "text-green-500" : "text-amber-400"}>{pointsLeft}</span> / {TOTAL_POOL}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-3">
              {/* Level slider */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground w-16">Level</span>
                <Slider
                  min={1} max={25} step={1}
                  value={[level]}
                  onValueChange={([v]) => setLevel(v)}
                  className="flex-1"
                />
                <span className="font-mono w-6 text-right">{level}</span>
              </div>

              <div className="border-t pt-2" />

              {STAT_KEYS.map(key => {
                const bonus = (RACE_BONUSES[race] || {})[key] || 0;
                return (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <span className="w-20 capitalize font-medium">{key}</span>
                    <Slider
                      min={BASE_POINTS} max={BASE_POINTS + TOTAL_POOL} step={1}
                      value={[allocated[key]]}
                      onValueChange={([v]) => setStat(key, v)}
                      className="flex-1"
                    />
                    <span className="font-mono w-6 text-right">{allocated[key]}</span>
                    {bonus > 0 && <Badge variant="secondary" className="text-[9px] px-1">+{bonus}</Badge>}
                    <span className="font-mono w-6 text-right text-primary">{finalAttrs[key]}</span>
                  </div>
                );
              })}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={resetStats}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Derived Combat Stats */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Derived Combat Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {([
                  ["Max HP", derived.maxHp, "❤️"],
                  ["Max Mana", derived.maxMana, "💧"],
                  ["Physical Damage", derived.physicalDamage, "⚔️"],
                  ["Spell Damage", derived.spellDamage, "✨"],
                  ["Defense", derived.defense, "🛡️"],
                  ["Crit Chance", `${derived.critChance}%`, "🎯"],
                  ["Dodge Chance", `${derived.dodgeChance}%`, "💨"],
                  ["Attack Speed", `${derived.attackSpeed}/s`, "⚡"],
                  ["Cast Speed Bonus", `${derived.castSpeedBonus}%`, "🪄"],
                  ["Move Speed", derived.moveSpeed, "🏃"],
                ] as [string, string | number, string][]).map(([label, value, icon]) => (
                  <div key={label} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <span>{icon}</span>
                    <span className="text-muted-foreground flex-1">{label}</span>
                    <span className="font-mono font-bold">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
