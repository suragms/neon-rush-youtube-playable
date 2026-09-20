import type { Rect } from "./Geometry";

export type ObstacleKind = "low" | "high" | "double";

export class Obstacle {
  kind: ObstacleKind;
  rect: Rect;
  flash = 0;

  constructor(kind: ObstacleKind, rect: Rect) {
    this.kind = kind;
    this.rect = rect;
  }

  update(dt: number, dx: number): void {
    this.rect.x -= dx;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
  }

  get offscreen(): boolean {
    return this.rect.x + this.rect.w < -80;
  }

  get top(): number {
    return this.rect.y;
  }

  get bottom(): number {
    return this.rect.y + this.rect.h;
  }
}
