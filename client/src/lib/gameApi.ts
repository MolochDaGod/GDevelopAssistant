// Game API utility functions for Overdrive Racing, MMO World, and Swarm RTS

const API_BASE = '/api';

// Types
export interface Track {
  id: string;
  name: string;
  description: string;
  length: number;
  difficulty: number;
  bestTime?: number;
  terrain: string;
}

export interface Race {
  id: string;
  trackId: string;
  playerId: string;
  vehicleId: string;
  startTime: number;
  endTime?: number;
  bestLapTime?: number;
  totalTime?: number;
  position: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  trackId: string;
  trackName: string;
  bestTime: number;
  rank: number;
  completions: number;
}

export interface MMOSprite {
  id: string;
  name: string;
  spriteSheetUrl: string;
  spriteWidth: number;
  spriteHeight: number;
  frameCount: number;
  type: 'character' | 'enemy' | 'npc' | 'effect';
}

export interface MMOAnimation {
  id: string;
  spriteId: string;
  name: string;
  frameStart: number;
  frameEnd: number;
  frameRate: number;
  loop: boolean;
  duration: number;
}

export interface RTSMap {
  id: string;
  name: string;
  width: number;
  height: number;
  terrain: string;
  difficulty: number;
  maxPlayers: number;
  description: string;
  preview?: string;
}

export interface RTSFaction {
  id: string;
  name: string;
  description: string;
  color: string;
  primaryWeapon: string;
  abilities: string[];
  unitTypes: string[];
  bonuses: Record<string, number>;
}

export interface RTSGameplaySystem {
  id: string;
  name: string;
  description: string;
  rules: Record<string, any>;
  balanceFactors: Record<string, number>;
}

// Overdrive Racing API
export const overdriveApi = {
  async getTracks(): Promise<Track[]> {
    try {
      const response = await fetch(`${API_BASE}/overdrive/tracks`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch Overdrive tracks:', error);
      return [];
    }
  },

  async startRace(trackId: string, vehicleId: string): Promise<Race | null> {
    try {
      const response = await fetch(`${API_BASE}/overdrive/races`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId, vehicleId }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to start race:', error);
      return null;
    }
  },

  async completeRace(raceId: string, totalTime: number, bestLapTime: number): Promise<Race | null> {
    try {
      const response = await fetch(`${API_BASE}/overdrive/races/${raceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalTime, bestLapTime, status: 'completed' }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to complete race:', error);
      return null;
    }
  },

  async getLeaderboard(trackId?: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const query = new URLSearchParams();
      if (trackId) query.append('trackId', trackId);
      query.append('limit', limit.toString());
      
      const response = await fetch(`${API_BASE}/overdrive/leaderboard?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  },

  async getRaceHistory(trackId?: string): Promise<Race[]> {
    try {
      const query = trackId ? `?trackId=${trackId}` : '';
      const response = await fetch(`${API_BASE}/overdrive/races${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch race history:', error);
      return [];
    }
  },
};

// MMO World API
export const mmoApi = {
  async getSprites(): Promise<MMOSprite[]> {
    try {
      const response = await fetch(`${API_BASE}/mmo/sprites`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch MMO sprites:', error);
      return [];
    }
  },

  async getAnimations(spriteId?: string): Promise<MMOAnimation[]> {
    try {
      const query = spriteId ? `?spriteId=${spriteId}` : '';
      const response = await fetch(`${API_BASE}/mmo/sprites/animations${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch MMO animations:', error);
      return [];
    }
  },

  async saveCharacterState(characterData: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/mmo/character-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterData),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to save character state:', error);
      return false;
    }
  },

  async getChatHistory(limit: number = 50): Promise<Array<{ id: string; message: string; timestamp: number }>> {
    try {
      const response = await fetch(`${API_BASE}/mmo/chat?limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      return [];
    }
  },
};

// Swarm RTS API
export const rtsApi = {
  async getMaps(): Promise<RTSMap[]> {
    try {
      const response = await fetch(`${API_BASE}/rts/maps`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch RTS maps:', error);
      return [];
    }
  },

  async getFactions(): Promise<RTSFaction[]> {
    try {
      const response = await fetch(`${API_BASE}/rts/factions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch RTS factions:', error);
      return [];
    }
  },

  async getGameplaySystems(): Promise<RTSGameplaySystem[]> {
    try {
      const response = await fetch(`${API_BASE}/rts/gameplay-systems`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch gameplay systems:', error);
      return [];
    }
  },

  async saveGameState(matchId: string, gameState: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/rts/match-state/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameState),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to save game state:', error);
      return false;
    }
  },

  async recordGameEvent(matchId: string, event: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/rts/match-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, ...event }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to record game event:', error);
      return false;
    }
  },
};
