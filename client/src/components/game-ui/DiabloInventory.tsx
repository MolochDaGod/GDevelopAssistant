import { useState, useCallback } from "react";
import { X, Sword, Shield, Crown, Shirt, Footprints, CircleDot, Sparkles, Gem, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface GameItem {
  id: string;
  name: string;
  type: "weapon" | "shield" | "helmet" | "armor" | "boots" | "ring" | "amulet" | "consumable" | "misc";
  rarity: "common" | "magic" | "rare" | "legendary";
  icon?: string;
  stats?: Record<string, number>;
  description?: string;
  stackable?: boolean;
  quantity?: number;
}

export interface EquipmentSlots {
  helmet?: GameItem;
  armor?: GameItem;
  weapon?: GameItem;
  shield?: GameItem;
  boots?: GameItem;
  ring1?: GameItem;
  ring2?: GameItem;
  amulet?: GameItem;
}

interface DiabloInventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: GameItem[];
  equipment: EquipmentSlots;
  gold: number;
  characterName: string;
  characterClass: string;
  level: number;
  stats: {
    strength: number;
    dexterity: number;
    intelligence: number;
    vitality: number;
  };
  onEquipItem?: (item: GameItem, slot: keyof EquipmentSlots) => void;
  onUnequipItem?: (slot: keyof EquipmentSlots) => void;
  onUseItem?: (item: GameItem) => void;
  onDropItem?: (item: GameItem) => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-300 border-gray-500",
  magic: "text-blue-400 border-blue-500",
  rare: "text-yellow-400 border-yellow-500",
  legendary: "text-orange-400 border-orange-500",
};

const RARITY_BG: Record<string, string> = {
  common: "bg-gray-900/80",
  magic: "bg-blue-900/40",
  rare: "bg-yellow-900/40",
  legendary: "bg-orange-900/40",
};

const SLOT_ICONS: Record<string, typeof Sword> = {
  helmet: Crown,
  armor: Shirt,
  weapon: Sword,
  shield: Shield,
  boots: Footprints,
  ring1: CircleDot,
  ring2: CircleDot,
  amulet: Gem,
};

function ItemSlot({
  item,
  slotType,
  onClick,
  size = "normal",
}: {
  item?: GameItem;
  slotType?: string;
  onClick?: () => void;
  size?: "normal" | "small";
}) {
  const Icon = slotType ? SLOT_ICONS[slotType] || Package : Package;
  const sizeClass = size === "small" ? "w-10 h-10" : "w-14 h-14";

  if (!item) {
    return (
      <div
        className={`${sizeClass} border-2 border-dashed border-gray-600 rounded bg-black/60 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors`}
        onClick={onClick}
        data-testid={`slot-empty-${slotType}`}
      >
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} border-2 ${RARITY_COLORS[item.rarity]} ${RARITY_BG[item.rarity]} rounded flex items-center justify-center cursor-pointer hover:brightness-125 transition-all relative group`}
      onClick={onClick}
      data-testid={`slot-${slotType}-${item.id}`}
    >
      {item.icon ? (
        <img src={item.icon} alt={item.name} className="w-full h-full object-contain p-1" style={{ imageRendering: "pixelated" }} />
      ) : (
        <Icon className="w-6 h-6" />
      )}
      {item.stackable && item.quantity && item.quantity > 1 && (
        <span className="absolute bottom-0 right-0.5 text-xs font-bold text-white bg-black/70 px-1 rounded">
          {item.quantity}
        </span>
      )}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className={`bg-black/95 border ${RARITY_COLORS[item.rarity]} rounded p-2 min-w-32 text-xs shadow-lg`}>
          <p className={`font-bold ${RARITY_COLORS[item.rarity].split(" ")[0]}`}>{item.name}</p>
          <p className="text-gray-400 capitalize">{item.type}</p>
          {item.stats && Object.entries(item.stats).map(([stat, value]) => (
            <p key={stat} className="text-green-400">+{value} {stat}</p>
          ))}
          {item.description && <p className="text-gray-300 mt-1 italic">{item.description}</p>}
        </div>
      </div>
    </div>
  );
}

export function DiabloInventory({
  isOpen,
  onClose,
  inventory,
  equipment,
  gold,
  characterName,
  characterClass,
  level,
  stats,
  onEquipItem,
  onUnequipItem,
  onUseItem,
}: DiabloInventoryProps) {
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);
  const [activeTab, setActiveTab] = useState<"inventory" | "character">("inventory");

  const handleItemClick = useCallback((item: GameItem) => {
    setSelectedItem(selectedItem?.id === item.id ? null : item);
  }, [selectedItem]);

  const handleEquip = useCallback(() => {
    if (!selectedItem || !onEquipItem) return;
    const slotMap: Record<string, keyof EquipmentSlots> = {
      helmet: "helmet",
      armor: "armor",
      weapon: "weapon",
      shield: "shield",
      boots: "boots",
      ring: "ring1",
      amulet: "amulet",
    };
    const slot = slotMap[selectedItem.type];
    if (slot) {
      onEquipItem(selectedItem, slot);
      setSelectedItem(null);
    }
  }, [selectedItem, onEquipItem]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="diablo-inventory-overlay">
      <div
        className="w-full max-w-4xl bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-amber-800/50 rounded-lg shadow-2xl overflow-hidden"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23422006\" fill-opacity=\"0.1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
        }}
      >
        <div className="flex items-center justify-between p-3 border-b border-amber-900/50 bg-gradient-to-r from-amber-950/50 via-transparent to-amber-950/50">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === "inventory" ? "default" : "ghost"}
              onClick={() => setActiveTab("inventory")}
              className="text-xs"
              data-testid="tab-inventory"
            >
              <Package className="w-4 h-4 mr-1" />
              Inventory
            </Button>
            <Button
              size="sm"
              variant={activeTab === "character" ? "default" : "ghost"}
              onClick={() => setActiveTab("character")}
              className="text-xs"
              data-testid="tab-character"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Character
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-yellow-400 border-yellow-600">
              <Gem className="w-3 h-3 mr-1" />
              {gold.toLocaleString()} Gold
            </Badge>
            <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-inventory">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex min-h-[500px]">
          <div className="w-64 border-r border-amber-900/30 p-4 bg-black/40">
            <div className="text-center mb-4">
              <div className="w-24 h-24 mx-auto border-2 border-amber-700 rounded bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center mb-2 overflow-hidden">
                <img
                  src={`/game-assets/2d-rpg/GrudgeRPGAssets2d/Characters(100x100)/Knight/Knight/Knight-Idle.png`}
                  alt="Character"
                  className="w-full h-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <p className="font-bold text-amber-200">{characterName}</p>
              <p className="text-xs text-gray-400 capitalize">{characterClass} - Level {level}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="col-start-2">
                <ItemSlot item={equipment.helmet} slotType="helmet" onClick={() => equipment.helmet && onUnequipItem?.("helmet")} />
              </div>
              <div className="col-start-1">
                <ItemSlot item={equipment.weapon} slotType="weapon" onClick={() => equipment.weapon && onUnequipItem?.("weapon")} />
              </div>
              <div className="col-start-2">
                <ItemSlot item={equipment.armor} slotType="armor" onClick={() => equipment.armor && onUnequipItem?.("armor")} />
              </div>
              <div className="col-start-3">
                <ItemSlot item={equipment.shield} slotType="shield" onClick={() => equipment.shield && onUnequipItem?.("shield")} />
              </div>
              <div className="col-start-2">
                <ItemSlot item={equipment.boots} slotType="boots" onClick={() => equipment.boots && onUnequipItem?.("boots")} />
              </div>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              <ItemSlot item={equipment.ring1} slotType="ring1" size="small" onClick={() => equipment.ring1 && onUnequipItem?.("ring1")} />
              <ItemSlot item={equipment.amulet} slotType="amulet" size="small" onClick={() => equipment.amulet && onUnequipItem?.("amulet")} />
              <ItemSlot item={equipment.ring2} slotType="ring2" size="small" onClick={() => equipment.ring2 && onUnequipItem?.("ring2")} />
            </div>

            <div className="space-y-1 text-xs border-t border-amber-900/30 pt-3">
              <div className="flex justify-between">
                <span className="text-red-400">Strength</span>
                <span className="font-bold">{stats.strength}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">Dexterity</span>
                <span className="font-bold">{stats.dexterity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">Intelligence</span>
                <span className="font-bold">{stats.intelligence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-400">Vitality</span>
                <span className="font-bold">{stats.vitality}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4">
            {activeTab === "inventory" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-amber-200">Backpack ({inventory.length}/40)</h3>
                  {selectedItem && (
                    <div className="flex gap-2">
                      {["weapon", "shield", "helmet", "armor", "boots", "ring", "amulet"].includes(selectedItem.type) && (
                        <Button size="sm" variant="outline" onClick={handleEquip} className="text-xs" data-testid="button-equip">
                          Equip
                        </Button>
                      )}
                      {selectedItem.type === "consumable" && (
                        <Button size="sm" variant="outline" onClick={() => onUseItem?.(selectedItem)} className="text-xs" data-testid="button-use">
                          Use
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <ScrollArea className="h-[380px]">
                  <div className="grid grid-cols-8 gap-1">
                    {Array.from({ length: 40 }).map((_, i) => {
                      const item = inventory[i];
                      return (
                        <div
                          key={i}
                          className={`w-12 h-12 border ${item ? `${RARITY_COLORS[item.rarity]} ${RARITY_BG[item.rarity]}` : "border-gray-700 bg-black/60"} rounded flex items-center justify-center cursor-pointer transition-all ${selectedItem?.id === item?.id ? "ring-2 ring-white" : "hover:brightness-125"}`}
                          onClick={() => item && handleItemClick(item)}
                          data-testid={`inventory-slot-${i}`}
                        >
                          {item ? (
                            <div className="relative w-full h-full p-1">
                              {item.icon ? (
                                <img src={item.icon} alt={item.name} className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
                              ) : (
                                <Package className="w-full h-full text-gray-400" />
                              )}
                              {item.stackable && item.quantity && item.quantity > 1 && (
                                <span className="absolute bottom-0 right-0 text-xs font-bold text-white bg-black/70 px-0.5 rounded">
                                  {item.quantity}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {selectedItem && (
                  <div className={`mt-3 p-3 border ${RARITY_COLORS[selectedItem.rarity]} ${RARITY_BG[selectedItem.rarity]} rounded`}>
                    <p className={`font-bold ${RARITY_COLORS[selectedItem.rarity].split(" ")[0]}`}>{selectedItem.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{selectedItem.rarity} {selectedItem.type}</p>
                    {selectedItem.stats && (
                      <div className="mt-1 text-xs">
                        {Object.entries(selectedItem.stats).map(([stat, value]) => (
                          <span key={stat} className="text-green-400 mr-2">+{value} {stat}</span>
                        ))}
                      </div>
                    )}
                    {selectedItem.description && (
                      <p className="text-xs text-gray-300 mt-1 italic">{selectedItem.description}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "character" && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-200">Character Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-amber-900/30 rounded p-3">
                    <h4 className="text-xs text-gray-400 mb-2">Primary Attributes</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-red-400 text-sm">Strength</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${Math.min(stats.strength * 5, 100)}%` }} />
                          </div>
                          <span className="text-sm font-bold w-8 text-right">{stats.strength}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-400 text-sm">Dexterity</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${Math.min(stats.dexterity * 5, 100)}%` }} />
                          </div>
                          <span className="text-sm font-bold w-8 text-right">{stats.dexterity}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-400 text-sm">Intelligence</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${Math.min(stats.intelligence * 5, 100)}%` }} />
                          </div>
                          <span className="text-sm font-bold w-8 text-right">{stats.intelligence}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-400 text-sm">Vitality</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded overflow-hidden">
                            <div className="h-full bg-yellow-500" style={{ width: `${Math.min(stats.vitality * 5, 100)}%` }} />
                          </div>
                          <span className="text-sm font-bold w-8 text-right">{stats.vitality}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black/40 border border-amber-900/30 rounded p-3">
                    <h4 className="text-xs text-gray-400 mb-2">Derived Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Physical Damage</span>
                        <span className="text-white font-bold">{10 + stats.strength * 2}-{15 + stats.strength * 3}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Attack Speed</span>
                        <span className="text-white font-bold">{(1 + stats.dexterity * 0.02).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Magic Power</span>
                        <span className="text-white font-bold">{stats.intelligence * 3}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Max Health</span>
                        <span className="text-white font-bold">{100 + stats.vitality * 10}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Defense</span>
                        <span className="text-white font-bold">{stats.vitality + Math.floor(stats.strength / 2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
