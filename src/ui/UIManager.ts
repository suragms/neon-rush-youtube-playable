/**
 * UIManager — premium UI/UX for Neon Rush.
 *
 * Screens:
 *   Menu → [Play] [How to Play] [Settings]
 *   HowToPlay overlay
 *   Settings overlay
 *   Countdown (3-2-1-GO)
 *   Playing HUD
 *   Pause overlay
 *   Game Over
 *
 * All DOM built programmatically — index.html stays minimal.
 * All callbacks preserved from the original interface.
 * Playables lifecycle untouched.
 */

import { CanvasSize } from '../game/CanvasSize';
import type { RunStats } from '../game/types';

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────

const STYLE = `
/* ── Reset & base ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{
  width:100%;height:100%;overflow:hidden;
  background:#090d17;
  touch-action:none;
  -webkit-user-select:none;user-select:none;
}
#app{
  display:flex;align-items:stretch;justify-content:center;
  width:100%;height:100%;
  position:relative;
}

/* ── Canvas ── */
#neon-canvas{
  display:block;width:100%;height:100%;
  max-width:100%;max-height:100%;
  position:relative;z-index:0;
}

/* ── Overlay layer ── */
.nr-overlay{
  position:fixed;inset:0;z-index:10;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  pointer-events:none;
  font-family:'Courier New',Courier,monospace;
  color:#fff;
}
.nr-overlay.active{pointer-events:auto}

/* ── Glass card ── */
.nr-card{
  background:rgba(9,13,23,0.82);
  border:1px solid rgba(0,245,255,0.22);
  border-radius:16px;
  box-shadow:0 0 32px rgba(0,245,255,0.08),inset 0 1px 0 rgba(255,255,255,0.04);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  padding:clamp(20px,5vw,40px) clamp(24px,6vw,52px);
  display:flex;flex-direction:column;
  align-items:center;
  gap:clamp(12px,2.5vh,22px);
  width:min(92vw,440px);
  max-height:90vh;
  overflow-y:auto;
}

/* ── Title ── */
.nr-title{
  font-size:clamp(32px,8vw,68px);
  letter-spacing:.14em;
  color:#00f5ff;
  text-shadow:0 0 24px #00f5ff,0 0 60px rgba(0,245,255,.35);
  line-height:1;
  text-align:center;
}
.nr-tagline{
  font-size:clamp(10px,2.6vw,15px);
  color:#6af;
  letter-spacing:.18em;
  text-transform:uppercase;
  opacity:.8;
  text-align:center;
}

/* ── Best score badge ── */
.nr-best-badge{
  display:flex;align-items:center;gap:8px;
  background:rgba(255,230,0,.07);
  border:1px solid rgba(255,230,0,.22);
  border-radius:999px;
  padding:5px 16px;
  font-size:clamp(11px,2.5vw,14px);
  color:#ffe600;
  letter-spacing:.06em;
}
.nr-best-badge span{opacity:.65;font-size:.9em}

/* ── Divider ── */
.nr-divider{
  width:100%;height:1px;
  background:linear-gradient(90deg,transparent,rgba(0,245,255,.25),transparent);
  flex-shrink:0;
}

/* ── Buttons ── */
.nr-btn{
  display:flex;align-items:center;justify-content:center;
  gap:8px;
  padding:0 clamp(20px,5vw,36px);
  height:clamp(44px,6vh,56px);
  min-width:clamp(140px,40vw,220px);
  border:2px solid #00f5ff;
  border-radius:8px;
  background:rgba(0,245,255,.08);
  color:#00f5ff;
  font-family:inherit;
  font-size:clamp(13px,3vw,17px);
  letter-spacing:.12em;
  cursor:pointer;
  transition:background .15s,box-shadow .15s,transform .1s;
  -webkit-tap-highlight-color:transparent;
  touch-action:manipulation;
  white-space:nowrap;
  position:relative;
  overflow:hidden;
}
.nr-btn::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,.05),transparent);
  pointer-events:none;
}
.nr-btn:hover,.nr-btn:focus-visible{
  background:rgba(0,245,255,.18);
  box-shadow:0 0 18px rgba(0,245,255,.28);
  outline:none;
}
.nr-btn:active{transform:scale(.96)}
.nr-btn.primary{
  border-color:#00f5ff;
  background:rgba(0,245,255,.12);
  font-size:clamp(15px,3.5vw,20px);
  letter-spacing:.18em;
  height:clamp(50px,7vh,62px);
  box-shadow:0 0 24px rgba(0,245,255,.18);
}
.nr-btn.primary:hover,.nr-btn.primary:focus-visible{
  background:rgba(0,245,255,.22);
  box-shadow:0 0 36px rgba(0,245,255,.38);
}
.nr-btn.danger{border-color:#ff2d55;color:#ff2d55;background:rgba(255,45,85,.08)}
.nr-btn.danger:hover,.nr-btn.danger:focus-visible{background:rgba(255,45,85,.18);box-shadow:0 0 18px rgba(255,45,85,.25)}
.nr-btn.ghost{border-color:rgba(136,170,255,.4);color:#8af;background:transparent}
.nr-btn.ghost:hover,.nr-btn.ghost:focus-visible{background:rgba(136,170,255,.12)}
.nr-btn-group{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%}

/* ── Toggle button ── */
.nr-toggle{
  display:flex;align-items:center;justify-content:space-between;
  width:100%;
  padding:10px 16px;
  border:1px solid rgba(0,245,255,.18);
  border-radius:8px;
  background:rgba(0,245,255,.04);
  cursor:pointer;
  touch-action:manipulation;
  -webkit-tap-highlight-color:transparent;
  gap:12px;
  transition:background .15s;
}
.nr-toggle:hover{background:rgba(0,245,255,.10)}
.nr-toggle:focus-visible{outline:2px solid #00f5ff;outline-offset:2px}
.nr-toggle-label{
  font-family:inherit;font-size:clamp(12px,2.8vw,15px);
  color:#cde;letter-spacing:.06em;
}
/* pill switch */
.nr-switch{
  width:44px;height:24px;
  border-radius:999px;
  border:1.5px solid rgba(0,245,255,.35);
  background:rgba(0,0,0,.5);
  position:relative;
  flex-shrink:0;
  transition:background .2s,border-color .2s;
}
.nr-switch::after{
  content:'';
  position:absolute;top:2px;left:2px;
  width:16px;height:16px;
  border-radius:50%;
  background:#445;
  transition:transform .2s,background .2s;
}
.nr-toggle[aria-pressed=true] .nr-switch{
  background:rgba(0,245,255,.22);border-color:#00f5ff;
}
.nr-toggle[aria-pressed=true] .nr-switch::after{
  transform:translateX(20px);background:#00f5ff;
}

/* ── How-to-play / Settings panels ── */
.nr-panel-title{
  font-size:clamp(15px,3.5vw,20px);
  color:#00f5ff;letter-spacing:.12em;
  text-align:center;
  text-shadow:0 0 12px rgba(0,245,255,.35);
}
.nr-instructions{
  width:100%;
  font-size:clamp(11px,2.4vw,14px);
  color:#aac;
  line-height:1.85;
  letter-spacing:.03em;
}
.nr-instructions b{color:#00f5ff}
.nr-instructions em{color:#ffe600;font-style:normal}
.nr-section-label{
  font-size:clamp(10px,2vw,12px);
  color:#557;
  letter-spacing:.12em;
  text-transform:uppercase;
  align-self:flex-start;
  margin-top:4px;
}

/* ── HUD ── */
#nr-hud{
  position:fixed;top:0;left:0;right:0;z-index:20;
  display:flex;align-items:flex-start;justify-content:space-between;
  padding:env(safe-area-inset-top, 8px) 14px 0;
  padding-top:max(env(safe-area-inset-top,0px),8px);
  pointer-events:none;
  gap:6px;
}
/* ── Scanlines ── */
#nr-scanlines{
  position:fixed;inset:0;pointer-events:none;z-index:99;
  background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.15) 50%);
  background-size:100% 4px;
  opacity:.1;
}

.nr-hud-pill{
  background:rgba(9,13,23,0.72);
  border:1px solid rgba(0,245,255,.16);
  border-radius:8px;
  padding:5px 11px;
  display:flex;flex-direction:column;align-items:center;
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
  min-width:64px;
}
.nr-hud-label{
  font-size:clamp(7px,1.5vw,10px);
  color:#557;letter-spacing:.1em;text-transform:uppercase;
  font-family:'Courier New',Courier,monospace;
}
.nr-hud-value{
  font-size:clamp(13px,3.5vw,21px);
  font-family:'Courier New',Courier,monospace;
  color:#fff;
  letter-spacing:.05em;
  line-height:1.1;
}
.nr-hud-value.cyan{color:#00f5ff;text-shadow:0 0 8px rgba(0,245,255,.5)}
.nr-hud-value.gold{color:#ffe600;text-shadow:0 0 8px rgba(255,230,0,.4)}
.nr-hud-value.magenta{color:#ff4fff;text-shadow:0 0 8px rgba(255,79,255,.5)}
.nr-hud-pill.pulse{animation:hudPulse .35s ease both}
@keyframes hudPulse{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}

/* ── Combo banner ── */
#nr-combo{
  position:fixed;left:50%;transform:translateX(-50%);
  top:max(env(safe-area-inset-top,0px),8px);
  z-index:21;pointer-events:none;
  display:none;
  background:rgba(255,79,255,.12);
  border:1px solid rgba(255,79,255,.35);
  border-radius:999px;
  padding:3px 18px;
  font-family:'Courier New',Courier,monospace;
  font-size:clamp(11px,2.8vw,15px);
  color:#ff4fff;
  letter-spacing:.12em;
  text-shadow:0 0 10px rgba(255,79,255,.6);
  white-space:nowrap;
}
#nr-combo.visible{display:block;animation:comboIn .2s ease both}
@keyframes comboIn{from{opacity:0;transform:translateX(-50%) scale(.8)}to{opacity:1;transform:translateX(-50%) scale(1)}}

/* ── Level-up flash ── */
#nr-levelup{
  position:fixed;inset:0;z-index:25;
  display:none;pointer-events:none;
  align-items:center;justify-content:center;
}
#nr-levelup.visible{display:flex;animation:levelFlash .6s ease forwards}
@keyframes levelFlash{
  0%{opacity:0}15%{opacity:1}70%{opacity:1}100%{opacity:0}
}
.nr-levelup-text{
  font-family:'Courier New',Courier,monospace;
  font-size:clamp(20px,5vw,36px);
  color:#ff4fff;
  text-shadow:0 0 30px #ff4fff,0 0 60px rgba(255,79,255,.4);
  letter-spacing:.2em;
  pointer-events:none;
}

/* ── Pause overlay ── */
#nr-pause{display:none}
#nr-pause.visible{display:flex}

/* ── Countdown ── */
#nr-countdown{
  position:fixed;inset:0;z-index:30;
  display:none;
  align-items:center;justify-content:center;
  pointer-events:none;
}
#nr-countdown.visible{display:flex}
.nr-countdown-num{
  font-size:clamp(64px,22vw,160px);
  font-family:'Courier New',Courier,monospace;
  color:#00f5ff;
  text-shadow:0 0 40px #00f5ff,0 0 80px rgba(0,245,255,.5);
  letter-spacing:.05em;
  animation:countPop .55s ease-out forwards;
}
@keyframes countPop{
  0%{opacity:0;transform:scale(1.6)}
  40%{opacity:1;transform:scale(.92)}
  100%{opacity:0;transform:scale(.7)}
}

/* ── Game over ── */
#nr-gameover .nr-go-title{
  font-size:clamp(28px,7vw,52px);
  color:#ff2d55;
  text-shadow:0 0 24px #ff2d55;
  letter-spacing:.12em;
  text-align:center;
}
.nr-score-block{
  display:flex;flex-direction:column;align-items:center;
  gap:2px;
}
.nr-score-num{
  font-size:clamp(28px,7vw,54px);
  color:#fff;letter-spacing:.04em;line-height:1;
}
.nr-score-label{
  font-size:clamp(9px,2vw,12px);
  color:#557;letter-spacing:.14em;text-transform:uppercase;
}
.nr-scores-row{
  display:flex;gap:clamp(20px,5vw,40px);
  align-items:flex-end;
}
.nr-scores-row .nr-score-block.best .nr-score-num{
  color:#ffe600;font-size:clamp(20px,5vw,36px);
  text-shadow:0 0 12px rgba(255,230,0,.4);
}
.nr-new-best{
  font-size:clamp(12px,3vw,17px);
  color:#ffe600;
  text-shadow:0 0 14px #ffe600;
  letter-spacing:.1em;
  animation:pulse .65s infinite alternate;
}
@keyframes pulse{from{opacity:.65}to{opacity:1}}

/* ── Animations ── */
.nr-fade-in{animation:fadeIn .22s ease both}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

/* ── Achievement Toast ── */
#nr-toast{
  position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(100px);
  z-index:40;background:rgba(9,13,23,0.92);
  border:1px solid rgba(255,230,0,0.4);
  box-shadow:0 0 24px rgba(255,230,0,0.2);
  border-radius:12px;padding:12px 24px;
  display:flex;align-items:center;gap:12px;
  color:#fff;font-family:'Courier New',Courier,monospace;
  transition:transform .3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events:none;
}
#nr-toast.visible{transform:translateX(-50%) translateY(0)}
.nr-toast-icon{font-size:24px;color:#ffe600}
.nr-toast-text{display:flex;flex-direction:column;gap:2px}
.nr-toast-title{font-size:10px;color:#ffe600;letter-spacing:.14em;text-transform:uppercase}
.nr-toast-desc{font-size:13px;color:#fff;letter-spacing:.05em}

/* reduced-motion: disable decorative animations */
@media(prefers-reduced-motion:reduce){
  .nr-btn,.nr-overlay,.nr-fade-in,
  .nr-countdown-num,.nr-new-best,
  #nr-toast,#nr-scanlines,
  .nr-hud-pill,#nr-combo,#nr-levelup{
    animation:none!important;transition:none!important;
  }
  #nr-scanlines{display:none}
}

/* ── Focus ring ── */
:focus-visible{outline:2px solid #00f5ff;outline-offset:3px}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(tag: string, cls = '', text = ''): T {
  const e = document.createElement(tag) as T;
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function btn(label: string, cls = '', ariaLabel?: string): HTMLButtonElement {
  const b = el<HTMLButtonElement>('button', `nr-btn ${cls}`.trim(), label);
  b.type = 'button';
  if (ariaLabel) b.setAttribute('aria-label', ariaLabel);
  return b;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported interface
// ─────────────────────────────────────────────────────────────────────────────

export interface UICallbacks {
  onStart: () => void;
  onRestart: () => void;
  onToggleSound: (on: boolean) => void;
  onToggleMusic: (on: boolean) => void;
  onJump: () => void;
  onPause: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// UIManager
// ─────────────────────────────────────────────────────────────────────────────

export class UIManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  // ── DOM refs ──
  private hud!: HTMLElement;
  private hudScoreVal!: HTMLElement;
  private hudBestVal!: HTMLElement;
  private hudCoinsVal!: HTMLElement;

  private menuScreen!: HTMLElement;
  private menuBestBadge!: HTMLElement;

  private pauseScreen!: HTMLElement;

  private gameoverScreen!: HTMLElement;
  private goScoreNum!: HTMLElement;
  private goBestNum!: HTMLElement;
  private goNewBest!: HTMLElement;

  private soundToggle!: HTMLButtonElement;
  private musicToggle!: HTMLButtonElement;
  private soundToggleInMenu!: HTMLButtonElement;
  private musicToggleInMenu!: HTMLButtonElement;

  private howToScreen!: HTMLElement;
  private settingsScreen!: HTMLElement;
  private countdownEl!: HTMLElement;
  private countdownNum!: HTMLElement;

  private toastEl!: HTMLElement;
  private toastTitle!: HTMLElement;
  private toastDesc!: HTMLElement;
  private toastTimer = 0;

  private comboEl!: HTMLElement;
  private comboTimer = 0;
  private levelupEl!: HTMLElement;
  private levelupTimer = 0;
  private hudLevelVal!: HTMLElement;
  private hudLevelPill!: HTMLElement;
  private lastLevel = 1;

  // ── state ──
  private soundEnabled: boolean;
  private musicEnabled: boolean;
  private callbacks: UICallbacks;
  private resizeRaf = 0;

  constructor(
    appEl: HTMLElement,
    callbacks: UICallbacks,
    soundOn: boolean,
    musicOn: boolean
  ) {
    this.callbacks = callbacks;
    this.soundEnabled = soundOn;
    this.musicEnabled = musicOn;

    // styles
    const styleTag = document.createElement('style');
    styleTag.textContent = STYLE;
    document.head.appendChild(styleTag);

    // canvas
    this.canvas = el<HTMLCanvasElement>('canvas');
    this.canvas.id = 'neon-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Neon Rush game canvas');
    appEl.appendChild(this.canvas);

    // Scanlines
    const scanlines = el('div');
    scanlines.id = 'nr-scanlines';
    appEl.appendChild(scanlines);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    // build all screens
    this._buildHUD(appEl);
    this._buildMenuScreen(appEl);
    this._buildHowToPlay(appEl);
    this._buildSettings(appEl);
    this._buildPause(appEl);
    this._buildGameOver(appEl);
    this._buildCountdown(appEl);
    this._buildToast(appEl);

    this._wireInput();
    this._onResize();
    window.addEventListener('resize', () => this._scheduleResize(), { passive: true });
    window.addEventListener('orientationchange', () => this._scheduleResize(), { passive: true });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Screen transitions
  // ─────────────────────────────────────────────────────────────────────────

  showMenu(): void {
    this._hideAll();
    this.menuScreen.hidden = false;
    this.menuScreen.classList.add('active', 'nr-fade-in');
  }

  showGame(): void {
    this._hideAll();
    this.hud.hidden = false;
    this.lastLevel = 1;
    this.hudLevelVal.textContent = '1';
  }

  showPause(): void {
    this.pauseScreen.classList.add('visible', 'active', 'nr-fade-in');
  }

  hidePause(): void {
    this.pauseScreen.classList.remove('visible', 'active', 'nr-fade-in');
  }

  showGameOver(stats: RunStats, bestScore: number, isRecord: boolean): void {
    this._hideAll();
    this.gameoverScreen.hidden = false;
    this.gameoverScreen.classList.add('active', 'nr-fade-in');
    this.goScoreNum.textContent = String(stats.score);
    this.goBestNum.textContent = String(bestScore);
    this.goNewBest.hidden = !isRecord;
  }

  updateHUD(stats: RunStats, best: number): void {
    this.hudScoreVal.textContent = String(stats.score);
    this.hudBestVal.textContent = String(best);
    this.hudCoinsVal.textContent = String(stats.coins);

    // Level pill + level-up flash
    if (stats.level !== this.lastLevel) {
      this.lastLevel = stats.level;
      this.hudLevelVal.textContent = String(stats.level);
      // pulse the pill
      this.hudLevelPill.classList.remove('pulse');
      void this.hudLevelPill.offsetWidth; // force reflow
      this.hudLevelPill.classList.add('pulse');
      // show level-up overlay
      this._showLevelUp(stats.level);
    }

    // Combo banner — show when combo > 1
    if (stats.combo > 1) {
      this.comboEl.textContent = `x${stats.combo} COMBO`;
      if (!this.comboEl.classList.contains('visible')) {
        this.comboEl.classList.add('visible');
      }
      if (this.comboTimer) window.clearTimeout(this.comboTimer);
      this.comboTimer = window.setTimeout(() => {
        this.comboEl.classList.remove('visible');
        this.comboTimer = 0;
      }, 800);
    }
  }

  updateSoundButtons(sound: boolean, music: boolean): void {
    this.soundEnabled = sound;
    this.musicEnabled = music;
    this._applyToggle(this.soundToggle, sound);
    this._applyToggle(this.musicToggle, music);
    this._applyToggle(this.soundToggleInMenu, sound);
    this._applyToggle(this.musicToggleInMenu, music);
  }

  setBestScore(best: number): void {
    this.menuBestBadge.textContent = best > 0 ? `BEST  ${best}` : 'BEST  —';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Countdown
  // ─────────────────────────────────────────────────────────────────────────

  /** Show 3-2-1-GO then call cb. */
  runCountdown(cb: () => void): void {
    const steps = ['3', '2', '1', 'GO'];
    let i = 0;
    this.countdownEl.classList.add('visible');

    const tick = (): void => {
      this.countdownNum.textContent = steps[i];
      // Re-trigger CSS animation by cloning
      const clone = this.countdownNum.cloneNode(true) as HTMLElement;
      this.countdownEl.replaceChild(clone, this.countdownNum);
      this.countdownNum = clone;
      i++;
      if (i < steps.length) {
        setTimeout(tick, 600);
      } else {
        setTimeout(() => {
          this.countdownEl.classList.remove('visible');
          cb();
        }, 400);
      }
    };
    tick();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Canvas sizing
  // ─────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────

  private _hideAll(): void {
    for (const s of [this.menuScreen, this.gameoverScreen, this.howToScreen, this.settingsScreen]) {
      s.hidden = true;
      s.classList.remove('active', 'nr-fade-in');
    }
    this.hud.hidden = true;
    this.hidePause();
  }

  private _applyToggle(b: HTMLButtonElement, on: boolean): void {
    b.setAttribute('aria-pressed', String(on));
    const sw = b.querySelector<HTMLElement>('.nr-switch-label');
    if (sw) sw.textContent = on ? 'ON' : 'OFF';
  }

  private _makeToggle(labelText: string, initialOn: boolean, onChange: (on: boolean) => void): HTMLButtonElement {
    const wrap = document.createElement('button') as HTMLButtonElement;
    wrap.type = 'button';
    wrap.className = 'nr-toggle';
    wrap.setAttribute('aria-pressed', String(initialOn));
    wrap.setAttribute('aria-label', `Toggle ${labelText}`);

    const lbl = el('span', 'nr-toggle-label', labelText);
    const switchWrap = el('span', 'nr-switch');
    const switchLbl = el('span', 'nr-switch-label', initialOn ? 'ON' : 'OFF');
    switchLbl.style.cssText = 'position:absolute;opacity:0;pointer-events:none';

    wrap.appendChild(lbl);
    wrap.appendChild(switchWrap);
    wrap.appendChild(switchLbl);

    wrap.addEventListener('click', () => {
      const now = wrap.getAttribute('aria-pressed') !== 'true';
      wrap.setAttribute('aria-pressed', String(now));
      onChange(now);
    });

    return wrap;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HUD
  // ─────────────────────────────────────────────────────────────────────────

  private _buildHUD(parent: HTMLElement): void {
    const hud = el('div');
    hud.id = 'nr-hud';
    hud.hidden = true;
    hud.setAttribute('aria-live', 'polite');
    hud.setAttribute('aria-atomic', 'false');
    hud.setAttribute('aria-label', 'Game stats');

    const scorePill = this._hudPill('SCORE', '0', 'cyan');
    const bestPill  = this._hudPill('BEST', '0', '');
    const coinPill  = this._hudPill('COINS', '0', 'gold');
    const levelPill = this._hudPill('LEVEL', '1', 'magenta');

    this.hudScoreVal = scorePill.querySelector('.nr-hud-value')!;
    this.hudBestVal  = bestPill.querySelector('.nr-hud-value')!;
    this.hudCoinsVal = coinPill.querySelector('.nr-hud-value')!;
    this.hudLevelVal = levelPill.querySelector('.nr-hud-value')!;
    this.hudLevelPill = levelPill;

    const pauseBtn = el<HTMLButtonElement>('button', 'nr-btn ghost');
    pauseBtn.style.cssText = 'min-width:44px;width:44px;height:44px;padding:0;border-radius:8px;pointer-events:auto;font-size:18px;border-color:rgba(0,245,255,.25)';
    pauseBtn.setAttribute('aria-label', 'Pause game');
    pauseBtn.textContent = '⏸';
    pauseBtn.addEventListener('click', () => this.callbacks.onPause());

    hud.appendChild(scorePill);
    hud.appendChild(bestPill);
    hud.appendChild(coinPill);
    hud.appendChild(levelPill);
    hud.appendChild(pauseBtn);

    parent.appendChild(hud);
    this.hud = hud;
  }

  private _hudPill(label: string, value: string, valueCls: string): HTMLElement {
    const pill = el('div', 'nr-hud-pill');
    const lbl = el('div', 'nr-hud-label', label);
    const val = el('div', `nr-hud-value${valueCls ? ' ' + valueCls : ''}`, value);
    pill.appendChild(lbl);
    pill.appendChild(val);
    return pill;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Menu
  // ─────────────────────────────────────────────────────────────────────────

  private _buildMenuScreen(parent: HTMLElement): void {
    const screen = el('div', 'nr-overlay');
    screen.id = 'nr-menu';
    screen.setAttribute('role', 'main');
    screen.setAttribute('aria-label', 'Neon Rush main menu');
    screen.hidden = true;

    const card = el('div', 'nr-card');

    const title = el('div', 'nr-title', 'NEON RUSH');
    const tagline = el('div', 'nr-tagline', 'RUN · JUMP · SURVIVE');

    this.menuBestBadge = el('div', 'nr-best-badge', 'BEST  —');

    const div1 = el('div', 'nr-divider');

    const playBtn = btn('▶  PLAY', 'primary', 'Start game');
    playBtn.addEventListener('click', () => this.callbacks.onStart());

    const howBtn = btn('HOW TO PLAY', 'ghost', 'How to play');
    howBtn.addEventListener('click', () => this._showPanel(this.howToScreen));

    const settBtn = btn('SETTINGS', 'ghost', 'Settings');
    settBtn.addEventListener('click', () => this._showPanel(this.settingsScreen));

    const btnGroup = el('div', 'nr-btn-group');
    btnGroup.appendChild(playBtn);
    btnGroup.appendChild(howBtn);
    btnGroup.appendChild(settBtn);

    card.appendChild(title);
    card.appendChild(tagline);
    card.appendChild(this.menuBestBadge);
    card.appendChild(div1);
    card.appendChild(btnGroup);

    screen.appendChild(card);
    parent.appendChild(screen);
    this.menuScreen = screen;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // How-to-play
  // ─────────────────────────────────────────────────────────────────────────

  private _buildHowToPlay(parent: HTMLElement): void {
    const screen = el('div', 'nr-overlay');
    screen.id = 'nr-howto';
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', 'How to play');
    screen.hidden = true;

    const card = el('div', 'nr-card');

    const title = el('div', 'nr-panel-title', 'HOW TO PLAY');

    const inst = el('div', 'nr-instructions');
    inst.innerHTML = `
      <div style="margin-bottom:10px"><b>OBJECTIVE</b><br>
      Avoid obstacles. Collect <em>coins</em>.<br>
      Survive as long as possible.</div>

      <div style="margin-bottom:6px"><b>DESKTOP</b></div>
      <div>SPACE / ↑ &nbsp;→&nbsp; Jump</div>
      <div>SPACE / ↑ again → Double Jump</div>
      <div>P &nbsp;→&nbsp; Pause / Resume</div>
      <div>M &nbsp;→&nbsp; Mute sounds</div>

      <div style="margin-top:10px;margin-bottom:6px"><b>MOBILE</b></div>
      <div>TAP &nbsp;→&nbsp; Jump</div>
      <div>TAP again (airborne) &nbsp;→&nbsp; Double Jump</div>
    `;

    const backBtn = btn('← BACK', 'ghost', 'Back to menu');
    backBtn.addEventListener('click', () => this._hidePanel(screen));

    card.appendChild(title);
    card.appendChild(el('div', 'nr-divider'));
    card.appendChild(inst);
    card.appendChild(el('div', 'nr-divider'));
    card.appendChild(backBtn);

    screen.appendChild(card);
    parent.appendChild(screen);
    this.howToScreen = screen;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────────────────

  private _buildSettings(parent: HTMLElement): void {
    const screen = el('div', 'nr-overlay');
    screen.id = 'nr-settings';
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', 'Settings');
    screen.hidden = true;

    const card = el('div', 'nr-card');
    const title = el('div', 'nr-panel-title', 'SETTINGS');

    const audioLabel = el('div', 'nr-section-label', 'AUDIO');

    this.soundToggleInMenu = this._makeToggle('Sound Effects', this.soundEnabled, (on) => {
      this.soundEnabled = on;
      this.callbacks.onToggleSound(on);
      this._applyToggle(this.soundToggle, on);
    });
    this.musicToggleInMenu = this._makeToggle('Background Music', this.musicEnabled, (on) => {
      this.musicEnabled = on;
      this.callbacks.onToggleMusic(on);
      this._applyToggle(this.musicToggle, on);
    });

    // Dummy sound/music refs for updateSoundButtons (pause settings uses these)
    this.soundToggle = this._makeToggle('Sound Effects', this.soundEnabled, (on) => {
      this.soundEnabled = on;
      this.callbacks.onToggleSound(on);
      this._applyToggle(this.soundToggleInMenu, on);
    });
    this.musicToggle = this._makeToggle('Background Music', this.musicEnabled, (on) => {
      this.musicEnabled = on;
      this.callbacks.onToggleMusic(on);
      this._applyToggle(this.musicToggleInMenu, on);
    });

    const backBtn = btn('← BACK', 'ghost', 'Back to menu');
    backBtn.addEventListener('click', () => this._hidePanel(screen));

    card.appendChild(title);
    card.appendChild(el('div', 'nr-divider'));
    card.appendChild(audioLabel);
    card.appendChild(this.soundToggleInMenu);
    card.appendChild(this.musicToggleInMenu);
    card.appendChild(el('div', 'nr-divider'));
    card.appendChild(backBtn);

    screen.appendChild(card);
    parent.appendChild(screen);
    this.settingsScreen = screen;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pause overlay
  // ─────────────────────────────────────────────────────────────────────────

  private _buildPause(parent: HTMLElement): void {
    const screen = el('div', 'nr-overlay');
    screen.id = 'nr-pause';
    screen.setAttribute('role', 'dialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', 'Game paused');

    const card = el('div', 'nr-card');
    const title = el('div', 'nr-panel-title', '— PAUSED —');

    const resumeBtn = btn('▶  RESUME', 'primary', 'Resume game');
    resumeBtn.addEventListener('click', () => this.callbacks.onPause()); // onPause toggles

    const restartBtn = btn('↺  RESTART', '', 'Restart game');
    restartBtn.addEventListener('click', () => this.callbacks.onRestart());

    const audioLabel = el('div', 'nr-section-label', 'AUDIO');

    // Settings toggles also in pause (reuse soundToggle / musicToggle)
    const settingsNote = el('div', 'nr-section-label');
    settingsNote.style.opacity = '.5';
    settingsNote.style.fontSize = 'clamp(9px,1.8vw,11px)';
    settingsNote.textContent = 'Audio changes take effect immediately';

    const menuBtn = btn('MAIN MENU', 'ghost danger', 'Return to main menu');
    menuBtn.style.marginTop = '4px';
    menuBtn.addEventListener('click', () => {
      this._hideAll();
      this.showMenu();
    });

    const btnGroup = el('div', 'nr-btn-group');
    btnGroup.appendChild(resumeBtn);
    btnGroup.appendChild(restartBtn);
    btnGroup.appendChild(el('div', 'nr-divider'));
    btnGroup.appendChild(audioLabel);
    btnGroup.appendChild(this.soundToggle);
    btnGroup.appendChild(this.musicToggle);
    btnGroup.appendChild(el('div', 'nr-divider'));
    btnGroup.appendChild(menuBtn);

    card.appendChild(title);
    card.appendChild(el('div', 'nr-divider'));
    card.appendChild(btnGroup);

    screen.appendChild(card);
    parent.appendChild(screen);
    this.pauseScreen = screen;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Game Over
  // ─────────────────────────────────────────────────────────────────────────

  private _buildGameOver(parent: HTMLElement): void {
    const screen = el('div', 'nr-overlay');
    screen.id = 'nr-gameover';
    screen.setAttribute('role', 'alertdialog');
    screen.setAttribute('aria-modal', 'true');
    screen.setAttribute('aria-label', 'Game over');
    screen.hidden = true;

    const card = el('div', 'nr-card');
    const title = el('div', 'nr-go-title', 'GAME OVER');
    title.style.textAlign = 'center';
    title.style.marginBottom = '4px';

    this.goNewBest = el('div', 'nr-new-best', '★  NEW BEST  ★');
    this.goNewBest.hidden = true;

    const scoresRow = el('div', 'nr-scores-row');

    const scorePart = el('div', 'nr-score-block');
    const scoreLabel = el('div', 'nr-score-label', 'SCORE');
    this.goScoreNum = el('div', 'nr-score-num', '0');
    scorePart.appendChild(this.goScoreNum);
    scorePart.appendChild(scoreLabel);

    const bestPart = el('div', 'nr-score-block best');
    const bestLabel = el('div', 'nr-score-label', 'BEST');
    this.goBestNum = el('div', 'nr-score-num', '0');
    bestPart.appendChild(this.goBestNum);
    bestPart.appendChild(bestLabel);

    scoresRow.appendChild(scorePart);
    scoresRow.appendChild(bestPart);

    const playAgainBtn = btn('▶  PLAY AGAIN', 'primary', 'Play again');
    playAgainBtn.addEventListener('click', () => this.callbacks.onRestart());

    const menuBtn = btn('MAIN MENU', 'ghost', 'Return to main menu');
    menuBtn.addEventListener('click', () => {
      this._hideAll();
      this.showMenu();
    });

    const btnGroup = el('div', 'nr-btn-group');
    btnGroup.appendChild(playAgainBtn);
    btnGroup.appendChild(menuBtn);

    card.appendChild(title);
    card.appendChild(this.goNewBest);
    card.appendChild(el('div', 'nr-divider'));
    card.appendChild(scoresRow);
    card.appendChild(el('div', 'nr-divider'));
    card.appendChild(btnGroup);

    screen.appendChild(card);
    parent.appendChild(screen);
    this.gameoverScreen = screen;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Countdown
  // ─────────────────────────────────────────────────────────────────────────

  private _buildCountdown(parent: HTMLElement): void {
    const overlay = el('div');
    overlay.id = 'nr-countdown';
    this.countdownNum = el('div', 'nr-countdown-num', '3');
    overlay.appendChild(this.countdownNum);
    parent.appendChild(overlay);
    this.countdownEl = overlay;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Panel helpers
  // ─────────────────────────────────────────────────────────────────────────

  showAchievement(title: string, desc: string): void {
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTitle.textContent = title;
    this.toastDesc.textContent = desc;
    this.toastEl.classList.add('visible');
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('visible');
      this.toastTimer = 0;
    }, 3000);
  }

  private _buildToast(parent: HTMLElement): void {
    const toast = el('div');
    toast.id = 'nr-toast';
    const icon = el('div', 'nr-toast-icon', '🏆');
    const textGroup = el('div', 'nr-toast-text');
    this.toastTitle = el('div', 'nr-toast-title');
    this.toastDesc = el('div', 'nr-toast-desc');
    textGroup.appendChild(this.toastTitle);
    textGroup.appendChild(this.toastDesc);
    toast.appendChild(icon);
    toast.appendChild(textGroup);
    parent.appendChild(toast);
    this.toastEl = toast;

    // Combo banner
    const combo = el('div');
    combo.id = 'nr-combo';
    parent.appendChild(combo);
    this.comboEl = combo;

    // Level-up flash overlay
    const levelup = el('div');
    levelup.id = 'nr-levelup';
    const levelupText = el('div', 'nr-levelup-text');
    levelup.appendChild(levelupText);
    parent.appendChild(levelup);
    this.levelupEl = levelup;
  }

  private _showLevelUp(level: number): void {
    const textEl = this.levelupEl.querySelector<HTMLElement>('.nr-levelup-text');
    if (textEl) textEl.textContent = `LEVEL ${level}`;
    if (this.levelupTimer) window.clearTimeout(this.levelupTimer);
    this.levelupEl.classList.remove('visible');
    void this.levelupEl.offsetWidth; // force reflow
    this.levelupEl.classList.add('visible');
    this.levelupTimer = window.setTimeout(() => {
      this.levelupEl.classList.remove('visible');
      this.levelupTimer = 0;
    }, 700);
  }

  private _showPanel(panel: HTMLElement): void {
    panel.hidden = false;
    panel.classList.add('active', 'nr-fade-in');
  }

  private _hidePanel(panel: HTMLElement): void {
    panel.hidden = true;
    panel.classList.remove('active', 'nr-fade-in');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Input wiring (unchanged from original)
  // ─────────────────────────────────────────────────────────────────────────

  private _wireInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
          e.preventDefault();
          this.callbacks.onJump();
          break;
        case 'KeyP':
        case 'Escape':
          this.callbacks.onPause();
          break;
        case 'KeyM':
          this.soundEnabled = !this.soundEnabled;
          this.callbacks.onToggleSound(this.soundEnabled);
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault();
    });

    // Touch — prevent scroll, fire jump
    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.preventDefault();
      this.callbacks.onJump();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
    }, { passive: false });

    // Mouse click on canvas = jump
    this.canvas.addEventListener('click', () => {
      this.callbacks.onJump();
    });
  }
}
