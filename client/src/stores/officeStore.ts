import { create } from 'zustand';
import {
  Office,
  Participant,
  ProximityRelationship,
  Obstacle,
  FurnitureItem,
} from '@proxispeak/shared';

interface OfficeState {
  currentOffice: Office | null;
  localParticipant: Participant | null;
  participants: Map<string, Participant>;
  nearbyPeers: Map<string, ProximityRelationship>;
  isConnected: boolean;
  isConnecting: boolean;
  latencyMs: number;

  setOffice: (office: Office) => void;
  updateLayout: (furniture: FurnitureItem[], obstacles: Obstacle[]) => void;
  setLocalParticipant: (p: Participant) => void;
  setLocalPosition: (x: number, y: number) => void;
  updateParticipant: (p: Participant) => void;
  updateParticipantPosition: (userId: string, pos: { x: number; y: number }, dir?: string, moving?: boolean) => void;
  removeParticipant: (userId: string) => void;
  setParticipants: (list: Participant[]) => void;
  setNearbyRelationships: (relationships: ProximityRelationship[]) => void;
  addNearbyPeer: (rel: ProximityRelationship) => void;
  removeNearbyPeer: (peerId: string) => void;
  setConnectionStatus: (connected: boolean, connecting?: boolean) => void;
  setLatency: (ms: number) => void;
  reset: () => void;
}

export const useOfficeStore = create<OfficeState>((set, get) => ({
  currentOffice: null,
  localParticipant: null,
  participants: new Map(),
  nearbyPeers: new Map(),
  isConnected: false,
  isConnecting: false,
  latencyMs: 0,

  setOffice: (office) => {
    set({ currentOffice: office });
  },

  updateLayout: (furniture, obstacles) => {
    const cur = get().currentOffice;
    if (!cur) return;
    set({
      currentOffice: {
        ...cur,
        layout: {
          ...cur.layout,
          furniture,
          obstacles,
        },
      },
    });
  },

  setLocalParticipant: (p) => {
    set({ localParticipant: p });
  },

  setLocalPosition: (x, y) => {
    const local = get().localParticipant;
    if (!local) return;
    set({
      localParticipant: {
        ...local,
        position: { x, y },
      },
    });
  },

  setParticipants: (list) => {
    const map = new Map<string, Participant>();
    list.forEach((p) => map.set(p.userId, p));
    set({ participants: map });
  },

  updateParticipant: (p) => {
    set((state) => {
      const next = new Map(state.participants);
      next.set(p.userId, p);
      return { participants: next };
    });
  },

  updateParticipantPosition: (userId, pos, dir, moving) => {
    set((state) => {
      const p = state.participants.get(userId);
      if (!p) return state;
      const updated: Participant = {
        ...p,
        position: pos,
        ...(dir && { direction: dir as any }),
        ...(moving !== undefined && { isMoving: moving }),
        lastSeen: Date.now(),
      };
      const next = new Map(state.participants);
      next.set(userId, updated);
      return { participants: next };
    });
  },

  removeParticipant: (userId) => {
    set((state) => {
      const nextParticipants = new Map(state.participants);
      nextParticipants.delete(userId);
      const nextNearby = new Map(state.nearbyPeers);
      nextNearby.delete(userId);
      return {
        participants: nextParticipants,
        nearbyPeers: nextNearby,
      };
    });
  },

  setNearbyRelationships: (relationships) => {
    const map = new Map<string, ProximityRelationship>();
    relationships.forEach((r) => map.set(r.peerId, r));
    set({ nearbyPeers: map });
  },

  addNearbyPeer: (rel) => {
    set((state) => {
      const next = new Map(state.nearbyPeers);
      next.set(rel.peerId, rel);
      return { nearbyPeers: next };
    });
  },

  removeNearbyPeer: (peerId) => {
    set((state) => {
      const next = new Map(state.nearbyPeers);
      next.delete(peerId);
      return { nearbyPeers: next };
    });
  },

  setConnectionStatus: (connected, connecting = false) => {
    set({ isConnected: connected, isConnecting: connecting });
  },

  setLatency: (ms) => {
    set({ latencyMs: ms });
  },

  reset: () => {
    set({
      currentOffice: null,
      localParticipant: null,
      participants: new Map(),
      nearbyPeers: new Map(),
      isConnected: false,
      isConnecting: false,
    });
  },
}));
