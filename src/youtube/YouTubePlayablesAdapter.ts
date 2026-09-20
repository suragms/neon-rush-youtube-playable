/**
 * YouTubePlayablesAdapter
 *
 * Isolates all YouTube Playables SDK interactions from the core game.
 *
 * ─── Official SDK ─────────────────────────────────────────────────────────
 *
 * The YouTube Playables SDK is loaded as an ESM module from Google's CDN:
 *   https://www.gstatic.com/ytgame/sdk/ytgame.mjs
 *
 * Full API reference (requires YouTube Playables partner program access):
 *   https://developers.google.com/youtube/gaming/playables/reference/js
 *
 * ─── Integration pattern ──────────────────────────────────────────────────
 *
 *   import ytgame from 'https://www.gstatic.com/ytgame/sdk/ytgame.mjs';
 *   const sdk = await ytgame.game.initializeSdk();
 *   sdk.game.firstFrameReady();
 *   sdk.game.gameReady();
 *   sdk.sendScore({ value: BigInt(score) });
 *
 * ─── Local development ────────────────────────────────────────────────────
 *
 * The SDK CDN module is ONLY available inside the real YouTube Playables
 * iframe. When running locally the dynamic import will fail (network error
 * or because the environment is not a Playables frame). The adapter detects
 * this and falls back to safe no-ops + developer console helpers.
 *
 * window.__ytdev is a LOCAL DEVELOPMENT TOOL ONLY. It is NOT the YouTube
 * environment. It does NOT submit scores. It does NOT certify the game.
 *
 * ─── What requires the real YouTube environment ───────────────────────────
 *  1. Verifying that the SDK CDN URL resolves correctly.
 *  2. Verifying that initializeSdk() resolves within the expected timeout.
 *  3. Verifying that firstFrameReady / gameReady trigger the correct YouTube
 *     loading screen dismissal.
 *  4. Verifying that sendScore actually posts to the leaderboard.
 *  5. Verifying pause/resume lifecycle from YouTube host events (ads, etc.).
 *  6. Verifying audio mute state handoff from the YouTube container.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── SDK types ─────────────────────────────────────────────────────────────

/** Minimal typing of the SDK instance returned by initializeSdk(). */
interface YTGameSDKInstance {
  game: {
    firstFrameReady(): void;
    /** gameReady signals the game is interactive. Supports audio by default. */
    gameReady(opts?: { supportsAudio?: boolean }): void;
  };
  system: {
    onPause(cb: () => void): void;
    onResume(cb: () => void): void;
  };
  audio: {
    onAudioDisabled(cb: () => void): void;
    onAudioEnabled(cb: () => void): void;
  };
  /** Submit final score. Value must be a BigInt. */
  sendScore(data: { value: bigint }): void;
}

/** Minimal typing of the ytgame default export from the CDN module. */
interface YTGameModule {
  game: {
    initializeSdk(): Promise<YTGameSDKInstance>;
  };
}

// ── Adapter ───────────────────────────────────────────────────────────────

export interface PlayablesCallbacks {
  onPause?: () => void;
  onResume?: () => void;
  onAudioDisabled?: () => void;
  onAudioEnabled?: () => void;
}

const SDK_URL = 'https://www.gstatic.com/ytgame/sdk/ytgame.mjs';

export class YouTubePlayablesAdapter {
  /** Set to true once initializeSdk() resolves successfully. */
  isPlayablesEnvironment = false;

  private sdk: YTGameSDKInstance | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Attempt to load the official YouTube Playables SDK and initialize it.
   *
   * Must be called as early as possible (before firstFrameReady).
   * Returns silently if outside the YouTube Playables environment.
   *
   * @param callbacks  Lifecycle event handlers from the host application.
   */
  async init(callbacks: PlayablesCallbacks): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit(callbacks);
    return this.initPromise;
  }

  private async _doInit(callbacks: PlayablesCallbacks): Promise<void> {
    try {
      // Dynamic import from the CDN — only resolves inside the YouTube iframe.
      const module = (await import(/* @vite-ignore */ SDK_URL)) as { default: YTGameModule };
      const ytgame = module.default;
      this.sdk = await ytgame.game.initializeSdk();
      this.isPlayablesEnvironment = true;

      // Apply the BigInt JSON serialization workaround (known SDK bug).
      // This prevents "A BigInt value cannot be serialized in JSON" errors
      // when sendScore is called internally by the SDK.
      if (typeof BigInt !== 'undefined' && !(BigInt.prototype as { toJSON?: unknown }).toJSON) {
        (BigInt.prototype as { toJSON?: () => string }).toJSON = function () {
          return this.toString();
        };
      }

      // Register lifecycle callbacks on the SDK instance.
      if (callbacks.onPause)        this.sdk.system.onPause(callbacks.onPause);
      if (callbacks.onResume)       this.sdk.system.onResume(callbacks.onResume);
      if (callbacks.onAudioDisabled) this.sdk.audio.onAudioDisabled(callbacks.onAudioDisabled);
      if (callbacks.onAudioEnabled)  this.sdk.audio.onAudioEnabled(callbacks.onAudioEnabled);

    } catch {
      // Not inside the YouTube Playables container, or SDK failed to load.
      // Fall back to local dev helpers — this is intentional and expected.
      this.sdk = null;
      this.isPlayablesEnvironment = false;
      this._devFallback(callbacks);
    }
  }

  /**
   * Signal that the first frame has been painted.
   *
   * Must be called as soon as the canvas is visibly rendered — before or
   * shortly after init() resolves. Safe no-op outside the YouTube environment.
   */
  firstFrameReady(): void {
    this.sdk?.game.firstFrameReady();
  }

  /**
   * Signal that the game is fully loaded and interactive.
   *
   * Must be called after all required assets and UI are ready.
   * Neon Rush supports audio, so no options object is passed.
   * Safe no-op outside the YouTube environment.
   */
  gameReady(): void {
    this.sdk?.game.gameReady();
  }

  /**
   * Submit the player's final score.
   *
   * IMPORTANT: Only executes when inside the real YouTube Playables
   * environment. Silently ignored during local development — no score is
   * submitted or faked.
   *
   * The YouTube Playables SDK requires the value as a BigInt.
   */
  sendScore(score: number): void {
    if (!this.sdk) {
      // ── LOCAL DEVELOPMENT ────────────────────────────────────────────────
      // We are NOT inside the YouTube Playables environment.
      // No score is submitted. No API call is made.
      // This is intentional — do not add a fake submission here.
      // ─────────────────────────────────────────────────────────────────────
      return;
    }

    try {
      const safeScore = Math.max(0, Math.floor(score));
      this.sdk.sendScore({ value: BigInt(safeScore) });
    } catch (err) {
      // Score submission failed — log for debugging but do not crash the game.
      console.warn('[YouTubePlayablesAdapter] sendScore failed:', err);
    }
  }

  // ── Local development fallback ────────────────────────────────────────────

  /**
   * When running outside the YouTube Playables container, expose console
   * helpers so developers can manually trigger SDK lifecycle events for
   * integration testing.
   *
   * ══════════════════════════════════════════════════════════════════════
   * WARNING: window.__ytdev is a LOCAL DEVELOPMENT TOOL ONLY.
   *          It is NOT the YouTube Playables environment.
   *          It does NOT submit scores.
   *          It does NOT trigger real YouTube lifecycle events.
   *          Remove or ignore it in production/certification testing.
   * ══════════════════════════════════════════════════════════════════════
   *
   * Usage in browser DevTools console:
   *   window.__ytdev.pause()     → simulate YouTube pause event
   *   window.__ytdev.resume()    → simulate YouTube resume event
   *   window.__ytdev.audioOff()  → simulate YouTube audio-disabled event
   *   window.__ytdev.audioOn()   → simulate YouTube audio-enabled event
   */
  private _devFallback(callbacks: PlayablesCallbacks): void {
    (window as Window & { __ytdev?: unknown }).__ytdev = {
      pause:    () => callbacks.onPause?.(),
      resume:   () => callbacks.onResume?.(),
      audioOff: () => callbacks.onAudioDisabled?.(),
      audioOn:  () => callbacks.onAudioEnabled?.(),
    };

    console.info(
      '[YouTubePlayablesAdapter] LOCAL DEVELOPMENT MODE\n' +
      'Not running inside the YouTube Playables container.\n' +
      'SDK not loaded. Scores are NOT submitted.\n' +
      'Dev helpers: window.__ytdev.pause / resume / audioOff / audioOn'
    );
  }
}
