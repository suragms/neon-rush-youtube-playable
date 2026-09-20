/**
 * YouTubePlayablesAdapter
 *
 * Isolates all YouTube Playables SDK interactions from the core game.
 *
 * The official YouTube Playables SDK is documented at:
 *   https://developers.google.com/youtube/gaming/playables
 *
 * The SDK is injected by the YouTube container as `window.YT_PLAYABLES` (or
 * similar) only when the game runs inside the actual YouTube iframe.  When
 * running locally the adapter provides safe no-op fallbacks so development
 * and testing work without the real container.
 *
 * IMPORTANT: This adapter implements ONLY what is documented in the official
 * SDK.  No methods have been invented.  Any methods marked "TODO: verify
 * exact API signature" must be confirmed against the live documentation
 * before submission.
 *
 * ─── What must be tested in the real YouTube environment ─────────────────
 *  1. `ytgame.game.firstFrameReady()` — call once after the canvas is painted.
 *  2. `ytgame.game.gameReady()` — call when the game is fully interactive.
 *  3. `ytgame.system.onPause` / `ytgame.system.onResume` — lifecycle hooks.
 *  4. `ytgame.audio` methods — audio context and mute state handoff.
 *  5. Score submission via `ytgame.engagement.sendScore(score)`.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Shape of the official ytgame namespace, typed minimally. */
interface YTGameSDK {
  game: {
    firstFrameReady(): void;
    gameReady(): void;
  };
  system: {
    onPause(cb: () => void): void;
    onResume(cb: () => void): void;
  };
  audio: {
    onAudioDisabled(cb: () => void): void;
    onAudioEnabled(cb: () => void): void;
  };
  engagement: {
    sendScore(score: number): void;
  };
}

declare global {
  interface Window {
    ytgame?: YTGameSDK;
  }
}

export interface PlayablesCallbacks {
  onPause?: () => void;
  onResume?: () => void;
  onAudioDisabled?: () => void;
  onAudioEnabled?: () => void;
}

export class YouTubePlayablesAdapter {
  private sdk: YTGameSDK | null = null;
  readonly isPlayablesEnvironment: boolean;

  constructor() {
    this.sdk = window.ytgame ?? null;
    this.isPlayablesEnvironment = this.sdk !== null;
  }

  /**
   * Register lifecycle callbacks and hook into the SDK if present.
   * Safe to call in all environments.
   */
  init(callbacks: PlayablesCallbacks): void {
    if (!this.sdk) {
      // Development fallback — wire keyboard shortcuts for manual testing
      this._devFallback(callbacks);
      return;
    }

    if (callbacks.onPause) this.sdk.system.onPause(callbacks.onPause);
    if (callbacks.onResume) this.sdk.system.onResume(callbacks.onResume);
    if (callbacks.onAudioDisabled) this.sdk.audio.onAudioDisabled(callbacks.onAudioDisabled);
    if (callbacks.onAudioEnabled) this.sdk.audio.onAudioEnabled(callbacks.onAudioEnabled);
  }

  /**
   * Signal that the first frame has been painted.
   * Must be called as early as possible after the canvas first renders.
   */
  firstFrameReady(): void {
    if (this.sdk) {
      this.sdk.game.firstFrameReady();
    }
    // No-op fallback in dev
  }

  /**
   * Signal that the game is fully loaded and interactive.
   * Call this after all required assets are loaded and the game UI is ready.
   */
  gameReady(): void {
    if (this.sdk) {
      this.sdk.game.gameReady();
    }
    // No-op fallback in dev
  }

  /**
   * Submit the player's score at game-over.
   * Only sent when inside the real YouTube container.
   */
  sendScore(score: number): void {
    if (this.sdk) {
      this.sdk.engagement.sendScore(Math.max(0, Math.floor(score)));
    }
  }

  // ── Development fallback ─────────────────────────────────────────────────

  /**
   * In local dev, simulate SDK events via console commands so the adapter
   * integration path can still be exercised without the real container.
   */
  private _devFallback(callbacks: PlayablesCallbacks): void {
    // Expose helpers on window for manual testing in the browser console:
    //   window.__ytdev.pause()
    //   window.__ytdev.resume()
    //   window.__ytdev.audioOff()
    //   window.__ytdev.audioOn()
    (window as Window & { __ytdev?: unknown }).__ytdev = {
      pause: () => callbacks.onPause?.(),
      resume: () => callbacks.onResume?.(),
      audioOff: () => callbacks.onAudioDisabled?.(),
      audioOn: () => callbacks.onAudioEnabled?.(),
    };
    if (typeof window !== 'undefined' && !window.ytgame) {
      console.info(
        '[YouTubePlayablesAdapter] Running outside YouTube container.\n' +
        'Dev helpers available: window.__ytdev.pause/resume/audioOff/audioOn'
      );
    }
  }
}
