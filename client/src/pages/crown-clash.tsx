import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as THREE from "three";
import {
  Play, Pause, Home, Crown, Zap, Timer, Shield, Target, Swords
} from "lucide-react";
import {
  CrownClashSceneManager, UnitFactory, BuildingSystem, CombatSystem, AIOpponent,
} from "@/lib/crown-clash";
import type { FactionId, Difficulty } from "@/lib/crown-clash";
import {
  getDefaultDeck, RARITY_COLORS, CARD_TYPE_COLORS,
} from "@/data/crown-clash-cards";
import type { CrownClashCard } from "@/data/crown-clash-cards";

type GameState = "menu" | "loading" | "playing" | "ended";

const GAME_DURATION = 180;
const OVERTIME_DURATION = 60;
const MAX_ELIXIR = 10;
const ELIXIR_REGEN = 1 / 2.8;
const OT_ELIXIR_REGEN = 1 / 1.4;

const DIFF_COLORS: Record<Difficulty, { bg: string; name: string }> = {
  easy: { bg: "#fbbf24", name: "Easy" },
  medium: { bg: "#3b82f6", name: "Medium" },
  hard: { bg: "#dc2626", name: "Hard" },
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function CrownClash() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef(0);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const arenaRef = useRef<CrownClashSceneManager | null>(null);
  const ufRef = useRef<UnitFactory | null>(null);
  const bsRef = useRef<BuildingSystem | null>(null);
  const csRef = useRef<CombatSystem | null>(null);
  const aiRef = useRef<AIOpponent | null>(null);

  const [gs, setGs] = useState<GameState>("menu");
  const [faction, setFaction] = useState<FactionId>("elves");
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [paused, setPaused] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [elixir, setElixir] = useState(5);
  const [pCrowns, setPCrowns] = useState(0);
  const [eCrowns, setECrowns] = useState(0);
  const [time, setTime] = useState(0);
  const [ot, setOt] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [selCard, setSelCard] = useState<number | null>(null);
  const [hand, setHand] = useState<CrownClashCard[]>([]);

  const drawPile = useRef<CrownClashCard[]>([]);
  const handRef = useRef<CrownClashCard[]>([]);
  const elxRef = useRef(5);
  const gtRef = useRef(0);
  const endedRef = useRef(false);
  const pcRef = useRef(0);
  const ecRef = useRef(0);
  const ray = useRef(new THREE.Raycaster());
  const gndPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  /* ===== START GAME ===== */
  const startGame = useCallback(async () => {
    setGs("loading");
    const ct = containerRef.current;
    if (!ct) return;

    setLoadMsg("Building arena...");
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const cam = new THREE.PerspectiveCamera(55, ct.clientWidth / ct.clientHeight, 0.1, 200);
    cam.position.set(0, 30, 25);
    cam.lookAt(0, 0, 0);
    camRef.current = cam;

    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setSize(ct.clientWidth, ct.clientHeight);
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.2;
    ct.appendChild(r.domElement);
    rendererRef.current = r;

    const arena = new CrownClashSceneManager({ scene });
    arenaRef.current = arena;
    setLoadMsg("Loading environment...");
    await arena.loadEnvironment();

    setLoadMsg("Loading models...");
    const uf = new UnitFactory(scene);
    ufRef.current = uf;
    await uf.preloadAnimations();
    await uf.preloadFaction("elves");
    await uf.preloadFaction("orcs");

    setLoadMsg("Placing towers...");
    const bs = new BuildingSystem(scene);
    bsRef.current = bs;
    bs.createInitialBuildings(faction);

    const cs = new CombatSystem(scene, arena, uf, bs);
    csRef.current = cs;
    const ai = new AIOpponent(diff, faction, cs, bs, uf);
    aiRef.current = ai;

    const deck = getDefaultDeck(faction);
    const shuffled = [...deck, ...deck].sort(() => Math.random() - 0.5);
    const h = shuffled.splice(0, 4);
    drawPile.current = shuffled;
    handRef.current = h;
    setHand([...h]);

    elxRef.current = 5; gtRef.current = 0; endedRef.current = false;
    pcRef.current = 0; ecRef.current = 0;
    setElixir(5); setPCrowns(0); setECrowns(0); setTime(0);
    setOt(false); setWinner(null); setSelCard(null);
    clockRef.current = new THREE.Clock();
    setLoadMsg("Battle ready!");
    setTimeout(() => setGs("playing"), 400);
  }, [faction, diff]);

  /* ===== GAME LOOP ===== */
  useEffect(() => {
    if (gs !== "playing") return;
    const loop = () => {
      if (endedRef.current) return;
      const dt = clockRef.current.getDelta();
      if (paused || dt > 0.1) {
        rafRef.current = requestAnimationFrame(loop);
        rendererRef.current?.render(sceneRef.current!, camRef.current!);
        return;
      }
      gtRef.current += dt;
      const t = gtRef.current;
      const maxT = ot ? GAME_DURATION + OVERTIME_DURATION : GAME_DURATION;
      if (t >= maxT) {
        if (!ot && pcRef.current === ecRef.current) { setOt(true); }
        else { doEnd(); return; }
      }
      elxRef.current = Math.min(MAX_ELIXIR, elxRef.current + (ot ? OT_ELIXIR_REGEN : ELIXIR_REGEN) * dt);
      csRef.current?.update(dt);
      aiRef.current?.update(dt);
      for (const ev of csRef.current?.flushEvents() || []) {
        if (ev.type === "crown_earned") {
          if (ev.owner === "player") { pcRef.current++; setPCrowns(pcRef.current); }
          else { ecRef.current++; setECrowns(ecRef.current); }
        } else if (ev.type === "king_destroyed") {
          if (ev.owner === "player") { pcRef.current = 3; setPCrowns(3); setWinner("You"); }
          else { ecRef.current = 3; setECrowns(3); setWinner("AI"); }
          doEnd(); return;
        }
      }
      if (Math.floor(t * 4) !== Math.floor((t - dt) * 4)) {
        setElixir(Math.floor(elxRef.current));
        setTime(t);
      }
      rendererRef.current?.render(sceneRef.current!, camRef.current!);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gs, paused, ot]);

  const doEnd = useCallback(() => {
    endedRef.current = true;
    if (!winner) {
      if (pcRef.current > ecRef.current) setWinner("You");
      else if (ecRef.current > pcRef.current) setWinner("AI");
      else setWinner("Draw");
    }
    setGs("ended");
  }, [winner]);

  /* ===== RESIZE ===== */
  useEffect(() => {
    const fn = () => {
      const ct = containerRef.current;
      if (!ct || !rendererRef.current || !camRef.current) return;
      camRef.current.aspect = ct.clientWidth / ct.clientHeight;
      camRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(ct.clientWidth, ct.clientHeight);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  /* ===== INPUT ===== */
  const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gs !== "playing" || paused || endedRef.current) return;
    const ct = containerRef.current, cam = camRef.current;
    if (!ct || !cam) return;
    const rc = ct.getBoundingClientRect();
    const m = new THREE.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    ray.current.setFromCamera(m, cam);
    const tgt = new THREE.Vector3();
    if (!ray.current.ray.intersectPlane(gndPlane.current, tgt)) return;
    if (selCard !== null && handRef.current[selCard]) {
      playCard(handRef.current[selCard], tgt);
      setSelCard(null);
    }
  }, [gs, paused, selCard]);

  const playCard = useCallback((card: CrownClashCard, pos: THREE.Vector3) => {
    if (elxRef.current < card.elixirCost) return;
    if (!arenaRef.current?.isPlayerTerritory(pos)) return;
    elxRef.current -= card.elixirCost;
    setElixir(Math.floor(elxRef.current));
    const lane = arenaRef.current!.getLane(pos);
    if (card.type === "building" && card.buildingType) {
      if (!bsRef.current?.isValidPlacement(pos, "player")) return;
      bsRef.current.createBuilding(card.buildingType, "player", pos, lane, false);
    } else if (card.type === "unit" && card.unitRole) {
      for (let i = 0; i < (card.spawnCount || 1); i++) {
        const off = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
        const u = ufRef.current?.spawnUnit(faction, card.unitRole!, "player", pos.clone().add(off), lane);
        if (u) csRef.current?.addUnit(u);
      }
    } else if (card.type === "hero" && card.heroRole) {
      const u = ufRef.current?.spawnUnit(faction, card.heroRole, "player", pos, lane);
      if (u) csRef.current?.addUnit(u);
    }
    handRef.current = handRef.current.filter(c => c !== card);
    if (drawPile.current.length > 0) handRef.current.push(drawPile.current.shift()!);
    if (drawPile.current.length === 0) drawPile.current = [...getDefaultDeck(faction), ...getDefaultDeck(faction)].sort(() => Math.random() - 0.5);
    setHand([...handRef.current]);
  }, [faction]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (gs !== "playing") return;
      const km: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
      if (km[e.key] !== undefined) setSelCard(km[e.key]);
      if (e.key === "p" || e.key === "P") setPaused(p => !p);
      if (e.key === "Escape") setSelCard(null);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [gs]);

  const returnMenu = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    csRef.current?.dispose(); bsRef.current?.dispose(); ufRef.current?.dispose(); arenaRef.current?.dispose();
    if (rendererRef.current && containerRef.current) {
      containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose(); rendererRef.current = null;
    }
    setGs("menu"); setWinner(null);
  }, []);

  /* ===== MENU ===== */
  if (gs === "menu") {
    return (
      <div className="min-h-full p-4 sm:p-6 flex flex-col items-center justify-center bg-black" data-testid="page-crown-clash">
        <div className="w-full max-w-2xl">
          <Card className="bg-gradient-to-br from-zinc-900 to-black border-amber-900/50">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Crown className="h-9 w-9 text-amber-500" />
                <CardTitle className="text-3xl sm:text-4xl font-bold text-white">Crown Clash</CardTitle>
                <Crown className="h-9 w-9 text-amber-500" />
              </div>
              <p className="text-zinc-400">Orcs vs Elves — 3D Building RTS</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><Shield className="h-5 w-5 text-amber-500" />Choose Faction</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(["elves", "orcs"] as FactionId[]).map(f => (
                    <Button key={f} variant={faction === f ? "default" : "outline"}
                      className={`h-20 flex-col gap-1 ${faction === f ? (f === "elves" ? "ring-2 ring-green-500 bg-green-900/50" : "ring-2 ring-red-500 bg-red-900/50") : ""}`}
                      onClick={() => setFaction(f)}>
                      <span className="text-2xl">{f === "elves" ? "🧝" : "👹"}</span>
                      <span className="font-bold">{f === "elves" ? "Elves" : "Orcs"}</span>
                      <span className="text-xs opacity-70">{f === "elves" ? "Swift & Elegant" : "Brutal & Strong"}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><Target className="h-5 w-5 text-amber-500" />Difficulty</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(["easy", "medium", "hard"] as Difficulty[]).map(d => (
                    <Button key={d} variant={diff === d ? "default" : "outline"}
                      style={{ backgroundColor: diff === d ? DIFF_COLORS[d].bg : "transparent", borderColor: DIFF_COLORS[d].bg, color: diff === d ? "#fff" : DIFF_COLORS[d].bg }}
                      onClick={() => setDiff(d)}>{DIFF_COLORS[d].name}</Button>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-white flex items-center gap-2"><Swords className="h-5 w-5 text-amber-500" />How to Play</h3>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li><span className="text-amber-500">1.</span> Place <strong>buildings</strong> — they auto-spawn troops</li>
                  <li><span className="text-amber-500">2.</span> Deploy <strong>heroes & units</strong> for direct combat</li>
                  <li><span className="text-amber-500">3.</span> Destroy enemy towers for crowns. King Tower = instant win!</li>
                </ul>
              </div>
              <Button onClick={startGame} size="lg" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold">
                <Play className="h-5 w-5 mr-2" />{faction === "elves" ? "🧝" : "👹"} Battle vs {DIFF_COLORS[diff].name} AI
              </Button>
              <div className="grid grid-cols-4 gap-2">
                {getDefaultDeck(faction).slice(0, 4).map((c, i) => (
                  <div key={i} className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800">
                    <div className="w-full h-8 rounded mb-1" style={{ backgroundColor: CARD_TYPE_COLORS[c.type] + "40" }} />
                    <p className="text-xs text-zinc-400 truncate">{c.name}</p>
                    <Badge variant="secondary" className="mt-1 text-xs" style={{ backgroundColor: RARITY_COLORS[c.rarity] + "30", color: RARITY_COLORS[c.rarity] }}>{c.elixirCost}⚡</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ===== LOADING ===== */
  if (gs === "loading") {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-black">
        <Crown className="h-16 w-16 text-amber-500 animate-pulse mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Preparing Battle</h2>
        <p className="text-zinc-400 mb-4">{loadMsg}</p>
        <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "60%" }} /></div>
        <div ref={containerRef} className="absolute inset-0 -z-10" />
      </div>
    );
  }

  /* ===== PLAYING / ENDED ===== */
  return (
    <div className="h-full flex flex-col bg-black" data-testid="page-crown-clash-game">
      {/* HUD */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/80 border-b border-amber-900/30 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={returnMenu} className="text-zinc-400 hover:text-white"><Home className="h-4 w-4 mr-1" />Menu</Button>
          <Badge style={{ backgroundColor: DIFF_COLORS[diff].bg }} className="text-white">{DIFF_COLORS[diff].name}</Badge>
          <Badge variant="outline" className="text-zinc-300">{faction === "elves" ? "🧝 Elves" : "👹 Orcs"}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${ot ? "bg-red-900 animate-pulse" : "bg-zinc-900"}`}>
            <Timer className="h-4 w-4 text-amber-500" />
            <span className="text-white font-mono font-bold">{ot ? <span className="text-yellow-400">OT {fmt(GAME_DURATION + OVERTIME_DURATION - time)}</span> : fmt(GAME_DURATION - time)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-400 font-bold">{pCrowns}</span>
            <Crown className="h-5 w-5 text-amber-500" />
            <span className="text-zinc-500">vs</span>
            <Crown className="h-5 w-5 text-red-500" />
            <span className="text-red-400 font-bold">{eCrowns}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPaused(!paused)} className="text-zinc-400">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</Button>
        </div>
      </div>

      {/* 3D viewport */}
      <div ref={containerRef} className="flex-1 relative cursor-crosshair" onClick={onClick}>
        {paused && !winner && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
            <div className="text-center"><Pause className="h-16 w-16 text-amber-500 mx-auto mb-4" /><p className="text-2xl font-bold text-white">Paused</p><p className="text-zinc-400 mt-2">Press P to resume</p></div>
          </div>
        )}
        {winner && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20">
            <div className="text-center space-y-4">
              <Crown className="h-20 w-20 mx-auto text-amber-500" />
              <h2 className="text-5xl font-bold text-white">{winner === "You" ? "🏆 Victory!" : winner === "Draw" ? "⚔️ Draw!" : "💀 Defeat!"}</h2>
              <p className="text-2xl text-zinc-300">{pCrowns} - {eCrowns}</p>
              <Button onClick={returnMenu} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 mt-4">Play Again</Button>
            </div>
          </div>
        )}
        {selCard !== null && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-900/80 text-amber-200 px-4 py-2 rounded-lg text-sm z-10">
            Click your territory to deploy {handRef.current[selCard]?.name} · ESC to cancel
          </div>
        )}
      </div>

      {/* Card hand */}
      <div className="bg-black/95 border-t border-amber-900/30 px-3 py-3 z-10">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-purple-500" />
          <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-200" style={{ width: `${(elixir / MAX_ELIXIR) * 100}%` }} />
          </div>
          <span className="text-white font-bold text-sm w-10 text-right">{elixir}/{MAX_ELIXIR}</span>
          {ot && <Badge className="bg-red-900 text-yellow-400 text-xs">x2</Badge>}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {hand.map((c, i) => {
            const ok = elixir >= c.elixirCost;
            const sel = selCard === i;
            return (
              <button key={`${c.id}-${i}`} disabled={!ok}
                onClick={() => setSelCard(sel ? null : i)}
                className={`relative rounded-lg p-2 text-left transition-all border-2 ${sel ? "border-amber-500 ring-2 ring-amber-500/50 scale-105" : "border-zinc-700"} ${ok ? "opacity-100 cursor-pointer hover:border-zinc-500" : "opacity-40 cursor-not-allowed"}`}
                style={{ backgroundColor: CARD_TYPE_COLORS[c.type] + "20" }}>
                <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: ok ? "#7c3aed" : "#444" }}>{c.elixirCost}</div>
                <div className="text-center mb-1"><span className="text-lg">{c.type === "building" ? "🏗️" : c.type === "hero" ? "👑" : c.type === "spell" ? "✨" : "⚔️"}</span></div>
                <p className="text-xs text-white font-medium truncate">{c.name}</p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: RARITY_COLORS[c.rarity] }}>{c.rarity}</p>
              </button>
            );
          })}
        </div>
        <p className="text-zinc-500 text-xs text-center mt-2">1-4: Select · Click: Deploy · P: Pause · ESC: Cancel</p>
      </div>
    </div>
  );
}
