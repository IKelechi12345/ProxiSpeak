import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { useOfficeStore } from '../stores/officeStore';
import { useAudioStore } from '../stores/audioStore';
import { Participant, ProximityRelationship } from '@proxispeak/shared';

describe('Frontend Zustand Stores & State Machine', () => {
  beforeEach(() => {
    useOfficeStore.getState().reset();
    useAuthStore.getState().logout();
  });

  it('manages office participants and real-time movement updates', () => {
    const store = useOfficeStore.getState();

    const participant: Participant = {
      userId: 'user_123',
      username: 'Devon',
      avatar: 'avatar-1',
      officeId: 'off_456',
      position: { x: 400, y: 300 },
      direction: 'down',
      isMoving: false,
      isMuted: false,
      isSpeaking: false,
      lastSeen: Date.now(),
    };

    store.updateParticipant(participant);
    expect(useOfficeStore.getState().participants.get('user_123')).toBeDefined();

    // Position update
    store.updateParticipantPosition('user_123', { x: 450, y: 320 }, 'right', true);
    const updated = useOfficeStore.getState().participants.get('user_123');
    expect(updated?.position.x).toBe(450);
    expect(updated?.direction).toBe('right');
    expect(updated?.isMoving).toBe(true);
  });

  it('adds and removes nearby peers as proximity changes', () => {
    const store = useOfficeStore.getState();

    const relationship: ProximityRelationship = {
      peerId: 'peer_999',
      username: 'Sarah',
      avatar: 'avatar-2',
      distance: 65,
      relativeX: 0.45,
      relativeY: 0.2,
      attenuation: 0.35,
      isObstructed: false,
      isMuted: false,
      isSpeaking: true,
    };

    store.addNearbyPeer(relationship);
    expect(useOfficeStore.getState().nearbyPeers.has('peer_999')).toBe(true);

    store.removeNearbyPeer('peer_999');
    expect(useOfficeStore.getState().nearbyPeers.has('peer_999')).toBe(false);
  });

  it('handles microphone mute toggle and volume normalization in audioStore', () => {
    const audioStore = useAudioStore.getState();

    expect(audioStore.isMuted).toBe(false);
    const toggled = audioStore.toggleMute();
    expect(toggled).toBe(true);
    expect(useAudioStore.getState().isMuted).toBe(true);

    audioStore.setMasterVolume(0.75);
    expect(useAudioStore.getState().masterVolume).toBe(0.75);

    // Bound test (clamped between 0 and 1)
    audioStore.setMasterVolume(1.8);
    expect(useAudioStore.getState().masterVolume).toBe(1.0);
    audioStore.setMasterVolume(-0.5);
    expect(useAudioStore.getState().masterVolume).toBe(0.0);
  });

  it('handles Week 4 in-office spatial chat messages and speech bubbles', () => {
    const store = useOfficeStore.getState();

    expect(store.messages.length).toBe(0);
    expect(store.unreadChatCount).toBe(0);

    store.addChatMessage({
      id: 'msg_1',
      senderId: 'peer_999',
      senderName: 'Sarah',
      senderAvatar: 'avatar-2',
      text: 'Hello team in proximity!',
      timestamp: Date.now(),
      type: 'proximity',
    });

    const updated = useOfficeStore.getState();
    expect(updated.messages.length).toBe(1);
    expect(updated.unreadChatCount).toBe(1);
    expect(updated.activeBubbles.has('peer_999')).toBe(true);
    expect(updated.activeBubbles.get('peer_999')?.text).toBe('Hello team in proximity!');

    // Opening chat marks messages read
    store.setChatOpen(true);
    expect(useOfficeStore.getState().unreadChatCount).toBe(0);
  });

  it('triggers quick animated emotes and user presence statuses', () => {
    const store = useOfficeStore.getState();

    store.triggerEmote('user_123', '??');
    expect(useOfficeStore.getState().activeEmotes.get('user_123')?.emoji).toBe('??');

    store.setUserStatus('focus');
    expect(useOfficeStore.getState().userStatus).toBe('focus');
  });

  it('manages WebRTC screen sharing state toggle', () => {
    const store = useOfficeStore.getState();

    expect(store.screenSharing.isSharing).toBe(false);

    store.setScreenSharing({
      isSharing: true,
      userId: 'user_123',
      username: 'Devon',
    });

    expect(useOfficeStore.getState().screenSharing.isSharing).toBe(true);
    expect(useOfficeStore.getState().screenSharing.username).toBe('Devon');
  });
});

