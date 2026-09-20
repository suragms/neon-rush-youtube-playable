import type { Rect } from "./Geometry";

export class Coin {
  rect: Rect;
  phase: number;
  collected = false;

  constructor(x: number, y: number, size: number, phase: number) {
    this.rect = { x, y, w: size, h: size };
    this.phase = phase;
  }

  update(dt: number, dx: number): void {
    this.rect.x -= dx;
    this.phase += dt * 3.4;
  }

  get offscreen(): boolean {
    return this.rect.x + this.rect.w < -40;
  }

  get centerX(): number {
    return this.rect.x + this.rect.w / 2;
  }

  get centerY(): number {
    return this.rect.y + this.rect.h / 2;
  }
}
