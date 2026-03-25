/**
 * ============================================================================
 * GRUDGE DRIFT — 3D Racing Game
 * ============================================================================
 * Three.js racing with drift physics, chase camera, procedural track,
 * car customization, and "GRUDGE GRUDGE DRIFT" intro sequence.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, RotateCcw, Gauge, Timer, Trophy, Paintbrush } from 'lucide-react';
import { Link } from 'wouter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DriftGameState = 'intro' | 'garage' | 'racing' | 'results';

interface CarConfig {
  color: number;
  name: string;
  accel: number;
  maxSpeed: number;
  handling: number;
  driftFactor: number;
}

const CAR_PRESETS: CarConfig[] = [
  { color: 0xff2200, name: 'Grudge Fury', accel: 0.08, maxSpeed: 2.5, handling: 0.04, driftFactor: 0.92 },
  { color: 0x0066ff, name: 'Blue Phantom', accel: 0.07, maxSpeed: 2.8, handling: 0.035, driftFactor: 0.94 },
  { color: 0x00cc44, name: 'Venom GT', accel: 0.09, maxSpeed: 2.3, handling: 0.045, driftFactor: 0.90 },
  { color: 0xff8800, name: 'Solar Blaze', accel: 0.06, maxSpeed: 3.0, handling: 0.03, driftFactor: 0.95 },
  { color: 0xaa00ff, name: 'Shadow Drift', accel: 0.085, maxSpeed: 2.6, handling: 0.042, driftFactor: 0.88 },
  { color: 0xffd700, name: 'Gold Rush', accel: 0.075, maxSpeed: 2.7, handling: 0.038, driftFactor: 0.93 },
];

// ---------------------------------------------------------------------------
// Build Track (procedural ring with banked curves)
// ---------------------------------------------------------------------------

function buildTrack(scene: THREE.Scene): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const segments = 80;
  const radius = 60;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const r = radius + Math.sin(t * 3) * 15 + Math.cos(t * 5) * 8;
    points.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r));
  }

  // Track surface
  const trackWidth = 12;
  const shape = new THREE.Shape();
  shape.moveTo(-trackWidth / 2, 0);
  shape.lineTo(trackWidth / 2, 0);

  const path = new THREE.CatmullRomCurve3(points, true);
  const extrudeSettings = { steps: 200, bevelEnabled: false, extrudePath: path };

  // Use a flat PlaneGeometry approach instead — simpler and cleaner
  const trackGeo = new THREE.PlaneGeometry(trackWidth, 1, 1, 200);
  const trackPositions = trackGeo.attributes.position;
  const pathPoints = path.getPoints(200);

  for (let i = 0; i <= 200; i++) {
    const p = pathPoints[i];
    const next = pathPoints[(i + 1) % pathPoints.length];
    const dir = new THREE.Vector3().subVectors(next, p).normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    const leftIdx = i * 2;
    const rightIdx = i * 2 + 1;
    if (leftIdx < trackPositions.count && rightIdx < trackPositions.count) {
      const left = p.clone().add(right.clone().multiplyScalar(-trackWidth / 2));
      const rightP = p.clone().add(right.clone().multiplyScalar(trackWidth / 2));
      trackPositions.setXYZ(leftIdx, left.x, 0.01, left.z);
      trackPositions.setXYZ(rightIdx, rightP.x, 0.01, rightP.z);
    }
  }

  trackGeo.computeVertexNormals();
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.9,
    metalness: 0.1,
  });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.receiveShadow = true;
  scene.add(trackMesh);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(300, 300);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  scene.add(ground);

  // Track edge markers
  for (let i = 0; i < pathPoints.length; i += 5) {
    const p = pathPoints[i];
    const next = pathPoints[(i + 1) % pathPoints.length];
    const dir = new THREE.Vector3().subVectors(next, p).normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    for (const side of [-1, 1]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.8, 6),
        new THREE.MeshStandardMaterial({ color: i % 10 === 0 ? 0xff4400 : 0xffcc00 }),
      );
      const pos = p.clone().add(right.clone().multiplyScalar(side * (trackWidth / 2 + 0.5)));
      cone.position.set(pos.x, 0.4, pos.z);
      cone.castShadow = true;
      scene.add(cone);
    }
  }

  return pathPoints;
}

// ---------------------------------------------------------------------------
// Build Car (procedural Three.js mesh)
// ---------------------------------------------------------------------------

function buildCar(scene: THREE.Scene, config: CarConfig): THREE.Group {
  const car = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(2, 0.6, 4);
  const bodyMat = new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.7, roughness: 0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  car.add(body);

  // Roof
  const roofGeo = new THREE.BoxGeometry(1.6, 0.5, 2);
  const roofMat = new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.6, roughness: 0.4 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 1.05, -0.3);
  roof.castShadow = true;
  car.add(roof);

  // Windshield
  const windGeo = new THREE.BoxGeometry(1.5, 0.45, 0.05);
  const windMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 });
  const windshield = new THREE.Mesh(windGeo, windMat);
  windshield.position.set(0, 0.95, 0.75);
  windshield.rotation.x = -0.3;
  car.add(windshield);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const wheelPositions = [
    [-1, 0.35, 1.3],
    [1, 0.35, 1.3],
    [-1, 0.35, -1.3],
    [1, 0.35, -1.3],
  ];
  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, wy, wz);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    car.add(wheel);
  }

  // Headlights
  for (const side of [-0.6, 0.6]) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 1 }),
    );
    light.position.set(side, 0.5, 2);
    car.add(light);
  }

  // Taillights
  for (const side of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 }),
    );
    tail.position.set(side, 0.5, -2);
    car.add(tail);
  }

  scene.add(car);
  return car;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GrudgeDrift() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<DriftGameState>('intro');
  const [selectedCar, setSelectedCar] = useState(0);
  const [raceTime, setRaceTime] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [lap, setLap] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(3);
  const animRef = useRef(0);

  // Intro sequence
  useEffect(() => {
    if (gameState !== 'intro') return;
    const timer = setTimeout(() => setGameState('garage'), 3500);
    return () => clearTimeout(timer);
  }, [gameState]);

  // Race loop
  const startRace = useCallback(() => {
    if (!containerRef.current) return;
    setGameState('racing');
    setRaceTime(0);
    setSpeed(0);
    setLap(0);
    setCountdown(3);

    const container = containerRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 80, 200);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500);
    camera.position.set(0, 8, -12);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.5);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(sun);

    // Skybox (simple gradient sphere)
    const skyGeo = new THREE.SphereGeometry(200, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x111122,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Build track and car
    const trackPoints = buildTrack(scene);
    const carConfig = CAR_PRESETS[selectedCar];
    const car = buildCar(scene, carConfig);

    // Place car at start
    car.position.copy(trackPoints[0]);
    car.position.y = 0;

    // Physics state
    let carSpeed = 0;
    let carAngle = 0;
    let drifting = false;
    let trackIdx = 0;
    let lapCount = 0;
    let elapsed = 0;
    let started = false;
    let cd = 3;
    let cdTimer = 0;
    const clock = new THREE.Clock();

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = () => {
      const dt = Math.min(clock.getDelta(), 0.05);

      // Countdown
      if (!started) {
        cdTimer += dt;
        if (cdTimer >= 1) {
          cd--;
          cdTimer = 0;
          setCountdown(cd);
          if (cd <= 0) started = true;
        }
      }

      if (started) {
        elapsed += dt;
        setRaceTime(elapsed);

        // Acceleration
        if (keys['w'] || keys['arrowup']) {
          carSpeed = Math.min(carSpeed + carConfig.accel * dt * 60, carConfig.maxSpeed);
        } else {
          carSpeed *= 0.98;
        }
        if (keys['s'] || keys['arrowdown']) {
          carSpeed = Math.max(carSpeed - 0.12 * dt * 60, -0.5);
        }

        // Steering
        const steerAmount = carConfig.handling * dt * 60;
        if (keys['a'] || keys['arrowleft']) carAngle += steerAmount;
        if (keys['d'] || keys['arrowright']) carAngle -= steerAmount;

        // Drift (Space/Shift)
        drifting = !!(keys[' '] || keys['shift']);
        if (drifting) {
          carSpeed *= carConfig.driftFactor;
        }

        // Move car
        car.position.x += Math.sin(carAngle) * carSpeed;
        car.position.z += Math.cos(carAngle) * carSpeed;
        car.rotation.y = carAngle;

        setSpeed(Math.abs(carSpeed) * 100);

        // Track progress (checkpoint proximity)
        const carPos2D = new THREE.Vector2(car.position.x, car.position.z);
        const nextPt = trackPoints[(trackIdx + 1) % trackPoints.length];
        const dist = carPos2D.distanceTo(new THREE.Vector2(nextPt.x, nextPt.z));
        if (dist < 8) {
          trackIdx = (trackIdx + 1) % trackPoints.length;
          if (trackIdx === 0) {
            lapCount++;
            setLap(lapCount);
            if (lapCount >= 3) {
              // Race complete
              setGameState('results');
              if (!bestTime || elapsed < bestTime) setBestTime(elapsed);
              return;
            }
          }
        }
      }

      // Chase camera
      const camOffset = new THREE.Vector3(
        -Math.sin(carAngle) * 12,
        6 + carSpeed * 1.5,
        -Math.cos(carAngle) * 12,
      );
      const desiredCamPos = car.position.clone().add(camOffset);
      camera.position.lerp(desiredCamPos, 4 * dt);
      camera.lookAt(car.position.x, 1, car.position.z);

      renderer.render(scene, camera);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [selectedCar, bestTime]);

  useEffect(() => {
    if (gameState === 'racing') {
      const cleanup = startRace();
      return cleanup;
    }
  }, [gameState, startRace]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="h-screen w-full bg-black text-white overflow-hidden flex flex-col">
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* ── INTRO SEQUENCE ── */}
        {gameState === 'intro' && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
            <div className="text-center animate-pulse">
              <div className="text-6xl font-black tracking-widest text-orange-500 mb-2"
                style={{ fontFamily: "Impact, 'Arial Black', sans-serif", textShadow: '4px 4px 0 #000' }}>
                GRUDGE
              </div>
              <div className="text-6xl font-black tracking-widest text-orange-400 mb-4"
                style={{ fontFamily: "Impact, 'Arial Black', sans-serif", textShadow: '4px 4px 0 #000' }}>
                GRUDGE
              </div>
              <div className="text-8xl font-black tracking-[0.3em] text-white"
                style={{ fontFamily: "Impact, 'Arial Black', sans-serif", textShadow: '6px 6px 0 #ff6600' }}>
                DRIFT
              </div>
              <div className="mt-6 text-sm text-gray-500 animate-bounce">Loading...</div>
            </div>
          </div>
        )}

        {/* ── GARAGE / CAR SELECT ── */}
        {gameState === 'garage' && (
          <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center z-40">
            <div className="max-w-3xl w-full px-6">
              <div className="text-center mb-8">
                <h1 className="text-5xl font-black text-orange-500 tracking-wider mb-2"
                  style={{ fontFamily: "Impact, sans-serif" }}>GRUDGE DRIFT</h1>
                <p className="text-gray-400">Select your ride. 3 laps. Drift to win.</p>
                {bestTime && (
                  <div className="mt-2 text-sm text-yellow-400">
                    <Trophy className="inline h-4 w-4 mr-1" /> Best: {bestTime.toFixed(2)}s
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {CAR_PRESETS.map((car, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCar(i)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedCar === i
                        ? 'border-orange-500 bg-orange-500/10 scale-105'
                        : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full mx-auto mb-2" style={{ background: `#${car.color.toString(16).padStart(6, '0')}` }} />
                    <div className="text-sm font-bold">{car.name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      SPD {Math.round(car.maxSpeed * 40)} · ACC {Math.round(car.accel * 100)} · GRIP {Math.round((1 - car.driftFactor) * 100)}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  className="h-14 px-10 bg-gradient-to-r from-orange-600 to-red-600 text-lg font-bold"
                  onClick={() => setGameState('racing')}
                >
                  <Play className="h-5 w-5 mr-2" /> START RACE
                </Button>
                <Link href="/grudge-drive">
                  <Button variant="outline" className="h-14 border-gray-600 text-gray-300">
                    2D Mode
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="h-14 border-gray-600 text-gray-300">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>
                </Link>
              </div>

              <div className="mt-6 text-center text-xs text-gray-600">
                WASD/Arrows to drive · Space/Shift to drift · 3 laps to finish
              </div>
            </div>
          </div>
        )}

        {/* ── RACING HUD ── */}
        {gameState === 'racing' && (
          <div className="absolute inset-0 pointer-events-none z-30">
            {/* Countdown */}
            {countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[120px] font-black text-yellow-400 animate-pulse"
                  style={{ textShadow: '4px 4px 0 #000' }}>{countdown}</span>
              </div>
            )}
            {countdown === 0 && raceTime < 1 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl font-black text-green-400"
                  style={{ textShadow: '4px 4px 0 #000' }}>GO!</span>
              </div>
            )}

            {/* Speed / Lap HUD */}
            <div className="absolute bottom-6 left-6 bg-black/70 border border-orange-600/40 rounded-lg p-4 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="h-5 w-5 text-orange-400" />
                <span className="text-2xl font-mono font-bold text-white">{Math.floor(speed)} MPH</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300">{raceTime.toFixed(1)}s</span>
                <Badge variant="secondary" className="ml-2 bg-orange-500/20 text-orange-400">
                  Lap {Math.min(lap + 1, 3)}/3
                </Badge>
              </div>
            </div>

            {/* Stop button */}
            <div className="absolute top-4 right-4 pointer-events-auto">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white bg-black/50"
                onClick={() => { cancelAnimationFrame(animRef.current); setGameState('garage'); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Quit
              </Button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {gameState === 'results' && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-40">
            <div className="text-center">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-4xl font-black text-white mb-2">RACE COMPLETE</h2>
              <p className="text-2xl font-mono text-orange-400 mb-1">{raceTime.toFixed(2)}s</p>
              {bestTime && <p className="text-sm text-gray-400 mb-6">Best: {bestTime.toFixed(2)}s</p>}
              <div className="flex gap-3 justify-center">
                <Button className="bg-orange-600 hover:bg-orange-500" onClick={() => setGameState('racing')}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Race Again
                </Button>
                <Button variant="outline" className="border-gray-600" onClick={() => setGameState('garage')}>
                  <Paintbrush className="h-4 w-4 mr-2" /> Garage
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
