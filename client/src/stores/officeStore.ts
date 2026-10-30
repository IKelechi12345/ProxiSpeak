import { create } from 'zustand';
import {
  Office,
  Participant,
  ProximityRelationship,
  Obstacle,
  FurnitureItem,
  MeetingZone,
  ChatMessage,
  UserStatus,
} from '@proxispeak/shared';

export interface ActiveEmote {
  emoji: string;
  expiresAt: number;
}

export interface ActiveSpeechBubble {
  text: string;
  expiresAt: number;
}

interface OfficeState {
  currentOffice: Office | null;
  localParticipant: Participant | null;
  participants: Map<string, Participant>;
  nearbyPeers: Map<string, ProximityRelationship>;
  isConnected: boolean;
  isConnecting: boolean;
  latencyMs: number;

  // Week 4 Additions: Chat, Emotes, Zones, Screen Share, Status
  messages: ChatMessage[];
  unreadChatCount: number;
  isChatOpen: boolean;
  currentZone: MeetingZone | null;
  activeEmotes: Map<string, ActiveEmote>;
  activeBubbles: Map<string, ActiveSpeechBubble>;
  userStatus: UserStatus;
  screenSharing: {
    isSharing: boolean;
    userId?: string;
    username?: string;
    stream?: MediaStream;
  };

  setOffice: (office: Office) => void;
  updateLayout: (furniture: FurnitureItem[], obstacles: Obstacle[]) => void;
  setLocalParticipant: (p: Participant) => void;
  setLocalPosition: (x: number, y: number) => void;
  updateParticipant: (p: Participant) => void;
  updateParticipantPosition: (userId: string, pos: { x: number; y: number }, dir?: string, moving?: boolean) => void;
  updateParticipantStatus: (userId: string, status: UserStatus) => void;
  removeParticipant: (userId: string) => void;
  setParticipants: (list: Participant[]) => void;
  setNearbyRelationships: (relationships: ProximityRelationship[]) => void;
  addNearbyPeer: (rel: ProximityRelationship) => void;
  removeNearbyPeer: (peerId: string) => void;
  setConnectionStatus: (connected: boolean, connecting?: boolean) => void;
  setLatency: (ms: number) => void;

  // New Actions
  addChatMessage: (msg: ChatMessage) => void;
  setChatOpen: (open: boolean) => void;
  clearUnreadCount: () => void;
  triggerEmote: (userId: string, emoji: string) => void;
  setCurrentZone: (zone: MeetingZone | null) => void;
  setUserStatus: (status: UserStatus) => void;
  setScreenSharing: (state: { isSharing: boolean; userId?: string; username?: string; stream?: MediaStream }) => void;
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

  messages: [],
  unreadChatCount: 0,
  isChatOpen: false,
  currentZone: null,
  activeEmotes: new Map(),
  activeBubbles: new Map(),
  userStatus: 'available',
  screenSharing: {
    isSharing: false,
  },

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
    set({ localParticipant: p, userStatus: p.status || 'available' });
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

  updateParticipantStatus: (userId, status) => {
    set((state) => {
      const p = state.participants.get(userId);
      if (!p) return state;
      const updated: Participant = { ...p, status };
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
      const nextEmotes = new Map(state.activeEmotes);
      nextEmotes.delete(userId);
      const nextBubbles = new Map(state.activeBubbles);
      nextBubbles.delete(userId);

      return {
        participants: nextParticipants,
        nearbyPeers: nextNearby,
        activeEmotes: nextEmotes,
        activeBubbles: nextBubbles,
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

  addChatMessage: (msg) => {
    set((state) => {
      const nextBubbles = new Map(state.activeBubbles);
      // Create speech bubble for 5 seconds
      nextBubbles.set(msg.senderId, {
        text: msg.text.length > 40 ? msg.text.substring(0, 37) + '...' : msg.text,
        expiresAt: Date.now() + 5000,
      });

      return {
        messages: [...state.messages, msg],
        unreadChatCount: state.isChatOpen ? 0 : state.unreadChatCount + 1,
        activeBubbles: nextBubbles,
      };
    });
  },

  setChatOpen: (open) => {
    set({ isChatOpen: open, unreadChatCount: open ? 0 : get().unreadChatCount });
  },

  clearUnreadCount: () => {
    set({ unreadChatCount: 0 });
  },

  triggerEmote: (userId, emoji) => {
    set((state) => {
      const nextEmotes = new Map(state.activeEmotes);
      nextEmotes.set(userId, {
        emoji,
        expiresAt: Date.now() + 3000,
      });
      return { activeEmotes: nextEmotes };
    });
  },

  setCurrentZone: (zone) => {
    set({ currentZone: zone });
  },

  setUserStatus: (status) => {
    set({ userStatus: status });
  },

  setScreenSharing: (state) => {
    set({ screenSharing: state });
  },

  reset: () => {
    set({
      currentOffice: null,
      localParticipant: null,
      participants: new Map(),
      nearbyPeers: new Map(),
      isConnected: false,
      isConnecting: false,
      messages: [],
      unreadChatCount: 0,
      activeEmotes: new Map(),
      activeBubbles: new Map(),
      currentZone: null,
    });
  },
}));
