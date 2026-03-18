import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Sword, Shield, Zap } from "lucide-react";
import { CLASS_WEAPON_RESTRICTIONS, CLASS_ARMOR_RESTRICTIONS } from "@/lib/mmo-systems";
import { GRUDA_WARS_HEROES } from "../../../../shared/grudaWarsHeroes";

const CLASS_DEFS: Record<string, { name: string; desc: string; playstyle: string; icon: string }> = {
  warrior: { name: "Warrior", desc: "Masters of melee combat who excel at absorbing damage and protecting allies. Warriors use heavy weapons and armor to dominate the battlefield.", playstyle: "Tank / Melee DPS", icon: "⚔️" },
  mage: { name: "Mage", desc: "Wielders of arcane power who devastate enemies from range with elemental spells. Fragile but capable of massive area damage.", playstyle: "Ranged Magic DPS", icon: "🪄" },
  rogue: { name: "Rogue", desc: "Stealthy assassins who strike from the shadows with deadly precision. High crit damage and evasion, but low durability.", playstyle: "Melee Burst DPS", icon: "🗡️" },
  ranger: { name: "Ranger", desc: "Expert marksmen who fight from distance with bows, crossbows, and nature magic. Mobile and versatile with crowd control.", playstyle: "Ranged Physical DPS", icon: "🏹" },
  cleric: { name: "Cleric", desc: "Holy warriors who heal allies and smite enemies with divine power. The backbone of any party with powerful support abilities.", playstyle: "Healer / Support", icon: "✝️" },
  worge: { name: "Worge", desc: "Shape-shifters who transform between Bear (tank), Raptor (stealth DPS), and Bird (flight/utility) forms. Incredibly versatile.", playstyle: "Hybrid / Shape-shifter", icon: "🐻" },
};

export default function ClassSkillsPage() {
  const [activeClass, setActiveClass] = useState("warrior");
  const cls = CLASS_DEFS[activeClass];
  const weapons = CLASS_WEAPON_RESTRICTIONS[activeClass] || [];
  const armors = CLASS_ARMOR_RESTRICTIONS[activeClass] || [];

  // Find matching hero from Gruda Wars heroes
  const heroMatch = GRUDA_WARS_HEROES.find(h => h.classId === activeClass);

  return (
    <div className="p-4 space-y-4">
      <Tabs value={activeClass} onValueChange={setActiveClass}>
        <TabsList className="flex-wrap h-auto gap-1">
          {Object.entries(CLASS_DEFS).map(([id, def]) => (
            <TabsTrigger key={id} value={id} className="gap-1 text-xs">
              <span>{def.icon}</span> {def.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CLASS_DEFS).map(([id, def]) => (
          <TabsContent key={id} value={id}>
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-4">
                {/* Class Overview */}
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">{def.icon}</span>
                      {def.name}
                      <Badge variant="secondary">{def.playstyle}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 space-y-3">
                    <p className="text-sm">{def.desc}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground font-medium">Allowed Weapons:</span>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {weapons.map(w => <Badge key={w} variant="outline" className="text-[9px] capitalize">{w.replace("_", " ")}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium">Allowed Armor:</span>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {armors.map(a => <Badge key={a} variant="outline" className="text-[9px] capitalize">{a}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Hero abilities (if a canonical hero exists for this class) */}
                {heroMatch && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        {heroMatch.name} — {heroMatch.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-4 space-y-3">
                      <p className="text-sm text-muted-foreground">{heroMatch.description}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Strengths:</span>
                          <ul className="list-disc list-inside mt-1">
                            {heroMatch.strengths.map(s => <li key={s}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weaknesses:</span>
                          <ul className="list-disc list-inside mt-1">
                            {heroMatch.weaknesses.map(w => <li key={w}>{w}</li>)}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t">
                        <span className="text-sm font-medium">Abilities</span>
                        {heroMatch.gdaAbilities.map(ability => (
                          <div key={ability.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                            <Zap className={`h-4 w-4 shrink-0 mt-0.5 ${ability.type === "passive" ? "text-blue-400" : "text-amber-400"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{ability.name}</span>
                                <Badge variant={ability.type === "passive" ? "secondary" : "default"} className="text-[9px] px-1 py-0">
                                  {ability.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{ability.description}</p>
                              {(ability.damage || ability.manaCost || ability.cooldown) && (
                                <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                                  {ability.damage && <span>⚔️ {ability.damage} dmg</span>}
                                  {ability.manaCost && <span>💧 {ability.manaCost} mana</span>}
                                  {ability.cooldown && <span>⏱️ {ability.cooldown}s cd</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* WCS Attributes for the hero */}
                {heroMatch && (
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base">Base Attributes (Level {heroMatch.level})</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-4">
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        {Object.entries(heroMatch.wcsAttributes).map(([stat, val]) => (
                          <div key={stat} className="flex flex-col items-center p-2 rounded bg-muted/50">
                            <span className="font-mono text-lg font-bold">{val}</span>
                            <span className="text-muted-foreground capitalize">{stat}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
