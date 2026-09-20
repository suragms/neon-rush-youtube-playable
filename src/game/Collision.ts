import { rectsOverlap, shrink, type Rect } from "./Geometry";
import type { Player } from "./Player";

export interface CollisionResult {
  hit: boolean;
  overlapArea: number;
}

export function playerVsObstacles(player: Player, obstacles: Rect[], forgivenessPx: number): CollisionResult {
  const body = shrink(player.getHitbox(), forgivenessPx);
  let overlapArea = 0;
  for (const obstacle of obstacles) {
    if (!rectsOverlap(body, obstacle)) continue;
    const w = Math.min(body.x + body.w, obstacle.x + obstacle.w) - Math.max(body.x, obstacle.x);
    const h = Math.min(body.y + body.h, obstacle.y + obstacle.h) - Math.max(body.y, obstacle.y);
    overlapArea += Math.max(0, w) * Math.max(0, h);
  }
  return { hit: overlapArea > 0, overlapArea };
}

export function playerHitsRect(player: Player, rect: Rect, forgivenessPx: number): boolean {
  const body = shrink(player.getHitbox(), forgivenessPx);
  return rectsOverlap(body, rect);
}
