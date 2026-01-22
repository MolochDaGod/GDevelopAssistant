import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HotkeyReferenceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HotkeyReference({ open, onOpenChange }: HotkeyReferenceProps) {
  const hotkeyCategories = [
    {
      category: "Camera Controls",
      hotkeys: [
        { keys: ["W", "A", "S", "D"], description: "Move camera" },
        { keys: ["Q", "E"], description: "Rotate camera" },
        { keys: ["Mouse Wheel"], description: "Zoom in/out" },
        { keys: ["Middle Mouse"], description: "Pan camera (drag)" },
      ],
    },
    {
      category: "Unit Selection",
      hotkeys: [
        { keys: ["Left Click"], description: "Select unit" },
        { keys: ["Ctrl", "+", "1-9"], description: "Save unit group" },
        { keys: ["1-9"], description: "Select unit group" },
      ],
    },
    {
      category: "Unit Commands",
      hotkeys: [
        { keys: ["Right Click"], description: "Move/Attack command" },
      ],
    },
    {
      category: "Game Controls",
      hotkeys: [
        { keys: ["Esc"], description: "Open menu" },
        { keys: ["Space"], description: "Pause game" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]" data-testid="dialog-hotkey-reference">
        <DialogHeader>
          <DialogTitle>Keyboard & Mouse Controls</DialogTitle>
          <DialogDescription>
            Master these shortcuts for better gameplay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hotkeyCategories.map((category) => (
            <Card key={category.category}>
              <CardContent className="p-4">
                <h4 className="mb-3 font-semibold">{category.category}</h4>
                <div className="space-y-2">
                  {category.hotkeys.map((hotkey, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4"
                      data-testid={`hotkey-item-${idx}`}
                    >
                      <span className="text-sm text-muted-foreground">
                        {hotkey.description}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {hotkey.keys.map((key, keyIdx) => (
                          <Badge
                            key={keyIdx}
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
