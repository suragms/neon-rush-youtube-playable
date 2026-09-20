import type { Rect } from "./Geometry";

const GRAVITY = 2600;
const JUMP_VELOCITY = -940;
const DOUBLE_JUMP_VELOCITY = -820;
const FAST_FALL = 3200;

export class Player {
  x: number;
  y: number;
  w = 46;
  h = 62;
  vy = 0;
  grounded = true;
  jumpsUsed = 0;
  maxJumps = 2;
  squash = 1;
  time = 0;

  constructor(x: number, groundY: number) {
    this.x = x;
    this.y = groundY - this.h;
  }

  get hitbox(): Rect {
    return { x: this.x + 6, y: this.y + 4, w: this.w - 12, h: this.h - 6 };
  }

  getHitbox(): Rect {
    return this.hitbox;
  }

  jump(): boolean {
    if (this.jumpsUsed >= this.maxJumps) return false;
    this.vy = this.jumpsUsed === 0 ? JUMP_VELOCITY : DOUBLE_JUMP_VELOCITY;
    this.jumpsUsed += 1;
    this.grounded = false;
    this.squash = 0.78;
    return true;
  }

  cutJump(): void {
    if (!this.grounded && this.vy < -300) this.vy = -300;
  }

  startFallBoost(): void {
    if (!this.grounded) this.vy += 260;
  }

  update(dt: number, groundY: number): void {
    this.time += dt;
    if (!this.grounded) {
      this.vy += (this.vy > 0 ? FAST_FALL : GRAVITY) * dt;
      this.y += this.vy * dt;
      const floor = groundY - this.h;
      if (this.y >= floor) {
        this.y = floor;
        this.vy = 0;
        this.grounded = true;
        this.jumpsUsed = 0;
        this.squash = 1.22;
      }
    }
    const target = this.grounded ? 1 : this.vy < 0 ? 1.08 : 0.94;
    this.squash += (target - this.squash) * Math.min(1, dt * 14);
  }

  get scarfPhase(): number {
    return this.time * 9;
  }

  get trailY(): number {
    return this.y + this.h * 0.62;
  }
}
