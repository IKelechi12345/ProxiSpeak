import { describe, it, expect, beforeEach } from 'vitest';
import { ProximityEngine } from './proximityEngine';
import {
  calculateEuclideanDistance,
  calculateDistanceAttenuation,
  calculateStereoPan,
  segmentIntersectsRect,
  calculateObstacleAttenuation,
  checkCollision,
} from '../../utils/geometry';
import { Participant, Obstacle } from '@proxispeak/shared';

describe('Geometry & Mathematics Unit Tests', () => {
  it('calculates Euclidean distance accurately on 2D plane', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 130, y: 140 }; // 30-40-50 right triangle
    expect(calculateEuclideanDistance(p1, p2)).toBe(50);
  });

  it('calculates distance attenuation according to specifications', () => {
    // distance = 0 => volume 1.0
    expect(calculateDistanceAttenuation(0, 100)).toBe(1.0);
    // distance = 50 => volume 0.5
    expect(calculateDistanceAttenuation(50, 100)).toBe(0.5);
    // distance = 100 => volume 0.0
    expect(calculateDistanceAttenuation(100, 100)).toBe(0.0);
    // distance > 100 => volume 0.0
    expect(calculateDistanceAttenuation(120, 100)).toBe(0.0);
  });

  it('calculates stereo panning in [-1.0, 1.0]', () => {
    const local = { x: 200, y: 200 };
    // Peer to the right
    expect(calculateStereoPan(local, { x: 300, y: 200 }, 100)).toBe(1.0);
    // Peer to the left
    expect(calculateStereoPan(local, { x: 100, y: 200 }, 100)).toBe(-1.0);
    // Peer directly aligned vertically
    expect(calculateStereoPan(local, { x: 200, y: 250 }, 100)).toBe(0);
  });

  it('detects line-of-sight intersection through sound-blocking obstacles', () => {
    const obstacle: Obstacle = {
      id: 'wall-1',
      type: 'wall',
      x: 100,
      y: 0,
      width: 20,
      height: 200,
      attenuationFactor: 1.0,
    };

    // User A at (50, 100) and User B at (150, 100) are on opposite sides of the wall
    const isIntersecting = segmentIntersectsRect({ x: 50, y: 100 }, { x: 150, y: 100 }, obstacle);
    expect(isIntersecting).toBe(true);

    const attenuation = calculateObstacleAttenuation({ x: 50, y: 100 }, { x: 150, y: 100 }, [obstacle]);
    expect(attenuation.isObstructed).toBe(true);
    expect(attenuation.factor).toBe(0.0); // Completely blocked

    // Line not intersecting
    const notIntersecting = segmentIntersectsRect({ x: 50, y: 300 }, { x: 150, y: 300 }, obstacle);
    expect(notIntersecting).toBe(false);
  });

  it('enforces avatar collision with office boundaries and obstacles', () => {
    const dimensions = { width: 500, height: 500 };
    const obstacle: Obstacle = {
      id: 'obs-1',
      type: 'wall',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      attenuationFactor: 1.0,
    };

    // Outside boundary
    expect(checkCollision({ x: -5, y: 100 }, 15, dimensions, [], [])).toBe(true);
    expect(checkCollision({ x: 510, y: 100 }, 15, dimensions, [], [])).toBe(true);

    // Colliding with obstacle
    expect(checkCollision({ x: 110, y: 110 }, 15, dimensions, [obstacle], [])).toBe(true);

    // Free space
    expect(checkCollision({ x: 50, y: 50 }, 15, dimensions, [obstacle], [])).toBe(false);
  });
});

describe('ProximityEngine Core & Hysteresis Tests', () => {
  let engine: ProximityEngine;
  const officeId = 'office_test_1';

  beforeEach(() => {
    engine = new ProximityEngine(100, 120);
  });

  it('triggers enter proximity when within 100px and assigns deterministic offer initiator', () => {
    const userA: Participant = {
      userId: 'user_alice',
      username: 'Alice',
      avatar: 'avatar_1',
      officeId,
      position: { x: 100, y: 100 },
      direction: 'down',
      isMoving: false,
      isMuted: false,
      isSpeaking: false,
      lastSeen: Date.now(),
    };

    const userB: Participant = {
      userId: 'user_bob',
      username: 'Bob',
      avatar: 'avatar_2',
      officeId,
      position: { x: 160, y: 100 }, // distance = 60 <= 100
      direction: 'down',
      isMoving: false,
      isMuted: false,
      isSpeaking: false,
      lastSeen: Date.now(),
    };

    engine.updateParticipant(officeId, userA);
    const resultB = engine.updateParticipant(officeId, userB);

    expect(resultB.enteredPeers.length).toBe(1);
    expect(resultB.enteredPeers[0].peer.userId).toBe('user_alice');
    expect(resultB.enteredPeers[0].distance).toBe(60);

    // Deterministic rule: 'user_bob' > 'user_alice'
    expect(resultB.enteredPeers[0].shouldInitiateOffer).toBe(true);
  });

  it('maintains proximity in hysteresis deadband (100px - 120px) without flapping', () => {
    const userA: Participant = {
      userId: 'user_alice',
      username: 'Alice',
      avatar: 'avatar_1',
      officeId,
      position: { x: 100, y: 100 },
      direction: 'down',
      isMoving: false,
      isMuted: false,
      isSpeaking: false,
      lastSeen: Date.now(),
    };

    const userB: Participant = {
      userId: 'user_bob',
      username: 'Bob',
      avatar: 'avatar_2',
      officeId,
      position: { x: 180, y: 100 }, // distance = 80 <= 100 (enters proximity)
      direction: 'down',
      isMoving: false,
      isMuted: false,
      isSpeaking: false,
      lastSeen: Date.now(),
    };

    engine.updateParticipant(officeId, userA);
    engine.updateParticipant(officeId, userB);

    // User B moves to distance = 110 (which is > 100 enter radius, but <= 120 exit radius)
    userB.position = { x: 210, y: 100 };
    const step2 = engine.updateParticipant(officeId, userB);

    // Should NOT have exited!
    expect(step2.leftPeerIds.length).toBe(0);
    expect(step2.currentRelationships.length).toBe(1);

    // User B moves past exit radius (distance = 130 > 120)
    userB.position = { x: 230, y: 100 };
    const step3 = engine.updateParticipant(officeId, userB);

    // Now should exit!
    expect(step3.leftPeerIds).toContain('user_alice');
    expect(step3.currentRelationships.length).toBe(0);
  });

  it('measures spatial query latency and meets the <20ms target', () => {
    const userA: Participant = {
      userId: 'user_alice',
      username: 'Alice',
      avatar: 'avatar_1',
      officeId,
      position: { x: 100, y: 100 },
      direction: 'down',
      isMoving: false,
      isMuted: false,
      isSpeaking: false,
      lastSeen: Date.now(),
    };
    engine.updateParticipant(officeId, userA);

    const report = engine.getAuditReport();
    expect(report.queryCount).toBeGreaterThan(0);
    expect(report.meetsTarget).toBe(true);
    expect(report.avgLatencyMs).toBeLessThan(20);
  });
});
