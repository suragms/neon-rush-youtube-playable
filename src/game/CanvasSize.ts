export interface CanvasView {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Keeps a canvas backing store matched to its CSS size, capped at 2x for
 * performance. Returns false when no resize was needed to avoid redundant
 * canvas clears.
 */
export function CanvasSize(canvas: HTMLCanvasElement, maxDpr = 2): CanvasView {
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { width, height, dpr };
}
