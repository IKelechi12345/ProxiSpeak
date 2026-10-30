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
});
