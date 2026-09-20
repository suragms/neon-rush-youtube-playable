interface Settings { sound: boolean; music: boolean; reducedMotion: boolean }
interface SaveData { version: number; best: number; coins: number; settings: Settings; achievements: string[] }
const KEY = 'neon-rush.v1';
const SCHEMA_VERSION = 1;
const safeNumber = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
export class StorageManager {
  data: SaveData = {
    version: SCHEMA_VERSION,
    best: 0,
    coins: 0,
    settings: {
      sound: true,
      music: true,
      reducedMotion: typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false
    },
    achievements: []
  };
  available = true;
  constructor() {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        const saved = raw as Partial<SaveData>;
        // Schema version check — if version mismatches, keep defaults (safe forward/backward compat)
        const savedVersion = typeof saved.version === 'number' ? saved.version : 0;
        if (savedVersion <= SCHEMA_VERSION) {
          this.data.best = safeNumber(saved.best);
          this.data.coins = safeNumber(saved.coins);
          for (const key of ['sound', 'music', 'reducedMotion'] as const) {
            if (typeof saved.settings?.[key] === 'boolean') this.data.settings[key] = saved.settings[key];
          }
          if (Array.isArray(saved.achievements)) {
            this.data.achievements = saved.achievements
              .filter((id): id is string => typeof id === 'string')
              .slice(0, 32);
          }
        }
      }
    } catch { this.available = false; }
  }
  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this.available = true;
    } catch { this.available = false; }
  }
  updateSettings(settings: Partial<Settings>): void { Object.assign(this.data.settings, settings); this.save(); }
  recordRun(score: number, coins: number): boolean {
    const record = safeNumber(score) > this.data.best;
    this.data.best = Math.max(this.data.best, safeNumber(score));
    this.data.coins += safeNumber(coins);
    this.save();
    return record;
  }
  unlockAchievement(id: string): boolean {
    if (this.data.achievements.includes(id)) return false;
    this.data.achievements.push(id);
    this.save();
    return true;
  }
}
