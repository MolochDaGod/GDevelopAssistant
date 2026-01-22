import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Gamepad2, Calendar, Trash2, ExternalLink, Play, Joystick, Puzzle, Zap, Rocket, Swords, Crown } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { GameProject } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

const gameTypeInfo: Record<string, { label: string; demoUrl: string; icon: any; color: string }> = {
  "2d-platformer": { label: "2D Platformer", demoUrl: "/platformer", icon: Joystick, color: "#4ade80" },
  "2d-topdown": { label: "2D Top-Down", demoUrl: "/shooter", icon: Rocket, color: "#f97316" },
  "2d-sidescroller": { label: "2D Side-Scroller", demoUrl: "/runner", icon: Zap, color: "#facc15" },
  "3d-platformer": { label: "3D Platformer", demoUrl: "/warlords", icon: Joystick, color: "#22d3ee" },
  "3d-fps": { label: "3D First-Person", demoUrl: "/warlords", icon: Rocket, color: "#f43f5e" },
  "3d-racing": { label: "3D Racing", demoUrl: "/warlords", icon: Rocket, color: "#06b6d4" },
  "3d-strategy": { label: "3D Strategy", demoUrl: "/rts-builder", icon: Swords, color: "#8b5cf6" },
  "puzzle": { label: "Puzzle Game", demoUrl: "/puzzle", icon: Puzzle, color: "#a78bfa" },
  "rpg": { label: "RPG", demoUrl: "/rts-builder", icon: Swords, color: "#818cf8" },
  "card-battle": { label: "Card Battle", demoUrl: "/crown-clash", icon: Crown, color: "#fbbf24" },
  "endless-runner": { label: "Endless Runner", demoUrl: "/runner", icon: Zap, color: "#34d399" },
  "space-shooter": { label: "Space Shooter", demoUrl: "/shooter", icon: Rocket, color: "#60a5fa" },
  "match-3": { label: "Match-3 Puzzle", demoUrl: "/puzzle", icon: Puzzle, color: "#f472b6" },
  "rts": { label: "Real-Time Strategy", demoUrl: "/rts-builder", icon: Swords, color: "#dc2626" },
  "moba": { label: "MOBA Arena", demoUrl: "/moba-arena", icon: Swords, color: "#dc2626" },
};

const normalizeGameType = (gameType: string): string => {
  const normalized = gameType.toLowerCase().replace(/\s+/g, '-');
  if (gameTypeInfo[normalized]) return normalized;
  if (normalized.includes('platformer')) return normalized.includes('3d') ? '3d-platformer' : '2d-platformer';
  if (normalized.includes('racing')) return '3d-racing';
  if (normalized.includes('strategy') || normalized.includes('city') || normalized.includes('builder')) return '3d-strategy';
  if (normalized.includes('shooter') || normalized.includes('fps')) return 'space-shooter';
  if (normalized.includes('puzzle') || normalized.includes('match')) return 'puzzle';
  if (normalized.includes('moba') || normalized.includes('arena')) return 'moba';
  if (normalized.includes('rts')) return 'rts';
  if (normalized.includes('card')) return 'card-battle';
  if (normalized.includes('runner')) return 'endless-runner';
  return '2d-platformer';
};

export default function ProjectsPage() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [gameType, setGameType] = useState("2d-platformer");

  const { data: projects, isLoading } = useQuery<GameProject[]>({
    queryKey: ["/api/projects"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/projects", {
        name: projectName,
        description: projectDescription,
        gameType,
        specifications: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsDialogOpen(false);
      setProjectName("");
      setProjectDescription("");
      setGameType("2d-platformer");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/projects/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              My Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your game development projects
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-project">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-new-project">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Start a new game development project with AI assistance
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Awesome Game"
                    data-testid="input-project-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="A brief description of your game..."
                    data-testid="input-project-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Game Type</Label>
                  <Select value={gameType} onValueChange={setGameType}>
                    <SelectTrigger id="type" data-testid="select-game-type">
                      <SelectValue placeholder="Select game type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2d-platformer">2D Platformer</SelectItem>
                      <SelectItem value="2d-topdown">2D Top-Down</SelectItem>
                      <SelectItem value="2d-sidescroller">2D Side-Scroller</SelectItem>
                      <SelectItem value="3d-platformer">3D Platformer</SelectItem>
                      <SelectItem value="3d-fps">3D First-Person</SelectItem>
                      <SelectItem value="puzzle">Puzzle Game</SelectItem>
                      <SelectItem value="rpg">RPG</SelectItem>
                      <SelectItem value="card-battle">Card Battle</SelectItem>
                      <SelectItem value="endless-runner">Endless Runner</SelectItem>
                      <SelectItem value="space-shooter">Space Shooter</SelectItem>
                      <SelectItem value="match-3">Match-3 Puzzle</SelectItem>
                      <SelectItem value="rts">Real-Time Strategy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createProjectMutation.mutate()}
                  disabled={!projectName.trim() || createProjectMutation.isPending}
                  data-testid="button-create-project"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 animate-pulse" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const normalizedType = normalizeGameType(project.gameType);
              const info = gameTypeInfo[normalizedType];
              const Icon = info?.icon || Gamepad2;
              const accentColor = info?.color || "#dc2626";
              
              return (
              <Card
                key={project.id}
                className="hover-elevate transition-all overflow-hidden"
                data-testid={`card-project-${project.id}`}
              >
                <div 
                  className="h-32 w-full relative flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, #18181b 0%, #0a0a0a 50%, ${accentColor}15 100%)`,
                    borderBottom: `2px solid ${accentColor}40`
                  }}
                >
                  <div 
                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ 
                      backgroundColor: `${accentColor}20`,
                      border: `2px solid ${accentColor}50`
                    }}
                  >
                    <Icon className="h-8 w-8" style={{ color: accentColor }} />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge 
                      variant="outline" 
                      className="text-[10px] border-white/20 text-white/70"
                    >
                      {info?.label || project.gameType}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 left-3 right-3">
                    <h3 className="font-semibold text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {project.name}
                    </h3>
                  </div>
                </div>
                <CardContent className="pt-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {project.description || "No description"}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {info?.label || project.gameType}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const normalizedType = normalizeGameType(project.gameType);
                      const info = gameTypeInfo[normalizedType];
                      if (info) {
                        setLocation(info.demoUrl);
                      }
                    }}
                    data-testid={`button-play-demo-${project.id}`}
                  >
                    <Play className="h-3 w-3 mr-2" />
                    Play Demo
                  </Button>
                  {(project.specifications as any)?.grudgeEngineUrl ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/editor?project=${encodeURIComponent((project.specifications as any).grudgeEngineUrl)}`)}
                        data-testid="button-open-editor"
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Editor
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteProjectMutation.mutate(project.id)}
                    data-testid="button-delete-project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Gamepad2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No projects yet</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Create your first game project to get started with AI-assisted development
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-project">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
