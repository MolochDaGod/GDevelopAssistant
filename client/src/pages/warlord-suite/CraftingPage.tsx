import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Hammer, Clock, FlaskConical, Package } from "lucide-react";
import {
  RECIPES, MATERIALS, PROFESSIONS, TIER_NAMES,
  type CraftingRecipe, type EquipmentTier,
} from "@/lib/mmo-systems";
import { useGrudgePlayer } from "@/hooks/useGrudgePlayer";

function materialName(id: string): string {
  return MATERIALS.find(m => m.id === id)?.name ?? id;
}

function materialIcon(id: string): string {
  return MATERIALS.find(m => m.id === id)?.icon ?? "📦";
}

export default function CraftingPage() {
  const player = useGrudgePlayer();
  const { toast } = useToast();
  const [crafting, setCrafting] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const startCraft = (recipe: CraftingRecipe) => {
    setCrafting(recipe.id);
    setProgress(0);
    const steps = 20;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setProgress(Math.round((step / steps) * 100));
      if (step >= steps) {
        clearInterval(interval);
        setCrafting(null);
        setProgress(0);
        toast({ title: `Crafted ${recipe.name}!`, description: `${recipe.output.type} → ${recipe.output.itemId}` });
      }
    }, recipe.craftTimeMs / steps);
  };

  return (
    <div className="p-4 space-y-4">
      <Tabs defaultValue="recipes">
        <TabsList>
          <TabsTrigger value="recipes" className="gap-1"><Hammer className="h-3 w-3" /> Recipes ({RECIPES.length})</TabsTrigger>
          <TabsTrigger value="materials" className="gap-1"><Package className="h-3 w-3" /> Materials ({MATERIALS.length})</TabsTrigger>
          <TabsTrigger value="professions" className="gap-1"><FlaskConical className="h-3 w-3" /> Professions ({PROFESSIONS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {RECIPES.map(recipe => (
                <Card key={recipe.id}>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{recipe.name}</span>
                      <Badge variant="secondary" className="text-[9px]">{recipe.output.type}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FlaskConical className="h-3 w-3" />
                      <span className="capitalize">{recipe.professionId}</span>
                      <span>· Lv {recipe.requiredLevel}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground">Materials:</span>
                      {recipe.materials.map(mat => (
                        <div key={mat.materialId} className="flex items-center justify-between pl-2">
                          <span>{materialIcon(mat.materialId)} {materialName(mat.materialId)}</span>
                          <span className="font-mono">×{mat.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{(recipe.craftTimeMs / 1000).toFixed(0)}s</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">→ {recipe.output.itemId}</div>
                    {crafting === recipe.id ? (
                      <Progress value={progress} className="h-2" />
                    ) : (
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => startCraft(recipe)}
                        disabled={!!crafting}
                      >
                        <Hammer className="h-3 w-3 mr-1" /> Craft
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="materials">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {MATERIALS.map(mat => (
                <Card key={mat.id}>
                  <CardContent className="py-3 px-3 flex items-center gap-3">
                    <span className="text-2xl">{mat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{mat.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {mat.professionSource} · {TIER_NAMES[mat.tier as EquipmentTier]}
                      </div>
                    </div>
                    <Badge variant="outline">T{mat.tier}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="professions">
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROFESSIONS.map(prof => {
                const playerProf = player.professions.find(p => p.profession === prof.id);
                const recipes = RECIPES.filter(r => r.professionId === prof.id);
                const mats = MATERIALS.filter(m => m.professionSource === prof.id);
                return (
                  <Card key={prof.id}>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-xl">{prof.icon}</span>
                        {prof.name}
                        {playerProf && (
                          <Badge variant="secondary">Lv {playerProf.level}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-4 space-y-2 text-sm">
                      <div className="text-xs text-muted-foreground">
                        Biomes: {(prof.biomes as readonly string[]).join(", ")}
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Recipes: </span>
                        {recipes.map(r => r.name).join(", ") || "None"}
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Materials: </span>
                        {mats.map(m => `${m.icon} ${m.name}`).join(", ")}
                      </div>
                      {playerProf && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>XP</span>
                            <span>{playerProf.xp} / {playerProf.next_milestone}</span>
                          </div>
                          <Progress value={(playerProf.xp / playerProf.next_milestone) * 100} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
