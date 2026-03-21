import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Plus, Users, Sword, Navigation, Sparkles, Target, TreePine, 
  Settings, Play, Save, Trash2, Copy, Eye, Crosshair, Shield,
  Heart, Zap, Move, Wind, Database, Search, Box, Flame,
  Image, Download, CheckCircle, XCircle, Loader2, Filter,
  Layers, Globe, Package
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useObjectStoreHealth } from "@/lib/objectstore";
import {
  useRtsModels, useModels3D, useEffects2D, use3DFx, useOsWeapons, useOsSprites,
  flattenRtsModels, flattenEffects2D, flatten3DFx, flattenOsWeapons,
  getEffect2DUrl, getOsBaseUrl,
  type RtsModel, type RtsRace, type RtsModelsData,
  type Model3D, type Effect2D, type Effect3D, type Effects3DData,
  type OsWeaponItem, type OsWeaponsData,
} from "@/lib/objectstore-gamedata";
import type { 
  OpenRTSUnit, OpenRTSWeapon, OpenRTSMover, OpenRTSEffect, 
  OpenRTSActor, OpenRTSProjectile, OpenRTSTrinket 
} from "@shared/schema";

type PathfindingMode = "Walk" | "Fly";
type Heightmap = "Ground" | "Sky" | "Air";
type StandingMode = "Stand" | "Prone";
type Race = "human" | "alien" | "undead" | "mechanical" | "nature";
type DamageType = "physical" | "magic" | "fire" | "ice" | "explosive" | "poison";

const RACES: { value: Race; label: string; color: string }[] = [
  { value: "human", label: "Human", color: "bg-blue-500" },
  { value: "alien", label: "Alien", color: "bg-green-500" },
  { value: "undead", label: "Undead", color: "bg-purple-500" },
  { value: "mechanical", label: "Mechanical", color: "bg-gray-500" },
  { value: "nature", label: "Nature", color: "bg-emerald-500" },
];

const DAMAGE_TYPES: { value: DamageType; label: string; icon: typeof Sword }[] = [
  { value: "physical", label: "Physical", icon: Sword },
  { value: "magic", label: "Magic", icon: Sparkles },
  { value: "fire", label: "Fire", icon: Zap },
  { value: "ice", label: "Ice", icon: Wind },
  { value: "explosive", label: "Explosive", icon: Target },
  { value: "poison", label: "Poison", icon: Shield },
];

export default function RtsBuilder() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("units");
  const [selectedUnit, setSelectedUnit] = useState<OpenRTSUnit | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<OpenRTSWeapon | null>(null);
  const [isCreateUnitOpen, setIsCreateUnitOpen] = useState(false);
  const [isCreateWeaponOpen, setIsCreateWeaponOpen] = useState(false);

  const { data: units = [], isLoading: unitsLoading } = useQuery<OpenRTSUnit[]>({
    queryKey: ["/api/openrts/units"],
  });

  const { data: weapons = [], isLoading: weaponsLoading } = useQuery<OpenRTSWeapon[]>({
    queryKey: ["/api/openrts/weapons"],
  });

  const { data: movers = [], isLoading: moversLoading } = useQuery<OpenRTSMover[]>({
    queryKey: ["/api/openrts/movers"],
  });

  const { data: effects = [] } = useQuery<OpenRTSEffect[]>({
    queryKey: ["/api/openrts/effects"],
  });

  const createUnitMutation = useMutation({
    mutationFn: async (data: Partial<OpenRTSUnit>) => {
      const res = await apiRequest("POST", "/api/openrts/units", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/units"] });
      setIsCreateUnitOpen(false);
      toast({ title: "Unit Created", description: "New unit added to your army" });
    },
  });

  const createWeaponMutation = useMutation({
    mutationFn: async (data: Partial<OpenRTSWeapon>) => {
      const res = await apiRequest("POST", "/api/openrts/weapons", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/weapons"] });
      setIsCreateWeaponOpen(false);
      toast({ title: "Weapon Created", description: "New weapon added to arsenal" });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/openrts/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/units"] });
      setSelectedUnit(null);
      toast({ title: "Unit Deleted" });
    },
  });

  const deleteWeaponMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/openrts/weapons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/openrts/weapons"] });
      setSelectedWeapon(null);
      toast({ title: "Weapon Deleted" });
    },
  });

  const osHealth = useObjectStoreHealth();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              OpenRTS Builder
            </h1>
            <p className="text-sm text-muted-foreground">
              Create units, weapons, movers, and effects for your RTS game
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              {osHealth.isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : osHealth.data?.status === "ok" ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500" />
              )}
              <span className="text-muted-foreground">ObjectStore</span>
            </div>
            <Button variant="outline" size="sm" data-testid="button-export-dsl">
              <Copy className="mr-2 h-4 w-4" />
              Export DSL
            </Button>
            <Button size="sm" data-testid="button-preview-game">
              <Play className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1">
          <div className="w-48 border-r bg-muted/30 p-2">
            <TabsList className="flex h-auto flex-col w-full gap-1 bg-transparent">
              <TabsTrigger 
                value="units" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-units"
              >
                <Users className="h-4 w-4" />
                Units ({units.length})
              </TabsTrigger>
              <TabsTrigger 
                value="weapons" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-weapons"
              >
                <Sword className="h-4 w-4" />
                Weapons ({weapons.length})
              </TabsTrigger>
              <TabsTrigger 
                value="movers" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-movers"
              >
                <Navigation className="h-4 w-4" />
                Movers ({movers.length})
              </TabsTrigger>
              <TabsTrigger 
                value="effects" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-effects"
              >
                <Sparkles className="h-4 w-4" />
                Effects ({effects.length})
              </TabsTrigger>
              <TabsTrigger 
                value="actors" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-actors"
              >
                <Eye className="h-4 w-4" />
                Actors
              </TabsTrigger>
              <TabsTrigger 
                value="trinkets" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-trinkets"
              >
                <TreePine className="h-4 w-4" />
                Trinkets
              </TabsTrigger>
              <div className="my-2 border-t" />
              <TabsTrigger 
                value="asset-library" 
                className="w-full justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="tab-asset-library"
              >
                <Database className="h-4 w-4" />
                Asset Library
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="units" className="h-full m-0 p-0">
              <UnitsPanel 
                units={units} 
                weapons={weapons}
                movers={movers}
                selectedUnit={selectedUnit}
                setSelectedUnit={setSelectedUnit}
                isCreateOpen={isCreateUnitOpen}
                setIsCreateOpen={setIsCreateUnitOpen}
                createMutation={createUnitMutation}
                deleteMutation={deleteUnitMutation}
                isLoading={unitsLoading}
              />
            </TabsContent>

            <TabsContent value="weapons" className="h-full m-0 p-0">
              <WeaponsPanel
                weapons={weapons}
                effects={effects}
                selectedWeapon={selectedWeapon}
                setSelectedWeapon={setSelectedWeapon}
                isCreateOpen={isCreateWeaponOpen}
                setIsCreateOpen={setIsCreateWeaponOpen}
                createMutation={createWeaponMutation}
                deleteMutation={deleteWeaponMutation}
                isLoading={weaponsLoading}
              />
            </TabsContent>

            <TabsContent value="movers" className="h-full m-0 p-0">
              <MoversPanel movers={movers} isLoading={moversLoading} />
            </TabsContent>

            <TabsContent value="effects" className="h-full m-0 p-0">
              <EffectsPanelConnected effects={effects} />
            </TabsContent>

            <TabsContent value="actors" className="h-full m-0 p-0">
              <ActorsPanelConnected />
            </TabsContent>

            <TabsContent value="trinkets" className="h-full m-0 p-0">
              <TrinketsPanelConnected />
            </TabsContent>

            <TabsContent value="asset-library" className="h-full m-0 p-0">
              <AssetLibraryPanel />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

function UnitsPanel({ 
  units, 
  weapons,
  movers,
  selectedUnit, 
  setSelectedUnit,
  isCreateOpen,
  setIsCreateOpen,
  createMutation,
  deleteMutation,
  isLoading
}: {
  units: OpenRTSUnit[];
  weapons: OpenRTSWeapon[];
  movers: OpenRTSMover[];
  selectedUnit: OpenRTSUnit | null;
  setSelectedUnit: (unit: OpenRTSUnit | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  createMutation: any;
  deleteMutation: any;
  isLoading: boolean;
}) {
  const [newUnit, setNewUnit] = useState({
    name: "",
    uiName: "",
    race: "human" as Race,
    radius: "0.25",
    separationRadius: "0.25",
    speed: "2.5",
    mass: "1.0",
    maxHealth: 100,
    sight: "7",
    moverLink: "Ground",
    weaponLinks: [] as string[],
    cost: { gold: 100 },
    buildTime: 15,
  });

  const handleCreateUnit = () => {
    createMutation.mutate(newUnit);
  };

  const groupedUnits = units.reduce((acc, unit) => {
    const race = unit.race || "human";
    if (!acc[race]) acc[race] = [];
    acc[race].push(unit);
    return acc;
  }, {} as Record<string, OpenRTSUnit[]>);

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Unit Library</h3>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-unit">
                <Plus className="mr-1 h-4 w-4" />
                New Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Unit</DialogTitle>
                <DialogDescription>Define a new combat unit with OpenRTS properties</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label>Unit ID</Label>
                    <Input 
                      value={newUnit.name}
                      onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                      placeholder="Marine"
                      data-testid="input-unit-id"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input 
                      value={newUnit.uiName}
                      onChange={(e) => setNewUnit({ ...newUnit, uiName: e.target.value })}
                      placeholder="Space Marine"
                      data-testid="input-unit-name"
                    />
                  </div>
                  <div>
                    <Label>Race</Label>
                    <Select value={newUnit.race} onValueChange={(v: Race) => setNewUnit({ ...newUnit, race: v })}>
                      <SelectTrigger data-testid="select-race">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RACES.map(race => (
                          <SelectItem key={race.value} value={race.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${race.color}`} />
                              {race.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mover Type</Label>
                    <Select value={newUnit.moverLink} onValueChange={(v) => setNewUnit({ ...newUnit, moverLink: v })}>
                      <SelectTrigger data-testid="select-mover">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {movers.map(mover => (
                          <SelectItem key={mover.name} value={mover.name}>
                            <div className="flex items-center gap-2">
                              {mover.pathfindingMode === "Fly" ? <Wind className="h-3 w-3" /> : <Move className="h-3 w-3" />}
                              {mover.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Max Health: {newUnit.maxHealth}</Label>
                    <Slider 
                      value={[newUnit.maxHealth]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, maxHealth: v })}
                      min={10} max={1000} step={10}
                    />
                  </div>
                  <div>
                    <Label>Speed: {newUnit.speed}</Label>
                    <Slider 
                      value={[parseFloat(newUnit.speed)]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, speed: v.toString() })}
                      min={0.5} max={15} step={0.5}
                    />
                  </div>
                  <div>
                    <Label>Sight Range: {newUnit.sight}</Label>
                    <Slider 
                      value={[parseFloat(newUnit.sight)]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, sight: v.toString() })}
                      min={1} max={20} step={1}
                    />
                  </div>
                  <div>
                    <Label>Collision Radius: {newUnit.radius}</Label>
                    <Slider 
                      value={[parseFloat(newUnit.radius)]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, radius: v.toString(), separationRadius: v.toString() })}
                      min={0.1} max={2} step={0.05}
                    />
                  </div>
                  <div>
                    <Label>Gold Cost: {newUnit.cost.gold}</Label>
                    <Slider 
                      value={[newUnit.cost.gold]} 
                      onValueChange={([v]) => setNewUnit({ ...newUnit, cost: { gold: v } })}
                      min={0} max={1000} step={25}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleCreateUnit} 
                  disabled={!newUnit.name || !newUnit.uiName || createMutation.isPending}
                  data-testid="button-submit-unit"
                >
                  Create Unit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading units...</div>
          ) : (
            <div className="p-2 space-y-4">
              {Object.entries(groupedUnits).map(([race, raceUnits]) => (
                <div key={race}>
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className={`w-2 h-2 rounded-full ${RACES.find(r => r.value === race)?.color || 'bg-gray-400'}`} />
                    <span className="text-xs font-medium uppercase text-muted-foreground">{race}</span>
                    <Badge variant="secondary" className="text-xs">{raceUnits.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {raceUnits.map(unit => (
                      <div
                        key={unit.id}
                        className={`p-2 rounded-md cursor-pointer transition-colors ${
                          selectedUnit?.id === unit.id 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover-elevate'
                        }`}
                        onClick={() => setSelectedUnit(unit)}
                        data-testid={`unit-card-${unit.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{unit.uiName}</span>
                          <Badge variant="outline" className="text-xs">{unit.moverLink || 'Ground'}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> {unit.maxHealth}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" /> {unit.speed}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {unit.sight}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {units.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No units yet</p>
                  <p className="text-xs">Create your first unit</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 p-4">
        {selectedUnit ? (
          <UnitDetails 
            unit={selectedUnit} 
            weapons={weapons}
            movers={movers}
            onDelete={() => deleteMutation.mutate(selectedUnit.id)}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a unit to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UnitDetails({ 
  unit, 
  weapons, 
  movers,
  onDelete 
}: { 
  unit: OpenRTSUnit; 
  weapons: OpenRTSWeapon[];
  movers: OpenRTSMover[];
  onDelete: () => void;
}) {
  const race = RACES.find(r => r.value === unit.race);
  const mover = movers.find(m => m.name === unit.moverLink);
  const unitWeapons = weapons.filter(w => unit.weaponLinks?.includes(w.name));
  const cost = unit.cost as { gold?: number } | null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {unit.uiName}
            <Badge className={race?.color}>{race?.label}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground font-mono">ID: {unit.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Copy className="mr-1 h-4 w-4" />
            Duplicate
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} data-testid="button-delete-unit">
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              Combat Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Health</span>
              <span className="font-medium">{unit.maxHealth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Speed</span>
              <span className="font-medium">{unit.speed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sight</span>
              <span className="font-medium">{unit.sight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mass</span>
              <span className="font-medium">{unit.mass}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Move className="h-4 w-4 text-blue-500" />
              Movement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mover</span>
              <Badge variant="outline">{unit.moverLink || 'None'}</Badge>
            </div>
            {mover && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pathfinding</span>
                  <span className="font-medium">{mover.pathfindingMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heightmap</span>
                  <span className="font-medium">{mover.heightmap}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Radius</span>
              <span className="font-medium">{unit.radius}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-yellow-500" />
              Production
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gold Cost</span>
              <span className="font-medium">{cost?.gold ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build Time</span>
              <span className="font-medium">{unit.buildTime}s</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sword className="h-4 w-4 text-orange-500" />
            Weapons ({unitWeapons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unitWeapons.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {unitWeapons.map(weapon => (
                <div key={weapon.id} className="p-2 rounded-md bg-muted">
                  <div className="font-medium">{weapon.uiName}</div>
                  <div className="text-xs text-muted-foreground">
                    Range: {weapon.range} | Damage: {weapon.damage} | Cooldown: {weapon.period}s
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No weapons assigned</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">OpenRTS DSL Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto">
{`Unit ${unit.name} {
    uIName "${unit.uiName}"
    race ${unit.race}
    radius ${unit.radius}
    separationRadius ${unit.separationRadius}
    speed ${unit.speed}
    mass ${unit.mass}
    maxHealth ${unit.maxHealth}
    sight ${unit.sight}
    mover ${unit.moverLink || 'Ground'}
    ${unit.weaponLinks?.length ? `weapons {
        ${unit.weaponLinks.map(w => `weapon ${w}`).join('\n        ')}
    }` : ''}
}`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function WeaponsPanel({
  weapons,
  effects,
  selectedWeapon,
  setSelectedWeapon,
  isCreateOpen,
  setIsCreateOpen,
  createMutation,
  deleteMutation,
  isLoading
}: {
  weapons: OpenRTSWeapon[];
  effects: OpenRTSEffect[];
  selectedWeapon: OpenRTSWeapon | null;
  setSelectedWeapon: (weapon: OpenRTSWeapon | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  createMutation: any;
  deleteMutation: any;
  isLoading: boolean;
}) {
  const [newWeapon, setNewWeapon] = useState({
    name: "",
    uiName: "",
    range: "5",
    scanRange: "7",
    period: "4",
    damage: 10,
    damageType: "physical" as DamageType,
    effectLink: "",
  });

  return (
    <div className="flex h-full">
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Weapon Arsenal</h3>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-weapon">
                <Plus className="mr-1 h-4 w-4" />
                New Weapon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Weapon</DialogTitle>
                <DialogDescription>Define weapon stats and effects</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Weapon ID</Label>
                    <Input 
                      value={newWeapon.name}
                      onChange={(e) => setNewWeapon({ ...newWeapon, name: e.target.value })}
                      placeholder="LaserRifle"
                      data-testid="input-weapon-id"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input 
                      value={newWeapon.uiName}
                      onChange={(e) => setNewWeapon({ ...newWeapon, uiName: e.target.value })}
                      placeholder="Laser Rifle"
                      data-testid="input-weapon-name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Damage Type</Label>
                  <Select value={newWeapon.damageType} onValueChange={(v: DamageType) => setNewWeapon({ ...newWeapon, damageType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAMAGE_TYPES.map(dt => (
                        <SelectItem key={dt.value} value={dt.value}>
                          <div className="flex items-center gap-2">
                            <dt.icon className="h-4 w-4" />
                            {dt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Damage: {newWeapon.damage}</Label>
                  <Slider 
                    value={[newWeapon.damage]} 
                    onValueChange={([v]) => setNewWeapon({ ...newWeapon, damage: v })}
                    min={1} max={200} step={1}
                  />
                </div>
                <div>
                  <Label>Attack Range: {newWeapon.range}</Label>
                  <Slider 
                    value={[parseFloat(newWeapon.range)]} 
                    onValueChange={([v]) => setNewWeapon({ ...newWeapon, range: v.toString() })}
                    min={0.1} max={20} step={0.5}
                  />
                </div>
                <div>
                  <Label>Cooldown: {newWeapon.period}s</Label>
                  <Slider 
                    value={[parseFloat(newWeapon.period)]} 
                    onValueChange={([v]) => setNewWeapon({ ...newWeapon, period: v.toString() })}
                    min={0.1} max={10} step={0.1}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => createMutation.mutate(newWeapon)} 
                  disabled={!newWeapon.name || !newWeapon.uiName || createMutation.isPending}
                  data-testid="button-submit-weapon"
                >
                  Create Weapon
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {weapons.map(weapon => (
              <div
                key={weapon.id}
                className={`p-2 rounded-md cursor-pointer transition-colors ${
                  selectedWeapon?.id === weapon.id 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover-elevate'
                }`}
                onClick={() => setSelectedWeapon(weapon)}
                data-testid={`weapon-card-${weapon.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{weapon.uiName}</span>
                  <Badge variant="secondary" className="text-xs">{weapon.damageType}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>DMG: {weapon.damage}</span>
                  <span>Range: {weapon.range}</span>
                  <span>CD: {weapon.period}s</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 p-4">
        {selectedWeapon ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedWeapon.uiName}</h2>
                <p className="text-sm text-muted-foreground font-mono">ID: {selectedWeapon.name}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(selectedWeapon.id)}>
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Combat Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Damage</span>
                    <span className="font-medium text-red-500">{selectedWeapon.damage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Damage Type</span>
                    <Badge variant="outline">{selectedWeapon.damageType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attack Range</span>
                    <span className="font-medium">{selectedWeapon.range}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scan Range</span>
                    <span className="font-medium">{selectedWeapon.scanRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cooldown</span>
                    <span className="font-medium">{selectedWeapon.period}s</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Effect Link</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedWeapon.effectLink ? (
                    <Badge>{selectedWeapon.effectLink}</Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">No effect linked</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">OpenRTS XML Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto">
{`<Weapon id="${selectedWeapon.name}">
    <UIName value="${selectedWeapon.uiName}"/>
    <EffectLink value="${selectedWeapon.effectLink || ''}"/>
    <Range value="${selectedWeapon.range}"/>
    <ScanRange value="${selectedWeapon.scanRange}"/>
    <Period value="${selectedWeapon.period}"/>
</Weapon>`}</pre>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Sword className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a weapon to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MoversPanel({ movers, isLoading }: { movers: OpenRTSMover[]; isLoading: boolean }) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Movement Types</h3>
        <p className="text-sm text-muted-foreground">Pathfinding and heightmap configurations</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading movers...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {movers.map(mover => (
            <Card key={mover.id} data-testid={`mover-card-${mover.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  {mover.pathfindingMode === "Fly" ? (
                    <Wind className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Navigation className="h-5 w-5 text-green-500" />
                  )}
                  {mover.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pathfinding</span>
                  <Badge variant="outline">{mover.pathfindingMode}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heightmap</span>
                  <Badge variant="secondary">{mover.heightmap}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Standing</span>
                  <span className="font-medium">{mover.standingMode}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">OpenRTS XML Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-3 rounded-md bg-muted text-xs font-mono overflow-x-auto max-h-48">
{movers.map(m => `<Mover id="${m.name}">
    <PathfindingMode value="${m.pathfindingMode}"/>
    <Heightmap value="${m.heightmap}"/>
    <StandingMode value="${m.standingMode}"/>
</Mover>`).join('\n')}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function EffectsPanelConnected({ effects }: { effects: OpenRTSEffect[] }) {
  const [fxTab, setFxTab] = useState<"db" | "2d" | "3d">("db");
  const [fxSearch, setFxSearch] = useState("");
  const [fxSubcat, setFxSubcat] = useState<string>("all");
  const { data: effects2dData, isLoading: fx2dLoading } = useEffects2D();
  const { data: effects3dData, isLoading: fx3dLoading } = use3DFx();

  const flatFx2d = useMemo(() => {
    if (!effects2dData) return [];
    return flattenEffects2D(effects2dData);
  }, [effects2dData]);

  const flatFx3d = useMemo(() => {
    if (!effects3dData) return [];
    return flatten3DFx(effects3dData);
  }, [effects3dData]);

  const filtered2d = useMemo(() => {
    let items = flatFx2d;
    if (fxSubcat !== "all") items = items.filter(e => e.subcategory === fxSubcat);
    if (fxSearch) {
      const q = fxSearch.toLowerCase();
      items = items.filter(e => e.key.toLowerCase().includes(q) || e.filename.toLowerCase().includes(q) || e.subcategory.includes(q));
    }
    return items.slice(0, 60);
  }, [flatFx2d, fxSearch, fxSubcat]);

  const filtered3d = useMemo(() => {
    let items = flatFx3d;
    if (fxSubcat !== "all") items = items.filter(e => e.category === fxSubcat);
    if (fxSearch) {
      const q = fxSearch.toLowerCase();
      items = items.filter(e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.some(t => t.includes(q)));
    }
    return items;
  }, [flatFx3d, fxSearch, fxSubcat]);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Visual Effects</h3>
          <p className="text-sm text-muted-foreground">
            DB effects + {effects2dData?.totalEffects ?? 0} 2D sprites + {effects3dData?.totalEffects ?? 0} 3D VFX from ObjectStore
          </p>
        </div>
        <Button size="sm" data-testid="button-create-effect">
          <Plus className="mr-1 h-4 w-4" />
          New Effect
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <Button variant={fxTab === "db" ? "default" : "outline"} size="sm" onClick={() => { setFxTab("db"); setFxSubcat("all"); }}>
          <Layers className="mr-1 h-3 w-3" /> DB ({effects.length})
        </Button>
        <Button variant={fxTab === "2d" ? "default" : "outline"} size="sm" onClick={() => { setFxTab("2d"); setFxSubcat("all"); }}>
          <Image className="mr-1 h-3 w-3" /> 2D Sprites ({effects2dData?.totalEffects ?? "..."})
        </Button>
        <Button variant={fxTab === "3d" ? "default" : "outline"} size="sm" onClick={() => { setFxTab("3d"); setFxSubcat("all"); }}>
          <Flame className="mr-1 h-3 w-3" /> 3D VFX ({effects3dData?.totalEffects ?? "..."})
        </Button>
      </div>

      {fxTab !== "db" && (
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search effects..." value={fxSearch} onChange={e => setFxSearch(e.target.value)} />
          </div>
          {fxTab === "2d" && effects2dData && (
            <Select value={fxSubcat} onValueChange={setFxSubcat}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {Object.entries(effects2dData.subcategories).map(([sub, count]) => (
                  <SelectItem key={sub} value={sub}>{sub} ({count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {fxTab === "3d" && effects3dData && (
            <Select value={fxSubcat} onValueChange={setFxSubcat}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(effects3dData.categories).map(([cat, info]) => (
                  <SelectItem key={cat} value={cat}>{info.name} ({info.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <ScrollArea className="flex-1">
        {fxTab === "db" && (
          <div className="grid grid-cols-3 gap-3">
            {effects.map(effect => (
              <Card key={effect.id} data-testid={`effect-card-${effect.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    {effect.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline">{effect.effectType}</Badge>
                  </div>
                  {effect.damage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Damage</span>
                      <span className="font-medium text-red-500">{effect.damage}</span>
                    </div>
                  )}
                  {effect.particleEffect && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Particle</span>
                      <span className="font-medium">{effect.particleEffect}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {fxTab === "2d" && (fx2dLoading ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />Loading 2D effects...</div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filtered2d.map(effect => (
              <Card key={effect.key} className="overflow-hidden">
                <div className="h-24 bg-black/80 flex items-center justify-center">
                  <img src={getEffect2DUrl(effect)} alt={effect.filename} className="max-h-20 max-w-full object-contain" loading="lazy" />
                </div>
                <CardContent className="p-2 space-y-1">
                  <p className="text-xs font-medium truncate">{effect.filename}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">{effect.subcategory}</Badge>
                    <span className="text-[10px] text-muted-foreground">{effect.sizeKB}KB</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

        {fxTab === "3d" && (fx3dLoading ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />Loading 3D VFX...</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered3d.map(fx => (
              <Card key={fx.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: fx.colors.primary }} />
                    {fx.name}
                  </CardTitle>
                  <CardDescription className="text-xs">{fx.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="outline" style={{ borderColor: fx.colors.primary, color: fx.colors.primary }}>{fx.category}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{fx.timing.duration}s</span>
                  </div>
                  {fx.shader && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shader</span>
                      <span className="font-mono text-xs">{fx.shader}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {fx.tags.slice(0, 4).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

function ActorsPanelConnected() {
  const [actorTab, setActorTab] = useState<"rts" | "all3d">("rts");
  const [modelSearch, setModelSearch] = useState("");
  const [raceFilter, setRaceFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const { data: rtsModelsData, isLoading: rtsLoading } = useRtsModels();
  const { data: models3dData, isLoading: models3dLoading } = useModels3D();

  const flatRts = useMemo(() => {
    if (!rtsModelsData) return [];
    return flattenRtsModels(rtsModelsData);
  }, [rtsModelsData]);

  const filteredRts = useMemo(() => {
    let items = flatRts;
    if (raceFilter !== "all") items = items.filter(m => m.race === raceFilter);
    if (modelSearch) {
      const q = modelSearch.toLowerCase();
      items = items.filter(m => m.displayName.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.tags.some(t => t.includes(q)));
    }
    return items;
  }, [flatRts, modelSearch, raceFilter]);

  const filtered3d = useMemo(() => {
    if (!models3dData) return [];
    let items = models3dData.models;
    if (formatFilter !== "all") items = items.filter(m => m.format === formatFilter);
    if (modelSearch) {
      const q = modelSearch.toLowerCase();
      items = items.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    return items.slice(0, 100);
  }, [models3dData, modelSearch, formatFilter]);

  const formats = useMemo(() => {
    if (!models3dData) return [];
    return Array.from(new Set(models3dData.models.map(m => m.format))).sort();
  }, [models3dData]);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Actors — 3D Models</h3>
          <p className="text-sm text-muted-foreground">
            {rtsModelsData?.totalModels ?? 0} RTS models + {models3dData?.models.length ?? 0} full library from ObjectStore
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <Button variant={actorTab === "rts" ? "default" : "outline"} size="sm" onClick={() => { setActorTab("rts"); setRaceFilter("all"); setFormatFilter("all"); }}>
          <Box className="mr-1 h-3 w-3" /> RTS Models ({rtsModelsData?.totalModels ?? "..."})
        </Button>
        <Button variant={actorTab === "all3d" ? "default" : "outline"} size="sm" onClick={() => { setActorTab("all3d"); setRaceFilter("all"); setFormatFilter("all"); }}>
          <Globe className="mr-1 h-3 w-3" /> Full 3D Library ({models3dData?.models.length ?? "..."})
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search models..." value={modelSearch} onChange={e => setModelSearch(e.target.value)} />
        </div>
        {actorTab === "rts" && rtsModelsData && (
          <Select value={raceFilter} onValueChange={setRaceFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Races</SelectItem>
              {Object.entries(rtsModelsData.races).map(([id, race]) => (
                <SelectItem key={id} value={id}>
                  <span className="flex items-center gap-1">
                    <span>{race.emoji}</span> {race.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {actorTab === "all3d" && (
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              {formats.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <ScrollArea className="flex-1">
        {actorTab === "rts" && (rtsLoading ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />Loading RTS models...</div>
        ) : (
          <div className="space-y-6">
            {raceFilter === "all" && rtsModelsData ? (
              Object.entries(rtsModelsData.races).map(([raceId, race]) => {
                const raceModels = filteredRts.filter(m => m.race === raceId);
                if (raceModels.length === 0) return null;
                return (
                  <div key={raceId}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{race.emoji}</span>
                      <span className="font-semibold">{race.name}</span>
                      <Badge variant="secondary" className="text-xs">{race.faction}</Badge>
                      <Badge className="text-xs" style={{ background: race.color }}>{raceModels.length}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {raceModels.map(model => (
                        <RtsModelCard key={model.grudgeId} model={model} raceColor={race.color} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredRts.map(model => {
                  const race = rtsModelsData?.races[model.race];
                  return <RtsModelCard key={model.grudgeId} model={model} raceColor={race?.color || "#888"} />;
                })}
              </div>
            )}
          </div>
        ))}

        {actorTab === "all3d" && (models3dLoading ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />Loading 3D models...</div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filtered3d.map((model, i) => (
              <Card key={`${model.path}-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs truncate flex items-center gap-1">
                    <Box className="h-3 w-3 flex-shrink-0 text-blue-500" />
                    {model.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{model.format}</Badge>
                    <span className="text-[10px] text-muted-foreground">{model.sizeKB}KB</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{model.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

function RtsModelCard({ model, raceColor }: { model: RtsModel & { race: string }; raceColor: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-2" style={{ background: raceColor }} />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{model.displayName}</CardTitle>
        <CardDescription className="text-xs font-mono">{model.grudgeId}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <Badge variant="outline">{model.unitType}</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Category</span>
          <span>{model.category}</span>
        </div>
        {model.sizeBytes && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Size</span>
            <span>{(model.sizeBytes / 1024).toFixed(0)}KB</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {model.customizable && <Badge className="text-[10px] bg-green-600">Customizable</Badge>}
          {model.hasAnimations && <Badge className="text-[10px] bg-blue-600">Animated</Badge>}
        </div>
        <div className="flex flex-wrap gap-1">
          {model.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TrinketsPanelConnected() {
  const [trinketSearch, setTrinketSearch] = useState("");
  const [trinketCat, setTrinketCat] = useState<string>("all");
  const { data: models3dData, isLoading } = useModels3D();
  const { data: rtsModelsData } = useRtsModels();

  const trinketModels = useMemo(() => {
    if (!models3dData) return [];
    const decorCategories = ["uncategorized", "Boats", "nature", "buildings", "terrain", "props"];
    let items = models3dData.models.filter(m => {
      const catLower = m.category.toLowerCase();
      return decorCategories.some(dc => catLower.includes(dc.toLowerCase())) ||
        m.name.toLowerCase().includes("tree") || m.name.toLowerCase().includes("rock") ||
        m.name.toLowerCase().includes("boat") || m.name.toLowerCase().includes("house") ||
        m.name.toLowerCase().includes("fence") || m.name.toLowerCase().includes("tower");
    });
    if (trinketCat !== "all") items = items.filter(m => m.category === trinketCat);
    if (trinketSearch) {
      const q = trinketSearch.toLowerCase();
      items = items.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    return items.slice(0, 80);
  }, [models3dData, trinketSearch, trinketCat]);

  const categories = useMemo(() => {
    if (!models3dData) return [];
    return Array.from(new Set(trinketModels.map(m => m.category))).sort();
  }, [trinketModels, models3dData]);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Map Trinkets</h3>
          <p className="text-sm text-muted-foreground">Decorations, terrain objects, and obstacles from ObjectStore</p>
        </div>
        <Button size="sm" data-testid="button-create-trinket">
          <Plus className="mr-1 h-4 w-4" />
          New Trinket
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search trinkets (trees, rocks, boats...)" value={trinketSearch} onChange={e => setTrinketSearch(e.target.value)} />
        </div>
        <Select value={trinketCat} onValueChange={setTrinketCat}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground"><Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />Loading trinkets...</div>
        ) : trinketModels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TreePine className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No trinkets match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {trinketModels.map((model, i) => (
              <Card key={`${model.path}-${i}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs truncate flex items-center gap-1">
                    <TreePine className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                    {model.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{model.format}</Badge>
                    <span className="text-[10px] text-muted-foreground">{model.sizeKB}KB</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{model.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ASSET LIBRARY — Unified browsable view of ALL ObjectStore data
// ═══════════════════════════════════════════════════════

type AssetCategory = "models" | "weapons" | "effects2d" | "effects3d" | "sprites";

const ASSET_CATEGORIES: { value: AssetCategory; label: string; icon: typeof Box }[] = [
  { value: "models", label: "3D Models", icon: Box },
  { value: "weapons", label: "Weapons", icon: Sword },
  { value: "effects2d", label: "2D Effects", icon: Image },
  { value: "effects3d", label: "3D VFX", icon: Flame },
  { value: "sprites", label: "Sprites", icon: Layers },
];

function AssetLibraryPanel() {
  const [category, setCategory] = useState<AssetCategory>("models");
  const [search, setSearch] = useState("");

  const { data: rtsModelsData } = useRtsModels();
  const { data: models3dData } = useModels3D();
  const { data: effects2dData } = useEffects2D();
  const { data: effects3dData } = use3DFx();
  const { data: osWeaponsData } = useOsWeapons();
  const { data: spritesData } = useOsSprites();

  const counts = useMemo(() => ({
    models: (rtsModelsData?.totalModels ?? 0) + (models3dData?.models.length ?? 0),
    weapons: osWeaponsData?.total ?? 0,
    effects2d: effects2dData?.totalEffects ?? 0,
    effects3d: effects3dData?.totalEffects ?? 0,
    sprites: spritesData?.totalSprites ?? 0,
  }), [rtsModelsData, models3dData, effects2dData, effects3dData, osWeaponsData, spritesData]);

  const totalAssets = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              ObjectStore Asset Library
            </h3>
            <p className="text-sm text-muted-foreground">
              {totalAssets.toLocaleString()} assets from Grudge ObjectStore
            </p>
          </div>
          <a href={getOsBaseUrl()} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Globe className="mr-1 h-3 w-3" /> Open ObjectStore
            </Button>
          </a>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {ASSET_CATEGORIES.map(cat => (
          <Button
            key={cat.value}
            variant={category === cat.value ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory(cat.value)}
          >
            <cat.icon className="mr-1 h-3 w-3" />
            {cat.label} ({counts[cat.value]})
          </Button>
        ))}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder={`Search ${category}...`} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <ScrollArea className="flex-1">
        {category === "models" && <AssetLibraryModels rtsData={rtsModelsData} models3dData={models3dData} search={search} />}
        {category === "weapons" && <AssetLibraryWeapons data={osWeaponsData} search={search} />}
        {category === "effects2d" && <AssetLibraryEffects2D data={effects2dData} search={search} />}
        {category === "effects3d" && <AssetLibraryEffects3D data={effects3dData} search={search} />}
        {category === "sprites" && <AssetLibrarySprites data={spritesData} search={search} />}
      </ScrollArea>
    </div>
  );
}

function AssetLibraryModels({ rtsData, models3dData, search }: { rtsData?: RtsModelsData; models3dData?: { models: Model3D[] }; search: string }) {
  const items = useMemo(() => {
    const all: { name: string; detail: string; badge: string; badgeColor?: string; size: string }[] = [];
    if (rtsData) {
      for (const [, race] of Object.entries(rtsData.races)) {
        for (const m of race.models) {
          all.push({ name: m.displayName, detail: `${race.name} • ${m.unitType}`, badge: "RTS", badgeColor: race.color, size: m.sizeBytes ? `${(m.sizeBytes / 1024).toFixed(0)}KB` : "" });
        }
      }
    }
    if (models3dData) {
      for (const m of models3dData.models.slice(0, 200)) {
        all.push({ name: m.name, detail: m.category, badge: m.format, size: `${m.sizeKB}KB` });
      }
    }
    if (search) {
      const q = search.toLowerCase();
      return all.filter(a => a.name.toLowerCase().includes(q) || a.detail.toLowerCase().includes(q));
    }
    return all;
  }, [rtsData, models3dData, search]);

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.slice(0, 80).map((item, i) => (
        <Card key={i}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs truncate">{item.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px]" style={item.badgeColor ? { borderColor: item.badgeColor, color: item.badgeColor } : {}}>{item.badge}</Badge>
              <span className="text-[10px] text-muted-foreground">{item.size}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssetLibraryWeapons({ data, search }: { data?: OsWeaponsData; search: string }) {
  const items = useMemo(() => {
    if (!data) return [];
    const all = flattenOsWeapons(data);
    if (search) {
      const q = search.toLowerCase();
      return all.filter(w => w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q) || w.weaponCategory.includes(q));
    }
    return all;
  }, [data, search]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.slice(0, 60).map(weapon => (
        <Card key={weapon.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>{weapon.emoji}</span>
              {weapon.name}
            </CardTitle>
            <CardDescription className="text-xs">{weapon.lore}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="outline">{weapon.weaponCategory}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Damage</span>
              <span className="font-medium text-red-500">{weapon.stats.damageBase}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Primary</span>
              <span>{weapon.primaryStat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Signature</span>
              <span className="text-xs truncate max-w-[180px]">{weapon.signatureAbility}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssetLibraryEffects2D({ data, search }: { data?: import("@/lib/objectstore-gamedata").Effects2DData; search: string }) {
  const items = useMemo(() => {
    if (!data) return [];
    const all = flattenEffects2D(data);
    if (search) {
      const q = search.toLowerCase();
      return all.filter(e => e.key.toLowerCase().includes(q) || e.filename.toLowerCase().includes(q) || e.subcategory.includes(q));
    }
    return all;
  }, [data, search]);

  return (
    <div className="grid grid-cols-5 gap-3">
      {items.slice(0, 60).map(effect => (
        <Card key={effect.key} className="overflow-hidden">
          <div className="h-20 bg-black/80 flex items-center justify-center">
            <img src={getEffect2DUrl(effect)} alt={effect.filename} className="max-h-16 max-w-full object-contain" loading="lazy" />
          </div>
          <CardContent className="p-2">
            <p className="text-[10px] font-medium truncate">{effect.filename}</p>
            <Badge variant="secondary" className="text-[10px]">{effect.subcategory}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssetLibraryEffects3D({ data, search }: { data?: Effects3DData; search: string }) {
  const items = useMemo(() => {
    if (!data) return [];
    const all = flatten3DFx(data);
    if (search) {
      const q = search.toLowerCase();
      return all.filter(e => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.some(t => t.includes(q)));
    }
    return all;
  }, [data, search]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(fx => (
        <Card key={fx.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ background: fx.colors.primary }} />
              {fx.name}
            </CardTitle>
            <CardDescription className="text-xs">{fx.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="outline" style={{ borderColor: fx.colors.primary, color: fx.colors.primary }}>{fx.category}</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {fx.tags.slice(0, 4).map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssetLibrarySprites({ data, search }: { data?: import("@/lib/objectstore-gamedata").Sprites2DData; search: string }) {
  const items = useMemo(() => {
    if (!data) return [];
    const all: import("@/lib/objectstore-gamedata").Sprite2D[] = [];
    for (const catData of Object.values(data.categories)) {
      all.push(...catData.items);
    }
    if (search) {
      const q = search.toLowerCase();
      return all.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    return all;
  }, [data, search]);

  const OS_BASE = getOsBaseUrl();

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.slice(0, 120).map(sprite => (
        <Card key={sprite.uuid} className="overflow-hidden">
          <div className="h-16 bg-muted/50 flex items-center justify-center">
            <img src={sprite.src.startsWith("http") ? sprite.src : `${OS_BASE}${sprite.src}`} alt={sprite.name} className="max-h-14 max-w-full object-contain" loading="lazy" />
          </div>
          <CardContent className="p-1.5">
            <p className="text-[10px] font-medium truncate">{sprite.name}</p>
            <p className="text-[9px] text-muted-foreground truncate">{sprite.category}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
