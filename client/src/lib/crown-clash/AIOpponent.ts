import * as THREE from 'three';
import type { CrownClashCard } from '@/data/crown-clash-cards';
import { getDefaultDeck, ALL_CARDS } from '@/data/crown-clash-cards';
import type { FactionId } from './UnitFactory';
import type { CombatSystem } from './CombatSystem';
import type { BuildingSystem, BuildingType } from './BuildingSystem';
import type { UnitFactory } from './UnitFactory';
import { ARENA_CONSTANTS } from './CrownClashScene';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface AIConfig {
  playDelay: number;
  accuracy: number;
  elixirThreshold: number;
  buildingBias: number; // Higher = more buildings vs direct units
  heroProbability: number;
}

const AI_CONFIGS: Record<Difficulty, AIConfig> = {
  easy: { playDelay: 3.0, accuracy: 0.4, elixirThreshold: 8, buildingBias: 0.6, heroProbability: 0.1 },
  medium: { playDelay: 1.8, accuracy: 0.7, elixirThreshold: 6, buildingBias: 0.7, heroProbability: 0.25 },
  hard: { playDelay: 0.9, accuracy: 0.9, elixirThreshold: 4, buildingBias: 0.8, heroProbability: 0.4 },
};

export class AIOpponent {
  private difficulty: Difficulty;
  private config: AIConfig;
  private faction: FactionId;
  private deck: CrownClashCard[];
  private hand: CrownClashCard[] = [];
  private drawPile: CrownClashCard[] = [];
  private elixir = 5;
  private lastPlayTime = 0;
  private gameTime = 0;

  private combatSystem: CombatSystem;
  private buildingSystem: BuildingSystem;
  private unitFactory: UnitFactory;

  constructor(
    difficulty: Difficulty,
    faction: FactionId,
    combatSystem: CombatSystem,
    buildingSystem: BuildingSystem,
    unitFactory: UnitFactory,
  ) {
    this.difficulty = difficulty;
    this.config = AI_CONFIGS[difficulty];
    this.faction = faction;
    this.combatSystem = combatSystem;
    this.buildingSystem = buildingSystem;
    this.unitFactory = unitFactory;

    // AI uses opposite faction from player
    const aiFaction: FactionId = faction === 'elves' ? 'orcs' : 'elves';
    this.deck = getDefaultDeck(aiFaction);
    this.drawPile = this.shuffleDeck([...this.deck, ...this.deck]); // Double deck for more variety
    this.drawCards(4);
  }

  update(delta: number): void {
    this.gameTime += delta;

    // Elixir regen
    const isOvertime = this.gameTime > 180;
    const regenRate = isOvertime ? 1 / 1.4 : 1 / 2.8;
    this.elixir = Math.min(10, this.elixir + regenRate * delta);

    // Check if it's time to play
    if (this.gameTime - this.lastPlayTime < this.config.playDelay) return;

    // Evaluate threats
    const threatLevel = this.evaluateThreat();
    
    // Choose action
    this.chooseAction(threatLevel);
  }

  getElixir(): number { return Math.floor(this.elixir); }

  private evaluateThreat(): { left: number; right: number; total: number } {
    const playerUnits = this.combatSystem.getPlayerUnits();
    let left = 0, right = 0;
    
    for (const unit of playerUnits) {
      const threat = (unit.stats.health / unit.stats.maxHealth) * unit.stats.damage;
      // Units closer to enemy territory are more threatening
      const proximity = unit.mesh.position.z < 0 ? 2.0 : 1.0;
      
      if (unit.mesh.position.x < -3) left += threat * proximity;
      else if (unit.mesh.position.x > 3) right += threat * proximity;
      else { left += threat * proximity * 0.5; right += threat * proximity * 0.5; }
    }

    return { left, right, total: left + right };
  }

  private chooseAction(threat: { left: number; right: number; total: number }): void {
    const availableCards = this.hand.filter(c => c.elixirCost <= this.elixir);
    if (availableCards.length === 0) return;

    const { DEPTH, RIVER_HALF_WIDTH } = ARENA_CONSTANTS;

    // Under threat — defend
    if (threat.total > 40 * this.config.accuracy) {
      this.playDefensive(availableCards, threat);
      return;
    }

    // Enough elixir to attack
    if (this.elixir >= this.config.elixirThreshold) {
      this.playOffensive(availableCards);
      return;
    }

    // Almost full elixir — spend something
    if (this.elixir >= 9) {
      const cheapest = availableCards.sort((a, b) => a.elixirCost - b.elixirCost)[0];
      if (cheapest) {
        this.playCard(cheapest, this.getRandomEnemyPosition());
      }
    }
  }

  private playDefensive(cards: CrownClashCard[], threat: { left: number; right: number }): void {
    const threatenedLane = threat.left > threat.right ? 'left' : 'right';
    const deployX = threatenedLane === 'left' ? -6 : 6;
    const { DEPTH } = ARENA_CONSTANTS;

    // Prefer buildings for defense (building-heavy gameplay)
    const buildingCards = cards.filter(c => c.type === 'building');
    const defensiveBuildings = buildingCards.filter(c => 
      c.buildingType === 'bomb_tower' || c.buildingType === 'fortification' || c.buildingType === 'mage_tower'
    );

    if (defensiveBuildings.length > 0 && Math.random() < this.config.buildingBias) {
      const card = defensiveBuildings[Math.floor(Math.random() * defensiveBuildings.length)];
      const pos = new THREE.Vector3(deployX, 0, -DEPTH / 2 + 12 + Math.random() * 4);
      this.playCard(card, pos);
      return;
    }

    // Direct unit deployment for immediate defense
    const unitCards = cards.filter(c => c.type === 'unit');
    if (unitCards.length > 0) {
      const card = unitCards[Math.floor(Math.random() * unitCards.length)];
      const pos = new THREE.Vector3(deployX + (Math.random() - 0.5) * 3, 0, -DEPTH / 2 + 10);
      this.playCard(card, pos);
    }
  }

  private playOffensive(cards: CrownClashCard[]): void {
    const { DEPTH } = ARENA_CONSTANTS;
    const attackLane = Math.random() < 0.5 ? -6 : 6;

    // Prefer placing buildings (core mechanic)
    if (Math.random() < this.config.buildingBias) {
      const buildingCards = cards.filter(c => c.type === 'building');
      const spawners = buildingCards.filter(c =>
        c.buildingType === 'barracks' || c.buildingType === 'archery_range' || 
        c.buildingType === 'spawner_hut' || c.buildingType === 'siege_workshop'
      );

      if (spawners.length > 0) {
        const card = spawners[Math.floor(Math.random() * spawners.length)];
        const pos = new THREE.Vector3(attackLane, 0, -DEPTH / 2 + 8 + Math.random() * 6);
        
        if (this.buildingSystem.isValidPlacement(pos, 'enemy')) {
          this.playCard(card, pos);
          return;
        }
      }
    }

    // Try hero deployment
    const heroCards = cards.filter(c => c.type === 'hero');
    if (heroCards.length > 0 && Math.random() < this.config.heroProbability) {
      const card = heroCards[0];
      const pos = new THREE.Vector3(attackLane, 0, -DEPTH / 2 + 10);
      this.playCard(card, pos);
      return;
    }

    // Direct units
    const unitCards = cards.filter(c => c.type === 'unit');
    if (unitCards.length > 0) {
      const card = unitCards[Math.floor(Math.random() * unitCards.length)];
      const pos = new THREE.Vector3(attackLane + (Math.random() - 0.5) * 4, 0, -DEPTH / 2 + 10 + Math.random() * 4);
      this.playCard(card, pos);
    }
  }

  private playCard(card: CrownClashCard, position: THREE.Vector3): void {
    if (this.elixir < card.elixirCost) return;

    this.elixir -= card.elixirCost;
    this.lastPlayTime = this.gameTime;

    // Remove from hand and draw replacement
    this.hand = this.hand.filter(c => c !== card);
    this.drawCards(1);

    const aiFaction: FactionId = this.faction === 'elves' ? 'orcs' : 'elves';

    if (card.type === 'building' && card.buildingType) {
      const lane = position.x < -3 ? 'left' : position.x > 3 ? 'right' : 'center';
      this.buildingSystem.createBuilding(card.buildingType, 'enemy', position, lane as any, false);
    } else if (card.type === 'unit' && card.unitRole) {
      const count = card.spawnCount || 1;
      const lane = position.x < -3 ? 'left' : position.x > 3 ? 'right' : 'center';
      for (let i = 0; i < count; i++) {
        const offset = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
        const unit = this.unitFactory.spawnUnit(aiFaction, card.unitRole, 'enemy', position.clone().add(offset), lane as any);
        if (unit) this.combatSystem.addUnit(unit);
      }
    } else if (card.type === 'hero' && card.heroRole) {
      const lane = position.x < -3 ? 'left' : position.x > 3 ? 'right' : 'center';
      const unit = this.unitFactory.spawnUnit(aiFaction, card.heroRole, 'enemy', position, lane as any);
      if (unit) this.combatSystem.addUnit(unit);
    }
    // Spells: TODO - apply area effects
  }

  private drawCards(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.hand.length >= 4) break;
      if (this.drawPile.length === 0) {
        this.drawPile = this.shuffleDeck([...this.deck, ...this.deck]);
      }
      this.hand.push(this.drawPile.shift()!);
    }
  }

  private shuffleDeck(deck: CrownClashCard[]): CrownClashCard[] {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  private getRandomEnemyPosition(): THREE.Vector3 {
    const { DEPTH } = ARENA_CONSTANTS;
    return new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      0,
      -DEPTH / 2 + 8 + Math.random() * 8
    );
  }
}
