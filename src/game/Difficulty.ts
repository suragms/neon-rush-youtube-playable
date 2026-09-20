export interface DifficultyBand {
  level: number;
  scrollSpeed: number;
  spawnGap: number;
}

export const MAX_LEVEL = 8;
export const MAX_SPEED = 560;

export function levelForTime(seconds: number): number {
  return Math.min(MAX_LEVEL, Math.floor(Math.max(0, seconds) / 25) + 1);
}

export function cappedSpeed(speed: number): number {
  return Math.max(0, Math.min(MAX_SPEED, speed));
}

export function bandForLevel(level: number): DifficultyBand {
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return {
    level: safeLevel,
    scrollSpeed: cappedSpeed(300 + (safeLevel - 1) * 38),
    spawnGap: Math.max(1.65, 2.45 - (safeLevel - 1) * 0.12),
  };
}
