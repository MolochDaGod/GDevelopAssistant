/**
 * Souls-Like Attack Indicator System for Phaser 3
 *
 * Draws telegraphs on the ground before enemy attacks land.
 * - Melee: expanding circle/cone at the target location
 * - Ranged: line indicator along the projectile path
 * - AoE: pulsing circle that fills as the cast progresses
 * - Boss: multi-phase patterns (sweep → slam → nova)
 *
 * Color progression: Yellow (warning) → Orange (imminent) → Red (impact)
 * Dodge window: brief green flash at the edge right before impact
 */

import Phaser from "phaser";

// ── Color Constants ─────────────────────────────────────────────────────

const COLOR_WARNING  = 0xffcc00; // yellow
const COLOR_IMMINENT = 0xff8800; // orange
const COLOR_IMPACT   = 0xff2200; // red
const COLOR_DODGE    = 0x00ff66; // green (perfect dodge window)
const COLOR_AOE_FILL = 0xff4444;
const COLOR_BOSS     = 0xaa00ff; // purple for boss specials

// ── Indicator Types ─────────────────────────────────────────────────────

export type IndicatorType = "melee_circle" | "melee_cone" | "ranged_line" | "aoe_circle" | "boss_sweep" | "boss_slam";

export interface TelegraphConfig {
  type: IndicatorType;
  x: number;
  y: number;
  /** Target X (for ranged line) */
  targetX?: number;
  /** Target Y (for ranged line) */
  targetY?: number;
  /** Radius for circles, length for lines */
  size: number;
  /** Cone angle in radians (for melee_cone) */
  coneAngle?: number;
  /** Direction angle in radians (for cone/line) */
  direction?: number;
  /** Total wind-up duration in ms */
  durationMs: number;
  /** Damage dealt on impact (for dodge reward calculation) */
  damage?: number;
}

// ── AttackTelegraph Class ───────────────────────────────────────────────

export class AttackTelegraph {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private config: TelegraphConfig;
  private startTime: number;
  private active = true;
  private onComplete?: () => void;
  private onDodgeWindow?: () => void;
  private dodgeWindowFired = false;

  constructor(scene: Phaser.Scene, config: TelegraphConfig, onComplete?: () => void, onDodgeWindow?: () => void) {
    this.scene = scene;
    this.config = config;
    this.startTime = scene.time.now;
    this.onComplete = onComplete;
    this.onDodgeWindow = onDodgeWindow;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(3); // below entities, above terrain
  }

  /** Returns 0..1 progress through the telegraph */
  get progress(): number {
    if (!this.active) return 1;
    return Math.min(1, (this.scene.time.now - this.startTime) / this.config.durationMs);
  }

  /** True during the last 15% of the telegraph (dodge window) */
  get inDodgeWindow(): boolean {
    return this.progress >= 0.85 && this.progress < 1;
  }

  /** Current interpolated color based on progress */
  private getColor(): number {
    const p = this.progress;
    if (p >= 0.85) return this.inDodgeWindow ? COLOR_DODGE : COLOR_IMPACT;
    if (p >= 0.5) return COLOR_IMMINENT;
    return COLOR_WARNING;
  }

  /** Check if a point (e.g. player position) is inside the danger zone */
  isPointInside(px: number, py: number): boolean {
    const { type, x, y, size, targetX, targetY, direction, coneAngle } = this.config;

    switch (type) {
      case "melee_circle":
      case "aoe_circle":
      case "boss_slam": {
        const dist = Phaser.Math.Distance.Between(px, py, x, y);
        return dist <= size;
      }

      case "melee_cone": {
        const dist = Phaser.Math.Distance.Between(px, py, x, y);
        if (dist > size) return false;
        const angle = Phaser.Math.Angle.Between(x, y, px, py);
        const diff = Phaser.Math.Angle.Wrap(angle - (direction ?? 0));
        return Math.abs(diff) <= (coneAngle ?? Math.PI / 3) / 2;
      }

      case "ranged_line": {
        const tx = targetX ?? x;
        const ty = targetY ?? y;
        // Distance from point to line segment
        const dx = tx - x;
        const dy = ty - y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return false;
        const t = Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / (len * len)));
        const closestX = x + t * dx;
        const closestY = y + t * dy;
        const distToLine = Phaser.Math.Distance.Between(px, py, closestX, closestY);
        return distToLine <= 20; // 20px width for line indicators
      }

      case "boss_sweep": {
        const dist = Phaser.Math.Distance.Between(px, py, x, y);
        if (dist > size || dist < size * 0.3) return false;
        const angle = Phaser.Math.Angle.Between(x, y, px, py);
        const sweepAngle = (coneAngle ?? Math.PI * 0.75);
        // Sweep rotates through the wind-up
        const sweepDir = (direction ?? 0) + this.progress * sweepAngle - sweepAngle / 2;
        const diff = Phaser.Math.Angle.Wrap(angle - sweepDir);
        return Math.abs(diff) <= 0.3; // narrow active edge
      }

      default:
        return false;
    }
  }

  /** Call each frame */
  update(): boolean {
    if (!this.active) return false;

    const p = this.progress;

    // Fire dodge window callback once
    if (this.inDodgeWindow && !this.dodgeWindowFired) {
      this.dodgeWindowFired = true;
      this.onDodgeWindow?.();
    }

    // Complete
    if (p >= 1) {
      this.active = false;
      this.onComplete?.();
      this.destroy();
      return false;
    }

    this.draw(p);
    return true;
  }

  private draw(progress: number) {
    this.graphics.clear();
    const color = this.getColor();
    const alpha = 0.15 + progress * 0.4;

    switch (this.config.type) {
      case "melee_circle":
        this.drawCircle(progress, color, alpha);
        break;
      case "melee_cone":
        this.drawCone(progress, color, alpha);
        break;
      case "ranged_line":
        this.drawLine(progress, color, alpha);
        break;
      case "aoe_circle":
        this.drawAoE(progress, color, alpha);
        break;
      case "boss_sweep":
        this.drawSweep(progress, color, alpha);
        break;
      case "boss_slam":
        this.drawSlam(progress, color, alpha);
        break;
    }
  }

  private drawCircle(p: number, color: number, alpha: number) {
    const { x, y, size } = this.config;
    const currentRadius = size * (0.3 + p * 0.7);

    // Fill
    this.graphics.fillStyle(color, alpha * 0.5);
    this.graphics.fillCircle(x, y, currentRadius);

    // Border ring
    this.graphics.lineStyle(2 + p * 2, color, alpha);
    this.graphics.strokeCircle(x, y, currentRadius);

    // Pulsing inner ring
    const pulse = Math.sin(this.scene.time.now * 0.008) * 0.15 + 0.85;
    this.graphics.lineStyle(1, 0xffffff, alpha * 0.5 * pulse);
    this.graphics.strokeCircle(x, y, currentRadius * 0.6);
  }

  private drawCone(p: number, color: number, alpha: number) {
    const { x, y, size, direction = 0, coneAngle = Math.PI / 3 } = this.config;
    const radius = size * (0.3 + p * 0.7);
    const halfAngle = coneAngle / 2;
    const startAngle = direction - halfAngle;
    const endAngle = direction + halfAngle;

    // Fill arc
    this.graphics.fillStyle(color, alpha * 0.4);
    this.graphics.slice(x, y, radius, startAngle, endAngle, false);
    this.graphics.fillPath();

    // Border
    this.graphics.lineStyle(2 + p * 2, color, alpha);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.arc(x, y, radius, startAngle, endAngle, false);
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  private drawLine(p: number, color: number, alpha: number) {
    const { x, y, targetX = x, targetY = y } = this.config;
    const dx = targetX - x;
    const dy = targetY - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    // Animated fill along the line
    const fillLen = len * p;
    const endX = x + (dx / len) * fillLen;
    const endY = y + (dy / len) * fillLen;

    // Perpendicular for width
    const nx = -dy / len;
    const ny = dx / len;
    const halfWidth = 10 + p * 8;

    // Outer line (full path, faded)
    this.graphics.lineStyle(2, color, alpha * 0.3);
    this.graphics.beginPath();
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(targetX, targetY);
    this.graphics.strokePath();

    // Fill rectangle up to current progress
    this.graphics.fillStyle(color, alpha * 0.4);
    this.graphics.beginPath();
    this.graphics.moveTo(x + nx * halfWidth, y + ny * halfWidth);
    this.graphics.lineTo(endX + nx * halfWidth, endY + ny * halfWidth);
    this.graphics.lineTo(endX - nx * halfWidth, endY - ny * halfWidth);
    this.graphics.lineTo(x - nx * halfWidth, y - ny * halfWidth);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Leading edge marker
    this.graphics.fillStyle(0xffffff, alpha);
    this.graphics.fillCircle(endX, endY, 6);
  }

  private drawAoE(p: number, color: number, alpha: number) {
    const { x, y, size } = this.config;

    // Full circle outline (shows full danger zone)
    this.graphics.lineStyle(2, color, alpha * 0.6);
    this.graphics.strokeCircle(x, y, size);

    // Fill that grows with progress
    this.graphics.fillStyle(COLOR_AOE_FILL, alpha * 0.3 * p);
    this.graphics.fillCircle(x, y, size * p);

    // Pulsing concentric rings
    const rings = 3;
    for (let i = 0; i < rings; i++) {
      const ringP = ((p * rings + i) % 1);
      const ringR = size * ringP;
      this.graphics.lineStyle(1, color, alpha * (1 - ringP) * 0.5);
      this.graphics.strokeCircle(x, y, ringR);
    }

    // Center crosshair
    const crossSize = 8;
    this.graphics.lineStyle(2, 0xffffff, alpha * 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(x - crossSize, y);
    this.graphics.lineTo(x + crossSize, y);
    this.graphics.moveTo(x, y - crossSize);
    this.graphics.lineTo(x, y + crossSize);
    this.graphics.strokePath();
  }

  private drawSweep(p: number, color: number, alpha: number) {
    const { x, y, size, direction = 0, coneAngle = Math.PI * 0.75 } = this.config;
    const innerRadius = size * 0.3;

    // Full arc outline
    const halfAngle = coneAngle / 2;
    this.graphics.lineStyle(2, COLOR_BOSS, alpha * 0.4);
    this.graphics.beginPath();
    this.graphics.arc(x, y, size, direction - halfAngle, direction + halfAngle, false);
    this.graphics.strokePath();
    this.graphics.beginPath();
    this.graphics.arc(x, y, innerRadius, direction - halfAngle, direction + halfAngle, false);
    this.graphics.strokePath();

    // Sweeping active zone
    const sweepAngle = direction - halfAngle + p * coneAngle;
    const sweepWidth = 0.3;
    this.graphics.fillStyle(color, alpha * 0.5);
    this.graphics.slice(x, y, size, sweepAngle - sweepWidth / 2, sweepAngle + sweepWidth / 2, false);
    this.graphics.fillPath();

    // Hollow out inner
    this.graphics.fillStyle(0x000000, 0.001);
    this.graphics.fillCircle(x, y, innerRadius);
  }

  private drawSlam(p: number, color: number, alpha: number) {
    const { x, y, size } = this.config;

    // Outer danger zone
    this.graphics.lineStyle(3, COLOR_BOSS, alpha * 0.6);
    this.graphics.strokeCircle(x, y, size);

    // Converging rings (outside in)
    const ringCount = 4;
    for (let i = 0; i < ringCount; i++) {
      const ringP = 1 - ((p + i / ringCount) % 1);
      const ringR = size * ringP;
      this.graphics.lineStyle(2, color, alpha * ringP * 0.6);
      this.graphics.strokeCircle(x, y, ringR);
    }

    // Impact zone grows at the end
    if (p > 0.7) {
      const impactP = (p - 0.7) / 0.3;
      this.graphics.fillStyle(COLOR_IMPACT, alpha * impactP * 0.5);
      this.graphics.fillCircle(x, y, size * impactP);
    }

    // Crosshair target
    const c = 12;
    this.graphics.lineStyle(2, 0xffffff, alpha);
    this.graphics.beginPath();
    this.graphics.moveTo(x - c, y); this.graphics.lineTo(x + c, y);
    this.graphics.moveTo(x, y - c); this.graphics.lineTo(x, y + c);
    this.graphics.strokePath();
  }

  destroy() {
    this.active = false;
    if (this.graphics) {
      this.graphics.destroy();
    }
  }

  get isActive(): boolean {
    return this.active;
  }
}

// ── Telegraph Manager (manages multiple active indicators) ──────────────

export class TelegraphManager {
  private scene: Phaser.Scene;
  private telegraphs: AttackTelegraph[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Create a telegraph and return it */
  create(config: TelegraphConfig, onComplete?: () => void, onDodgeWindow?: () => void): AttackTelegraph {
    const telegraph = new AttackTelegraph(this.scene, config, onComplete, onDodgeWindow);
    this.telegraphs.push(telegraph);
    return telegraph;
  }

  /** Convenience: melee circle indicator at target position */
  meleeCircle(x: number, y: number, radius: number, durationMs: number, onComplete?: () => void): AttackTelegraph {
    return this.create({ type: "melee_circle", x, y, size: radius, durationMs }, onComplete);
  }

  /** Convenience: melee cone in a direction */
  meleeCone(x: number, y: number, radius: number, direction: number, coneAngle: number, durationMs: number, onComplete?: () => void): AttackTelegraph {
    return this.create({ type: "melee_cone", x, y, size: radius, direction, coneAngle, durationMs }, onComplete);
  }

  /** Convenience: ranged line from source to target */
  rangedLine(x: number, y: number, targetX: number, targetY: number, durationMs: number, onComplete?: () => void): AttackTelegraph {
    const size = Phaser.Math.Distance.Between(x, y, targetX, targetY);
    return this.create({ type: "ranged_line", x, y, targetX, targetY, size, durationMs }, onComplete);
  }

  /** Convenience: AoE circle at target */
  aoeCircle(x: number, y: number, radius: number, durationMs: number, onComplete?: () => void): AttackTelegraph {
    return this.create({ type: "aoe_circle", x, y, size: radius, durationMs }, onComplete);
  }

  /** Convenience: boss sweep around the boss */
  bossSweep(x: number, y: number, radius: number, direction: number, durationMs: number, onComplete?: () => void): AttackTelegraph {
    return this.create({ type: "boss_sweep", x, y, size: radius, direction, coneAngle: Math.PI * 0.75, durationMs }, onComplete);
  }

  /** Convenience: boss ground slam */
  bossSlam(x: number, y: number, radius: number, durationMs: number, onComplete?: () => void): AttackTelegraph {
    return this.create({ type: "boss_slam", x, y, size: radius, durationMs }, onComplete);
  }

  /** Call each frame — updates all active telegraphs, returns those still active */
  update(): void {
    this.telegraphs = this.telegraphs.filter(t => t.update());
  }

  /** Check if player position is inside any active danger zone */
  isPlayerInDanger(px: number, py: number): boolean {
    return this.telegraphs.some(t => t.isActive && t.isPointInside(px, py));
  }

  /** Get all active telegraphs the player is currently inside */
  getDangerZones(px: number, py: number): AttackTelegraph[] {
    return this.telegraphs.filter(t => t.isActive && t.isPointInside(px, py));
  }

  /** Check if player is in any dodge window */
  isInDodgeWindow(): boolean {
    return this.telegraphs.some(t => t.isActive && t.inDodgeWindow);
  }

  /** Clear all active telegraphs */
  clear(): void {
    this.telegraphs.forEach(t => t.destroy());
    this.telegraphs = [];
  }

  get count(): number {
    return this.telegraphs.length;
  }
}
