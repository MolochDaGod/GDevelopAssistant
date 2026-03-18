import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Sword, Gem } from "lucide-react";
import {
  WEAPON_TYPES, EQUIPMENT_SLOTS, TIER_NAMES, TIER_COLORS,
  CLASS_WEAPON_RESTRICTIONS, CLASS_ARMOR_RESTRICTIONS,
  makeWeapon, makeArmor,
  type EquipmentTier, type ArmorWeight, type WeaponDef, type ArmorDef,
} from "@/lib/mmo-systems";

const ALL_TIERS: EquipmentTier[] = [0, 1, 2, 3, 4, 5];
const ARMOR_WEIGHTS: ArmorWeight[] = ["cloth", "leather", "metal"];
const ARMOR_SLOTS = ["Head", "Chest", "Legs", "Feet", "Shoulder", "Hands", "Back"] as const;
const CLASSES = Object.keys(CLASS_WEAPON_RESTRICTIONS);

function tierHex(tier: EquipmentTier): string {
  return "#" + TIER_COLORS[tier].toString(16).padStart(6, "0");
}

export default function ArsenalPage() {
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  const weapons = useMemo(() => {
    const list: WeaponDef[] = [];
    for (const type of WEAPON_TYPES) {
      for (const tier of ALL_TIERS) {
        list.push(makeWeapon(type, tier));
      }
    }
    return list.filter(w => {
      if (tierFilter !== "all" && w.tier !== Number(tierFilter)) return false;
      if (classFilter !== "all" && !w.classes.includes(classFilter)) return false;
      return true;
    });
  }, [tierFilter, classFilter]);

  const armors = useMemo(() => {
    const list: ArmorDef[] = [];
    for (const slot of ARMOR_SLOTS) {
      for (const weight of ARMOR_WEIGHTS) {
        for (const tier of ALL_TIERS) {
          list.push(makeArmor(slot, weight, tier));
        }
      }
    }
    return list.filter(a => {
      if (tierFilter !== "all" && a.tier !== Number(tierFilter)) return false;
      if (classFilter !== "all" && !a.classes.includes(classFilter)) return false;
      return true;
    });
  }, [tierFilter, classFilter]);

  return (
    <div className="p-4 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {ALL_TIERS.map(t => <SelectItem key={t} value={String(t)}>{TIER_NAMES[t]} (T{t})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASSES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{weapons.length} weapons · {armors.length} armor pieces</span>
      </div>

      <Tabs defaultValue="weapons">
        <TabsList>
          <TabsTrigger value="weapons" className="gap-1"><Sword className="h-3 w-3" /> Weapons ({weapons.length})</TabsTrigger>
          <TabsTrigger value="armor" className="gap-1"><Shield className="h-3 w-3" /> Armor ({armors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="weapons">
          <ScrollArea className="h-[calc(100vh-260px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {weapons.map(w => (
                <Card key={w.id} className="overflow-hidden">
                  <CardHeader className="py-2 px-3" style={{ borderLeft: `3px solid ${tierHex(w.tier)}` }}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{w.name}</span>
                      <Badge variant="outline" style={{ color: tierHex(w.tier), borderColor: tierHex(w.tier) }}>
                        T{w.tier}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Damage</span><span className="font-mono">{w.baseDamage}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Speed</span><span className="font-mono">{w.attackSpeed}/s</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Range</span><span className="font-mono">{w.range}px</span></div>
                    <div className="flex gap-1 flex-wrap pt-1">
                      {w.classes.map(c => <Badge key={c} variant="secondary" className="text-[9px] px-1 py-0">{c}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="armor">
          <ScrollArea className="h-[calc(100vh-260px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {armors.map(a => (
                <Card key={a.id} className="overflow-hidden">
                  <CardHeader className="py-2 px-3" style={{ borderLeft: `3px solid ${tierHex(a.tier)}` }}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{a.name}</span>
                      <Badge variant="outline" style={{ color: tierHex(a.tier), borderColor: tierHex(a.tier) }}>
                        T{a.tier}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Defense</span><span className="font-mono">{a.defense}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Slot</span><span>{a.slot}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Weight</span><span className="capitalize">{a.weight}</span></div>
                    <div className="flex gap-1 flex-wrap pt-1">
                      {a.classes.map(c => <Badge key={c} variant="secondary" className="text-[9px] px-1 py-0">{c}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
