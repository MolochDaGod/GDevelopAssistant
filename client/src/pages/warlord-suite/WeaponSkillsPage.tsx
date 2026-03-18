import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sword, ChevronRight, Shield, Target } from "lucide-react";
import { WEAPON_TYPES, CLASS_WEAPON_RESTRICTIONS, makeWeapon, TIER_NAMES, TIER_COLORS, type EquipmentTier } from "@/lib/mmo-systems";

const WEAPON_ICONS: Record<string, string> = {
  sword: "⚔️", shield: "🛡️", "2h_sword": "🗡️", staff: "🪄", tome: "📖",
  wand: "✨", mace: "🔨", dagger: "🗡️", bow: "🏹", crossbow: "🎯",
  spear: "🔱", hammer: "⚒️",
};

const WEAPON_SKILLS: Record<string, { name: string; level: number; desc: string }[]> = {
  sword:      [{ name: "Slash", level: 1, desc: "Basic sword swing" }, { name: "Parry", level: 5, desc: "Block incoming attack, riposte for 150% damage" }, { name: "Whirlwind", level: 15, desc: "Spin attack hitting all nearby enemies" }, { name: "Blade Dance", level: 30, desc: "Chain 5 rapid strikes with increasing damage" }],
  "2h_sword": [{ name: "Cleave", level: 1, desc: "Wide arc attack" }, { name: "Overhead Slam", level: 5, desc: "Heavy downward strike, stuns for 1s" }, { name: "Executioner", level: 15, desc: "Massive damage to targets below 30% HP" }, { name: "Titan's Edge", level: 30, desc: "Empowered strikes ignore 50% of armor" }],
  dagger:     [{ name: "Quick Stab", level: 1, desc: "Fast puncture attack" }, { name: "Backstab", level: 5, desc: "200% damage from behind" }, { name: "Fan of Knives", level: 15, desc: "Throw daggers in all directions" }, { name: "Shadow Strike", level: 30, desc: "Teleport behind target and deal 300% damage" }],
  bow:        [{ name: "Aimed Shot", level: 1, desc: "Basic ranged attack" }, { name: "Multi-Shot", level: 5, desc: "Fire 3 arrows in a spread" }, { name: "Rain of Arrows", level: 15, desc: "Area denial, arrows rain for 4s" }, { name: "Eagle's Fury", level: 30, desc: "Rapid-fire 8 arrows at a single target" }],
  crossbow:   [{ name: "Bolt Shot", level: 1, desc: "Heavy single bolt" }, { name: "Piercing Bolt", level: 5, desc: "Bolt penetrates through enemies" }, { name: "Explosive Bolt", level: 15, desc: "Bolt explodes on impact for AoE" }, { name: "Siege Shot", level: 30, desc: "Massive bolt deals 400% damage, long cooldown" }],
  staff:      [{ name: "Arcane Bolt", level: 1, desc: "Basic magic projectile" }, { name: "Staff Strike", level: 5, desc: "Melee swing that knocks back" }, { name: "Conduit", level: 15, desc: "Channel mana, next spell deals 200% damage" }, { name: "Ley Line Burst", level: 30, desc: "Devastating AoE magic explosion" }],
  wand:       [{ name: "Magic Missile", level: 1, desc: "Auto-targeting projectile" }, { name: "Drain Life", level: 5, desc: "Steal HP equal to damage dealt" }, { name: "Arcane Barrage", level: 15, desc: "Fire 5 homing missiles" }, { name: "Disintegrate", level: 30, desc: "Beam that deals continuous damage" }],
  mace:       [{ name: "Crush", level: 1, desc: "Blunt force strike" }, { name: "Holy Strike", level: 5, desc: "Infuse mace with light, bonus holy damage" }, { name: "Shockwave", level: 15, desc: "Ground slam sends a wave forward" }, { name: "Judgment", level: 30, desc: "Divine strike that heals allies near the target" }],
  tome:       [{ name: "Read Passage", level: 1, desc: "Buff ally with tome's enchantment" }, { name: "Ward", level: 5, desc: "Create a protective barrier on an ally" }, { name: "Mass Insight", level: 15, desc: "Buff entire party's spell damage by 20%" }, { name: "Grimoire Unleashed", level: 30, desc: "Unleash all stored spells at once" }],
  spear:      [{ name: "Thrust", level: 1, desc: "Long-range forward stab" }, { name: "Sweep", level: 5, desc: "Low sweep that trips enemies" }, { name: "Impale", level: 15, desc: "Pin target in place for 3s" }, { name: "Dragon Lance", level: 30, desc: "Leaping strike from distance, massive damage" }],
  hammer:     [{ name: "Smash", level: 1, desc: "Overhead hammer blow" }, { name: "Ground Pound", level: 5, desc: "AoE stun in small radius" }, { name: "Seismic Strike", level: 15, desc: "Earth splits beneath enemies in a line" }, { name: "Worldbreaker", level: 30, desc: "Catastrophic AoE, massive damage + stun" }],
  shield:     [{ name: "Block", level: 1, desc: "Raise shield to negate damage" }, { name: "Shield Bash", level: 5, desc: "Stun target for 1.5s" }, { name: "Bulwark", level: 15, desc: "Become immovable, reflect projectiles" }, { name: "Fortress", level: 30, desc: "Shield all nearby allies for 50% of incoming damage" }],
};

function tierHex(tier: EquipmentTier): string {
  return "#" + TIER_COLORS[tier].toString(16).padStart(6, "0");
}

export default function WeaponSkillsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-4">
      <ScrollArea className="h-[calc(100vh-160px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {WEAPON_TYPES.map(type => {
            const classes = Object.entries(CLASS_WEAPON_RESTRICTIONS)
              .filter(([, weapons]) => weapons.includes(type))
              .map(([cls]) => cls);
            const skills = WEAPON_SKILLS[type] || [];
            const isExpanded = expanded === type;
            const sample = makeWeapon(type, 3);

            return (
              <Card key={type} className="overflow-hidden cursor-pointer" onClick={() => setExpanded(isExpanded ? null : type)}>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-lg">{WEAPON_ICONS[type] || "⚔️"}</span>
                    <span className="capitalize flex-1">{type.replace("_", " ")}</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3 space-y-2 text-xs">
                  <div className="flex gap-1 flex-wrap">
                    {classes.map(c => <Badge key={c} variant="secondary" className="text-[9px] px-1 py-0">{c}</Badge>)}
                  </div>
                  <div className="text-muted-foreground">
                    Base: {sample.baseDamage} dmg · {sample.attackSpeed}/s · {sample.range}px range
                  </div>
                  {isExpanded && (
                    <div className="space-y-1.5 pt-2 border-t">
                      {skills.map((skill, i) => (
                        <div key={skill.name} className="flex items-start gap-2">
                          <Badge
                            variant="outline"
                            className="text-[9px] shrink-0 mt-0.5"
                            style={{ color: tierHex(Math.min(5, Math.floor(i * 1.5)) as EquipmentTier) }}
                          >
                            Lv {skill.level}
                          </Badge>
                          <div>
                            <div className="font-medium">{skill.name}</div>
                            <div className="text-muted-foreground">{skill.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
