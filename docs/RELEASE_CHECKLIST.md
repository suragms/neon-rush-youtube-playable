# Release Checklist

1. [x] Code freeze
2. [x] TypeScript check (`npm run typecheck` — 0 errors)
3. [x] Unit tests (`npm test` — 46/46 passing)
4. [x] Production build (`npm run build` — 46.89 KB raw / 13.62 KB gzip)
5. [x] Local production test (`npm run preview` verified, bundle under 50 KB)
6. [x] Mobile test (portrait/landscape/touch verified)
7. [x] Audio test (no autoplay, 1st gesture activation, visibility mute, SDK audio callbacks)
8. [x] Pause/resume test (SDK + visibility change + game button + keyboard P/Escape)
9. [x] SDK lifecycle verified:
       - `firstFrameReady` queued and flushed correctly
       - `gameReady({ supportsAudio: true })` fires after menu is visible
       - `sendScore({ value: BigInt(score) })` called on game over
10. [x] Game over screen shows SCORE, BEST, COINS and NEW BEST badge
11. [x] Escape key closes panels before toggling pause
12. [x] Schema version in StorageManager save data
13. [x] Security check (no API keys, no eval, no external requests, 0 runtime dependencies)
14. [x] Content/IP check (100% original programmatic assets)
15. [x] Accessibility check (semantic buttons, aria labels, focus rings, reduced-motion)
16. [x] README updated
17. [x] REDEME.md updated
18. [x] docs/YOUTUBE_PLAYABLES_CERTIFICATION.md updated
19. [ ] Playables Test Suite (run in YouTube staging for final certification)
20. [ ] Certification submission
