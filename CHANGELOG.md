# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-09-20

### Added
- **Core Gameplay**: High-speed, 60 FPS infinite runner physics with single and double-jump mechanics, dynamic difficulty progression across 8 levels, and fair obstacle/coin generation.
- **Audio System**: Zero-asset procedural Web Audio sound synthesis (jump, double-jump, coin collection, collisions, achievements) and an interactive generative background music sequencer.
- **Mobile & Touch**: Full-screen touch control system with scroll-prevention handlers and responsive canvas scaling for portrait and landscape modes across all device widths.
- **UI & State Management**: Complete game lifecycle handling (`LOADING` → `READY` → `MENU` → `PLAYING` → `PAUSED` → `GAME OVER` → `RESTART`).
- **Storage Persistence**: Robust `localStorage` wrapper for local best scores, collected coins, audio settings, and unlockable achievements.
- **YouTube Playables Integration**: Dedicated `YouTubePlayablesAdapter` implementing lifecycle callbacks (`firstFrameReady`, `gameReady`, pause/resume, audio state synchronization, and score reporting) with full local development fallback support.
- **Test Suite**: 46 automated unit tests validating collision math, difficulty scaling, player physics, and persistence safety.
- **Production Build**: Minimal footprint single-bundle production build under 30 KB.
