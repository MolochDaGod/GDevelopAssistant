import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Home, 
  Gamepad2, 
  Car, 
  Sword, 
  Target,
  Users,
  Map,
  Sparkles,
  Info,
  Zap,
  Shield,
  Crosshair
} from "lucide-react";
import { Link } from "wouter";
import { GameContainer, GameContainerGrid } from "@/components/game-ui";

const FEATURED_GAMES = [
  {
    id: "decay",
    title: "Decay",
    description: "FPS zombie survival shooter with intense combat",
    iframeSrc: "/decay/index.html",
    standalonePath: "/decay",
    tags: ["FPS", "Survival", "Zombies"],
    controls: "WASD + Mouse to play",
    aspectRatio: "16:9" as const,
  },
  {
    id: "warlords-viewer",
    title: "Warlords Asset Viewer",
    description: "3D model viewer with animations and terrain",
    iframeSrc: "/grudge-warlords/index.html?scene=viewer",
    standalonePath: "/warlords",
    tags: ["Editor", "3D", "Tools"],
    controls: "Mouse to orbit, Scroll to zoom",
    aspectRatio: "16:9" as const,
  },
  {
    id: "warlords-testing",
    title: "Warlords Testing Grounds",
    description: "Large 3000m procedural terrain for testing",
    iframeSrc: "/grudge-warlords/index.html?scene=testing&biome=grassland",
    standalonePath: "/warlords",
    tags: ["Sandbox", "3D", "Terrain"],
    controls: "WASD to move, Mouse to look",
    aspectRatio: "16:9" as const,
  },
];

const BEST_PRACTICES = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Lazy Loading",
    description: "Games only load when the Play button is clicked, reducing initial page load time",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Iframe Isolation",
    description: "Each game runs in an isolated iframe for security and performance",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Responsive Design",
    description: "Containers adapt to screen size with configurable aspect ratios",
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "Multiple View Modes",
    description: "Play inline, expand to full container, or pop out to standalone page",
  },
  {
    icon: <Crosshair className="w-5 h-5" />,
    title: "Hot Reload",
    description: "Refresh games without leaving the page using the refresh button",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Standalone Support",
    description: "Each game can be accessed directly via its own route for sharing",
  },
];

export default function FeaturedGames() {
  const [activeTab, setActiveTab] = useState("games");

  return (
    <div className="min-h-screen bg-background" data-testid="page-featured-games">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-home">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-primary" />
                Featured Games
              </h1>
              <p className="text-muted-foreground text-sm">
                Play games inline or pop them out for fullscreen experience
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-500 border-green-500/50">
              Best Practices
            </Badge>
            <Badge variant="outline" className="text-blue-500 border-blue-500/50">
              Game Containers
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="games" data-testid="tab-games">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Games
            </TabsTrigger>
            <TabsTrigger value="practices" data-testid="tab-practices">
              <Info className="w-4 h-4 mr-2" />
              Best Practices
            </TabsTrigger>
            <TabsTrigger value="usage" data-testid="tab-usage">
              <Map className="w-4 h-4 mr-2" />
              Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-4">
            <GameContainerGrid>
              {FEATURED_GAMES.map(game => (
                <GameContainer
                  key={game.id}
                  {...game}
                />
              ))}
            </GameContainerGrid>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary">1</Badge>
                    <div>
                      <p className="font-medium">Click Play</p>
                      <p className="text-muted-foreground">Game loads in the container</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary">2</Badge>
                    <div>
                      <p className="font-medium">Expand</p>
                      <p className="text-muted-foreground">Click expand for larger view</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary">3</Badge>
                    <div>
                      <p className="font-medium">Pop Out</p>
                      <p className="text-muted-foreground">Open in standalone page</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practices" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BEST_PRACTICES.map((practice, index) => (
                <Card key={index} className="hover-elevate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-primary">{practice.icon}</span>
                      {practice.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{practice.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Security & Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Iframe Sandboxing:</strong> Games run in isolated iframes, preventing them from accessing the parent page's DOM or data.
                </p>
                <p>
                  <strong>Lazy Loading:</strong> Game assets only load when the user clicks Play, reducing initial page load time significantly.
                </p>
                <p>
                  <strong>Memory Management:</strong> Stopping a game destroys the iframe, freeing up memory for other activities.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Using GameContainer Component</CardTitle>
                <CardDescription>
                  Import and use the GameContainer component to embed games anywhere in your app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { GameContainer, GameContainerGrid } from "@/components/game-ui";

// Single game container
<GameContainer
  id="my-game"
  title="My Game"
  description="A fun game to play"
  iframeSrc="/games/my-game/index.html"
  standalonePath="/my-game"
  tags={["Action", "3D"]}
  controls="WASD to move"
  aspectRatio="16:9"
/>

// Grid of games
<GameContainerGrid>
  <GameContainer {...game1Props} />
  <GameContainer {...game2Props} />
  <GameContainer {...game3Props} />
</GameContainerGrid>`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GameContainer Props</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2">
                    <span>Prop</span>
                    <span>Type</span>
                    <span>Description</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <code>id</code>
                    <span className="text-muted-foreground">string</span>
                    <span className="text-muted-foreground">Unique identifier</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <code>title</code>
                    <span className="text-muted-foreground">string</span>
                    <span className="text-muted-foreground">Game title</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <code>iframeSrc</code>
                    <span className="text-muted-foreground">string</span>
                    <span className="text-muted-foreground">URL to game HTML</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <code>standalonePath</code>
                    <span className="text-muted-foreground">string?</span>
                    <span className="text-muted-foreground">Route for standalone page</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <code>aspectRatio</code>
                    <span className="text-muted-foreground">"16:9" | "4:3" | "1:1"</span>
                    <span className="text-muted-foreground">Container aspect ratio</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <code>tags</code>
                    <span className="text-muted-foreground">string[]</span>
                    <span className="text-muted-foreground">Category badges</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <code>controls</code>
                    <span className="text-muted-foreground">string?</span>
                    <span className="text-muted-foreground">Control hint text</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
