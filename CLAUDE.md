# Neon Rush — CLAUDE.md

Project-level guidance for Claude Code when working on this repository.

---

## Project overview

**Neon Rush** is a YouTube Playables–certified HTML5 infinite runner.
- Language: TypeScript (strict)
- Renderer: HTML5 Canvas 2D
- Build: Vite (single JS bundle, zero runtime deps)
- Audio: Web Audio API (procedural — no audio files)
- Tests: Node built-in test runner via `tsx`

Entry point: `src/main.ts`
All UI: `src/ui/UIManager.ts` (DOM + inline CSS in the `STYLE` constant)
SDK: `src/youtube/YouTubePlayablesAdapter.ts`

---

## Commands

```bash
npm run dev          # Vite dev server
npm run typecheck    # tsc --noEmit (must pass before any commit)
npm test             # 46 unit tests via tsx
npm run build        # typecheck + Vite production build → dist/
npm run preview      # serve dist/ locally
```

All three — `typecheck`, `test`, `build` — must pass after every change.

---

## UI design system

All styles live in the `STYLE` string constant at the top of
`src/ui/UIManager.ts`. There are no external CSS files, no CSS frameworks,
no Tailwind, no CSS-in-JS libraries. Keep it that way.

### Visual language

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#090d17` | Page, cards, overlays |
| Cyan / primary | `#00f5ff` | Titles, primary buttons, borders, HUD score |
| Magenta / accent | `#ff4fff` | Player, scarf, level pill, combo banner |
| Gold | `#ffe600` | Coins, best score, new-best badge, achievements |
| Danger / red | `#ff2d55` | Game over title, obstacle A, danger button |
| Orange | `#ff9500` | Obstacle B |
| Muted text | `#aac`, `#cde` | Body copy, instructions |
| Dim label | `#557` | HUD labels, section labels |

Glow is applied with `text-shadow` and `box-shadow` using the same colour at
12–30 % opacity. Never exceed `box-shadow: 0 0 36px` — more is not better.

### Typography

Single font stack: `'Courier New', Courier, monospace`  
All sizes use `clamp(min, fluid, max)` — never hard-coded `px` on text.

| Role | Clamp |
|------|-------|
| Title (NEON RUSH) | `clamp(32px, 8vw, 68px)` |
| Panel title | `clamp(15px, 3.5vw, 20px)` |
| Button text | `clamp(13px, 3vw, 17px)` |
| Primary button | `clamp(15px, 3.5vw, 20px)` |
| HUD value | `clamp(13px, 3.5vw, 21px)` |
| HUD label | `clamp(7px, 1.5vw, 10px)` |
| Body / instructions | `clamp(11px, 2.4vw, 14px)` |
| Small label | `clamp(10px, 2vw, 12px)` |

### Layout

Cards use `width: min(92vw, 440px)` — they are always slightly narrower than
the viewport on small screens and capped at 440 px on large ones.

All overlays use `position: fixed; inset: 0` and flex-center. They are never
`position: absolute` on a scrolling parent.

HUD uses `position: fixed; top: 0` with
`padding-top: max(env(safe-area-inset-top, 0px), 8px)` for iOS notch safety.

### Buttons

Every interactive element is a `<button type="button">` — never a `<div>`.

Standard button class: `.nr-btn`
- height: `clamp(44px, 6vh, 56px)` — minimum 44 px touch target
- min-width: `clamp(140px, 40vw, 220px)`
- border: `2px solid #00f5ff`
- has `:hover`, `:focus-visible`, `:active` states

Modifiers:
- `.primary` — larger, stronger glow, cyan fill
- `.danger` — red border + text
- `.ghost` — muted blue border, transparent fill

Toggle buttons use `.nr-toggle` with `aria-pressed` and a `.nr-switch` pill
that animates its knob via `translateX(20px)` when pressed.

Spacing between adjacent touch targets: minimum 8 px (enforced by
`.nr-btn-group` gap of `10px`).

### Screens

The game has exactly these screens/states — do not add or remove any:

| Screen | DOM id | Shown via |
|--------|--------|-----------|
| Menu | `#nr-menu` | `showMenu()` |
| How To Play | `#nr-howto` | `_showPanel()` |
| Settings | `#nr-settings` | `_showPanel()` |
| Countdown | `#nr-countdown` | `runCountdown()` |
| HUD (in-game) | `#nr-hud` | `showGame()` |
| Pause | `#nr-pause` | `showPause()` |
| Game Over | `#nr-gameover` | `showGameOver()` |
| Achievement toast | `#nr-toast` | `showAchievement()` |
| Combo banner | `#nr-combo` | `updateHUD()` |
| Level-up flash | `#nr-levelup` | `_showLevelUp()` |
| Scanlines | `#nr-scanlines` | always present |

Visibility is controlled with `hidden` attribute + `.active` class for
pointer-events. Never use `display: none` directly in JS — toggle `hidden`
and the matching CSS class.

### Accessibility requirements (non-negotiable)

- Every `<button>` has `type="button"` and an `aria-label`
- Toggle buttons carry `aria-pressed="true|false"`
- All dialog overlays carry `role="dialog"` and `aria-modal="true"`
- Game over carries `role="alertdialog"`
- HUD carries `aria-live="polite"` and `aria-atomic="false"`
- Canvas carries `role="img"` and `aria-label`
- Focus ring: `:focus-visible { outline: 2px solid #00f5ff; outline-offset: 3px }`
- `@media (prefers-reduced-motion: reduce)` must disable all decorative
  animations (`animation: none !important; transition: none !important`)
- Scanlines hidden under reduced-motion

### Input wiring rules

- `Space` / `ArrowUp` → `e.preventDefault()` + jump
- `P` → pause toggle
- `Escape` → close open panel first; fall back to pause toggle (no `preventDefault` on Escape)
- `M` → toggle sound
- Canvas `touchstart` → `preventDefault()` + jump (`passive: false`)
- Canvas `touchend` / `touchmove` → `preventDefault()` only (no second jump)
- Canvas `click` → jump
- Never call `preventDefault()` on Escape
- No custom exit/quit/close YouTube buttons

### Animation guidelines

All animations are CSS — no JS animation libraries.

| Animation | Duration | Easing |
|-----------|----------|--------|
| Screen fade-in | 0.22 s | ease |
| Button hover/active | 0.15 s / 0.1 s | ease |
| Countdown pop | 0.55 s | ease-out |
| Combo banner in | 0.2 s | ease |
| Level-up flash | 0.6 s | ease forwards |
| HUD pulse | 0.35 s | ease |
| Toast slide-in | 0.3 s | cubic-bezier(0.175, 0.885, 0.32, 1.275) |
| New-best pulse | 0.65 s | alternate infinite |

Never add `animation-duration > 1s` on interactive elements.

### What NOT to add to the UI

- No React, Vue, or any component framework
- No CSS framework (Tailwind, Bootstrap, etc.)
- No external fonts (system monospace only)
- No external images or icons
- No social sharing buttons
- No external links
- No login / account / sign-up UI
- No fake YouTube controls (close button, mute button, navigation)
- No QR codes
- No YouTube branding inside the game
- No additional screens beyond the list above without explicit approval

---

## YouTube Playables constraints

- `firstFrameReady()` — call once, immediately after first canvas paint.
  The adapter queues it if the SDK is not yet loaded.
- `gameReady({ supportsAudio: true })` — call after `showMenu()` has run.
  Never before the UI is visible and interactive.
- `sendScore({ value: BigInt(score) })` — call on game over only.
- `onPause` / `onResume` — must pause/resume both engine and audio.
- `onAudioDisabled` / `onAudioEnabled` — must sync sound/music state.
- No external network requests from game code at runtime.
- No source maps in production build.

---

## Storage

`StorageManager` (`src/storage/StorageManager.ts`):
- Key: `neon-rush.v1`
- Schema version: `1` (increment if shape changes)
- Fields: `version`, `best`, `coins`, `settings`, `achievements`
- Always validate with `safeNumber()` on load
- Never write before a successful read attempt in the same session

---

## Performance budget

| Asset | Limit |
|-------|-------|
| JS bundle (gzip) | < 30 KB |
| JS bundle (raw) | < 100 KB |
| External HTTP requests at runtime | 0 |
| Runtime npm dependencies | 0 |

Current: 46.89 KB raw / 13.62 KB gzip — well within budget.

---

## Test baseline

46/46 tests must pass at all times (`npm test`).
Tests live in `tests/game.test.ts`.
Do not delete tests because they fail — fix the code or the test.
New features that add logic need corresponding tests.

---

## Git

- Work on feature branches; never push directly to `main`
- `npm run typecheck && npm test && npm run build` must all pass before commit
- End commit messages with:
  `Co-Authored-By: Claude Code <noreply@anthropic.com>`
