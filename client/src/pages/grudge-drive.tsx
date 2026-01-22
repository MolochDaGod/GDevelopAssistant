import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Trophy, Clock, Gamepad2, Zap, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState, useRef } from "react";
import { overdriveApi, type Track, type LeaderboardEntry } from "@/lib/gameApi";

export default function GrudgeDrive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRacing, setIsRacing] = useState(false);

  useEffect(() => {
    document.title = "Overdrive - Speed. Skill. Survival.";
    loadGameData();
  }, []);

  const loadGameData = async () => {
    try {
      setLoading(true);
      setError(null);
      const tracksData = await overdriveApi.getTracks();
      const leaderboardData = await overdriveApi.getLeaderboard();
      setTracks(tracksData);
      setLeaderboard(leaderboardData);
      if (tracksData.length > 0) {
        setSelectedTrack(tracksData[0]);
      }
    } catch (err) {
      setError('Failed to load game data');
      console.error('Error loading Overdrive data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startRace = async (track: Track) => {
    try {
      setError(null);
      const race = await overdriveApi.startRace(track.id, 'default-vehicle');
      if (race) {
        setIsRacing(true);
        initRaceCanvas();
      } else {
        setError('Failed to start race');
      }
    } catch (err) {
      setError('Error starting race');
      console.error('Error starting race:', err);
    }
  };

  const initRaceCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let carY = canvas.height / 2;
    let speed = 5;
    let roadOffset = 0;

    const animate = () => {
      if (!isRacing) return;

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Road
      ctx.fillStyle = '#333';
      ctx.fillRect(canvas.width / 2 - 100, 0, 200, canvas.height);

      // Lane lines
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      for (let i = -50; i < canvas.height + 50; i += 60) {
        const y = (i + roadOffset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, y);
        ctx.lineTo(canvas.width / 2, y + 30);
        ctx.stroke();
      }

      roadOffset += speed;

      // Car
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(canvas.width / 2 - 20, carY, 40, 70);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(canvas.width / 2 - 15, carY + 10, 30, 25);

      requestAnimationFrame(animate);
    };

    animate();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col" data-testid="page-grudge-drive">
      <header className="bg-black/80 border-b border-red-900/30 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              data-testid="link-back-home"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-red-500" />
            <h1 className="text-xl font-bold text-white">
              OVER<span className="text-red-500">DRIVE</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Gamepad2 className="h-4 w-4" />
          <span>Racing Game</span>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {isRacing && (
            <Card className="bg-gray-900/50 border-red-900/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">Racing!</h3>
                  <Button
                    onClick={() => setIsRacing(false)}
                    variant="outline"
                    size="sm"
                  >
                    End Race
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full rounded-lg border border-red-500/30"
                />
              </CardContent>
            </Card>
          )}
          {error && (
            <Card className="border-red-500/50 bg-red-950/30">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-200">{error}</p>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Card className="bg-gray-900/50 border-red-900/30">
              <CardContent className="p-8 text-center">
                <p className="text-gray-300">Loading tracks...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {/* Tracks List */}
              <div className="col-span-2 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Race Tracks</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {tracks.map((track) => (
                      <Card
                        key={track.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTrack?.id === track.id
                            ? 'bg-red-900/30 border-red-500'
                            : 'bg-gray-900/30 border-gray-700 hover:bg-gray-800/40'
                        }`}
                        onClick={() => setSelectedTrack(track)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-white">{track.name}</h3>
                              <p className="text-sm text-gray-400">{track.description}</p>
                              <div className="flex gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {track.length}m
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Difficulty {track.difficulty}/5
                                </Badge>
                              </div>
                            </div>
                            {track.bestTime && (
                              <div className="text-right">
                                <p className="text-xs text-gray-400">Best Time</p>
                                <p className="text-lg font-bold text-red-400">
                                  {(track.bestTime / 1000).toFixed(2)}s
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="col-span-1 space-y-4">
                {selectedTrack && (
                  <Card className="bg-gray-900/50 border-red-900/30">
                    <CardHeader>
                      <CardTitle className="text-red-400">{selectedTrack.name}</CardTitle>
                      <CardDescription>{selectedTrack.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Distance</span>
                          <span className="font-bold text-white">{selectedTrack.length}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Difficulty</span>
                          <span className="font-bold text-white">{selectedTrack.difficulty}/5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Terrain</span>
                          <span className="font-bold text-white capitalize">{selectedTrack.terrain}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => startRace(selectedTrack)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        data-testid="button-start-race"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Start Race
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <Card className="bg-gray-900/50 border-red-900/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Global Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <div key={entry.playerId} className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-bold text-red-400 w-6">{entry.rank}</span>
                        <div>
                          <p className="text-white font-medium">{entry.playerName}</p>
                          <p className="text-xs text-gray-400">{entry.trackName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{(entry.bestTime / 1000).toFixed(2)}s</p>
                        <p className="text-xs text-gray-400">{entry.completions} runs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
