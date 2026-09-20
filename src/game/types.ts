export type GameState = 'menu' | 'running' | 'paused' | 'over';
export interface RunStats { score: number; coins: number; distance: number; combo: number; level: number; time: number }
export interface GameCallbacks {
  onUpdate: (stats: RunStats) => void;
  onGameOver: (stats: RunStats) => void;
  onEvent: (event: 'jump' | 'coin' | 'collision' | 'achievement') => void;
  onAchievement: (id: string, title: string) => void;
}
