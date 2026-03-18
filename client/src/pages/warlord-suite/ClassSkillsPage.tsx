import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CLASS_SKILL_TREES, CLASS_IDS,
} from "../../../../shared/wcs/definitions/classSkillTrees";
import {
  ATTRIBUTES, ATTRIBUTE_IDS,
  type AttributeDefinition,
} from "../../../../shared/wcs/attributeSystem";
import {
  CLASS_ALLOWED_WEAPONS, CLASS_ALLOWED_ARMOR,
} from "../../../../shared/wcs/classWeaponRestrictions";
import { CLASS_DISPLAY_NAMES, type ClassId } from "../../../../shared/wcs/gameConstants";

const CLASS_META: Record<string, { icon: string; desc: string; playstyle: string }> = {
  warrior: { icon: "⚔️", desc: "Masters of melee combat who excel at absorbing damage and protecting allies. Warriors use heavy weapons and armor to dominate the battlefield.", playstyle: "Tank / Melee DPS" },
  mage:    { icon: "🪄", desc: "Wielders of arcane power who devastate enemies from range with elemental spells. Fragile but capable of massive area damage.", playstyle: "Ranged Magic DPS" },
  ranger:  { icon: "🏹", desc: "Expert marksmen who fight from distance with bows, crossbows, and nature magic. Mobile and versatile with crowd control.", playstyle: "Ranged Physical DPS" },
  worge:   { icon: "🐻", desc: "Shape-shifters who transform between Bear (tank), Raptor (stealth DPS), and Bird (flight/utility) forms. Incredibly versatile.", playstyle: "Hybrid / Shape-shifter" },
};

// Map canonical class IDs — classSkillTrees uses 'worge', gameConstants uses 'worg'
function getWeaponClassId(cls: string): ClassId {
  return (cls === "worge" ? "worg" : cls) as ClassId;
}

export default function ClassSkillsPage() {
  const [activeClass, setActiveClass] = useState<string>("warrior");
  const meta = CLASS_META[activeClass];
  const tree = CLASS_SKILL_TREES[activeClass];
  const weaponClassId = getWeaponClassId(activeClass);
  const weapons = CLASS_ALLOWED_WEAPONS[weaponClassId] || [];
  const armors = CLASS_ALLOWED_ARMOR[weaponClassId] || [];

  return (
    <div className="p-4 space-y-4">
      {/* Class Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CLASS_IDS.map(cls => {
          const m = CLASS_META[cls];
          const active = activeClass === cls;
          return (
            <button
              key={cls}
              onClick={() => setActiveClass(cls)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide rounded transition-all ${
                active ? "gilded-button" : "dark-button"
              }`}
            >
              <span className="text-base">{m?.icon}</span>
              {tree ? CLASS_SKILL_TREES[cls]?.className : cls}
            </button>
          );
        })}
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {/* Class Overview */}
          <div className="ornate-frame p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{meta?.icon}</span>
              <div>
                <h3 className="font-[var(--font-heading)] text-base gold-text tracking-wide">
                  {tree?.className || activeClass}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_55%)]">
                  {meta?.playstyle}
                </span>
              </div>
              {tree && (
                <div className="ml-auto w-4 h-4 rounded-full animate-gem-glow" style={{ backgroundColor: tree.color, color: tree.color }} />
              )}
            </div>
            <p className="text-xs text-[hsl(45_30%_75%)] mb-3">{meta?.desc}</p>

            {/* Weapons & Armor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-[var(--font-heading)] text-[hsl(43_70%_55%)] tracking-wide">Allowed Weapons</span>
                <div className="flex gap-1 flex-wrap mt-1">
                  {weapons.map(w => (
                    <span key={w} className="text-[9px] px-1.5 py-0.5 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)] capitalize">
                      {w.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-[var(--font-heading)] text-[hsl(43_70%_55%)] tracking-wide">Allowed Armor</span>
                <div className="flex gap-1 flex-wrap mt-1">
                  {armors.map(a => (
                    <span key={a} className="text-[9px] px-1.5 py-0.5 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)] capitalize">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Skill Tree Preview */}
          {tree && (
            <div className="fantasy-panel p-4">
              <h4 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase mb-3">
                Skill Tree — {tree.tiers.length} Tiers
              </h4>

              {/* Special Ability */}
              <div className="parchment-panel p-3 mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-[var(--font-heading)] tracking-wide" style={{ color: tree.color }}>
                    ★ {tree.specialAbility.name}
                  </span>
                  <span className="text-[9px] px-1 py-0 rounded border border-[hsl(35_100%_55%)] text-[hsl(35_100%_55%)]">
                    {tree.specialAbility.effectType}
                  </span>
                </div>
                <p className="text-[10px] text-[hsl(45_15%_55%)]">{tree.specialAbility.description}</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {tree.specialAbility.effects.map((e, i) => (
                    <span key={i} className="text-[9px] px-1 py-0 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_65%)]">{e}</span>
                  ))}
                </div>
              </div>

              {/* Tier list */}
              <div className="space-y-2">
                {tree.tiers.map(tier => (
                  <div key={tier.level} className="stone-panel p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tree.color }} />
                      <span className="font-[var(--font-heading)] text-[10px] tracking-wide" style={{ color: tree.color }}>
                        Lv {tier.level} — {tier.tierName}
                      </span>
                      <span className="text-[9px] text-[hsl(45_15%_45%)] ml-auto">{tier.description}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {tier.choices.map(choice => (
                        <div key={choice.id} className="flex items-center gap-1.5">
                          {choice.icon && <img src={choice.icon} alt="" className="w-4 h-4 rounded" />}
                          <span className="text-[10px] text-[hsl(45_30%_75%)]">{choice.name}</span>
                          <span className="text-[9px] px-1 py-0 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_55%)]">
                            {choice.effectType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attribute Affinities */}
          <div className="fantasy-panel p-4">
            <h4 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase mb-3">
              Core Attributes (8)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {ATTRIBUTE_IDS.map(attrId => {
                const attr = ATTRIBUTES[attrId];
                return (
                  <div key={attrId} className="inset-panel p-2.5 text-center">
                    <div className="font-[var(--font-heading)] text-xs font-bold" style={{ color: attr.color }}>
                      {attr.abbrev}
                    </div>
                    <div className="text-[10px] text-[hsl(45_30%_75%)]">{attr.name}</div>
                    <div className="text-[9px] text-[hsl(45_15%_50%)]">{attr.role}</div>
                    <div className="text-[9px] text-[hsl(45_15%_45%)] mt-1">{attr.effects.length} stat effects</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
