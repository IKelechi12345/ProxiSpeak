/**
 * Spatial Audio Engine for ProxiSpeak
 * Powered by Web Audio API
 *
 * Implements:
 * - Distance-based volume attenuation with smooth gain ramping
 * - 2D horizontal stereo panning via StereoPannerNode
 * - Obstacle sound blocking and dampening
 * - Autoplay audio context unlock on user gesture
 */

interface PeerAudioNodes {
  sourceNode: MediaStreamAudioSourceNode;
  gainNode: GainNode;
  pannerNode: StereoPannerNode;
  stream: MediaStream;
}

export class SpatialAudioEngine {
  private audioCtx: AudioContext | null = null;
  private peerNodes: Map<string, PeerAudioNodes> = new Map();
  private masterVolume: number = 1.0;
  public isUnlocked: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    return this.audioCtx;
  }

  /**
   * Unlocks the AudioContext following browser autoplay policy requirements
   */
  public async unlock(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        this.isUnlocked = true;
        return true;
      } catch (err) {
        console.warn('AudioContext resume failed:', err);
        return false;
      }
    }
    this.isUnlocked = true;
    return true;
  }

  /**
   * Attaches a remote WebRTC audio stream to a dedicated spatial audio processing chain
   */
  public attachRemoteStream(peerId: string, stream: MediaStream): void {
    const ctx = this.getAudioContext();

    // Clean up existing chain if peer was already registered
    this.detachRemoteStream(peerId);

    try {
      const sourceNode = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime); // Start muted, ramp up smoothly

      let pannerNode: StereoPannerNode;
      if (typeof ctx.createStereoPanner === 'function') {
        pannerNode = ctx.createStereoPanner();
      } else {
        // Fallback for older browsers
        pannerNode = { pan: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} } } as any;
      }

      // Chain: Source -> Gain -> Panner -> Destination
      sourceNode.connect(gainNode);
      if (typeof gainNode.connect === 'function' && typeof pannerNode.connect === 'function') {
        gainNode.connect(pannerNode);
        pannerNode.connect(ctx.destination);
      } else {
        gainNode.connect(ctx.destination);
      }

      this.peerNodes.set(peerId, {
        sourceNode,
        gainNode,
        pannerNode,
        stream,
      });

      console.log(`SpatialAudioEngine: Attached stream for peer ${peerId}`);
    } catch (err) {
      console.error(`SpatialAudioEngine: Failed to attach audio stream for peer ${peerId}:`, err);
    }
  }

  /**
   * Dynamically updates volume attenuation and stereo panning for a peer
   * @param peerId Target peer ID
   * @param attenuation Attenuation factor [0.0 - 1.0] calculated by distance and obstacles
   * @param relativeX Horizontal panning offset [-1.0 (left) to 1.0 (right)]
   */
  public updateSpatialParameters(
    peerId: string,
    attenuation: number,
    relativeX: number
  ): void {
    const nodes = this.peerNodes.get(peerId);
    if (!nodes || !this.audioCtx) return;

    const ctx = this.audioCtx;
    const targetGain = Math.max(0, Math.min(1, attenuation * this.masterVolume));
    const targetPan = Math.max(-1.0, Math.min(1.0, relativeX));

    // Smooth gain ramp (50ms) to avoid audio clicks
    nodes.gainNode.gain.cancelScheduledValues(ctx.currentTime);
    nodes.gainNode.gain.linearRampToValueAtTime(
      Math.max(0.00001, targetGain),
      ctx.currentTime + 0.05
    );

    // Smooth stereo pan adjustment
    if (nodes.pannerNode.pan && typeof nodes.pannerNode.pan.linearRampToValueAtTime === 'function') {
      nodes.pannerNode.pan.cancelScheduledValues(ctx.currentTime);
      nodes.pannerNode.pan.linearRampToValueAtTime(targetPan, ctx.currentTime + 0.05);
    }
  }

  /**
   * Removes and cleans up audio nodes for a disconnected or out-of-range peer
   */
  public detachRemoteStream(peerId: string): void {
    const nodes = this.peerNodes.get(peerId);
    if (!nodes) return;

    try {
      if (this.audioCtx) {
        // Fade out smoothly before disconnecting
        nodes.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
        nodes.gainNode.gain.linearRampToValueAtTime(0.00001, this.audioCtx.currentTime + 0.05);
      }

      setTimeout(() => {
        try {
          nodes.sourceNode.disconnect();
          nodes.gainNode.disconnect();
          if (typeof nodes.pannerNode.disconnect === 'function') {
            nodes.pannerNode.disconnect();
          }
        } catch (e) {
          // Already disconnected
        }
      }, 60);
    } catch (e) {
      console.warn('Error detaching audio nodes:', e);
    }

    this.peerNodes.delete(peerId);
    console.log(`SpatialAudioEngine: Detached audio stream for peer ${peerId}`);
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public hasPeer(peerId: string): boolean {
    return this.peerNodes.has(peerId);
  }

  public close(): void {
    for (const peerId of this.peerNodes.keys()) {
      this.detachRemoteStream(peerId);
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export const spatialAudioEngine = new SpatialAudioEngine();
