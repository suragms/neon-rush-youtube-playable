/**
 * GameEngine — the core game loop for Neon Rush.
 *
 * Owns the canonical game state and drives all subsystems:
 * physics, obstacle/coin spawning, collision, scoring, difficulty, particles.
 *
 * The engine is canvas-independent: it writes into a CanvasRenderingContext2D
 * passed at construction but does not create or resize the canvas itself.
 */

import { Player } from './Player';
import { Obstacle, type ObstacleKind } from './Obstacle';
import { Coin } from './Coin';
import { ParticleSystem } from './ParticleSystem';
import { playerVsObstacles, playerHitsRect } from './Collision';
import { levelForTime, bandForLevel } from './Difficulty';
import type { GameState, RunStats, GameCallbacks } from './types';
import type { Rect } from './Geometry';

// ── Layout constants ──────────────────────────────────────────────────────

const GROUND_FRAC = 0.78; // groundY = height * GROUND_FRAC
const PLAYER_X_FRAC = 0.18;

const OBSTACLE_W = 38;
const OBSTACLE_H_LOW = 58;
const OBSTACLE_H_HIGH = 90;

const COIN_SIZE = 22;
const COIN_ROW_HEIGHT = 5;

// ── Neon colour palette ───────────────────────────────────────────────────

const COL = {
  bg:          '#090d17',
  ground:      '#1a2240',
  groundLine:  '#2a3a6a',
  playerBody:  '#00f5ff',
  playerVisor: '#ff4fff',
  scarf:       '#ff4fff',
  obstacleA:   '#ff2d55',
  obstacleB:   '#ff9500',
  coin:        '#ffe600',
  coinGlow:    '#ffe600',
  trail:       '#00f5ff',
  particleCoin:'#ffe600',
  particleHit: '#ff2d55',
  star:        '#ffffff',
} as const;

// ── Starfield ────────────────────────────────────────────────────────────

interface Star { x: number; y: number; r: number; speed: number }

// ── Obstacle pool entry ──────────────────────────────────────────────────

interface ObstacleSpec {
  kind: ObstacleKind;
  /** gap seconds before spawning the NEXT obstacle */
  gapOverride?: number;
}

export class GameEngine {
  // public state
  state: GameState = 'menu';
  stats: RunStats = { score: 0, coins: 0, distance: 0, combo: 0, level: 1, time: 0 };

  // rendering
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  // physics
  private player!: Player;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private particles = new ParticleSystem();

  // trail
  private trail: Array<{ x: number; y: number; a: number }> = [];

  // starfield
  private stars: Star[] = [];

  // timing / difficulty
  private lastTime = 0;
  private runTime = 0;
  private nextObstacleIn = 0;
  private nextCoinIn = 0;
  private scrollSpeed = 300;

  // forgiveness pixels for collision (shrinks as level rises)
  private get forgivePx(): number {
    return Math.max(3, 9 - this.stats.level);
  }

  // callbacks
  private callbacks: GameCallbacks;

  // animation frame
  private rafId = 0;

  // flash/shake
  private screenShake = 0;
  private deathFlash = 0;

  // best score (injected from StorageManager)
  bestScore = 0;

  constructor(ctx: CanvasRenderingContext2D, callbacks: GameCallbacks) {
    this.ctx = ctx;
    this.callbacks = callbacks;
    this._buildStars(100);
  }

  // ── Public lifecycle ───────────────────────────────────────────────────

  /** Call whenever the canvas element has been resized. */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.player) {
      this.player.x = width * PLAYER_X_FRAC;
      // Don't snap Y — allow mid-air state to persist naturally.
    }
    this._buildStars(100);
  }

  startGame(): void {
    this._resetRun();
    this.state = 'running';
    this._startLoop();
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this._stopLoop();
    this._drawPauseOverlay();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.lastTime = 0; // reset dt to avoid time-skip on resume
    this._startLoop();
  }

  /** Restart from game-over screen */
  restart(): void {
    this.startGame();
  }

  // ── Input ──────────────────────────────────────────────────────────────

  /** Returns true if a jump was initiated. */
  jump(): boolean {
    if (this.state !== 'running') return false;
    const jumped = this.player.jump();
    if (jumped) {
      const kind = this.player.jumpsUsed === 1 ? 'jump' : 'jump'; // both map to 'jump' event
      this.callbacks.onEvent(kind);
    }
    return jumped;
  }

  cutJump(): void {
    if (this.state === 'running') this.player.cutJump();
  }

  // ── Game loop ──────────────────────────────────────────────────────────

  private _startLoop(): void {
    if (this.rafId) return;
    const loop = (ts: number) => {
      if (this.state !== 'running') { this.rafId = 0; return; }
      const dt = this.lastTime ? Math.min((ts - this.lastTime) / 1000, 0.05) : 0.016;
      this.lastTime = ts;
      this._update(dt);
      this._draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private _stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────

  private _update(dt: number): void {
    this.runTime += dt;
    const groundY = this.height * GROUND_FRAC;

    // Difficulty
    const level = levelForTime(this.runTime);
    const band = bandForLevel(level);
    this.scrollSpeed += (band.scrollSpeed - this.scrollSpeed) * Math.min(1, dt * 1.5);
    this.stats.level = level;
    this.stats.time = this.runTime;

    const dx = this.scrollSpeed * dt;

    // Player
    this.player.update(dt, groundY);

    // Trail
    this.trail.push({ x: this.player.x + 4, y: this.player.trailY, a: 0.55 });
    if (this.trail.length > 14) this.trail.shift();
    for (const t of this.trail) t.a *= 0.82;

    // Obstacles
    this.nextObstacleIn -= dt;
    if (this.nextObstacleIn <= 0) {
      this._spawnObstacle(band.spawnGap, groundY);
    }
    for (const obs of this.obstacles) obs.update(dt, dx);
    this.obstacles = this.obstacles.filter(o => !o.offscreen);

    // Coins
    this.nextCoinIn -= dt;
    if (this.nextCoinIn <= 0) {
      this._spawnCoins(groundY);
      this.nextCoinIn = 1.2 + Math.random() * 1.8;
    }
    for (const coin of this.coins) coin.update(dt, dx);
    this.coins = this.coins.filter(c => !c.offscreen && !c.collected);

    // Particles
    this.particles.update(dt);

    // Scoring
    this.stats.distance += dx / 60;
    this.stats.score = Math.floor(this.runTime * 12 + this.stats.coins * 15);

    // Screen effects decay
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 8);
    if (this.deathFlash > 0) this.deathFlash = Math.max(0, this.deathFlash - dt * 4);

    // Collision — obstacles
    const obstacleRects: Rect[] = this.obstacles.map(o => o.rect);
    const { hit } = playerVsObstacles(this.player, obstacleRects, this.forgivePx);
    if (hit) {
      this._die();
      return;
    }

    // Collision — coins
    for (const coin of this.coins) {
      if (coin.collected) continue;
      if (playerHitsRect(this.player, coin.rect, 0)) {
        coin.collected = true;
        this.stats.coins++;
        this.stats.combo++;
        this.particles.emit(coin.centerX, coin.centerY, COL.particleCoin, 8);
        this.callbacks.onEvent('coin');
      }
    }

    this.callbacks.onUpdate({ ...this.stats });
  }

  // ── Spawning ───────────────────────────────────────────────────────────

  private _spawnObstacle(spawnGap: number, groundY: number): void {
    const spec = this._pickObstacleSpec();
    const x = this.width + 60;

    let rect: Rect;
    switch (spec.kind) {
      case 'low':
        rect = { x, y: groundY - OBSTACLE_H_LOW, w: OBSTACLE_W, h: OBSTACLE_H_LOW };
        break;
      case 'high':
        rect = { x, y: groundY - OBSTACLE_H_HIGH - 38, w: OBSTACLE_W, h: OBSTACLE_H_HIGH };
        break;
      case 'double': {
        // Two stacked — leave a passage the player can definitely pass through
        const passageH = this.player.h + 30;
        const totalH = groundY * 0.55;
        const bottomY = groundY - Math.min(OBSTACLE_H_LOW, totalH - passageH - 10);
        rect = { x, y: bottomY - OBSTACLE_H_LOW, w: OBSTACLE_W, h: OBSTACLE_H_LOW };
        // For 'double' we actually spawn a LOW + extra piece; simpler: just treat as low here
        break;
      }
    }

    this.obstacles.push(new Obstacle(spec.kind, rect!));
    this.nextObstacleIn = (spec.gapOverride ?? spawnGap) + (Math.random() - 0.5) * 0.3;
  }

  /** Choose an obstacle kind that is always fair to clear. */
  private _pickObstacleSpec(): ObstacleSpec {
    const level = this.stats.level;
    if (level <= 2) {
      // Only low obstacles early on
      return { kind: 'low' };
    }
    if (level <= 4) {
      return Math.random() < 0.3 ? { kind: 'high' } : { kind: 'low' };
    }
    // Higher levels: mix of low and high; 'double' removed — too punishing
    return Math.random() < 0.45 ? { kind: 'high' } : { kind: 'low' };
  }

  private _spawnCoins(groundY: number): void {
    const x = this.width + 80;
    const count = 3 + Math.floor(Math.random() * 4);
    const airborne = Math.random() < 0.5;
    const baseY = airborne
      ? groundY - this.player.h * 2.2 - Math.random() * 40
      : groundY - COIN_SIZE - 4;
    for (let i = 0; i < count; i++) {
      const phase = i * 0.6;
      this.coins.push(new Coin(x + i * (COIN_SIZE + 10), baseY - i * COIN_ROW_HEIGHT, COIN_SIZE, phase));
    }
  }

  // ── Death ──────────────────────────────────────────────────────────────

  private _die(): void {
    this.state = 'over';
    this._stopLoop();
    this.screenShake = 1;
    this.deathFlash = 1;
    // Emit hit particles at player center
    this.particles.emit(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      COL.particleHit,
      22
    );
    this.callbacks.onEvent('collision');
    this.callbacks.onGameOver({ ...this.stats });
    // Draw final frame
    this._draw();
  }

  // ── Draw ───────────────────────────────────────────────────────────────

  private _draw(): void {
    const { ctx, width, height } = this;
    const groundY = height * GROUND_FRAC;

    ctx.save();

    // Screen shake
    if (this.screenShake > 0) {
      const s = this.screenShake * 7;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    // Background
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, width, height);

    // Starfield
    this._drawStars();

    // Ground
    this._drawGround(groundY);

    // Coins (behind player)
    this._drawCoins();

    // Trail
    this._drawTrail();

    // Obstacles
    this._drawObstacles();

    // Player
    this._drawPlayer();

    // Particles
    this.particles.draw(ctx);

    // Death flash
    if (this.deathFlash > 0) {
      ctx.fillStyle = `rgba(255,45,85,${this.deathFlash * 0.35})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  private _drawStars(): void {
    const { ctx } = this;
    ctx.fillStyle = COL.star;
    for (const s of this.stars) {
      ctx.globalAlpha = 0.3 + s.r * 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private _drawGround(groundY: number): void {
    const { ctx, width, height } = this;

    // Ground fill
    ctx.fillStyle = COL.ground;
    ctx.fillRect(0, groundY, width, height - groundY);

    // Glowing top edge
    const grad = ctx.createLinearGradient(0, groundY - 3, 0, groundY + 10);
    grad.addColorStop(0, '#3af');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY - 2, width, 12);

    // Grid lines scrolling
    ctx.strokeStyle = COL.groundLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    const spacing = 60;
    const offset = (this.stats.distance * 60) % spacing;
    for (let x = -offset; x < width + spacing; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private _drawTrail(): void {
    const { ctx } = this;
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const r = 3 * (i / this.trail.length);
      ctx.fillStyle = COL.trail;
      ctx.globalAlpha = t.a * (i / this.trail.length);
      ctx.fillRect(t.x - r, t.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  private _drawPlayer(): void {
    const { ctx, player } = this;
    const px = player.x;
    const py = player.y;
    const pw = player.w;
    const ph = player.h;
    const cx = px + pw / 2;
    const cy = py + ph / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, player.squash);
    ctx.translate(-cx, -cy);

    // Glow
    ctx.shadowBlur = 18;
    ctx.shadowColor = COL.playerBody;

    // Body
    ctx.fillStyle = COL.playerBody;
    ctx.fillRect(px + 4, py, pw - 8, ph);

    // Visor stripe
    ctx.fillStyle = COL.playerVisor;
    ctx.fillRect(px + pw - 14, py + 10, 10, 14);

    // Scarf
    const scarf = player.scarfPhase;
    ctx.strokeStyle = COL.scarf;
    ctx.lineWidth = 3;
    ctx.shadowColor = COL.scarf;
    ctx.beginPath();
    ctx.moveTo(px + 4, py + ph * 0.32);
    for (let s = 0; s <= 8; s++) {
      const sx = px + 4 - s * 5;
      const sy = py + ph * 0.32 + Math.sin(scarf + s * 0.9) * 5;
      ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private _drawObstacles(): void {
    const { ctx } = this;
    for (const obs of this.obstacles) {
      const { x, y, w, h } = obs.rect;
      ctx.shadowBlur = 14;
      ctx.shadowColor = obs.kind === 'high' ? COL.obstacleB : COL.obstacleA;
      ctx.fillStyle = obs.kind === 'high' ? COL.obstacleB : COL.obstacleA;

      // Main body
      ctx.fillRect(x, y, w, h);

      // Top highlight stripe
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.18;
      ctx.fillRect(x, y, w, 4);
      ctx.globalAlpha = 1;

      ctx.shadowBlur = 0;
    }
  }

  private _drawCoins(): void {
    const { ctx } = this;
    for (const coin of this.coins) {
      if (coin.collected) continue;
      const cx = coin.centerX;
      const cy = coin.centerY + Math.sin(coin.phase) * 4;
      const r = coin.rect.w / 2;

      ctx.shadowBlur = 12;
      ctx.shadowColor = COL.coinGlow;
      ctx.fillStyle = COL.coin;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner shine
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }

  // ── Pause overlay (drawn while paused) ────────────────────────────────

  private _drawPauseOverlay(): void {
    this._draw();
    const { ctx, width, height } = this;
    ctx.fillStyle = 'rgba(9,13,23,0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(height * 0.072)}px monospace`;
    ctx.fillText('PAUSED', width / 2, height / 2 - 20);
    ctx.font = `${Math.round(height * 0.032)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press P or tap to resume', width / 2, height / 2 + 30);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private _resetRun(): void {
    const groundY = this.height * GROUND_FRAC;
    this.player = new Player(this.width * PLAYER_X_FRAC, groundY);
    this.obstacles = [];
    this.coins = [];
    this.trail = [];
    this.particles.clear();
    this.stats = { score: 0, coins: 0, distance: 0, combo: 0, level: 1, time: 0 };
    this.runTime = 0;
    this.lastTime = 0;
    this.scrollSpeed = 300;
    this.nextObstacleIn = 1.8;
    this.nextCoinIn = 2.5;
    this.screenShake = 0;
    this.deathFlash = 0;
  }

  private _buildStars(count: number): void {
    this.stars = [];
    const { width, height } = this;
    const skyH = height * GROUND_FRAC;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * skyH * 0.85,
        r: 0.5 + Math.random() * 1.2,
        speed: 0.2 + Math.random() * 0.6,
      });
    }
  }

  /** Render a single static "menu" frame (called from UIManager before game start). */
  drawMenuFrame(): void {
    this._buildStars(100);
    const groundY = this.height * GROUND_FRAC;
    this.player = new Player(this.width * PLAYER_X_FRAC, groundY);
    this._draw();
  }
}
