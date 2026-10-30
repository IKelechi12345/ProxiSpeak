import { io, Socket } from 'socket.io-client';
import { useOfficeStore } from '../stores/officeStore';
import { useAudioStore } from '../stores/audioStore';
import { webrtcManager } from './webrtcManager';
import { spatialAudioEngine } from './spatialAudioEngine';
import {
  MovementPayload,
  OfficeJoinedPayload,
  Participant,
  AvatarUpdatePayload,
  ProximityEnterPayload,
  ProximityLeavePayload,
  ProximityUpdatePayload,
  SignalingOfferPayload,
  SignalingAnswerPayload,
  SignalingIceCandidatePayload,
  AudioStatePayload,
  ChatMessage,
  ChatMessageType,
  EmotePayload,
  ScreenSharePayload,
  UserStatus,
} from '@proxispeak/shared';

class SocketService {
  private socket: Socket | null = null;

  public connect(token: string, userId: string): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    // Provide signaling bridge to WebRTC manager
    webrtcManager.setLocalUserId(userId);
    webrtcManager.setSignalingCallback((event, payload) => {
      if (this.socket && this.socket.connected) {
        this.socket.emit(event, payload);
      }
    });

    // Connection lifecycle
    this.socket.on('connect', () => {
      console.log('Socket.io connected:', this.socket?.id);
      useOfficeStore.getState().setConnectionStatus(true, false);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('Socket.io disconnected:', reason);
      useOfficeStore.getState().setConnectionStatus(false, true);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err.message);
      useOfficeStore.getState().setConnectionStatus(false, false);
    });

    // Office presence events
    this.socket.on('office:joined', (payload: OfficeJoinedPayload) => {
      console.log('Office joined:', payload.office.name);
      const officeStore = useOfficeStore.getState();
      officeStore.setOffice(payload.office);
      officeStore.setLocalParticipant(payload.localParticipant);
      officeStore.setParticipants(payload.participants);
    });

    this.socket.on('user:joined', (participant: Participant) => {
      console.log('User joined office:', participant.username);
      useOfficeStore.getState().updateParticipant(participant);
    });

    this.socket.on('user:left', (data: { userId: string }) => {
      console.log('User left office:', data.userId);
      useOfficeStore.getState().removeParticipant(data.userId);
      webrtcManager.handlePeerLeave(data.userId);
    });

    this.socket.on('avatar:update', (data: AvatarUpdatePayload) => {
      useOfficeStore.getState().updateParticipantPosition(
        data.userId,
        data.position,
        data.direction,
        data.isMoving
      );
    });

    // Proximity detection events
    this.socket.on('proximity:enter', async (data: ProximityEnterPayload) => {
      console.log(`Proximity ENTER: Peer ${data.username} (${data.peerId}) at distance ${data.distance}px. ShouldInitiate: ${data.shouldInitiateOffer}`);
      const officeStore = useOfficeStore.getState();
      officeStore.addNearbyPeer({
        peerId: data.peerId,
        username: data.username,
        avatar: data.avatar,
        distance: data.distance,
        relativeX: data.relativeX,
        relativeY: data.relativeY,
        attenuation: data.attenuation,
        isObstructed: data.isObstructed,
        isMuted: false,
        isSpeaking: false,
      });

      // Connect WebRTC peer and configure spatial audio
      await webrtcManager.handlePeerEnter(data.peerId, data.shouldInitiateOffer);
      spatialAudioEngine.updateSpatialParameters(data.peerId, data.relativeX, data.attenuation);
    });

    this.socket.on('proximity:leave', (data: ProximityLeavePayload) => {
      console.log(`Proximity LEAVE: Peer ${data.peerId} (${data.reason})`);
      useOfficeStore.getState().removeNearbyPeer(data.peerId);
      webrtcManager.handlePeerLeave(data.peerId);
    });

    this.socket.on('proximity:update', (data: ProximityUpdatePayload) => {
      useOfficeStore.getState().setNearbyRelationships(data.relationships);
      // Update spatial panning and attenuation for all nearby peers
      for (const rel of data.relationships) {
        spatialAudioEngine.updateSpatialParameters(rel.peerId, rel.relativeX, rel.attenuation);
      }
    });

    // Audio states
    this.socket.on('audio:state', (data: AudioStatePayload) => {
      const officeStore = useOfficeStore.getState();
      const peer = officeStore.nearbyPeers.get(data.userId);
      if (peer) {
        officeStore.addNearbyPeer({
          ...peer,
          isMuted: data.isMuted,
          isSpeaking: !!data.isSpeaking,
        });
      }
    });

    // WebRTC Signaling
    this.socket.on('webrtc:offer', async (payload: SignalingOfferPayload) => {
      await webrtcManager.handleSignalingOffer(payload.senderUserId, payload.sdp);
    });

    this.socket.on('webrtc:answer', async (payload: SignalingAnswerPayload) => {
      await webrtcManager.handleSignalingAnswer(payload.senderUserId, payload.sdp);
    });

    this.socket.on('webrtc:ice-candidate', async (payload: SignalingIceCandidatePayload) => {
      await webrtcManager.handleSignalingIceCandidate(payload.senderUserId, payload.candidate);
    });

    // Week 4 Real-time additions: Chat, Emotes, User Status, Screen Share
    this.socket.on('chat:message', (message: ChatMessage) => {
      useOfficeStore.getState().addChatMessage(message);
    });

    this.socket.on('user:emote', (payload: EmotePayload) => {
      useOfficeStore.getState().triggerEmote(payload.userId, payload.emoji);
    });

    this.socket.on('user:status', (payload: { userId: string; status: UserStatus }) => {
      useOfficeStore.getState().updateParticipantStatus(payload.userId, payload.status);
    });

    this.socket.on('screen:state', (payload: ScreenSharePayload) => {
      useOfficeStore.getState().setScreenSharing({
        isSharing: payload.isSharing,
        userId: payload.userId,
        username: payload.username,
      });
    });

    return this.socket;
  }

  public joinOffice(officeId: string, initialPosition?: { x: number; y: number }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket not initialized'));
      this.socket.emit('office:join', { officeId, initialPosition }, (response: any) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.message || 'Failed to join office'));
        }
      });
    });
  }

  public leaveOffice(): void {
    if (this.socket) {
      this.socket.emit('office:leave');
      webrtcManager.cleanup();
      useOfficeStore.getState().reset();
    }
  }

  public sendMovement(payload: MovementPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('avatar:move', payload);
    }
  }

  public sendMuteState(isMuted: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('audio:mute', { isMuted });
    }
  }

  public sendSpeakingState(isSpeaking: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('audio:speaking', { isSpeaking });
    }
  }

  public sendChatMessage(text: string, type: ChatMessageType = 'proximity', targetUserId?: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:send', { text, type, targetUserId });
    }
  }

  public sendEmote(emoji: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('emote:send', { emoji });
    }
  }

  public updateUserStatus(status: UserStatus): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('user:status', { status });
      useOfficeStore.getState().setUserStatus(status);
    }
  }

  public sendScreenState(isSharing: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('screen:state', { isSharing });
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();


