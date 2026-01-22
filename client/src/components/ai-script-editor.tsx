import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Save, Play, Copy, Brain, Sword, Shield, Heart, Footprints, Target, Home, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface BehaviorConfig {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: ConditionConfig[];
  actions: ActionConfig[];
  enabled: boolean;
}

export interface ConditionConfig {
  id: string;
  type: 'health_below' | 'health_above' | 'enemy_nearby' | 'ally_nearby' | 'resource_nearby' | 'distance_from_home' | 'has_target' | 'custom';
  value: number;
  operator?: 'and' | 'or';
  customScript?: string;
}

export interface ActionConfig {
  id: string;
  type: 'move_to' | 'attack' | 'flee' | 'patrol' | 'gather' | 'return_home' | 'wait' | 'custom';
  params: Record<string, number | string | boolean>;
  customScript?: string;
}

interface AIScriptEditorProps {
  unitType: string;
  initialBehaviors?: BehaviorConfig[];
  onSave?: (behaviors: BehaviorConfig[]) => void;
  onTest?: (behaviors: BehaviorConfig[]) => void;
}

const DEFAULT_BEHAVIORS: BehaviorConfig[] = [
  {
    id: 'flee_low_health',
    name: 'Flee When Low Health',
    description: 'Run away when health drops below 20%',
    priority: 100,
    enabled: true,
    conditions: [
      { id: 'c1', type: 'health_below', value: 20 },
      { id: 'c2', type: 'enemy_nearby', value: 15, operator: 'and' }
    ],
    actions: [
      { id: 'a1', type: 'flee', params: { speed: 1.5, distance: 20 } }
    ]
  },
  {
    id: 'attack_enemy',
    name: 'Attack Nearby Enemies',
    description: 'Engage enemies within attack range',
    priority: 80,
    enabled: true,
    conditions: [
      { id: 'c1', type: 'enemy_nearby', value: 25 },
      { id: 'c2', type: 'health_above', value: 30, operator: 'and' }
    ],
    actions: [
      { id: 'a1', type: 'attack', params: { chaseDistance: 15, retreatOnLowHealth: true } }
    ]
  },
  {
    id: 'patrol',
    name: 'Patrol Area',
    description: 'Patrol between waypoints when idle',
    priority: 30,
    enabled: true,
    conditions: [
      { id: 'c1', type: 'enemy_nearby', value: 0 }
    ],
    actions: [
      { id: 'a1', type: 'patrol', params: { radius: 10, waitTime: 2 } }
    ]
  },
  {
    id: 'idle_wander',
    name: 'Idle Wander',
    description: 'Wander around home position when nothing else to do',
    priority: 10,
    enabled: true,
    conditions: [],
    actions: [
      { id: 'a1', type: 'move_to', params: { randomRadius: 5 } },
      { id: 'a2', type: 'wait', params: { duration: 2 } }
    ]
  }
];

const CONDITION_TYPES = [
  { value: 'health_below', label: 'Health Below %', icon: Heart },
  { value: 'health_above', label: 'Health Above %', icon: Heart },
  { value: 'enemy_nearby', label: 'Enemy Within Range', icon: Target },
  { value: 'ally_nearby', label: 'Ally Within Range', icon: Shield },
  { value: 'resource_nearby', label: 'Resource Nearby', icon: Flag },
  { value: 'distance_from_home', label: 'Distance From Home', icon: Home },
  { value: 'has_target', label: 'Has Target', icon: Sword },
  { value: 'custom', label: 'Custom Script', icon: Brain }
];

const ACTION_TYPES = [
  { value: 'move_to', label: 'Move To', icon: Footprints },
  { value: 'attack', label: 'Attack', icon: Sword },
  { value: 'flee', label: 'Flee', icon: Shield },
  { value: 'patrol', label: 'Patrol', icon: Flag },
  { value: 'gather', label: 'Gather Resource', icon: Target },
  { value: 'return_home', label: 'Return Home', icon: Home },
  { value: 'wait', label: 'Wait', icon: Heart },
  { value: 'custom', label: 'Custom Script', icon: Brain }
];

export function AIScriptEditor({ unitType, initialBehaviors, onSave, onTest }: AIScriptEditorProps) {
  const { toast } = useToast();
  const [behaviors, setBehaviors] = useState<BehaviorConfig[]>(initialBehaviors ?? DEFAULT_BEHAVIORS);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string | null>(behaviors[0]?.id ?? null);
  const [hasChanges, setHasChanges] = useState(false);

  const selectedBehavior = behaviors.find(b => b.id === selectedBehaviorId);

  const addBehavior = useCallback(() => {
    const newBehavior: BehaviorConfig = {
      id: `behavior_${Date.now()}`,
      name: 'New Behavior',
      description: 'Describe this behavior',
      priority: 50,
      enabled: true,
      conditions: [],
      actions: []
    };
    setBehaviors(prev => [...prev, newBehavior]);
    setSelectedBehaviorId(newBehavior.id);
    setHasChanges(true);
  }, []);

  const deleteBehavior = useCallback((id: string) => {
    setBehaviors(prev => prev.filter(b => b.id !== id));
    if (selectedBehaviorId === id) {
      setSelectedBehaviorId(behaviors[0]?.id ?? null);
    }
    setHasChanges(true);
  }, [selectedBehaviorId, behaviors]);

  const updateBehavior = useCallback((id: string, updates: Partial<BehaviorConfig>) => {
    setBehaviors(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    setHasChanges(true);
  }, []);

  const addCondition = useCallback((behaviorId: string) => {
    const newCondition: ConditionConfig = {
      id: `cond_${Date.now()}`,
      type: 'enemy_nearby',
      value: 10
    };
    setBehaviors(prev => prev.map(b => 
      b.id === behaviorId 
        ? { ...b, conditions: [...b.conditions, newCondition] }
        : b
    ));
    setHasChanges(true);
  }, []);

  const updateCondition = useCallback((behaviorId: string, conditionId: string, updates: Partial<ConditionConfig>) => {
    setBehaviors(prev => prev.map(b => 
      b.id === behaviorId 
        ? { 
            ...b, 
            conditions: b.conditions.map(c => 
              c.id === conditionId ? { ...c, ...updates } : c
            ) 
          }
        : b
    ));
    setHasChanges(true);
  }, []);

  const deleteCondition = useCallback((behaviorId: string, conditionId: string) => {
    setBehaviors(prev => prev.map(b => 
      b.id === behaviorId 
        ? { ...b, conditions: b.conditions.filter(c => c.id !== conditionId) }
        : b
    ));
    setHasChanges(true);
  }, []);

  const addAction = useCallback((behaviorId: string) => {
    const newAction: ActionConfig = {
      id: `action_${Date.now()}`,
      type: 'move_to',
      params: {}
    };
    setBehaviors(prev => prev.map(b => 
      b.id === behaviorId 
        ? { ...b, actions: [...b.actions, newAction] }
        : b
    ));
    setHasChanges(true);
  }, []);

  const updateAction = useCallback((behaviorId: string, actionId: string, updates: Partial<ActionConfig>) => {
    setBehaviors(prev => prev.map(b => 
      b.id === behaviorId 
        ? { 
            ...b, 
            actions: b.actions.map(a => 
              a.id === actionId ? { ...a, ...updates } : a
            ) 
          }
        : b
    ));
    setHasChanges(true);
  }, []);

  const deleteAction = useCallback((behaviorId: string, actionId: string) => {
    setBehaviors(prev => prev.map(b => 
      b.id === behaviorId 
        ? { ...b, actions: b.actions.filter(a => a.id !== actionId) }
        : b
    ));
    setHasChanges(true);
  }, []);

  const handleSave = () => {
    onSave?.(behaviors);
    setHasChanges(false);
    toast({
      title: "Behaviors Saved",
      description: `Saved ${behaviors.length} behavior configurations for ${unitType}`,
    });
  };

  const handleTest = () => {
    onTest?.(behaviors);
    toast({
      title: "Testing Behaviors",
      description: "Applying behaviors to test units in the game",
    });
  };

  const duplicateBehavior = useCallback((behavior: BehaviorConfig) => {
    const newBehavior: BehaviorConfig = {
      ...behavior,
      id: `behavior_${Date.now()}`,
      name: `${behavior.name} (Copy)`,
      conditions: behavior.conditions.map(c => ({ ...c, id: `cond_${Date.now()}_${Math.random()}` })),
      actions: behavior.actions.map(a => ({ ...a, id: `action_${Date.now()}_${Math.random()}` }))
    };
    setBehaviors(prev => [...prev, newBehavior]);
    setSelectedBehaviorId(newBehavior.id);
    setHasChanges(true);
  }, []);

  return (
    <div className="flex h-full gap-4">
      <Card className="w-64 flex-shrink-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" />
            {unitType} Behaviors
          </CardTitle>
          <CardDescription className="text-xs">
            Configure AI behavior scripts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {behaviors
                .sort((a, b) => b.priority - a.priority)
                .map((behavior) => (
                  <div
                    key={behavior.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedBehaviorId === behavior.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover-elevate'
                    }`}
                    onClick={() => setSelectedBehaviorId(behavior.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{behavior.name}</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          P:{behavior.priority}
                        </Badge>
                        {!behavior.enabled && (
                          <Badge variant="secondary" className="text-[10px]">Off</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
          
          <Button 
            className="w-full mt-2" 
            size="sm" 
            variant="outline"
            onClick={addBehavior}
            data-testid="button-add-behavior"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Behavior
          </Button>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        {selectedBehavior ? (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Input
                  value={selectedBehavior.name}
                  onChange={(e) => updateBehavior(selectedBehavior.id, { name: e.target.value })}
                  className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                  data-testid="input-behavior-name"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedBehavior.enabled}
                    onCheckedChange={(enabled) => updateBehavior(selectedBehavior.id, { enabled })}
                    data-testid="switch-behavior-enabled"
                  />
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => duplicateBehavior(selectedBehavior)}
                    data-testid="button-duplicate-behavior"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => deleteBehavior(selectedBehavior.id)}
                    data-testid="button-delete-behavior"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                value={selectedBehavior.description}
                onChange={(e) => updateBehavior(selectedBehavior.id, { description: e.target.value })}
                className="text-sm text-muted-foreground resize-none"
                rows={2}
                data-testid="input-behavior-description"
              />
            </CardHeader>
            
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Priority (Higher = Checked First)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[selectedBehavior.priority]}
                      onValueChange={([v]) => updateBehavior(selectedBehavior.id, { priority: v })}
                      min={1}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <Badge variant="outline">{selectedBehavior.priority}</Badge>
                  </div>
                </div>

                <Accordion type="multiple" defaultValue={['conditions', 'actions']}>
                  <AccordionItem value="conditions">
                    <AccordionTrigger className="text-sm">
                      Conditions ({selectedBehavior.conditions.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {selectedBehavior.conditions.map((condition, index) => (
                          <div key={condition.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            {index > 0 && (
                              <Select
                                value={condition.operator ?? 'and'}
                                onValueChange={(v) => updateCondition(selectedBehavior.id, condition.id, { operator: v as 'and' | 'or' })}
                              >
                                <SelectTrigger className="w-16 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="and">AND</SelectItem>
                                  <SelectItem value="or">OR</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            
                            <Select
                              value={condition.type}
                              onValueChange={(v) => updateCondition(selectedBehavior.id, condition.id, { type: v as ConditionConfig['type'] })}
                            >
                              <SelectTrigger className="flex-1 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CONDITION_TYPES.map(ct => (
                                  <SelectItem key={ct.value} value={ct.value}>
                                    {ct.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Input
                              type="number"
                              value={condition.value}
                              onChange={(e) => updateCondition(selectedBehavior.id, condition.id, { value: parseFloat(e.target.value) || 0 })}
                              className="w-20 h-8"
                            />
                            
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => deleteCondition(selectedBehavior.id, condition.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => addCondition(selectedBehavior.id)}
                          data-testid="button-add-condition"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Condition
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="actions">
                    <AccordionTrigger className="text-sm">
                      Actions ({selectedBehavior.actions.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {selectedBehavior.actions.map((action, index) => (
                          <div key={action.id} className="p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                              
                              <Select
                                value={action.type}
                                onValueChange={(v) => updateAction(selectedBehavior.id, action.id, { type: v as ActionConfig['type'] })}
                              >
                                <SelectTrigger className="flex-1 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map(at => (
                                    <SelectItem key={at.value} value={at.value}>
                                      {at.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => deleteAction(selectedBehavior.id, action.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {action.type === 'custom' && (
                              <Textarea
                                value={action.customScript ?? ''}
                                onChange={(e) => updateAction(selectedBehavior.id, action.id, { customScript: e.target.value })}
                                placeholder="// Custom action script..."
                                className="mt-2 font-mono text-xs"
                                rows={3}
                              />
                            )}
                          </div>
                        ))}
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => addAction(selectedBehavior.id)}
                          data-testid="button-add-action"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Action
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Select a behavior to edit</p>
          </CardContent>
        )}

        <div className="p-4 border-t flex justify-between">
          <Button variant="outline" onClick={handleTest} data-testid="button-test-behaviors">
            <Play className="w-4 h-4 mr-1" />
            Test
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} data-testid="button-save-behaviors">
            <Save className="w-4 h-4 mr-1" />
            Save Behaviors
          </Button>
        </div>
      </Card>
    </div>
  );
}
