/**
 * main.ts — Neon Rush entry point.
 *
 * Lifecycle:
 *   BOOT → Canvas init → firstFrameReady → ytAdapter.init (async) →
 *   gameReady → Menu → [countdown] → Playing ↔ Paused → Game Over →
 *   Restart / Menu
 */

import { GameEngine } from './game/GameEngine';
import { UIManager } from './ui/UIManager';
import { AudioManager } from './audio/AudioManager';
import { StorageManager } from './storage/StorageManager';
import { YouTubePlayablesAdapter } from './youtube/YouTubePlayablesAdapter';
import { CanvasSize } from './game/CanvasSize';

// ── Bootstrap ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const appEl = document.getElementById('app');
  if (!appEl) throw new Error('#app element not found');

  // Clear the loading placeholder
  appEl.innerHTML = '';

  // Storage — safe even when localStorage is unavailable
  const storage = new StorageManager();
  const { sound, music } = storage.data.settings;

  // YouTube Playables adapter — no-op outside the container
  const ytAdapter = new YouTubePlayablesAdapter();

  // Audio — not started yet; requires a user gesture
  const audio = new AudioManager(sound, music);

  // UI — creates canvas + all DOM screens
  const ui = new UIManager(appEl, {
    onStart: () => { void startGame(); },
    onRestart: () => { void restartGame(); },
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

  // Seed the menu best-score badge
  ui.setBestScore(storage.data.best);

  // Game engine — renders into the canvas context
  const engine = new GameEngine(ui.ctx, {
    onUpdate: (stats) => {
      syncCanvasSize();
      ui.updateHUD(stats, storage.data.best);
    },
    onGameOver: (stats) => {
      const isRecord = storage.recordRun(stats.score, stats.coins);
      engine.bestScore = storage.data.best;
      audio.play('collision');
      ytAdapter.sendScore(stats.score);
      // Short delay so the death flash resolves before the overlay appears
      setTimeout(() => {
        ui.showGameOver(stats, storage.data.best, isRecord);
        if (isRecord) ui.setBestScore(storage.data.best);
      }, 480);
    },
    onEvent: (kind) => {
      if (kind === 'jump') audio.play('jump');
      if (kind === 'coin') audio.play('coin');
      if (kind === 'collision') audio.play('collision');
    },
    onAchievement: (id, title) => {
      if (storage.unlockAchievement(id)) {
        audio.play('achievement');
        ui.showAchievement('Achievement Unlocked', title);
        console.info(`Achievement unlocked: ${id} — ${title}`);
      }
    },
  });

  engine.bestScore = storage.data.best;

  // ── Canvas resize sync ─────────────────────────────────────────────────

  function syncCanvasSize(): void {
    const { width, height } = ui.getCanvasPhysicalSize();
    if ((engine as unknown as Record<string, number>)['width'] !== width ||
        (engine as unknown as Record<string, number>)['height'] !== height) {
      engine.resize(width, height);
    }
  }

  // ── Initial canvas setup + first frame ────────────────────────────────

  CanvasSize(ui.canvas);
  syncCanvasSize();

  // Draw a static background so the canvas is never blank during load
  engine.drawMenuFrame();

  // ── YouTube Playables lifecycle ────────────────────────────────────────

  // firstFrameReady: signal as soon as first pixels are painted
  ytAdapter.firstFrameReady();

  // Async SDK init — registers pause/resume/audio callbacks.
  // We do NOT await this; it resolves in the background so the menu
  // appears immediately (local dev: resolves instantly via fallback).
  // gameReady is called once init settles.
  ytAdapter.init({
    onPause: () => {
      if (engine.state === 'running') {
        engine.pause();
        ui.showPause();
      }
    },
    onResume: () => {
      if (engine.state === 'paused') {
        ui.hidePause();
        engine.resume();
        void audio.resume();
      }
    },
    onAudioDisabled: () => {
      audio.setSoundEnabled(false);
      audio.setMusicEnabled(false);
      ui.updateSoundButtons(false, false);
    },
    onAudioEnabled: () => {
      const s = storage.data.settings;
      audio.setSoundEnabled(s.sound);
      audio.setMusicEnabled(s.music);
      ui.updateSoundButtons(s.sound, s.music);
    },
  }).then(() => {
    ytAdapter.gameReady();
  }).catch(() => {
    // Fallback: init failed (already handled inside adapter) — still signal ready
    ytAdapter.gameReady();
  });

  // Show the menu
  ui.showMenu();

  // ── Visibility change ──────────────────────────────────────────────────

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (engine.state === 'running') {
        engine.pause();
        ui.showPause();
      }
      audio.suspend();
    } else {
      void audio.resume();
    }
  });

  // ── Resize observer ────────────────────────────────────────────────────

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      CanvasSize(ui.canvas);
      syncCanvasSize();
      if (engine.state === 'menu') engine.drawMenuFrame();
    });
    ro.observe(ui.canvas);
  }

  // ── Game lifecycle handlers ────────────────────────────────────────────

  async function startGame(): Promise<void> {
    await audio.init();
    audio.play('uiClick');
    syncCanvasSize();
    // Show HUD, then countdown, then actually start
    ui.showGame();
    ui.runCountdown(() => {
      engine.startGame();
    });
  }

  async function restartGame(): Promise<void> {
    await audio.init();
    audio.play('uiClick');
    engine.bestScore = storage.data.best;
    syncCanvasSize();
    ui.showGame();
    ui.runCountdown(() => {
      engine.restart();
    });
  }

  function handleJump(): void {
    if (engine.state === 'menu') {
      void startGame();
      return;
    }
    if (engine.state === 'paused') {
      ui.hidePause();
      engine.resume();
      void audio.resume();
      return;
    }
    if (engine.state === 'over') {
      void restartGame();
      return;
    }
    engine.jump();
  }

  function handlePause(): void {
    if (engine.state === 'running') {
      engine.pause();
      ui.showPause();
    } else if (engine.state === 'paused') {
      ui.hidePause();
      engine.resume();
      void audio.resume();
    }
  }
}

// Run
main().catch(console.error);
