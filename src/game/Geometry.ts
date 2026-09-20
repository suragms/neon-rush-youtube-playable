export interface Rect { x: number; y: number; w: number; h: number }
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function shrink(rect: Rect, px: number): Rect {
  return { x: rect.x + px, y: rect.y + px, w: Math.max(1, rect.w - px * 2), h: Math.max(1, rect.h - px * 2) };
}
