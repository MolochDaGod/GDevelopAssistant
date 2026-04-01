/**
 * Characters Page — Unified Grudge Account Characters
 *
 * Uses the `accounts` + `grudgeCharacters` tables exclusively.
 * All 6 races, 4 classes. cNFT minting per character.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGrudgeAccount, type GrudgeCharacterLocal } from "@/hooks/useGrudgeAccount";
import { mintCharacterAsNFT } from "@/lib/nft-service";
import {
  Sword, Shield, Zap, Heart, LogIn, Plus, Trash2,
  Coins, Loader2, Gem, Sparkles, Star,
} from "lucide-react";
import { useState } from "react";

// ── Game Design Constants ────────────────────────────────────────────────────

const RACES = [
  { id: "barbarian", label: "Barbarian", icon: "\u{1FA93}", color: "bg-orange-700" },
  { id: "dwarf",     label: "Dwarf",     icon: "\u26CF\uFE0F",  color: "bg-amber-800" },
  { id: "elf",       label: "Elf",       icon: "\u{1F3F9}", color: "bg-emerald-700" },
  { id: "human",     label: "Human",     icon: "\u2694\uFE0F",  color: "bg-blue-700" },
  { id: "orc",       label: "Orc",       icon: "\u{1F480}", color: "bg-red-800" },
  { id: "undead",    label: "Undead",    icon: "\u2620\uFE0F",  color: "bg-purple-800" },
] as const;

const CLASSES = [
  { id: "warrior",      label: "Warrior",      icon: Sword,    desc: "Shields, swords, 2H weapons. Stamina sprint system." },
  { id: "mage",         label: "Mage",         icon: Zap,      desc: "Staffs, tomes, wands. Particle teleport blocks." },
  { id: "ranger",       label: "Ranger",       icon: Shield,   desc: "Bows, crossbows, daggers. Parry-counter mechanics." },
  { id: "shapeshifter", label: "Shapeshifter", icon: Sparkles, desc: "Bear, Raptor, Large Bird forms. Multi-role class." },
] as const;

const CLASS_ICON_MAP: Record<string, typeof Sword> = {
  warrior: Sword,
  mage: Zap,
  ranger: Shield,
  shapeshifter: Sparkles,
};

function getRaceConfig(raceId: string | undefined) {
  return RACES.find((r) => r.id === raceId?.toLowerCase()) || RACES[3];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CharactersPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const {
    characters, charactersLoading,
    createCharacter, deleteCharacter,
    hasWallet,
  } = useGrudgeAccount();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [newChar, setNewChar] = useState({ name: "", raceId: "human", classId: "warrior" });
  const [mintingId, setMintingId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newChar.name.trim()) {
      toast({ variant: "destructive", title: "Name required" });
      return;
    }
    createCharacter.mutate(newChar, {
      onSuccess: () => {
        setShowCreate(false);
        setNewChar({ name: "", raceId: "human", classId: "warrior" });
        toast({ title: "Character Created", description: "Your Grudge Warlord has been born!" });
      },
      onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  };

  const handleDelete = (ch: GrudgeCharacterLocal) => {
    deleteCharacter.mutate(ch.id, {
      onSuccess: () => toast({ title: "Character Deleted" }),
      onError: (e: Error) => toast({ variant: "destructive", title: "Error", description: e.message }),
    });
  };

  const handleMint = async (ch: GrudgeCharacterLocal) => {
    setMintingId(ch.id);
    try {
      const result = await mintCharacterAsNFT(ch.id);
      if (result.success) {
        toast({ title: "Character Minted!", description: `cNFT: ${result.mintAddress?.slice(0, 16)}...` });
      } else {
        toast({ variant: "destructive", title: "Mint Failed", description: result.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Mint Error", description: err?.message });
    } finally {
      setMintingId(null);
    }
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Characters</h2>
          <p className="text-muted-foreground">Sign in to create and manage your Grudge Warlords</p>
        </div>
        <Button asChild>
          <a href="/auth"><LogIn className="mr-2 h-4 w-4" /> Sign In</a>
        </Button>
      </div>
    );
  }

  if (charactersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Characters</h1>
          <p className="text-sm text-muted-foreground">
            {characters.length} Warlord{characters.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-1 h-4 w-4" /> New Character</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Grudge Character</DialogTitle>
              <DialogDescription>Choose a name, race, and class for your new warlord.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newChar.name}
                  onChange={(e) => setNewChar({ ...newChar, name: e.target.value })}
                  placeholder="Enter character name"
                  maxLength={32}
                />
              </div>

              <div className="space-y-2">
                <Label>Race</Label>
                <div className="grid grid-cols-3 gap-2">
                  {RACES.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setNewChar({ ...newChar, raceId: r.id })}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
                        newChar.raceId === r.id
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-lg">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CLASSES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setNewChar({ ...newChar, classId: c.id })}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                        newChar.classId === c.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <c.icon className={`h-5 w-5 shrink-0 ${newChar.classId === c.id ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <div className={`text-sm font-medium ${newChar.classId === c.id ? "text-primary" : ""}`}>{c.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight">{c.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newChar.name.trim() || createCharacter.isPending}>
                {createCharacter.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {characters.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Sword className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">No Characters Yet</CardTitle>
          <CardDescription>Create your first Grudge Warlord to get started!</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((ch) => {
            const race = getRaceConfig(ch.raceId);
            const ClassIcon = CLASS_ICON_MAP[ch.classId?.toLowerCase() || ""] || Sword;
            const isMinting = mintingId === ch.id;

            return (
              <Card key={ch.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${race.color}`}>
                        {race.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{ch.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {ch.raceId || "Unknown"} {ch.classId || "Unknown"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline">Lv {ch.level}</Badge>
                      {ch.isNft && (
                        <Badge className="bg-green-500/20 text-green-400 border-0 text-[9px]">
                          <Gem className="h-3 w-3 mr-0.5" /> cNFT
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span>{ch.currentHealth ?? "\u2014"} HP</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{ch.experience} XP</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClassIcon className="h-3 w-3 text-blue-500" />
                      <span className="capitalize">{ch.classId || "\u2014"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="h-3 w-3 text-yellow-600" />
                      <span>{ch.gold} Gold</span>
                    </div>
                  </div>

                  {ch.faction && (
                    <p className="text-xs text-muted-foreground">Faction: {ch.faction}</p>
                  )}

                  {ch.nftMintAddress && (
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      Mint: {ch.nftMintAddress}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {!ch.isNft && hasWallet && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleMint(ch)}
                        disabled={isMinting}
                      >
                        {isMinting
                          ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Minting...</>
                          : <><Gem className="h-3 w-3 mr-1" /> Mint cNFT</>
                        }
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className={`${!ch.isNft && hasWallet ? "" : "flex-1"} text-xs`}
                      onClick={() => handleDelete(ch)}
                      disabled={deleteCharacter.isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
