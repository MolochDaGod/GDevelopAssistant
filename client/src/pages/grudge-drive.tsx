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

    let carX = canvas.width / 2 - 20;
    let carY = canvas.height - 150;
    let carSpeed = 0;
    let maxSpeed = 15;
    let acceleration = 0.3;
    let rpm = 0;
    let gear = 1;
    let raceProgress = 0;
    let opponentProgress = 0;
    let opponentSpeed = 8 + Math.random() * 4;
    let raceDistance = 400; // meters
    let countdown = 3;
    let countdownTimer = 0;
    let raceStarted = false;
    let raceFinished = false;
    let keys: { [key: string]: boolean } = {};

    // Houston map elements
    const houstonLandmarks = [
      { name: 'Downtown', y: 100 },
      { name: 'Galleria', y: 200 },
      { name: 'Medical Center', y: 300 },
      { name: 'NASA', y: 400 },
    ];

    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;
      if (e.key === 'Shift' && gear < 5) gear++;
      if (e.key === 'Control' && gear > 1) gear--;
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });

    const drawHoustonMap = (offset: number) => {
      // Draw Houston street grid background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw street grid
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const y = (i * 80 + offset) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw landmarks
      ctx.fillStyle = '#444';
      ctx.font = '12px monospace';
      houstonLandmarks.forEach(landmark => {
        const y = (landmark.y + offset) % canvas.height;
        if (y > 0 && y < canvas.height - 50) {
          ctx.fillRect(20, y, 60, 40);
          ctx.fillStyle = '#888';
          ctx.fillText(landmark.name, 25, y + 25);
          ctx.fillStyle = '#444';
        }
      });

      // Main drag strip
      const stripX = canvas.width / 2 - 120;
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(stripX, 0, 240, canvas.height);

      // Starting line
      if (offset < 50) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(stripX, canvas.height - 120, 240, 8);
      }

      // Lane divider
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.setLineDash([20, 15]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Finish line
      const finishY = canvas.height - 150 - (raceDistance * 1.5);
      if (finishY + offset > 0 && finishY + offset < canvas.height) {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#fff' : '#000';
          ctx.fillRect(stripX + i * 20, finishY + offset, 20, 15);
        }
      }
    };

    const drawCar = (x: number, y: number, color: string) => {
      // Car body
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 40, 70);
      
      // Windshield
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(x + 5, y + 10, 30, 20);
      
      // Wheels
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 5, y + 10, 8, 15);
      ctx.fillRect(x + 37, y + 10, 8, 15);
      ctx.fillRect(x - 5, y + 45, 8, 15);
      ctx.fillRect(x + 37, y + 45, 8, 15);
      
      // Headlights
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x + 5, y + 65, 10, 4);
      ctx.fillRect(x + 25, y + 65, 10, 4);
    };

    const drawHUD = () => {
      // Speed and RPM
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 120);
      
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${Math.floor(carSpeed * 10)} MPH`, 20, 40);
      
      ctx.font = '16px monospace';
      ctx.fillText(`RPM: ${Math.floor(rpm)}`, 20, 65);
      ctx.fillText(`GEAR: ${gear}`, 20, 85);
      
      // RPM bar
      ctx.fillStyle = '#333';
      ctx.fillRect(20, 95, 170, 20);
      const rpmPercent = Math.min(rpm / 8000, 1);
      ctx.fillStyle = rpmPercent > 0.8 ? '#ff0000' : '#00ff00';
      ctx.fillRect(20, 95, 170 * rpmPercent, 20);
      
      // Distance
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width - 210, 10, 200, 80);
      ctx.fillStyle = '#fff';
      ctx.font = '18px monospace';
      ctx.fillText(`YOU: ${Math.floor(raceProgress)}m`, canvas.width - 200, 35);
      ctx.fillText(`OPP: ${Math.floor(opponentProgress)}m`, canvas.width - 200, 60);
      ctx.fillText(`/${raceDistance}m`, canvas.width - 200, 80);
    };

    const animate = () => {
      if (!isRacing) return;

      drawHoustonMap(-raceProgress * 1.5);

      // Countdown
      if (!raceStarted) {
        countdownTimer += 16;
        if (countdownTimer > 1000) {
          countdown--;
          countdownTimer = 0;
          if (countdown === 0) {
            raceStarted = true;
          }
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = countdown > 0 ? '#ffff00' : '#00ff00';
        ctx.font = 'bold 120px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(countdown > 0 ? countdown.toString() : 'GO!', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'left';
      }

      if (raceStarted && !raceFinished) {
        // Player controls
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
          carSpeed += acceleration * (gear / 5);
          rpm = Math.min(8000, carSpeed * 500 / gear);
        } else {
          carSpeed *= 0.98;
          rpm *= 0.95;
        }
        
        carSpeed = Math.min(carSpeed, maxSpeed * (gear / 5));
        
        // Lane changing
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
          carX = Math.max(canvas.width / 2 - 110, carX - 3);
        }
        if (keys['ArrowRight'] || keys['d'] || keys['D']) {
          carX = Math.min(canvas.width / 2 + 10, carX + 3);
        }

        raceProgress += carSpeed / 10;
        opponentProgress += opponentSpeed / 10;

        // Check finish
        if (raceProgress >= raceDistance || opponentProgress >= raceDistance) {
          raceFinished = true;
        }
      }

      // Draw cars
      drawCar(carX, carY, '#ff0000');
      
      // Opponent car (left lane)
      const opponentX = canvas.width / 2 - 100;
      const opponentY = canvas.height - 150 + (raceProgress - opponentProgress) * 1.5;
      if (opponentY > -80 && opponentY < canvas.height) {
        drawCar(opponentX, opponentY, '#0066ff');
      }

      drawHUD();

      // Race result
      if (raceFinished) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const won = raceProgress >= raceDistance && raceProgress > opponentProgress;
        ctx.fillStyle = won ? '#00ff00' : '#ff0000';
        ctx.font = 'bold 60px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(won ? 'YOU WIN!' : 'YOU LOSE!', canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.fillStyle = '#fff';
        ctx.font = '24px monospace';
        ctx.fillText(`Your time: ${(raceProgress / carSpeed * 6).toFixed(2)}s`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText(`Opponent: ${(opponentProgress / opponentSpeed * 6).toFixed(2)}s`, canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = 'left';
        
        setTimeout(() => setIsRacing(false), 5000);
      }

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
                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2"><strong className="text-white">Controls:</strong></p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>↑/W - Accelerate</div>
                    <div>←/→ or A/D - Change lanes</div>
                    <div>Shift - Shift up</div>
                    <div>Ctrl - Shift down</div>
                  </div>
                  <p className="text-xs text-yellow-400 mt-2">🏁 Drag race through Houston streets! Perfect your shifts!</p>
                </div>
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
