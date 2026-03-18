import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Lock, Star, Clock, Droplet, Flame } from "lucide-react";
import {
  CLASS_SKILL_TREES, CLASS_IDS,
  type ClassSkillChoice,
} from "../../../../shared/wcs/definitions/classSkillTrees";

const CLASS_META: Record<string, { icon: string; label: string }> = {
  warrior: { icon: "⚔️", label: "Warrior" },
  mage:    { icon: "🪄", label: "Mage" },
  ranger:  { icon: "🏹", label: "Ranger" },
  worge:   { icon: "🐻", label: "Worge" },
};

function SkillNode({
  skill, selected, locked, onSelect, treeColor,
}: {
  skill: ClassSkillChoice; selected: boolean; locked: boolean; onSelect: () => void; treeColor: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          disabled={locked}
          className={`relative flex flex-col gap-1.5 p-3 text-left text-xs transition-all w-full rounded ${
            selected
              ? "fantasy-panel ring-2 shadow-lg"
              : locked
                ? "stone-panel opacity-40 cursor-not-allowed"
                : "stone-panel hover:border-[hsl(43_60%_45%)] cursor-pointer"
          }`}
          style={selected ? { borderColor: treeColor, boxShadow: `0 0 12px ${treeColor}40` } : undefined}
        >
          <div className="flex items-center gap-2">
            {skill.icon && (
              <img src={skill.icon} alt="" className="w-6 h-6 rounded" style={{ filter: locked ? "grayscale(1)" : "none" }} />
            )}
            <span className="font-[var(--font-heading)] font-semibold tracking-wide" style={selected ? { color: treeColor } : undefined}>
              {skill.name}
            </span>
            <Badge
              className={`text-[9px] px-1.5 py-0 ml-auto border ${
                skill.effectType === "ultimate" ? "border-[hsl(35_100%_55%)] text-[hsl(35_100%_55%)]" :
                skill.effectType === "active" ? "border-[hsl(43_85%_55%)] text-[hsl(43_85%_55%)]" :
                "border-[hsl(220_15%_50%)] text-[hsl(220_15%_60%)]"
              }`}
              variant="outline"
            >
              {skill.effectType}
            </Badge>
          </div>
          <p className="text-[hsl(45_15%_60%)] line-clamp-2">{skill.description}</p>
          <div className="flex gap-3 text-[10px] text-[hsl(45_15%_55%)] mt-0.5">
            {skill.cooldown != null && skill.cooldown > 0 && (
              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{skill.cooldown}s</span>
            )}
            {skill.manaCost != null && skill.manaCost > 0 && (
              <span className="flex items-center gap-0.5 text-blue-400"><Droplet className="h-2.5 w-2.5" />{skill.manaCost}</span>
            )}
            {skill.staminaCost != null && skill.staminaCost > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400"><Flame className="h-2.5 w-2.5" />{skill.staminaCost}</span>
            )}
          </div>
          {selected && (
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full animate-gem-glow" style={{ backgroundColor: treeColor, color: treeColor }} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs fantasy-panel p-3 space-y-1.5">
        <p className="font-[var(--font-heading)] font-semibold text-[hsl(43_85%_55%)]">{skill.name}</p>
        <p className="text-sm text-[hsl(45_30%_75%)]">{skill.description}</p>
        <ul className="text-xs space-y-0.5 text-[hsl(45_15%_65%)]">
          {skill.effects.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export default function SkillTreePage() {
  const [selectedClass, setSelectedClass] = useState<string>("warrior");
  const [tierSelections, setTierSelections] = useState<Record<string, string>>({});
  const characterLevel = 20;

  const tree = CLASS_SKILL_TREES[selectedClass];

  const selectSkill = (tierLevel: number, skillId: string) => {
    setTierSelections(prev => {
      const key = String(tierLevel);
      if (prev[key] === skillId) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: skillId };
    });
  };

  const reset = () => setTierSelections({});
  const switchClass = (cls: string) => { setSelectedClass(cls); reset(); };

  const selectedCount = Object.keys(tierSelections).length;
  const totalTiers = tree?.tiers.length || 0;

  const selectedSkills = useMemo(() => {
    if (!tree) return [];
    return tree.tiers
      .map(tier => {
        const selId = tierSelections[String(tier.level)];
        return tier.choices.find(c => c.id === selId);
      })
      .filter(Boolean) as ClassSkillChoice[];
  }, [tree, tierSelections]);

  if (!tree) return <div className="p-4 text-[hsl(45_15%_55%)]">No skill tree data.</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Class Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {CLASS_IDS.map(cls => {
          const t = CLASS_SKILL_TREES[cls];
          const meta = CLASS_META[cls];
          const active = selectedClass === cls;
          return (
            <button
              key={cls}
              onClick={() => switchClass(cls)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide transition-all rounded ${
                active ? "gilded-button" : "dark-button"
              }`}
            >
              <span className="text-base">{meta?.icon}</span>
              {t.className}
            </button>
          );
        })}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-[var(--font-body)] text-[hsl(43_85%_55%)]">
            {selectedCount}/{totalTiers} tiers
          </span>
          <button onClick={reset} className="dark-button flex items-center gap-1 px-2 py-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-4">
          {/* Special Ability */}
          <div className="ornate-frame p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5" style={{ color: tree.color }} />
              <h3 className="font-[var(--font-heading)] text-sm gold-text tracking-wide">
                Special Ability — {tree.specialAbility.name}
              </h3>
              <Badge className="ml-auto text-[9px] border-[hsl(35_100%_55%)] text-[hsl(35_100%_55%)]" variant="outline">
                {tree.specialAbility.effectType}
              </Badge>
            </div>
            <p className="text-xs text-[hsl(45_30%_75%)] mb-2">{tree.specialAbility.description}</p>
            <div className="flex gap-1.5 flex-wrap mb-1">
              {tree.specialAbility.effects.map((e, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_65%)] bg-[hsl(225_25%_12%)]">
                  {e}
                </span>
              ))}
            </div>
            <div className="flex gap-3 text-[10px] text-[hsl(45_15%_55%)]">
              {tree.specialAbility.cooldown != null && tree.specialAbility.cooldown > 0 && <span>CD: {tree.specialAbility.cooldown}s</span>}
              {tree.specialAbility.manaCost != null && tree.specialAbility.manaCost > 0 && <span className="text-blue-400">Mana: {tree.specialAbility.manaCost}</span>}
              {tree.specialAbility.staminaCost != null && tree.specialAbility.staminaCost > 0 && <span className="text-amber-400">Stamina: {tree.specialAbility.staminaCost}</span>}
            </div>
          </div>

          {/* Skill Tiers */}
          {tree.tiers.map((tier) => {
            const isLocked = tier.level > characterLevel;
            const selectedId = tierSelections[String(tier.level)];
            return (
              <div key={tier.level} className={`fantasy-panel p-4 ${isLocked ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2 mb-3">
                  {isLocked
                    ? <Lock className="h-4 w-4 text-[hsl(45_15%_40%)]" />
                    : <div className="w-4 h-4 rounded-full animate-gem-glow" style={{ backgroundColor: tree.color, color: tree.color }} />
                  }
                  <h4 className="font-[var(--font-heading)] text-sm tracking-wide" style={{ color: isLocked ? undefined : tree.color }}>
                    Lv {tier.level} — {tier.tierName}
                  </h4>
                  <span className="text-[10px] font-[var(--font-body)] text-[hsl(45_15%_55%)] ml-auto">{tier.description}</span>
                  {selectedId && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(43_40%_12%)] text-[hsl(43_85%_55%)] border border-[hsl(43_50%_30%)]">
                      Selected
                    </span>
                  )}
                </div>
                <div className={`grid gap-3 ${tier.choices.length === 1 ? "grid-cols-1" : tier.choices.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {tier.choices.map(skill => (
                    <SkillNode
                      key={skill.id}
                      skill={skill}
                      selected={selectedId === skill.id}
                      locked={isLocked}
                      onSelect={() => selectSkill(tier.level, skill.id)}
                      treeColor={tree.color}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Build Summary */}
          {selectedSkills.length > 0 && (
            <div className="parchment-panel p-4">
              <h4 className="font-[var(--font-heading)] text-sm gold-text tracking-wide mb-2">
                Build Summary — {selectedSkills.length} skills
              </h4>
              <div className="flex gap-2 flex-wrap">
                {selectedSkills.map(s => (
                  <span
                    key={s.id}
                    className="text-[10px] px-2 py-1 rounded font-[var(--font-heading)] tracking-wide"
                    style={{ backgroundColor: `${tree.color}20`, color: tree.color, border: `1px solid ${tree.color}50` }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
