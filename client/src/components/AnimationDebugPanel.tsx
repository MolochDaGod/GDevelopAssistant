import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import {
  AnimationDebugger,
  AnimationControllerBridge,
  type CharacterAnimationState,
  type AnimationEvent
} from '@/lib/rts-animation';

interface AnimationDebugPanelProps {
  debugger?: AnimationDebugger;
  bridge?: AnimationControllerBridge;
  enabled?: boolean;
  onClose?: () => void;
}

export function AnimationDebugPanel({
  debugger: animDebugger,
  bridge,
  enabled = true,
  onClose
}: AnimationDebugPanelProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [characterStates, setCharacterStates] = useState<CharacterAnimationState[]>([]);
  const [events, setEvents] = useState<AnimationEvent[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled || !animDebugger || isPaused) return;

    const interval = setInterval(() => {
      setCharacterStates(animDebugger.getAllCharacterStates());

      if (selectedCharacter) {
        setEvents(animDebugger.getAnimationTimeline(selectedCharacter, 20));
        setConflicts(animDebugger.checkBlendConflicts(selectedCharacter));
      }

      setMetrics(animDebugger.getPerformanceReport());
    }, 100);

    return () => clearInterval(interval);
  }, [animDebugger, enabled, isPaused, selectedCharacter]);

  if (!animDebugger || !enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] z-50 shadow-2xl">
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <CardTitle className="text-cyan-400">Animation Debug</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsPaused(!isPaused)}
              className="h-6 w-6 p-0"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => animDebugger.clear()}
              className="h-6 w-6 p-0"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const data = animDebugger.exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `anim-debug-${Date.now()}.json`;
                a.click();
              }}
              className="h-6 w-6 p-0"
            >
              <Download className="w-3 h-3" />
            </Button>
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 max-h-[520px] overflow-y-auto text-xs">
          {metrics && (
            <div className="bg-gray-800/50 p-2 rounded space-y-1">
              <p className="font-semibold text-gray-300">Performance</p>
              <div className="grid grid-cols-2 gap-2 text-gray-400">
                <div>Avg Blend: {metrics.averageBlendTime.toFixed(3)}s</div>
                <div>Error Rate: {(metrics.animationErrorRate * 100).toFixed(1)}%</div>
                <div>Events: {metrics.totalEvents}</div>
                <div>Memory: {metrics.memoryUsage}</div>
              </div>
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 p-2 rounded space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <p className="font-semibold text-red-300">Issues</p>
              </div>
              <div className="space-y-1">
                {conflicts.map((conflict, i) => (
                  <p key={i} className="text-red-300/80">
                    • {conflict}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="font-semibold text-gray-300">Characters ({characterStates.length})</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {characterStates.map(state => (
                <button
                  key={state.characterId}
                  onClick={() => setSelectedCharacter(state.characterId)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    selectedCharacter === state.characterId
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-gray-800/30 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-gray-300">{state.characterId}</span>
                    <div className="flex items-center gap-1">
                      {state.isTransitioning && (
                        <Zap className="w-3 h-3 text-yellow-400" />
                      )}
                      {state.currentAnimation && (
                        <Badge variant="outline" className="text-xs">
                          {state.currentAnimation}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {state.blendingTo && (
                    <p className="text-gray-500 text-xs mt-1">
                      → {state.blendingTo} ({(state.blendProgress * 100).toFixed(0)}%)
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedCharacter && events.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-gray-300">Timeline</p>
              <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-800/30 p-2 rounded">
                {events.map((event, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-400">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full" 
                         style={{
                           backgroundColor: ({
                             'start': '#22c55e',
                             'end': '#ef4444',
                             'blend': '#3b82f6',
                             'interrupt': '#f59e0b',
                             'error': '#dc2626'
                           } as Record<string, string>)[event.type] || '#6b7280'
                         }}
                    />
                    <span className="flex-1">
                      <span className="text-gray-400">{event.type}:</span>
                      <span className="ml-1">{event.animationName}</span>
                    </span>
                    {event.blendTime && (
                      <span className="text-gray-500">{event.blendTime.toFixed(2)}s</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Blend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Error</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnimationDebugPanel;
