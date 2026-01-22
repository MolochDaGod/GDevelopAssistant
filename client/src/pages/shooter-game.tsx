import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Home, 
  RotateCcw,
  Trophy,
  Heart,
  Zap,
  Rocket
} from "lucide-react";

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isPlayer: boolean;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  type: 'small' | 'medium' | 'boss';
  shootCooldown: number;
  points: number;
}

interface Powerup {
  x: number;
  y: number;
  type: 'health' | 'rapid' | 'shield';
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  shootCooldown: number;
  rapidFire: boolean;
  rapidFireTimer: number;
  shield: boolean;
  shieldTimer: number;
}

export default function ShooterGame() {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gameDataRef = useRef<{
    player: Player;
    bullets: Bullet[];
    enemies: Enemy[];
    powerups: Powerup[];
    stars: Star[];
    keys: Set<string>;
    wave: number;
    enemiesKilled: number;
    bossSpawned: boolean;
  } | null>(null);
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover' | 'victory'>('menu');
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('shooter-highscore');
    return saved ? parseInt(saved) : 0;
  });

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 700;
  const PLAYER_SPEED = 6;

  const startGame = useCallback(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 1 + Math.random() * 3,
        size: Math.random() * 2 + 1,
      });
    }

    gameDataRef.current = {
      player: {
        x: CANVAS_WIDTH / 2 - 25,
        y: CANVAS_HEIGHT - 80,
        width: 50,
        height: 50,
        health: 100,
        maxHealth: 100,
        shootCooldown: 0,
        rapidFire: false,
        rapidFireTimer: 0,
        shield: false,
        shieldTimer: 0,
      },
      bullets: [],
      enemies: [],
      powerups: [],
      stars,
      keys: new Set(),
      wave: 1,
      enemiesKilled: 0,
      bossSpawned: false,
    };

    setScore(0);
    setWave(1);
    setPlayerHealth(100);
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameDataRef.current) return;
      gameDataRef.current.keys.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameDataRef.current) return;
      gameDataRef.current.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const spawnEnemy = (type: Enemy['type'] = 'small') => {
      if (!gameDataRef.current) return;
      
      let width = 40, height = 40, health = 1, points = 100;
      
      if (type === 'medium') {
        width = 60;
        height = 50;
        health = 3;
        points = 250;
      } else if (type === 'boss') {
        width = 120;
        height = 80;
        health = 20 + gameDataRef.current.wave * 5;
        points = 1000;
      }
      
      gameDataRef.current.enemies.push({
        x: type === 'boss' ? CANVAS_WIDTH / 2 - width / 2 : Math.random() * (CANVAS_WIDTH - width),
        y: type === 'boss' ? -height : -height - Math.random() * 100,
        width,
        height,
        health,
        maxHealth: health,
        type,
        shootCooldown: Math.random() * 60,
        points,
      });
    };

    const spawnWave = () => {
      if (!gameDataRef.current) return;
      
      const wave = gameDataRef.current.wave;
      const enemyCount = 3 + wave * 2;
      
      for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
          const type = Math.random() < 0.2 ? 'medium' : 'small';
          spawnEnemy(type);
        }, i * 500);
      }
    };

    let lastSpawnTime = 0;
    let waveComplete = false;

    const gameLoop = (timestamp: number) => {
      if (gameState !== 'playing' || !gameDataRef.current) return;
      
      const data = gameDataRef.current;
      const player = data.player;
      const keys = data.keys;

      if (keys.has('a') || keys.has('arrowleft')) {
        player.x = Math.max(0, player.x - PLAYER_SPEED);
      }
      if (keys.has('d') || keys.has('arrowright')) {
        player.x = Math.min(CANVAS_WIDTH - player.width, player.x + PLAYER_SPEED);
      }
      if (keys.has('w') || keys.has('arrowup')) {
        player.y = Math.max(CANVAS_HEIGHT / 2, player.y - PLAYER_SPEED);
      }
      if (keys.has('s') || keys.has('arrowdown')) {
        player.y = Math.min(CANVAS_HEIGHT - player.height, player.y + PLAYER_SPEED);
      }

      if (keys.has(' ') && player.shootCooldown <= 0) {
        const cooldown = player.rapidFire ? 5 : 15;
        data.bullets.push({
          x: player.x + player.width / 2 - 3,
          y: player.y,
          vy: -12,
          isPlayer: true,
        });
        player.shootCooldown = cooldown;
      }

      if (player.shootCooldown > 0) player.shootCooldown--;
      
      if (player.rapidFire) {
        player.rapidFireTimer--;
        if (player.rapidFireTimer <= 0) player.rapidFire = false;
      }
      
      if (player.shield) {
        player.shieldTimer--;
        if (player.shieldTimer <= 0) player.shield = false;
      }

      for (let i = data.bullets.length - 1; i >= 0; i--) {
        const bullet = data.bullets[i];
        bullet.y += bullet.vy;
        
        if (bullet.y < -10 || bullet.y > CANVAS_HEIGHT + 10) {
          data.bullets.splice(i, 1);
          continue;
        }

        if (bullet.isPlayer) {
          for (let j = data.enemies.length - 1; j >= 0; j--) {
            const enemy = data.enemies[j];
            if (
              bullet.x > enemy.x &&
              bullet.x < enemy.x + enemy.width &&
              bullet.y > enemy.y &&
              bullet.y < enemy.y + enemy.height
            ) {
              enemy.health--;
              data.bullets.splice(i, 1);
              
              if (enemy.health <= 0) {
                setScore(prev => prev + enemy.points);
                data.enemiesKilled++;
                
                if (Math.random() < 0.1) {
                  const types: Powerup['type'][] = ['health', 'rapid', 'shield'];
                  data.powerups.push({
                    x: enemy.x + enemy.width / 2,
                    y: enemy.y + enemy.height / 2,
                    type: types[Math.floor(Math.random() * types.length)],
                  });
                }
                
                data.enemies.splice(j, 1);
              }
              break;
            }
          }
        } else {
          if (
            bullet.x > player.x &&
            bullet.x < player.x + player.width &&
            bullet.y > player.y &&
            bullet.y < player.y + player.height
          ) {
            if (!player.shield) {
              player.health -= 10;
              setPlayerHealth(player.health);
              
              if (player.health <= 0) {
                if (score > highScore) {
                  setHighScore(score);
                  localStorage.setItem('shooter-highscore', score.toString());
                }
                setGameState('gameover');
                return;
              }
            }
            data.bullets.splice(i, 1);
          }
        }
      }

      for (let i = data.enemies.length - 1; i >= 0; i--) {
        const enemy = data.enemies[i];
        
        if (enemy.type === 'boss') {
          enemy.y = Math.min(100, enemy.y + 1);
          enemy.x += Math.sin(timestamp / 500) * 2;
        } else {
          enemy.y += 1 + data.wave * 0.2;
        }

        enemy.shootCooldown--;
        if (enemy.shootCooldown <= 0) {
          data.bullets.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            vy: enemy.type === 'boss' ? 8 : 5,
            isPlayer: false,
          });
          enemy.shootCooldown = enemy.type === 'boss' ? 20 : 60 + Math.random() * 60;
        }

        if (enemy.y > CANVAS_HEIGHT) {
          data.enemies.splice(i, 1);
        }

        if (
          player.x + player.width > enemy.x &&
          player.x < enemy.x + enemy.width &&
          player.y + player.height > enemy.y &&
          player.y < enemy.y + enemy.height
        ) {
          if (!player.shield) {
            player.health -= 30;
            setPlayerHealth(player.health);
            
            if (player.health <= 0) {
              if (score > highScore) {
                setHighScore(score);
                localStorage.setItem('shooter-highscore', score.toString());
              }
              setGameState('gameover');
              return;
            }
          }
          data.enemies.splice(i, 1);
        }
      }

      for (let i = data.powerups.length - 1; i >= 0; i--) {
        const powerup = data.powerups[i];
        powerup.y += 2;
        
        if (powerup.y > CANVAS_HEIGHT) {
          data.powerups.splice(i, 1);
          continue;
        }
        
        if (
          player.x + player.width > powerup.x - 15 &&
          player.x < powerup.x + 15 &&
          player.y + player.height > powerup.y - 15 &&
          player.y < powerup.y + 15
        ) {
          if (powerup.type === 'health') {
            player.health = Math.min(player.maxHealth, player.health + 30);
            setPlayerHealth(player.health);
          } else if (powerup.type === 'rapid') {
            player.rapidFire = true;
            player.rapidFireTimer = 300;
          } else if (powerup.type === 'shield') {
            player.shield = true;
            player.shieldTimer = 300;
          }
          data.powerups.splice(i, 1);
        }
      }

      const enemiesForWave = 3 + data.wave * 2;
      
      if (data.enemies.length === 0 && data.enemiesKilled >= enemiesForWave) {
        if (!data.bossSpawned && data.wave % 3 === 0) {
          spawnEnemy('boss');
          data.bossSpawned = true;
        } else if (data.bossSpawned || data.wave % 3 !== 0) {
          data.wave++;
          data.enemiesKilled = 0;
          data.bossSpawned = false;
          setWave(data.wave);
          
          if (data.wave > 9) {
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem('shooter-highscore', score.toString());
            }
            setGameState('victory');
            return;
          }
          
          setTimeout(() => spawnWave(), 1000);
        }
      } else if (data.enemies.length === 0 && timestamp - lastSpawnTime > 2000) {
        spawnWave();
        lastSpawnTime = timestamp;
      }

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      for (const star of data.stars) {
        star.y += star.speed;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
        
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.size * 0.2})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      for (const powerup of data.powerups) {
        const colors = { health: '#2ecc71', rapid: '#f1c40f', shield: '#3498db' };
        ctx.fillStyle = colors[powerup.type];
        ctx.beginPath();
        ctx.arc(powerup.x, powerup.y, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        const symbols = { health: '+', rapid: '⚡', shield: '🛡' };
        ctx.fillText(symbols[powerup.type], powerup.x, powerup.y + 4);
      }

      for (const enemy of data.enemies) {
        if (enemy.type === 'boss') {
          ctx.fillStyle = '#8e44ad';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
          ctx.fillStyle = '#9b59b6';
          ctx.fillRect(enemy.x + 10, enemy.y + 10, enemy.width - 20, enemy.height - 20);
          
          ctx.fillStyle = '#e74c3c';
          const healthWidth = (enemy.health / enemy.maxHealth) * (enemy.width - 10);
          ctx.fillRect(enemy.x + 5, enemy.y - 15, healthWidth, 8);
          ctx.strokeStyle = '#fff';
          ctx.strokeRect(enemy.x + 5, enemy.y - 15, enemy.width - 10, 8);
        } else if (enemy.type === 'medium') {
          ctx.fillStyle = '#c0392b';
          ctx.beginPath();
          ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
          ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
          ctx.lineTo(enemy.x, enemy.y + enemy.height);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#e74c3c';
          ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
          ctx.fillStyle = '#c0392b';
          ctx.fillRect(enemy.x + 5, enemy.y + 5, 10, 10);
          ctx.fillRect(enemy.x + enemy.width - 15, enemy.y + 5, 10, 10);
        }
      }

      for (const bullet of data.bullets) {
        ctx.fillStyle = bullet.isPlayer ? '#3498db' : '#e74c3c';
        ctx.fillRect(bullet.x, bullet.y, 6, 15);
      }

      ctx.fillStyle = '#3498db';
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.lineTo(player.x + player.width / 2, player.y + player.height - 15);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(player.x + player.width / 2 - 8, player.y + player.height - 10, 16, 15);
      
      if (player.shield) {
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      if (player.rapidFire) {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y - 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    spawnWave();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, score, highScore]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      {gameState === 'menu' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
              <Rocket className="h-8 w-8 text-blue-500" />
              Space Shooter
            </CardTitle>
            <p className="text-muted-foreground">Defend Earth from alien invaders!</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                High Score: {highScore}
              </Badge>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Controls:</p>
              <p>WASD or Arrow Keys - Move</p>
              <p>Space - Shoot</p>
              <div className="flex gap-2 pt-2">
                <Badge variant="outline" className="bg-green-500/20">+ Health</Badge>
                <Badge variant="outline" className="bg-yellow-500/20">⚡ Rapid</Badge>
                <Badge variant="outline" className="bg-blue-500/20">🛡 Shield</Badge>
              </div>
            </div>
            
            <Button 
              onClick={startGame} 
              className="w-full" 
              size="lg"
              data-testid="button-start-shooter"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Game
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
              data-testid="button-back-home"
            >
              <Home className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === 'playing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {score}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                Wave {wave}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <Progress value={playerHealth} className="w-20 h-2" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGameState('paused')}
              data-testid="button-pause-shooter"
            >
              <Pause className="h-4 w-4" />
            </Button>
          </div>
          
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-border rounded-lg shadow-lg"
            data-testid="canvas-shooter"
          />
        </div>
      )}

      {gameState === 'paused' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Game Paused</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setGameState('playing')} 
              className="w-full"
              data-testid="button-resume-shooter"
            >
              <Play className="h-5 w-5 mr-2" />
              Resume
            </Button>
            <Button 
              variant="outline" 
              onClick={startGame} 
              className="w-full"
              data-testid="button-restart-shooter"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Restart
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setGameState('menu')} 
              className="w-full"
            >
              <Home className="h-5 w-5 mr-2" />
              Main Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === 'gameover' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-500">Game Over!</CardTitle>
            <div className="space-y-1">
              <p className="text-muted-foreground">Final Score: {score}</p>
              <p className="text-muted-foreground">Reached Wave: {wave}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {score >= highScore && score > 0 && (
              <div className="text-center">
                <Badge className="bg-yellow-500 text-yellow-900">New High Score!</Badge>
              </div>
            )}
            <Button 
              onClick={startGame} 
              className="w-full"
              data-testid="button-try-again"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setGameState('menu')} 
              className="w-full"
            >
              <Home className="h-5 w-5 mr-2" />
              Main Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === 'victory' && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-500 flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6" />
              Victory!
            </CardTitle>
            <p className="text-muted-foreground">You defeated all waves!</p>
            <p className="text-lg font-bold">Final Score: {score}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {score >= highScore && (
              <div className="text-center">
                <Badge className="bg-yellow-500 text-yellow-900">New High Score!</Badge>
              </div>
            )}
            <Button 
              onClick={startGame} 
              className="w-full"
              data-testid="button-play-again"
            >
              <Play className="h-5 w-5 mr-2" />
              Play Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setGameState('menu')} 
              className="w-full"
            >
              <Home className="h-5 w-5 mr-2" />
              Main Menu
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
