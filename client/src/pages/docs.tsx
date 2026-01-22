import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Search, BookOpen, Code, Gamepad2, Box, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const docSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    items: [
      {
        title: "Introduction to GrudgeDevelop",
        content: "GrudgeDevelop is Grudge Studios' powerful game creation engine designed for everyone. Create games without programming using visual events.",
      },
      {
        title: "Your First Game",
        content: "Learn the basics by creating your first game. We'll cover scenes, objects, events, and how to test your game.",
      },
    ],
  },
  {
    id: "game-mechanics",
    title: "Game Mechanics",
    icon: Gamepad2,
    items: [
      {
        title: "Platformer Movement",
        content: "Add platformer behavior to your character. Set jump speed, gravity, and control acceleration for smooth movement.",
      },
      {
        title: "Collision Detection",
        content: "Detect when objects collide using conditions. Create interactive gameplay with proper collision handling.",
      },
      {
        title: "Score and Lives System",
        content: "Track player progress with variables. Update scores, manage lives, and create game over conditions.",
      },
    ],
  },
  {
    id: "3d-features",
    title: "3D Game Development",
    icon: Box,
    items: [
      {
        title: "3D Objects and Models",
        content: "Import and use 3D models in your game. GrudgeDevelop supports GLTF/GLB formats for 3D assets.",
      },
      {
        title: "Third Person Camera",
        content: "Implement a third-person camera that follows your player. Control distance, rotation, and elevation angles.",
      },
      {
        title: "3D Lighting",
        content: "Add dynamic lighting to your 3D scenes. Configure ambient, directional, and point lights.",
      },
    ],
  },
  {
    id: "advanced",
    title: "Advanced Topics",
    icon: Code,
    items: [
      {
        title: "Custom Behaviors",
        content: "Create reusable behaviors for your game objects. Package logic that can be applied to multiple objects.",
      },
      {
        title: "Extensions",
        content: "Extend GrudgeDevelop's capabilities with extensions. Access third-party extensions or create your own.",
      },
      {
        title: "Performance Optimization",
        content: "Optimize your game for better performance. Learn about object pooling, efficient events, and profiling.",
      },
    ],
  },
];

const recommendedTools = [
  {
    name: "Babylon.js Viewer for VS Code",
    description: "Preview and inspect 3D models (GLTF/GLB) directly in VS Code. Essential for validating 3D assets before importing to GrudgeDevelop.",
    url: "https://github.com/bmcbarron/vscode-babylonjs-viewer",
    category: "3D Development",
  },
  {
    name: "wgen Terrain Builder",
    description: "Easy-to-use procedural terrain generator for creating game worlds. Generate heightmaps and export for 3D game environments.",
    url: "https://github.com/jice-nospam/wgen",
    category: "3D Development",
  },
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = docSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Documentation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Learn how to create amazing games with GrudgeDevelop
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation..."
            className="pl-10"
            data-testid="input-search-docs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {filteredSections.length > 0 ? (
            <div className="space-y-6">
              <Card className="p-6 bg-primary/5 border-primary/20" data-testid="section-recommended-tools">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Code className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Recommended Game Development Tools</h2>
                </div>
                <div className="space-y-3">
                  {recommendedTools.map((tool, index) => (
                    <div key={index} className="flex items-start justify-between gap-4 p-4 rounded-lg bg-background border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tool.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {tool.category}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{tool.description}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        data-testid={`button-tool-${index}`}
                      >
                        <a href={tool.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          GitHub
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {filteredSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card key={section.id} className="p-6" data-testid={`section-${section.id}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold">{section.title}</h2>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                      {section.items.map((item, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger className="text-left hover:no-underline">
                            <span className="font-medium">{item.title}</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {item.content}
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold">No documentation found</h2>
              <p className="max-w-md text-muted-foreground">
                Try adjusting your search to find what you're looking for
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
