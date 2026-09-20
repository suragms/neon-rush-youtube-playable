/**
 * UIManager — builds and drives all DOM UI for Neon Rush.
 *
 * Creates the canvas and all overlay screens (menu, HUD, game-over, pause)
 * entirely in code so index.html stays minimal.  All sizes are calculated
 * relative to the canvas/window so the UI works on any screen.
 */

import { CanvasSize } from '../game/CanvasSize';
import type { RunStats } from '../game/types';

// ── CSS ───────────────────────────────────────────────────────────────────

const STYLE = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#090d17;touch-action:none}
#app{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
#neon-canvas{display:block;width:100%;height:100%;max-width:100%;max-height:100%}
.ui-layer{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;font-family:monospace;color:#fff}
.ui-layer.active{pointer-events:auto}
/* HUD */
#hud{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:flex-start;padding:10px 14px;pointer-events:none;font-family:monospace;gap:8px;flex-wrap:wrap}
.hud-score{font-size:clamp(14px,3.5vw,22px);color:#fff;text-shadow:0 0 8px #00f5ff;letter-spacing:.04em}
.hud-info{font-size:clamp(10px,2.5vw,15px);color:#8af;opacity:.85}
.hud-coins{color:#ffe600;font-size:clamp(12px,3vw,18px);text-shadow:0 0 6px #ffe600}
/* Buttons */
.nr-btn{display:inline-block;padding:12px 28px;border:2px solid #00f5ff;background:rgba(0,245,255,.08);color:#00f5ff;font-family:monospace;font-size:clamp(13px,3vw,18px);letter-spacing:.1em;cursor:pointer;border-radius:4px;transition:background .15s,transform .1s;-webkit-tap-highlight-color:transparent;min-width:140px;min-height:44px;touch-action:manipulation}
.nr-btn:hover,.nr-btn:focus{background:rgba(0,245,255,.22);outline:2px solid #00f5ff;outline-offset:3px}
.nr-btn:active{transform:scale(.96)}
.nr-btn.secondary{border-color:#8af;color:#8af}
.nr-btn.secondary:hover,.nr-btn.secondary:focus{background:rgba(136,170,255,.18)}
/* Menu */
#menu-screen{gap:18px}
.nr-title{font-size:clamp(28px,8vw,62px);letter-spacing:.12em;color:#00f5ff;text-shadow:0 0 24px #00f5ff,0 0 48px #00f5ff66;margin-bottom:4px}
.nr-subtitle{font-size:clamp(11px,2.8vw,16px);color:#8af;margin-bottom:14px;letter-spacing:.08em}
.menu-controls{font-size:clamp(10px,2vw,13px);color:#556;margin-top:10px;text-align:center;line-height:1.8}
/* Game over */
#gameover-screen{gap:14px}
.nr-gameover{font-size:clamp(24px,6vw,48px);color:#ff2d55;text-shadow:0 0 20px #ff2d55;letter-spacing:.1em}
.nr-final-score{font-size:clamp(18px,4.5vw,32px);color:#fff}
.nr-best{font-size:clamp(12px,3vw,18px);color:#ffe600}
.nr-new-record{color:#ffe600;font-size:clamp(13px,3.2vw,20px);text-shadow:0 0 12px #ffe600;animation:pulse .7s infinite alternate}
@keyframes pulse{from{opacity:.7}to{opacity:1}}
.go-buttons{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:4px}
/* Settings row */
.settings-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.toggle-btn{padding:8px 16px;border:1px solid #335;background:rgba(0,0,0,.4);color:#8af;font-family:monospace;font-size:clamp(11px,2.5vw,14px);cursor:pointer;border-radius:4px;min-height:36px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.toggle-btn.on{border-color:#00f5ff;color:#00f5ff}
.toggle-btn:focus{outline:2px solid #00f5ff;outline-offset:2px}
`;

// ── Helper ─────────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(tag: string, cls = '', text = ''): T {
  const e = document.createElement(tag) as T;
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// ── UIManager ──────────────────────────────────────────────────────────────

export interface UICallbacks {
  onStart: () => void;
  onRestart: () => void;
  onToggleSound: (on: boolean) => void;
  onToggleMusic: (on: boolean) => void;
  onJump: () => void;
  onPause: () => void;
}

export class UIManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  private hud!: HTMLElement;
  private hudScore!: HTMLElement;
  private hudCoins!: HTMLElement;
  private hudLevel!: HTMLElement;
  private hudBest!: HTMLElement;

  private menuScreen!: HTMLElement;
  private gameoverScreen!: HTMLElement;
  private goScore!: HTMLElement;
  private goBest!: HTMLElement;
  private goRecord!: HTMLElement;

  private soundBtn!: HTMLButtonElement;
  private musicBtn!: HTMLButtonElement;

  private soundEnabled = true;
  private musicEnabled = true;

  private callbacks: UICallbacks;

  // Pending RAF for canvas resize
  private resizeRaf = 0;

  constructor(appEl: HTMLElement, callbacks: UICallbacks, soundOn: boolean, musicOn: boolean) {
    this.callbacks = callbacks;
    this.soundEnabled = soundOn;
    this.musicEnabled = musicOn;

    // Inject styles
    const styleTag = document.createElement('style');
    styleTag.textContent = STYLE;
    document.head.appendChild(styleTag);

    // Canvas
    this.canvas = el<HTMLCanvasElement>('canvas');
    this.canvas.id = 'neon-canvas';
    this.canvas.setAttribute('aria-label', 'Neon Rush game canvas');
    appEl.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    // UI layers
    this._buildHUD(appEl);
    this._buildMenuScreen(appEl);
    this._buildGameOverScreen(appEl);

    // Input
    this._wireInput();

    // Resize
    this._onResize();
    window.addEventListener('resize', () => this._scheduleResize(), { passive: true });
    window.addEventListener('orientationchange', () => this._scheduleResize(), { passive: true });
  }

  // ── Screens ────────────────────────────────────────────────────────────

  showMenu(): void {
    this.menuScreen.hidden = false;
    this.menuScreen.classList.add('active');
    this.gameoverScreen.hidden = true;
    this.hud.hidden = true;
  }

  showGame(): void {
    this.menuScreen.hidden = true;
    this.gameoverScreen.hidden = true;
    this.hud.hidden = false;
  }

  showGameOver(stats: RunStats, bestScore: number, isRecord: boolean): void {
    this.gameoverScreen.hidden = false;
    this.gameoverScreen.classList.add('active');
    this.hud.hidden = true;
    this.goScore.textContent = `Score: ${stats.score}`;
    this.goBest.textContent = `Best: ${bestScore}`;
    this.goRecord.hidden = !isRecord;
  }

  updateHUD(stats: RunStats, best: number): void {
    this.hudScore.textContent = `${stats.score}`;
    this.hudCoins.textContent = `⬡ ${stats.coins}`;
    this.hudLevel.textContent = `Lv.${stats.level}`;
    this.hudBest.textContent = `Best: ${best}`;
  }

  updateSoundButtons(sound: boolean, music: boolean): void {
    this.soundEnabled = sound;
    this.musicEnabled = music;
    this.soundBtn.textContent = sound ? '🔊 SFX' : '🔇 SFX';
    this.soundBtn.classList.toggle('on', sound);
    this.musicBtn.textContent = music ? '🎵 Music' : '🎵 Off';
    this.musicBtn.classList.toggle('on', music);
  }

  // ── Canvas size ────────────────────────────────────────────────────────

  private _scheduleResize(): void {
    if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = 0;
      this._onResize();
    });
  }

  private _onResize(): void {
    CanvasSize(this.canvas);
  }

  getCanvasLogicalSize(): { width: number; height: number } {
    const r = this.canvas.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }

  getCanvasPhysicalSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  // ── Build helpers ──────────────────────────────────────────────────────

  private _buildHUD(parent: HTMLElement): void {
    const hud = el('div');
    hud.id = 'hud';
    hud.hidden = true;
    hud.setAttribute('aria-live', 'polite');
    hud.setAttribute('aria-atomic', 'false');
    hud.setAttribute('aria-label', 'Game stats');

    this.hudScore = el('div', 'hud-score', '0');
    this.hudCoins = el('div', 'hud-coins', '⬡ 0');
    this.hudLevel = el('div', 'hud-info', 'Lv.1');
    this.hudBest = el('div', 'hud-info', 'Best: 0');

    hud.appendChild(this.hudScore);
    hud.appendChild(this.hudCoins);
    hud.appendChild(this.hudLevel);
    hud.appendChild(this.hudBest);

    parent.appendChild(hud);
    this.hud = hud;
  }

  private _buildMenuScreen(parent: HTMLElement): void {
    const screen = el('div', 'ui-layer active');
    screen.id = 'menu-screen';
    screen.setAttribute('role', 'main');
    screen.setAttribute('aria-label', 'Neon Rush main menu');

    const title = el('div', 'nr-title', 'NEON RUSH');
    const subtitle = el('div', 'nr-subtitle', 'Infinite Runner');

    const startBtn = el<HTMLButtonElement>('button', 'nr-btn', 'START');
    startBtn.setAttribute('aria-label', 'Start game');
    startBtn.addEventListener('click', () => {
      this.callbacks.onStart();
    });

    // Settings row
    const settingsRow = el('div', 'settings-row');
    this.soundBtn = el<HTMLButtonElement>('button', 'toggle-btn on', '🔊 SFX');
    this.soundBtn.setAttribute('aria-pressed', 'true');
    this.soundBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled;
      this.soundBtn.setAttribute('aria-pressed', String(this.soundEnabled));
      this.callbacks.onToggleSound(this.soundEnabled);
    });
    this.musicBtn = el<HTMLButtonElement>('button', 'toggle-btn on', '🎵 Music');
    this.musicBtn.setAttribute('aria-pressed', 'true');
    this.musicBtn.addEventListener('click', () => {
      this.musicEnabled = !this.musicEnabled;
      this.musicBtn.setAttribute('aria-pressed', String(this.musicEnabled));
      this.callbacks.onToggleMusic(this.musicEnabled);
    });
    settingsRow.appendChild(this.soundBtn);
    settingsRow.appendChild(this.musicBtn);

    const controls = el('div', 'menu-controls');
    controls.innerHTML =
      'Space / ↑ &nbsp;→&nbsp; Jump &nbsp;|&nbsp; P &nbsp;→&nbsp; Pause &nbsp;|&nbsp; M &nbsp;→&nbsp; Mute<br>' +
      'Tap screen &nbsp;→&nbsp; Jump';

    screen.appendChild(title);
    screen.appendChild(subtitle);
    screen.appendChild(startBtn);
    screen.appendChild(settingsRow);
    screen.appendChild(controls);

    parent.appendChild(screen);
    this.menuScreen = screen;
  }

  private _buildGameOverScreen(parent: HTMLElement): void {
    const screen = el('div', 'ui-layer');
    screen.id = 'gameover-screen';
    screen.setAttribute('role', 'alertdialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', 'Game over');
    screen.hidden = true;

    const titleEl = el('div', 'nr-gameover', 'GAME OVER');
    this.goScore = el('div', 'nr-final-score', 'Score: 0');
    this.goBest = el('div', 'nr-best', 'Best: 0');
    this.goRecord = el('div', 'nr-new-record', '★ NEW RECORD ★');
    this.goRecord.hidden = true;

    const btnRow = el('div', 'go-buttons');
    const restartBtn = el<HTMLButtonElement>('button', 'nr-btn', 'PLAY AGAIN');
    restartBtn.setAttribute('aria-label', 'Play again');
    restartBtn.addEventListener('click', () => this.callbacks.onRestart());

    const menuBtn = el<HTMLButtonElement>('button', 'nr-btn secondary', 'MENU');
    menuBtn.setAttribute('aria-label', 'Return to menu');
    menuBtn.addEventListener('click', () => {
      screen.hidden = true;
      screen.classList.remove('active');
      this.showMenu();
    });

    btnRow.appendChild(restartBtn);
    btnRow.appendChild(menuBtn);

    screen.appendChild(titleEl);
    screen.appendChild(this.goScore);
    screen.appendChild(this.goBest);
    screen.appendChild(this.goRecord);
    screen.appendChild(btnRow);

    parent.appendChild(screen);
    this.gameoverScreen = screen;
  }

  // ── Input wiring ───────────────────────────────────────────────────────

  private _wireInput(): void {
    // Keyboard
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
          e.preventDefault();
          this.callbacks.onJump();
          break;
        case 'KeyP':
          this.callbacks.onPause();
          break;
        case 'KeyM':
          this.soundEnabled = !this.soundEnabled;
          this.callbacks.onToggleSound(this.soundEnabled);
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
      }
    });

    // Touch — prevent scroll, handle tap
    let touchStartY = 0;
    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      touchStartY = e.changedTouches[0]?.clientY ?? 0;
      this.callbacks.onJump();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
    }, { passive: false });

    // Mouse click on canvas while playing = jump
    this.canvas.addEventListener('click', () => {
      void touchStartY; // used to suppress linter
      this.callbacks.onJump();
    });
  }
}
