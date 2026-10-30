/**
 * Geospatial Proximity Engine for ProxiSpeak
 * Features:
 * - Server-authoritative distance calculation on 2D Cartesian plane
 * - Dual-radius hysteresis (Enter <= 100px, Exit > 120px) to prevent connection flapping
 * - Spatial grid optimization for high-density scalability
 * - Line-of-sight sound blocking & obstacle attenuation
 * - Meeting Zone acoustic isolation & private breakout rooms
 * - Real-time spatial query latency performance audit
 */

import {
  Participant,
  Position,
  Obstacle,
  MeetingZone,
  ProximityRelationship,
  SpatialAuditReport,
} from '@proxispeak/shared';
import { SpatialGrid } from './spatialGrid';
import {
  calculateEuclideanDistance,
  calculateDistanceAttenuation,
  calculateStereoPan,
  calculateObstacleAttenuation,
} from '../../utils/geometry';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface ProximityDiffResult {
  userId: string;
  enteredPeers: Array<{
    peer: Participant;
    distance: number;
    relativeX: number;
    relativeY: number;
    attenuation: number;
    isObstructed: boolean;
    shouldInitiateOffer: boolean;
  }>;
  leftPeerIds: string[];
  currentRelationships: ProximityRelationship[];
}

export class ProximityEngine {
  private enterRadius: number;
  private exitRadius: number;

  // Office ID -> SpatialGrid of participants
  private officeGrids: Map<string, SpatialGrid<Participant>> = new Map();
  // Office ID -> Obstacles list
  private officeObstacles: Map<string, Obstacle[]> = new Map();
  // Office ID -> Meeting Zones list
  private officeZones: Map<string, MeetingZone[]> = new Map();
  // Pairwise proximity state: Key `${officeId}:${userId}` -> Set of peerIds currently in proximity
  private activeProximityPairs: Map<string, Set<string>> = new Map();

  // Performance audit latency tracking
  private latenciesMs: number[] = [];
  private maxLatencyHistory: number = 2000;

  constructor(
    enterRadius: number = env.PROXIMITY_RADIUS,
    exitRadius: number = env.PROXIMITY_EXIT_RADIUS
  ) {
    this.enterRadius = enterRadius;
    this.exitRadius = exitRadius;
  }

  public setOfficeObstacles(officeId: string, obstacles: Obstacle[]): void {
    this.officeObstacles.set(officeId, obstacles);
  }

  public setOfficeZones(officeId: string, zones: MeetingZone[]): void {
    this.officeZones.set(officeId, zones);
  }

  public getZoneForPosition(officeId: string, pos: Position): MeetingZone | null {
    const zones = this.officeZones.get(officeId) || [];
    for (const zone of zones) {
      if (
        pos.x >= zone.bounds.x &&
        pos.x <= zone.bounds.x + zone.bounds.width &&
        pos.y >= zone.bounds.y &&
        pos.y <= zone.bounds.y + zone.bounds.height
      ) {
        return zone;
      }
    }
    return null;
  }

  private getOfficeGrid(officeId: string): SpatialGrid<Participant> {
    let grid = this.officeGrids.get(officeId);
    if (!grid) {
      grid = new SpatialGrid<Participant>(env.SPATIAL_GRID_CELL_SIZE);
      this.officeGrids.set(officeId, grid);
    }
    return grid;
  }

  private getPairStateKey(officeId: string, userId: string): string {
    return `${officeId}:${userId}`;
  }

  /**
   * Registers or updates a participant's position in an office and calculates proximity changes.
   */
  public updateParticipant(
    officeId: string,
    participant: Participant
  ): ProximityDiffResult {
    const startTime = performance.now();

    const grid = this.getOfficeGrid(officeId);
    grid.update({ ...participant, id: participant.userId } as any);

    const userPairKey = this.getPairStateKey(officeId, participant.userId);
    let currentActivePeers = this.activeProximityPairs.get(userPairKey);
    if (!currentActivePeers) {
      currentActivePeers = new Set<string>();
      this.activeProximityPairs.set(userPairKey, currentActivePeers);
    }

    const obstacles = this.officeObstacles.get(officeId) || [];
    const localZone = this.getZoneForPosition(officeId, participant.position);

    // Query candidate peers within exitRadius + grid buffer
    const candidates = grid.getCandidates(participant.position, this.exitRadius);

    // If local participant is in a private meeting zone, also include other members in that zone
    if (localZone && localZone.isPrivate) {
      const allParticipants = this.getParticipantsInOffice(officeId);
      for (const p of allParticipants) {
        if (p.userId === participant.userId) continue;
        const pZone = this.getZoneForPosition(officeId, p.position);
        if (pZone && pZone.id === localZone.id && !candidates.some((c) => c.userId === p.userId)) {
          candidates.push(p);
        }
      }
    }

    const enteredPeers: ProximityDiffResult['enteredPeers'] = [];
    const leftPeerIds: string[] = [];
    const relationships: ProximityRelationship[] = [];
    const stillNearbyIds = new Set<string>();

    for (const candidate of candidates) {
      if (candidate.userId === participant.userId) continue;

      const dist = calculateEuclideanDistance(participant.position, candidate.position);
      const wasInProximity = currentActivePeers.has(candidate.userId);
      const candidateZone = this.getZoneForPosition(officeId, candidate.position);

      const isInSamePrivateZone =
        localZone &&
        candidateZone &&
        localZone.id === candidateZone.id &&
        localZone.isPrivate;

      const isOneInPrivateZone =
        (localZone?.isPrivate || candidateZone?.isPrivate) && !isInSamePrivateZone;

      // Hysteresis & Acoustic Isolation logic
      let isInProximityNow = false;
      if (isOneInPrivateZone) {
        // Complete acoustic isolation: cannot hear into or out of a private room
        isInProximityNow = false;
      } else if (isInSamePrivateZone) {
        // Collocated in private conference/breakout room: connected for discussion
        isInProximityNow = true;
      } else if (wasInProximity) {
        // Must stay in proximity until exceeding exit radius
        isInProximityNow = dist <= this.exitRadius;
      } else {
        // Must be at or within enter radius to enter proximity
        isInProximityNow = dist <= this.enterRadius;
      }

      if (isInProximityNow) {
        stillNearbyIds.add(candidate.userId);

        // Calculate audio metrics
        let finalAttenuation: number;
        let isObstructed = false;

        if (isInSamePrivateZone) {
          finalAttenuation = 1.0;
          isObstructed = false;
        } else {
          const baseDistanceGain = calculateDistanceAttenuation(dist, this.exitRadius);
          const obstacleResult = calculateObstacleAttenuation(
            participant.position,
            candidate.position,
            obstacles
          );
          finalAttenuation = baseDistanceGain * obstacleResult.factor;
          isObstructed = obstacleResult.isObstructed;
        }

        const relativeX = calculateStereoPan(participant.position, candidate.position, this.exitRadius);
        const relativeY = (candidate.position.y - participant.position.y) / this.exitRadius;

        const rel: ProximityRelationship = {
          peerId: candidate.userId,
          username: candidate.username,
          avatar: candidate.avatar,
          distance: Math.round(dist * 10) / 10,
          relativeX: Math.round(relativeX * 100) / 100,
          relativeY: Math.round(relativeY * 100) / 100,
          attenuation: Math.round(finalAttenuation * 1000) / 1000,
          isObstructed,
          isMuted: candidate.isMuted,
          isSpeaking: candidate.isSpeaking,
        };
        relationships.push(rel);

        if (!wasInProximity) {
          // Newly entered proximity!
          // Deterministic rule: peer with alphabetically greater userId initiates WebRTC offer
          const shouldInitiateOffer = participant.userId > candidate.userId;
          enteredPeers.push({
            peer: candidate,
            distance: dist,
            relativeX,
            relativeY,
            attenuation: finalAttenuation,
            isObstructed,
            shouldInitiateOffer,
          });
          currentActivePeers.add(candidate.userId);
        }
      }
    }

    // Identify peers that moved out of proximity
    for (const activePeerId of currentActivePeers) {
      if (!stillNearbyIds.has(activePeerId)) {
        leftPeerIds.push(activePeerId);
        currentActivePeers.delete(activePeerId);
      }
    }

    const elapsedMs = performance.now() - startTime;
    this.recordLatency(elapsedMs);

    return {
      userId: participant.userId,
      enteredPeers,
      leftPeerIds,
      currentRelationships: relationships,
    };
  }

  /**
   * Removes a participant when leaving an office or disconnecting.
   */
  public removeParticipant(
    officeId: string,
    userId: string
  ): { leftPeerIds: string[] } {
    const grid = this.officeGrids.get(officeId);
    if (grid) {
      grid.remove(userId);
    }

    const userPairKey = this.getPairStateKey(officeId, userId);
    const activePeers = this.activeProximityPairs.get(userPairKey);
    const leftPeerIds = activePeers ? Array.from(activePeers) : [];
    this.activeProximityPairs.delete(userPairKey);

    // Also remove from other peers' sets
    for (const peerId of leftPeerIds) {
      const peerKey = this.getPairStateKey(officeId, peerId);
      const peerSet = this.activeProximityPairs.get(peerKey);
      if (peerSet) {
        peerSet.delete(userId);
      }
    }

    return { leftPeerIds };
  }

  public getParticipant(officeId: string, userId: string): Participant | undefined {
    const grid = this.officeGrids.get(officeId);
    return grid ? grid.getEntity(userId) : undefined;
  }

  public getParticipantsInOffice(officeId: string): Participant[] {
    const grid = this.officeGrids.get(officeId);
    return grid ? grid.getAll() : [];
  }

  private recordLatency(latencyMs: number): void {
    this.latenciesMs.push(latencyMs);
    if (this.latenciesMs.length > this.maxLatencyHistory) {
      this.latenciesMs.shift();
    }
  }

  /**
   * Audit spatial performance metrics
   */
  public getAuditReport(): SpatialAuditReport {
    if (this.latenciesMs.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        queryCount: 0,
        totalLatencyMs: 0,
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        maxLatencyMs: 0,
        meetsTarget: true,
      };
    }

    const sorted = [...this.latenciesMs].sort((a, b) => a - b);
    const total = sorted.reduce((sum, val) => sum + val, 0);
    const avg = total / sorted.length;
    const p95Index = Math.min(
      sorted.length - 1,
      Math.floor(sorted.length * 0.95)
    );
    const p95 = sorted[p95Index];
    const max = sorted[sorted.length - 1];

    return {
      timestamp: new Date().toISOString(),
      queryCount: sorted.length,
      totalLatencyMs: Math.round(total * 100) / 100,
      avgLatencyMs: Math.round(avg * 1000) / 1000,
      p95LatencyMs: Math.round(p95 * 1000) / 1000,
      maxLatencyMs: Math.round(max * 1000) / 1000,
      meetsTarget: avg < 20 && p95 < 20,
    };
  }
}

// Global Singleton Engine instance
export const proximityEngine = new ProximityEngine();

