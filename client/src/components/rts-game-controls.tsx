import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GameMenu {
  type: "main" | "pause" | "victory" | "defeat" | null;
}

interface RTSGameControlsProps {
  onContinue: () => void;
  onRestart: () => void;
  onQuit: () => void;
  stagesCleared?: number;
}

export function RTSGameControls({
  onContinue,
  onRestart,
  onQuit,
  stagesCleared = 0,
}: RTSGameControlsProps) {
  const [menuState, setMenuState] = useState<GameMenu>({ type: null });
  const [keyboardHints, setKeyboardHints] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuState((prev) =>
          prev.type === "pause" ? { type: null } : { type: "pause" }
        );
      }
      if (e.key === "h" || e.key === "H") {
        setKeyboardHints((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const showVictory = () => setMenuState({ type: "victory" });
  const showDefeat = () => setMenuState({ type: "defeat" });
  const closeMenu = () => setMenuState({ type: null });

  return (
    <>
      {keyboardHints && !menuState.type && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 z-10 -translate-x-1/2">
          <Card className="pointer-events-auto bg-background/80 px-4 py-2 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">W/A/S/D</kbd>
                <span className="text-muted-foreground">Pan Camera</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">Q/E</kbd>
                <span className="text-muted-foreground">Rotate</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">Scroll</kbd>
                <span className="text-muted-foreground">Zoom</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">Click</kbd>
                <span className="text-muted-foreground">Select Unit</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">Right Click</kbd>
                <span className="text-muted-foreground">Move/Attack</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">1-9</kbd>
                <span className="text-muted-foreground">Unit Groups</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">ESC</kbd>
                <span className="text-muted-foreground">Pause</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-muted px-2 py-1 font-mono">H</kbd>
                <span className="text-muted-foreground">Hide Hints</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {menuState.type === "pause" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-96 border-2 border-primary/50 bg-background p-8">
            <div className="mb-6 border-b border-border pb-4">
              <h2 className="text-2xl font-bold tracking-tight">Game Paused</h2>
              {stagesCleared > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Total Stages Cleared: <span className="font-semibold text-foreground">{stagesCleared}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Button
                className="w-full justify-start font-mono"
                variant="outline"
                onClick={() => {
                  closeMenu();
                  onContinue();
                }}
                data-testid="button-menu-continue"
              >
                ■ Continue
              </Button>
              <Button
                className="w-full justify-start font-mono"
                variant="outline"
                onClick={() => {
                  closeMenu();
                  onRestart();
                }}
                data-testid="button-menu-restart"
              >
                ■ Restart
              </Button>
              <Button
                className="w-full justify-start font-mono"
                variant="outline"
                onClick={() => {
                  closeMenu();
                  onQuit();
                }}
                data-testid="button-menu-quit"
              >
                ■ Quit to Menu
              </Button>
            </div>
            <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
              Press ESC to close menu
            </div>
          </Card>
        </div>
      )}

      {menuState.type === "victory" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="w-96 border-2 border-green-500/50 bg-background p-8 text-center">
            <h3 className="mb-6 text-3xl font-bold text-green-500">VICTORY</h3>
            <p className="mb-6 text-muted-foreground">
              All enemies have been eliminated!
            </p>
            <div className="space-y-3">
              <Button
                className="w-full justify-start font-mono"
                variant="outline"
                onClick={() => {
                  closeMenu();
                  onRestart();
                }}
                data-testid="button-victory-restart"
              >
                ■ Play Again
              </Button>
              <Button
                className="w-full justify-start font-mono"
                variant="outline"
                onClick={() => {
                  closeMenu();
                  onQuit();
                }}
                data-testid="button-victory-quit"
              >
                ■ Quit to Menu
              </Button>
            </div>
          </Card>
        </div>
      )}

      {menuState.type === "defeat" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="w-96 border-2 border-red-500/50 bg-background p-8 text-center">
            <h3 className="mb-6 text-3xl font-bold text-red-500">GAME OVER</h3>
            <p className="mb-6 text-muted-foreground">
              Your base has been destroyed!
            </p>
            <div className="space-y-3">
              <Button
                className="w-full justify-start font-mono"
                variant="outline"
                onClick={() => {
                  closeMenu();
                  onRestart();
                }}
                data-testid="button-gameover-restart"
              >
                ■ Try Again
              </Button>
              <Button
                className="w-full justify-start font-mono"
                variant="outline"
                onClick={() => {
                  closeMenu();
                  onQuit();
                }}
                data-testid="button-gameover-quit"
              >
                ■ Quit to Menu
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
