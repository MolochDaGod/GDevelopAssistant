/**
 * Sprite Gallery Component
 * Browse and select sprites for RTS units and objects
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, User, TreePine, Sparkles, Box, Image, FileCode } from 'lucide-react';
import { 
  getAllSprites, 
  getSpritesByCategory,
  type SpriteAsset,
  SPRITE_BEST_PRACTICES 
} from '@/lib/sprite-assets';

interface SpriteGalleryProps {
  onSelectSprite?: (sprite: SpriteAsset) => void;
  selectedSpriteId?: string;
}

export default function SpriteGallery({ onSelectSprite, selectedSpriteId }: SpriteGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | SpriteAsset['category']>('all');
  const [showBestPractices, setShowBestPractices] = useState(false);

  const allSprites = getAllSprites();
  
  const filteredSprites = allSprites.filter(sprite => {
    const matchesSearch = sprite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sprite.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || sprite.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: SpriteAsset['category']) => {
    switch (category) {
      case 'character': return <User className="w-4 h-4" />;
      case 'environment': return <TreePine className="w-4 h-4" />;
      case 'effect': return <Sparkles className="w-4 h-4" />;
      case 'building': return <Box className="w-4 h-4" />;
      case 'projectile': return <Sparkles className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: SpriteAsset['category']) => {
    switch (category) {
      case 'character': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'environment': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'effect': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'building': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'projectile': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const categoryStats = {
    all: allSprites.length,
    character: getSpritesByCategory('character').length,
    environment: getSpritesByCategory('environment').length,
    effect: getSpritesByCategory('effect').length,
    building: getSpritesByCategory('building').length,
    projectile: getSpritesByCategory('projectile').length,
    ui: getSpritesByCategory('ui').length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Sprite Gallery</h2>
            <p className="text-sm text-muted-foreground">
              Browse and select sprites for your units and buildings
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBestPractices(!showBestPractices)}
          >
            <FileCode className="w-4 h-4 mr-2" />
            {showBestPractices ? 'Hide' : 'Show'} Best Practices
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sprites by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="all">
              All ({categoryStats.all})
            </TabsTrigger>
            <TabsTrigger value="character">
              <User className="w-4 h-4 mr-1" />
              {categoryStats.character}
            </TabsTrigger>
            <TabsTrigger value="environment">
              <TreePine className="w-4 h-4 mr-1" />
              {categoryStats.environment}
            </TabsTrigger>
            <TabsTrigger value="effect">
              <Sparkles className="w-4 h-4 mr-1" />
              {categoryStats.effect}
            </TabsTrigger>
            <TabsTrigger value="building">
              <Box className="w-4 h-4 mr-1" />
              {categoryStats.building}
            </TabsTrigger>
            <TabsTrigger value="projectile">
              <Sparkles className="w-4 h-4 mr-1" />
              {categoryStats.projectile}
            </TabsTrigger>
            <TabsTrigger value="ui">
              <Image className="w-4 h-4 mr-1" />
              {categoryStats.ui}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {showBestPractices && (
        <div className="p-4 bg-muted/30 border-b">
          <ScrollArea className="h-48">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {SPRITE_BEST_PRACTICES}
            </pre>
          </ScrollArea>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredSprites.length === 0 ? (
            <div className="text-center py-12">
              <Image className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sprites found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSprites.map((sprite) => (
                <Card
                  key={sprite.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                    selectedSpriteId === sprite.id
                      ? 'ring-2 ring-primary shadow-lg'
                      : ''
                  }`}
                  onClick={() => onSelectSprite?.(sprite)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm line-clamp-1">{sprite.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${getCategoryColor(sprite.category)}`}
                      >
                        {getCategoryIcon(sprite.category)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Sprite preview placeholder */}
                    <div className="aspect-square bg-muted rounded-md flex items-center justify-center border">
                      <div className="text-center p-4">
                        <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {sprite.dimensions
                            ? `${sprite.dimensions.width}x${sprite.dimensions.height}`
                            : 'Sprite preview'}
                        </p>
                      </div>
                    </div>

                    {sprite.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {sprite.description}
                      </p>
                    )}

                    {sprite.animations && (
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(sprite.animations).map((animKey) => (
                          <Badge key={animKey} variant="secondary" className="text-xs">
                            {animKey}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {sprite.path}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
