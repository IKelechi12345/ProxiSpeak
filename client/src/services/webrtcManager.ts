/**
 * WebRTC Peer Connection Manager for ProxiSpeak
 * Features:
 * - Deterministic polite/impolite peer offer initiation
 * - ICE candidate queuing until remote description is set
 * - Local microphone management with voice activity detection (VAD)
 * - Seamless integration with SpatialAudioEngine
 */

import { spatialAudioEngine } from './spatialAudioEngine';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export type SignalingCallback = (event: string, payload: any) => void;

interface PeerRecord {
  peerId: string;
  connection: RTCPeerConnection;
  isOfferInitiator: boolean;
  iceCandidateQueue: RTCIceCandidateInit[];
  remoteDescriptionSet: boolean;
  remoteStream?: MediaStream;
}

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerRecord> = new Map();
  private signalingCallback: SignalingCallback | null = null;
  private localUserId: string = '';
  private config: WebRTCConfig;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadInterval: any = null;
  private onSpeakingChange: ((isSpeaking: boolean) => void) | null = null;

  constructor(config?: Partial<WebRTCConfig>) {
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        ...(config?.iceServers || []),
      ],
    };
  }

  public setSignalingCallback(cb: SignalingCallback): void {
    this.signalingCallback = cb;
  }

  public setLocalUserId(userId: string): void {
    this.localUserId = userId;
  }

  public setSpeakingCallback(cb: (isSpeaking: boolean) => void): void {
    this.onSpeakingChange = cb;
  }

  /**
   * Initializes the local audio stream from the physical microphone.
   * If running in a headless test environment or microphone access is denied,
   * creates a controlled sine wave oscillator audio track for testing.
   */
  public async initializeLocalStream(deviceId?: string): Promise<{ success: boolean; isSynthetic?: boolean }> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('WebRTCManager: Microphone stream initialized successfully');
      this.setupVoiceActivityDetection(this.localStream);
      return { success: true };
    } catch (err: any) {
      console.warn(`WebRTCManager: Physical microphone unavailable (${err.message}). Using controlled audio source for testing.`);
      // Controlled synthetic audio stream fallback
      this.localStream = this.createSyntheticAudioStream();
      return { success: true, isSynthetic: true };
    }
  }

  private createSyntheticAudioStream(): MediaStream {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime); // Whisper tone
    osc.connect(gain);
    gain.connect(dst);
    osc.start();
    return dst.stream;
  }

  private setupVoiceActivityDetection(stream: MediaStream): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      let wasSpeaking = false;

      this.vadInterval = setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const isSpeaking = average > 25; // Voice threshold

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          if (this.onSpeakingChange) {
            this.onSpeakingChange(isSpeaking);
          }
        }
      }, 150);
    } catch (e) {
      console.warn('VAD setup skipped:', e);
    }
  }

  public setMute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Called when a peer enters proximity range.
   * Initiates deterministic peer connection.
   */
  public async handlePeerEnter(peerId: string, shouldInitiateOffer: boolean): Promise<void> {
    if (this.peers.has(peerId)) {
      console.log(`WebRTCManager: Peer ${peerId} already has an active connection`);
      return;
    }

    console.log(`WebRTCManager: Establishing peer connection with ${peerId}. Initiator: ${shouldInitiateOffer}`);
    const peerRecord = this.createPeerConnection(peerId, shouldInitiateOffer);
    this.peers.set(peerId, peerRecord);

    if (shouldInitiateOffer) {
      try {
        const offer = await peerRecord.connection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await peerRecord.connection.setLocalDescription(offer);

        if (this.signalingCallback) {
          this.signalingCallback('webrtc:offer', {
            targetUserId: peerId,
            senderUserId: this.localUserId,
            sdp: offer,
          });
        }
      } catch (err) {
        console.error(`WebRTCManager: Failed to create offer for ${peerId}:`, err);
      }
    }
  }

  private createPeerConnection(peerId: string, isOfferInitiator: boolean): PeerRecord {
    const pc = new RTCPeerConnection(this.config);

    const record: PeerRecord = {
      peerId,
      connection: pc,
      isOfferInitiator,
      iceCandidateQueue: [],
      remoteDescriptionSet: false,
    };

    // Add local audio tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && this.signalingCallback) {
        this.signalingCallback('webrtc:ice-candidate', {
          targetUserId: peerId,
          senderUserId: this.localUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Remote Track received! Attach to spatial audio engine
    pc.ontrack = (event) => {
      console.log(`WebRTCManager: Received remote audio track from peer ${peerId}`);
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      record.remoteStream = remoteStream;
      spatialAudioEngine.attachRemoteStream(peerId, remoteStream);
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`WebRTCManager: Connection state with ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.handlePeerLeave(peerId);
      }
    };

    return record;
  }

  /**
   * Receive SDP offer from remote peer
   */
  public async handleSignalingOffer(senderUserId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    let record = this.peers.get(senderUserId);
    if (!record) {
      record = this.createPeerConnection(senderUserId, false);
      this.peers.set(senderUserId, record);
    }

    try {
      await record.connection.setRemoteDescription(new RTCSessionDescription(sdp));
      record.remoteDescriptionSet = true;

      // Flush any queued ICE candidates
      await this.flushIceCandidates(record);

      const answer = await record.connection.createAnswer();
      await record.connection.setLocalDescription(answer);

      if (this.signalingCallback) {
        this.signalingCallback('webrtc:answer', {
          targetUserId: senderUserId,
          senderUserId: this.localUserId,
          sdp: answer,
        });
      }
    } catch (err) {
      console.error(`WebRTCManager: Error handling offer from ${senderUserId}:`, err);
    }
  }

  /**
   * Receive SDP answer from remote peer
   */
  public async handleSignalingAnswer(senderUserId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const record = this.peers.get(senderUserId);
    if (!record) return;

    try {
      await record.connection.setRemoteDescription(new RTCSessionDescription(sdp));
      record.remoteDescriptionSet = true;
      await this.flushIceCandidates(record);
    } catch (err) {
      console.error(`WebRTCManager: Error handling answer from ${senderUserId}:`, err);
    }
  }

  /**
   * Receive ICE candidate from remote peer
   */
  public async handleSignalingIceCandidate(senderUserId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const record = this.peers.get(senderUserId);
    if (!record) return;

    if (!record.remoteDescriptionSet) {
      // Queue until remote description is applied
      record.iceCandidateQueue.push(candidate);
      return;
    }

    try {
      await record.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error(`WebRTCManager: Failed to add ICE candidate for ${senderUserId}:`, err);
    }
  }

  private async flushIceCandidates(record: PeerRecord): Promise<void> {
    while (record.iceCandidateQueue.length > 0) {
      const cand = record.iceCandidateQueue.shift();
      if (cand) {
        try {
          await record.connection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('Error applying queued ICE candidate:', e);
        }
      }
    }
  }

  /**
   * Called when a peer leaves proximity or leaves office
   */
  public handlePeerLeave(peerId: string): void {
    const record = this.peers.get(peerId);
    if (record) {
      try {
        record.connection.close();
      } catch (e) {
        // already closed
      }
      this.peers.delete(peerId);
    }
    spatialAudioEngine.detachRemoteStream(peerId);
    console.log(`WebRTCManager: Cleaned up peer connection with ${peerId}`);
  }

  public cleanup(): void {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    for (const peerId of this.peers.keys()) {
      this.handlePeerLeave(peerId);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    spatialAudioEngine.close();
  }
}

export const webrtcManager = new WebRTCManager();
