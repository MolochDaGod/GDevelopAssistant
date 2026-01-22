import * as THREE from 'three';
import { ParticleManager, ParticleEffectPresets } from '../../game-effects/ParticleSystem';
import { SpellEffectsManager } from '../../game-effects/SpellEffects';

export interface EffectsSystem {
  particleManager: ParticleManager | null;
  spellManager: SpellEffectsManager | null;
  init: (scene: THREE.Scene) => void;
  update: (delta: number) => void;
  dispose: () => void;
  spawnDamageEffect: (position: THREE.Vector3, type: 'fire' | 'ice' | 'lightning' | 'physical' | 'magic') => void;
  spawnHealEffect: (position: THREE.Vector3) => void;
  spawnExplosion: (position: THREE.Vector3, color: string, scale?: number) => void;
  spawnProjectile: (from: THREE.Vector3, to: THREE.Vector3, type: 'fireball' | 'lightning' | 'frost' | 'arrow') => void;
  spawnDeathEffect: (position: THREE.Vector3, entityType: string, color?: string) => void;
}

export function createEffectsSystem(): EffectsSystem {
  let particleManager: ParticleManager | null = null;
  let spellManager: SpellEffectsManager | null = null;

  const init = (scene: THREE.Scene) => {
    particleManager = new ParticleManager(scene);
    spellManager = new SpellEffectsManager(scene);
  };

  const update = (delta: number) => {
    particleManager?.update(delta);
    spellManager?.update(delta);
  };

  const dispose = () => {
    particleManager?.dispose();
    spellManager?.dispose();
    particleManager = null;
    spellManager = null;
  };

  const spawnDamageEffect = (position: THREE.Vector3, type: 'fire' | 'ice' | 'lightning' | 'physical' | 'magic') => {
    if (!particleManager) return;
    
    const pos = position.clone();
    pos.y = Math.max(pos.y, 1);

    switch (type) {
      case 'fire':
        particleManager.spawnDamage(pos, 'fire');
        break;
      case 'ice':
        particleManager.spawnEffect(ParticleEffectPresets.frost(), pos, 1.5, 30);
        break;
      case 'lightning':
        particleManager.spawnExplosion(pos, '#ffff00', 1);
        break;
      case 'physical':
        particleManager.spawnDamage(pos, 'physical');
        break;
      case 'magic':
        particleManager.spawnDamage(pos, 'magic');
        break;
    }
  };

  const spawnHealEffect = (position: THREE.Vector3) => {
    if (!particleManager) return;
    const pos = position.clone();
    pos.y = Math.max(pos.y, 1);
    particleManager.spawnHeal(pos);
    spellManager?.spawnHealingAura(pos, 1, 2);
  };

  const spawnExplosion = (position: THREE.Vector3, color: string, scale: number = 1) => {
    if (!particleManager) return;
    const pos = position.clone();
    pos.y = Math.max(pos.y, 1);
    particleManager.spawnExplosion(pos, color, scale);
  };

  const spawnProjectile = (from: THREE.Vector3, to: THREE.Vector3, type: 'fireball' | 'lightning' | 'frost' | 'arrow') => {
    if (!spellManager) return;

    switch (type) {
      case 'fireball':
        spellManager.spawnFireball(from, 1, 1.5);
        break;
      case 'lightning':
        spellManager.spawnLightning(from, to, 0.5);
        break;
      case 'frost':
        spellManager.spawnFrost(from, 1, 1.5);
        break;
      case 'arrow':
        spellManager.spawnLightning(from, to, 0.3);
        break;
    }
  };

  const spawnDeathEffect = (position: THREE.Vector3, entityType: string, color?: string) => {
    if (!particleManager) return;

    const pos = position.clone();
    pos.y = Math.max(pos.y, 1.5);

    let scale = 1;
    let effectColor = color || '#ff4444';

    switch (entityType) {
      case 'tower':
        scale = 3;
        effectColor = color || '#ff8800';
        break;
      case 'champion':
      case 'player':
        scale = 1.5;
        break;
      case 'minion':
      case 'creep':
        scale = 0.8;
        break;
      case 'boss':
        scale = 4;
        effectColor = color || '#ff00ff';
        break;
    }

    particleManager.spawnExplosion(pos, effectColor, scale);
  };

  return {
    get particleManager() { return particleManager; },
    get spellManager() { return spellManager; },
    init,
    update,
    dispose,
    spawnDamageEffect,
    spawnHealEffect,
    spawnExplosion,
    spawnProjectile,
    spawnDeathEffect,
  };
}
