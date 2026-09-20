# Release Checklist

1. [x] Code freeze
2. [x] TypeScript check (`npm run typecheck` passed)
3. [x] Unit tests (`npm test` passed 46/46)
4. [x] Production build (`npm run build` completed)
5. [x] Local production test (`npm run preview` verified, bundle is <30kb)
6. [x] Mobile test (portrait/landscape/touch verified)
7. [x] Audio test (no autoplay, 1st gesture activation, visibility mute)
8. [x] Pause/resume test (SDK + visibility change + game button)
9. [ ] Playables Test Suite (run in YouTube staging for final certification)
10. [x] Security check (no API keys, no eval, 0 dependencies except vite/ts)
11. [x] Content/IP check (100% original programmatic assets)
12. [x] README verification
13. [ ] Certification submission
