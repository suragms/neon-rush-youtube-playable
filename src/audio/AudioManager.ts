/**
 * AudioManager — centralized audio for Neon Rush.
 *
 * Uses the Web Audio API to synthesize simple sound effects so the game
 * has zero audio-asset downloads while still being responsive.  Background
 * music is a procedural loop generated entirely in the browser.
 *
 * All audio is gated behind user interaction — AudioContext is created (or
 * resumed) on the first user gesture, satisfying browser autoplay policies.
 */

export type SfxKind = 'jump' | 'doubleJump' | 'coin' | 'collision' | 'uiClick' | 'achievement';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  /** Whether any audio context is running */
  private started = false;

  /** Oscillators/sources that make up the music loop */
  private musicNodes: AudioNode[] = [];
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicBeat = 0;

  soundEnabled: boolean;
  musicEnabled: boolean;

  constructor(sound = true, music = true) {
    this.soundEnabled = sound;
    this.musicEnabled = music;
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  /** Call once after the first user gesture. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.masterGain);

      this.applyMuteState();
      this.started = true;

      if (this.musicEnabled) this.startMusic();
    } catch {
      // AudioContext not available (some restricted environments)
    }
  }

  // ── Sound effects ─────────────────────────────────────────────────────────

  play(kind: SfxKind): void {
    if (!this.ctx || !this.sfxGain || !this.soundEnabled) return;
    const now = this.ctx.currentTime;
    switch (kind) {
      case 'jump':        return this._tone(now, 520, 720, 0.13, 'square', 0.22);
      case 'doubleJump':  return this._tone(now, 680, 900, 0.11, 'square', 0.18);
      case 'coin':        return this._coinSfx(now);
      case 'collision':   return this._collisionSfx(now);
      case 'uiClick':     return this._tone(now, 440, 480, 0.05, 'sine', 0.08);
      case 'achievement': return this._achievementSfx(now);
    }
  }

  private _tone(
    start: number,
    freqStart: number,
    freqEnd: number,
    gain: number,
    type: OscillatorType,
    duration: number
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration * 0.8);
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + duration + 0.01);
  }

  private _coinSfx(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const freqs = [880, 1100, 1320];
    freqs.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = now + i * 0.045;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  private _collisionSfx(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const bufSize = this.ctx.sampleRate * 0.25;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 320;
    src.connect(filt);
    filt.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.26);
  }

  private _achievementSfx(now: number): void {
    if (!this.ctx || !this.sfxGain) return;
    [520, 660, 780, 1040].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = now + i * 0.07;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // ── Background music ──────────────────────────────────────────────────────

  private startMusic(): void {
    if (!this.ctx || !this.musicGain) return;
    this.stopMusic();
    this.musicBeat = 0;
    const bpm = 128;
    const beatMs = (60 / bpm) * 1000;
    this.musicInterval = setInterval(() => this._tick(), beatMs);
  }

  private _tick(): void {
    if (!this.ctx || !this.musicGain || !this.musicEnabled) return;
    const now = this.ctx.currentTime;
    const beat = this.musicBeat % 16;
    this.musicBeat++;

    // Simple arp pattern
    const scale = [220, 261.6, 329.6, 392, 440, 523.3, 659.3, 784];
    const idx = [0, 2, 4, 5, 4, 2, 0, 2, 4, 7, 6, 4, 2, 0, 2, 4][beat];
    const freq = scale[idx];

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq * 2;
    filt.Q.value = 1.2;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(filt);
    filt.connect(g);
    g.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.4);
    this.musicNodes.push(osc);

    // Kick on beats 0, 4, 8, 12
    if (beat % 4 === 0) this._kick(now);
    // Hi-hat on every other beat
    if (beat % 2 === 1) this._hat(now);
  }

  private _kick(now: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  private _hat(now: number): void {
    if (!this.ctx || !this.musicGain) return;
    const bufSize = this.ctx.sampleRate * 0.04;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 7000;
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.musicGain);
    src.start(now);
    src.stop(now + 0.05);
  }

  private stopMusic(): void {
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    for (const n of this.musicNodes) {
      try { (n as OscillatorNode | AudioBufferSourceNode).stop?.(); } catch { /* already stopped */ }
    }
    this.musicNodes = [];
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  setSoundEnabled(on: boolean): void {
    this.soundEnabled = on;
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    if (!on) {
      this.stopMusic();
    } else if (this.started) {
      this.startMusic();
    }
  }

  private applyMuteState(): void {
    if (!this.masterGain) return;
    this.masterGain.gain.value = 1;
  }

  /** Resume context after visibility change */
  async resume(): Promise<void> {
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    if (this.musicEnabled && this.started && this.musicInterval === null) {
      this.startMusic();
    }
  }

  /** Suspend context when the tab is hidden */
  suspend(): void {
    this.stopMusic();
    this.ctx?.suspend();
  }

  get isStarted(): boolean {
    return this.started;
  }
}
