/**
 * Tests for Neon Rush core modules.
 * Run with: npm test
 * Uses Node's built-in test runner (node --experimental-strip-types --test)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Geometry ──────────────────────────────────────────────────────────────

import { rectsOverlap, shrink } from '../src/game/Geometry';

describe('Geometry', () => {
  it('rectsOverlap returns true for overlapping rects', () => {
    assert.ok(rectsOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 }
    ));
  });

  it('rectsOverlap returns false for non-overlapping rects', () => {
    assert.ok(!rectsOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 20, w: 10, h: 10 }
    ));
  });

  it('rectsOverlap returns false for adjacent rects (touching edge)', () => {
    assert.ok(!rectsOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 10, y: 0, w: 10, h: 10 }
    ));
  });

  it('shrink reduces all sides by px', () => {
    const r = shrink({ x: 0, y: 0, w: 20, h: 20 }, 3);
    assert.equal(r.x, 3);
    assert.equal(r.y, 3);
    assert.equal(r.w, 14);
    assert.equal(r.h, 14);
  });

  it('shrink clamps w/h to minimum 1', () => {
    const r = shrink({ x: 0, y: 0, w: 4, h: 4 }, 10);
    assert.equal(r.w, 1);
    assert.equal(r.h, 1);
  });
});

// ── Difficulty ────────────────────────────────────────────────────────────

import { levelForTime, bandForLevel, cappedSpeed, MAX_LEVEL, MAX_SPEED } from '../src/game/Difficulty';

describe('Difficulty', () => {
  it('levelForTime returns 1 at t=0', () => {
    assert.equal(levelForTime(0), 1);
  });

  it('levelForTime returns 2 at t=25', () => {
    assert.equal(levelForTime(25), 2);
  });

  it('levelForTime caps at MAX_LEVEL', () => {
    assert.equal(levelForTime(10000), MAX_LEVEL);
  });

  it('levelForTime handles negative input safely', () => {
    assert.equal(levelForTime(-5), 1);
  });

  it('bandForLevel level 1 has base scroll speed', () => {
    const band = bandForLevel(1);
    assert.equal(band.level, 1);
    assert.equal(band.scrollSpeed, 300);
  });

  it('bandForLevel scroll speed increases with level', () => {
    const b1 = bandForLevel(1);
    const b4 = bandForLevel(4);
    assert.ok(b4.scrollSpeed > b1.scrollSpeed);
  });

  it('bandForLevel spawn gap decreases with level', () => {
    const b1 = bandForLevel(1);
    const b5 = bandForLevel(5);
    assert.ok(b5.spawnGap < b1.spawnGap);
  });

  it('bandForLevel spawn gap never goes below 1.65', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const b = bandForLevel(l);
      assert.ok(b.spawnGap >= 1.65, `level ${l} spawnGap ${b.spawnGap} below 1.65`);
    }
  });

  it('cappedSpeed clamps to MAX_SPEED', () => {
    assert.equal(cappedSpeed(9999), MAX_SPEED);
  });

  it('cappedSpeed clamps negative to 0', () => {
    assert.equal(cappedSpeed(-100), 0);
  });

  it('bandForLevel clamps out-of-range input', () => {
    assert.equal(bandForLevel(0).level, 1);
    assert.equal(bandForLevel(999).level, MAX_LEVEL);
  });
});

// ── Player ────────────────────────────────────────────────────────────────

import { Player } from '../src/game/Player';

describe('Player', () => {
  const GROUND = 400;

  it('starts grounded', () => {
    const p = new Player(100, GROUND);
    assert.ok(p.grounded);
    assert.equal(p.jumpsUsed, 0);
  });

  it('jump returns true and sets player airborne', () => {
    const p = new Player(100, GROUND);
    const jumped = p.jump();
    assert.ok(jumped);
    assert.ok(!p.grounded);
    assert.equal(p.jumpsUsed, 1);
  });

  it('second jump (double jump) is allowed', () => {
    const p = new Player(100, GROUND);
    p.jump();
    const jumped2 = p.jump();
    assert.ok(jumped2);
    assert.equal(p.jumpsUsed, 2);
  });

  it('third jump is not allowed', () => {
    const p = new Player(100, GROUND);
    p.jump();
    p.jump();
    const jumped3 = p.jump();
    assert.ok(!jumped3);
    assert.equal(p.jumpsUsed, 2);
  });

  it('player lands back on ground after update loop', () => {
    const p = new Player(100, GROUND);
    p.jump();
    // Run physics for a full second — should be back on ground
    for (let i = 0; i < 200; i++) p.update(0.005, GROUND);
    assert.ok(p.grounded);
    assert.equal(p.jumpsUsed, 0);
  });

  it('hitbox is inset from player bounds', () => {
    const p = new Player(100, GROUND);
    const hb = p.getHitbox();
    assert.ok(hb.x > p.x);
    assert.ok(hb.y > p.y);
    assert.ok(hb.w < p.w);
    assert.ok(hb.h < p.h);
  });

  it('cutJump reduces upward velocity', () => {
    const p = new Player(100, GROUND);
    p.jump();
    const vyBefore = p.vy;
    p.cutJump();
    assert.ok(p.vy > vyBefore, 'vy should be less negative (closer to 0) after cut');
  });
});

// ── Collision ─────────────────────────────────────────────────────────────

import { playerVsObstacles, playerHitsRect } from '../src/game/Collision';

describe('Collision', () => {
  function makePlayer(): Player {
    const p = new Player(100, 400);
    // Manually place mid-air to test collision cleanly
    p.y = 300;
    return p;
  }

  it('detects collision when obstacle overlaps player hitbox', () => {
    const p = makePlayer();
    const hb = p.getHitbox();
    const obstacle = { x: hb.x + 2, y: hb.y + 2, w: 20, h: 20 };
    const result = playerVsObstacles(p, [obstacle], 0);
    assert.ok(result.hit);
    assert.ok(result.overlapArea > 0);
  });

  it('no collision when obstacle is far away', () => {
    const p = makePlayer();
    const obstacle = { x: 999, y: 999, w: 20, h: 20 };
    const result = playerVsObstacles(p, [obstacle], 0);
    assert.ok(!result.hit);
    assert.equal(result.overlapArea, 0);
  });

  it('forgiveness margin prevents collision on near-miss', () => {
    const p = makePlayer();
    const hb = p.getHitbox();
    // Obstacle that just barely overlaps the un-shrunk hitbox but not the shrunk one
    const obstacle = { x: hb.x, y: hb.y, w: 2, h: 2 };
    const result = playerVsObstacles(p, [obstacle], 3);
    // With 3px forgiveness, a 2x2 overlap into a shrunk rect should not hit
    assert.ok(!result.hit);
  });

  it('playerHitsRect returns true on overlap', () => {
    const p = makePlayer();
    const hb = p.getHitbox();
    const coin = { x: hb.x + 4, y: hb.y + 4, w: 10, h: 10 };
    assert.ok(playerHitsRect(p, coin, 0));
  });

  it('playerHitsRect returns false when not overlapping', () => {
    const p = makePlayer();
    const coin = { x: 0, y: 0, w: 5, h: 5 };
    assert.ok(!playerHitsRect(p, coin, 0));
  });

  it('empty obstacle list returns no hit', () => {
    const p = makePlayer();
    const result = playerVsObstacles(p, [], 0);
    assert.ok(!result.hit);
  });
});

// ── StorageManager ────────────────────────────────────────────────────────

import { StorageManager } from '../src/storage/StorageManager';

describe('StorageManager', () => {
  it('constructs without throwing when localStorage is unavailable', () => {
    assert.doesNotThrow(() => new StorageManager());
  });

  it('starts with zero best and coins', () => {
    const s = new StorageManager();
    assert.equal(s.data.best, 0);
    assert.equal(s.data.coins, 0);
  });

  it('recordRun updates best score', () => {
    const s = new StorageManager();
    s.recordRun(500, 10);
    assert.equal(s.data.best, 500);
  });

  it('recordRun does not decrease best score', () => {
    const s = new StorageManager();
    s.recordRun(500, 0);
    s.recordRun(100, 0);
    assert.equal(s.data.best, 500);
  });

  it('recordRun returns true only on new record', () => {
    const s = new StorageManager();
    const first = s.recordRun(500, 0);
    assert.ok(first);
    const second = s.recordRun(200, 0);
    assert.ok(!second);
  });

  it('recordRun accumulates coins across runs', () => {
    const s = new StorageManager();
    s.recordRun(0, 5);
    s.recordRun(0, 7);
    assert.equal(s.data.coins, 12);
  });

  it('recordRun ignores non-finite scores safely', () => {
    const s = new StorageManager();
    s.recordRun(NaN, 0);
    assert.equal(s.data.best, 0);
  });

  it('unlockAchievement returns true on first unlock', () => {
    const s = new StorageManager();
    assert.ok(s.unlockAchievement('first_run'));
  });

  it('unlockAchievement returns false on duplicate', () => {
    const s = new StorageManager();
    s.unlockAchievement('first_run');
    assert.ok(!s.unlockAchievement('first_run'));
  });

  it('updateSettings merges partial settings', () => {
    const s = new StorageManager();
    s.updateSettings({ sound: false });
    assert.equal(s.data.settings.sound, false);
    assert.equal(s.data.settings.music, true); // unchanged
  });
});

// ── Obstacle ──────────────────────────────────────────────────────────────

import { Obstacle } from '../src/game/Obstacle';

describe('Obstacle', () => {
  it('moves left on update', () => {
    const obs = new Obstacle('low', { x: 500, y: 300, w: 38, h: 58 });
    obs.update(0.016, 5);
    assert.ok(obs.rect.x < 500);
  });

  it('offscreen returns false when on screen', () => {
    const obs = new Obstacle('low', { x: 500, y: 300, w: 38, h: 58 });
    assert.ok(!obs.offscreen);
  });

  it('offscreen returns true when past left edge', () => {
    const obs = new Obstacle('low', { x: -200, y: 300, w: 38, h: 58 });
    assert.ok(obs.offscreen);
  });
});

// ── Coin ─────────────────────────────────────────────────────────────────

import { Coin } from '../src/game/Coin';

describe('Coin', () => {
  it('moves left on update', () => {
    const c = new Coin(400, 200, 22, 0);
    c.update(0.016, 5);
    assert.ok(c.rect.x < 400);
  });

  it('centerX and centerY return center', () => {
    const c = new Coin(100, 100, 20, 0);
    assert.equal(c.centerX, 110);
    assert.equal(c.centerY, 110);
  });

  it('offscreen returns false when on screen', () => {
    const c = new Coin(400, 200, 22, 0);
    assert.ok(!c.offscreen);
  });

  it('offscreen returns true when past left edge', () => {
    const c = new Coin(-100, 200, 22, 0);
    assert.ok(c.offscreen);
  });
});
