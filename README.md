# Neon Rush — Infinite Runner

![Neon Rush Banner](https://img.shields.io/badge/Neon-Rush-00f5ff?style=for-the-badge&logo=rocket&logoColor=090d17)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Neon Rush** is an original high-speed, arcade-style infinite runner built with TypeScript and HTML5 Canvas2D. Designed specifically for instant-play web gaming platforms such as **YouTube Playables**, it features fluid 60 FPS physics, double-jumping, procedural difficulty scaling, synthesized Web Audio soundscapes, and comprehensive offline storage persistence.

---

## 🎮 Gameplay & Features

- **Automatic Scrolling & Running**: The runner dashes continuously through a vibrant cyberpunk neon cityscape.
- **Precision Controls (Jump & Double Jump)**: Tap or press Space/Arrow Up to jump; press again while airborne to perform a double jump.
- **Fair Procedural Obstacle Generation**: Obstacles (low barriers, elevated hazards) scale dynamically with level progression while guaranteeing mathematically fair clearance windows.
- **Coin Collection & Combos**: Collect glowing data-crystals to boost your score and combo counter.
- **Dynamic Difficulty Scaling**: Game speed and obstacle spawn intervals adjust smoothly across 8 intensity levels over time.
- **Game Lifecycle Management**: Clean transitions between **Loading**, **Menu**, **Playing**, **Paused**, and **Game Over** states with zero memory leaks or runaway timer loops.
- **Synthesized Web Audio**: Zero audio asset downloads required; custom procedural sound effects (jump, coin, collision, UI clicks, achievements) and an evolving arpeggiated background music loop driven by the Web Audio API.
- **Robust Storage Persistence**: High scores, coin counts, audio preferences, and achievements are persisted securely via `localStorage` with graceful fallbacks.
- **YouTube Playables Integration**: Isolated behind `YouTubePlayablesAdapter`, fully supporting lifecycle events (`firstFrameReady`, `gameReady`, pause/resume, audio state handoff, and score submission) with local development fallbacks.

---

## 🕹️ Controls

### Desktop
- **Space** / **Arrow Up** — Jump / Double Jump / Start Game / Resume
- **P** — Pause / Resume
- **M** — Mute / Unmute Sound Effects
- **Click / Tap** — Jump / Interact with UI buttons

### Mobile & Tablets
- **Tap Screen** — Jump / Double Jump / Start Game / Resume
- **On-screen Buttons** — Audio toggles and menu navigation

---

## 🛠️ Technology Stack

- **Language**: TypeScript (`strict: true`)
- **Rendering**: HTML5 Canvas2D (`CanvasSize` high-DPI backing store management)
- **Build Tool**: Vite (optimized ESM bundle under 30kB)
- **Audio**: Web Audio API (procedural synthesis)
- **Storage**: `localStorage` with error boundaries
- **Testing**: Node.js built-in test runner (`node:test`) driven by `tsx`

---

## 📁 Project Structure

```
├── index.html              # Minimal HTML container
├── package.json            # Project configuration & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── src/
│   ├── main.ts             # Application entry point & lifecycle coordinator
│   ├── game/
│   │   ├── CanvasSize.ts   # High-DPI canvas backing store scaler
│   │   ├── Coin.ts         # Collectible crystal entity logic
│   │   ├── Collision.ts    # Bounding-box and forgiveness-margin collision detection
│   │   ├── Difficulty.ts   # Time-based level progression & speed bands
│   │   ├── Geometry.ts     # 2D rectangle intersection & math utilities
│   │   ├── Obstacle.ts     # Hazard entity logic
│   │   ├── ParticleSystem.ts# Neon explosion & trail particle emitter
│   │   ├── Player.ts       # Runner physics (gravity, jump, double jump, squash/stretch)
│   │   └── types.ts        # Core game types and callback contracts
│   ├── audio/
│   │   └── AudioManager.ts # Synthesized Web Audio SFX & background music
│   ├── storage/
│   │   └── StorageManager.ts# Safe localStorage wrapper for high scores & settings
│   └── youtube/
│       └── YouTubePlayablesAdapter.ts # Isolated YouTube Playables SDK integration
└── tests/
    └── game.test.ts        # Comprehensive unit tests (collision, difficulty, storage, player)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation
```bash
git clone https://github.com/suragms/neon-rush-youtube-playable.git
cd neon-rush-youtube-playable
npm install
```

### Development
Start the local Vite development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Type Checking & Testing
Run TypeScript type checking:
```bash
npm run typecheck
```

Run the unit test suite (46 tests covering physics, collision, difficulty, and storage):
```bash
npm test
```

### Production Build
Create an optimized production build in `dist/`:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 📺 YouTube Playables Compatibility

**Neon Rush** is fully structured for YouTube Playables integration:
- **Playables-Ready**: Implements the required lifecycle hooks (`firstFrameReady`, `gameReady`, pause/resume, audio synchronization, and score reporting) via `YouTubePlayablesAdapter`.
- **Local Development Fallback**: When run outside of YouTube, provides `window.__ytdev` console helpers for manual simulation.
- **Certification Note**: *Playables-ready* indicates full technical compliance with SDK specifications. Official YouTube certification is subject to formal review and publishing through the YouTube Playables submission portal.

---

## ♿ Accessibility & Responsiveness

- **Responsive Design**: Scales fluidly across mobile phones, tablets, and desktop displays in both portrait and landscape orientations without breaking layout.
- **Reduced Motion**: Respects `prefers-reduced-motion` media queries for user comfort.
- **Contrast & Focus**: High-contrast neon color palette against dark backgrounds with clear keyboard focus rings on interactive elements.

---

## 📄 License

MIT License — Copyright (c) 2026 Surag. See [LICENSE](LICENSE) for details.
