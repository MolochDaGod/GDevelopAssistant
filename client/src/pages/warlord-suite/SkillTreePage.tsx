import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeDeciduous, RotateCcw, Shield, Zap } from "lucide-react";

interface SkillNode {
  id: string;
  title: string;
  description: string;
  children: SkillNode[];
}

const CLASS_TREES: Record<string, SkillNode[]> = {
  warrior: [
    { id: "w1", title: "Warrior's Resolve", description: "Increase base health by 10%", children: [
      { id: "w2", title: "Iron Skin", description: "Reduce physical damage taken by 5%", children: [
        { id: "w3", title: "Unbreakable", description: "Become immune to stagger effects", children: [] },
        { id: "w4", title: "Last Stand", description: "When below 20% HP, gain 30% damage reduction for 5s", children: [] },
      ]},
      { id: "w5", title: "Battle Cry", description: "Inspire nearby allies, increasing damage by 15% for 8s", children: [
        { id: "w6", title: "Warlord's Presence", description: "Battle Cry also heals allies for 5% of their max HP", children: [] },
      ]},
    ]},
    { id: "w7", title: "Shield Mastery", description: "Block chance increased by 10%", children: [
      { id: "w8", title: "Shield Bash", description: "Stun target for 1.5s with shield", children: [] },
      { id: "w9", title: "Fortified Wall", description: "While blocking, reflect 20% of damage back", children: [] },
    ]},
  ],
  mage: [
    { id: "m1", title: "Arcane Knowledge", description: "Increase mana pool by 15%", children: [
      { id: "m2", title: "Fireball", description: "Launch a fiery projectile dealing 60 spell damage", children: [
        { id: "m3", title: "Meteor Strike", description: "Call down a meteor dealing massive AoE damage", children: [] },
      ]},
      { id: "m4", title: "Frost Nova", description: "Freeze all nearby enemies for 2s", children: [
        { id: "m5", title: "Blizzard", description: "Channel a blizzard for 6s, dealing continuous AoE damage", children: [] },
      ]},
    ]},
    { id: "m6", title: "Mana Flow", description: "Mana regeneration increased by 20%", children: [
      { id: "m7", title: "Arcane Shield", description: "Create a mana shield absorbing 200 damage", children: [] },
    ]},
  ],
  rogue: [
    { id: "r1", title: "Shadow Step", description: "Move silently and undetected", children: [
      { id: "r2", title: "Backstab", description: "Deal 200% damage from behind", children: [
        { id: "r3", title: "Assassinate", description: "Instantly kill enemies below 15% HP", children: [] },
      ]},
      { id: "r4", title: "Poison Blade", description: "Apply poison dealing 30 damage over 6s", children: [
        { id: "r5", title: "Venom Mastery", description: "Poisons spread to nearby enemies", children: [] },
      ]},
    ]},
    { id: "r6", title: "Evasion", description: "Dodge chance increased by 10%", children: [
      { id: "r7", title: "Shadow Dance", description: "After dodging, next attack deals 50% bonus damage", children: [] },
    ]},
  ],
  ranger: [
    { id: "rn1", title: "Eagle Eye", description: "Increase ranged attack range by 20%", children: [
      { id: "rn2", title: "Multi-Shot", description: "Fire 3 arrows in a spread pattern", children: [
        { id: "rn3", title: "Arrow Storm", description: "Rain arrows on an area for 4s", children: [] },
      ]},
      { id: "rn4", title: "Snipe", description: "Charged shot dealing 300% damage at max range", children: [] },
    ]},
    { id: "rn5", title: "Nature Bond", description: "Regenerate 2% HP per second while stationary", children: [
      { id: "rn6", title: "Beast Companion", description: "Summon a wolf companion that attacks enemies", children: [] },
    ]},
  ],
  cleric: [
    { id: "c1", title: "Divine Light", description: "Healing spells are 15% more effective", children: [
      { id: "c2", title: "Sanctuary", description: "Create a healing zone restoring 5% HP/s to allies", children: [
        { id: "c3", title: "Divine Intervention", description: "Prevent one killing blow on an ally every 60s", children: [] },
      ]},
      { id: "c4", title: "Holy Smite", description: "Deal holy damage and reduce target's attack by 15%", children: [] },
    ]},
    { id: "c5", title: "Blessed Armor", description: "Increase defense by 10% while healing", children: [
      { id: "c6", title: "Martyr's Shield", description: "Transfer 30% of ally's damage taken to yourself", children: [] },
    ]},
  ],
  worge: [
    { id: "wg1", title: "Primal Instinct", description: "Gain bonuses from shifting between forms", children: [
      { id: "wg2", title: "Bear Form", description: "Shift to bear: +50% HP, +30% defense, slower movement", children: [
        { id: "wg3", title: "Devastating Swipe", description: "Bear AoE attack that knocks back enemies", children: [] },
      ]},
      { id: "wg4", title: "Raptor Form", description: "Shift to raptor: stealth, +40% crit, +30% speed", children: [
        { id: "wg5", title: "Pounce", description: "Leap to target and stun for 2s from stealth", children: [] },
      ]},
      { id: "wg6", title: "Bird Form", description: "Shift to bird: fly over terrain, carry allies", children: [] },
    ]},
  ],
};

function SkillNodeView({
  node, depth, unlocked, onToggle, parentUnlocked,
}: {
  node: SkillNode; depth: number; unlocked: Set<string>;
  onToggle: (id: string) => void; parentUnlocked: boolean;
}) {
  const isUnlocked = unlocked.has(node.id);
  const canUnlock = parentUnlocked && !isUnlocked;

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        {depth > 0 && <div className="w-4 h-px bg-border" />}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggle(node.id)}
              disabled={!isUnlocked && !canUnlock}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all ${
                isUnlocked
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : canUnlock
                    ? "bg-muted border-muted-foreground/40 hover:border-primary cursor-pointer"
                    : "bg-muted/40 border-muted-foreground/20 opacity-50 cursor-not-allowed"
              }`}
            >
              <Zap className={`h-3 w-3 ${isUnlocked ? "" : "opacity-50"}`} />
              {node.title}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="font-semibold">{node.title}</p>
            <p className="text-sm text-muted-foreground">{node.description}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      {node.children.length > 0 && (
        <div className="ml-6 pl-4 border-l border-border space-y-1 mt-1">
          {node.children.map(child => (
            <SkillNodeView
              key={child.id} node={child} depth={depth + 1}
              unlocked={unlocked} onToggle={onToggle} parentUnlocked={isUnlocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillTreePage() {
  const [selectedClass, setSelectedClass] = useState("warrior");
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setUnlocked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const reset = () => setUnlocked(new Set());
  const tree = CLASS_TREES[selectedClass] || [];

  const allIds = (nodes: SkillNode[]): string[] =>
    nodes.flatMap(n => [n.id, ...allIds(n.children)]);
  const totalNodes = allIds(tree).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); reset(); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(CLASS_TREES).map(cls => (
              <SelectItem key={cls} value={cls}>{cls.charAt(0).toUpperCase() + cls.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{unlocked.size} / {totalNodes} unlocked</Badge>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1">
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {tree.map(root => (
            <Card key={root.id}>
              <CardContent className="py-4 px-4">
                <SkillNodeView
                  node={root} depth={0} unlocked={unlocked}
                  onToggle={toggle} parentUnlocked={true}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
