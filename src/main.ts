/**
 * main.ts — Neon Rush entry point.
 *
 * Wires together GameEngine, UIManager, AudioManager, StorageManager, and
 * YouTubePlayablesAdapter into a clean game lifecycle:
 *
 *   LOADING → MENU → PLAYING ↔ PAUSED → GAME OVER → RESTART / MENU
 */

import { GameEngine } from './game/GameEngine';
import { UIManager } from './ui/UIManager';
import { AudioManager } from './audio/AudioManager';
import { StorageManager } from './storage/StorageManager';
import { YouTubePlayablesAdapter } from './youtube/YouTubePlayablesAdapter';
import { CanvasSize } from './game/CanvasSize';

// ── Bootstrap ─────────────────────────────────────────────────────────────

function main(): void {
  const appEl = document.getElementById('app');
  if (!appEl) throw new Error('#app element not found');

  // Clear the loading placeholder
  appEl.innerHTML = '';

  // Storage (safe even when localStorage is unavailable)
  const storage = new StorageManager();
  const { sound, music } = storage.data.settings;

  // YouTube Playables adapter (no-op outside the container)
  const ytAdapter = new YouTubePlayablesAdapter();

  // Audio (not started yet — requires user gesture)
  const audio = new AudioManager(sound, music);

  // UI — creates canvas + all DOM screens
  const ui = new UIManager(appEl, {
    onStart: () => startGame(),
    onRestart: () => restartGame(),
    onToggleSound: (on) => {
      storage.updateSettings({ sound: on });
      audio.setSoundEnabled(on);
      ui.updateSoundButtons(on, storage.data.settings.music);
    },
    onToggleMusic: (on) => {
      storage.updateSettings({ music: on });
      audio.setMusicEnabled(on);
      ui.updateSoundButtons(storage.data.settings.sound, on);
    },
    onJump: () => handleJump(),
    onPause: () => handlePause(),
  }, sound, music);

  // Game engine — operates on the canvas context
  const engine = new GameEngine(ui.ctx, {
    onUpdate: (stats) => {
      syncCanvasSize();
      ui.updateHUD(stats, storage.data.best);
    },
    onGameOver: (stats) => {
      const isRecord = storage.recordRun(stats.score, stats.coins);
      audio.play('collision');
      ytAdapter.sendScore(stats.score);
      setTimeout(() => {
        ui.showGameOver(stats, storage.data.best, isRecord);
      }, 420);
    },
    onEvent: (kind) => {
      if (kind === 'jump') audio.play('jump');
      if (kind === 'coin') audio.play('coin');
      if (kind === 'collision') audio.play('collision');
    },
    onAchievement: (id, title) => {
      if (storage.unlockAchievement(id)) {
        audio.play('achievement');
        console.info(`Achievement unlocked: ${id} — ${title}`);
      }
    },
  });

  engine.bestScore = storage.data.best;

  // ── Canvas resize sync ───────────────────────────────────────────────

  function syncCanvasSize(): void {
    const { width, height } = ui.getCanvasPhysicalSize();
    if (engine['width'] !== width || engine['height'] !== height) {
      engine.resize(width, height);
    }
  }

  // ── Initial resize + first frame ─────────────────────────────────────

  function initCanvas(): void {
    CanvasSize(ui.canvas);
    const { width, height } = ui.getCanvasPhysicalSize();
    engine.resize(width, height);
  }

  initCanvas();

  // Draw a static menu background frame so the canvas isn't blank
  engine.drawMenuFrame();

  // ── Signal readiness to YouTube ──────────────────────────────────────

  // firstFrameReady: called immediately after first paint
  ytAdapter.firstFrameReady();

  // gameReady: called after the menu is shown and input is live
  ytAdapter.init({
    onPause: () => {
      if (engine.state === 'running') engine.pause();
    },
    onResume: () => {
      if (engine.state === 'paused') engine.resume();
    },
    onAudioDisabled: () => {
      audio.setSoundEnabled(false);
      audio.setMusicEnabled(false);
    },
    onAudioEnabled: () => {
      audio.setSoundEnabled(storage.data.settings.sound);
      audio.setMusicEnabled(storage.data.settings.music);
    },
  });

  ytAdapter.gameReady();

  // Show the menu
  ui.showMenu();

  // ── Tab visibility ────────────────────────────────────────────────────

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (engine.state === 'running') engine.pause();
      audio.suspend();
    } else {
      audio.resume();
    }
  });

  // ── Resize observer ───────────────────────────────────────────────────

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      CanvasSize(ui.canvas);
      syncCanvasSize();
      if (engine.state === 'menu') engine.drawMenuFrame();
      if (engine.state === 'paused') engine['_drawPauseOverlay']?.();
    });
    ro.observe(ui.canvas);
  }

  // ── Game lifecycle handlers ───────────────────────────────────────────

  async function startGame(): Promise<void> {
    // Initialise audio on first user gesture
    await audio.init();
    audio.play('uiClick');

    ui.showGame();
    syncCanvasSize();
    engine.startGame();
  }

  async function restartGame(): Promise<void> {
    await audio.init();
    audio.play('uiClick');

    engine.bestScore = storage.data.best;
    ui.showGame();
    syncCanvasSize();
    engine.restart();
  }

  function handleJump(): void {
    if (engine.state === 'menu') {
      startGame();
      return;
    }
    if (engine.state === 'paused') {
      engine.resume();
      audio.resume();
      return;
    }
    if (engine.state === 'over') {
      restartGame();
      return;
    }
    engine.jump();
  }

  function handlePause(): void {
    if (engine.state === 'running') {
      engine.pause();
    } else if (engine.state === 'paused') {
      engine.resume();
      audio.resume();
    }
  }
}

// Run
main();
