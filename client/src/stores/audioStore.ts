import { create } from 'zustand';

interface AudioState {
  isMuted: boolean;
  isDeafened: boolean;
  masterVolume: number;
  inputDeviceId: string;
  outputDeviceId: string;
  audioPermission: 'granted' | 'denied' | 'prompt';
  isSpeaking: boolean;
  peersSpeaking: Record<string, boolean>;
  availableDevices: {
    audioInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  };
  toggleMute: () => boolean;
  toggleDeafen: () => void;
  setMasterVolume: (vol: number) => void;
  setInputDevice: (deviceId: string) => void;
  setOutputDevice: (deviceId: string) => void;
  setAudioPermission: (status: 'granted' | 'denied' | 'prompt') => void;
  setIsSpeaking: (speaking: boolean) => void;
  setPeerSpeaking: (peerId: string, speaking: boolean) => void;
  refreshAudioDevices: () => Promise<void>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isMuted: false,
  isDeafened: false,
  masterVolume: 1.0,
  inputDeviceId: 'default',
  outputDeviceId: 'default',
  audioPermission: 'prompt',
  isSpeaking: false,
  peersSpeaking: {},
  availableDevices: {
    audioInputs: [],
    audioOutputs: [],
  },

  toggleMute: () => {
    const next = !get().isMuted;
    set({ isMuted: next });
    return next;
  },

  toggleDeafen: () => {
    set((state) => ({ isDeafened: !state.isDeafened }));
  },

  setMasterVolume: (vol: number) => {
    set({ masterVolume: Math.max(0, Math.min(1, vol)) });
  },

  setInputDevice: (deviceId: string) => {
    set({ inputDeviceId: deviceId });
  },

  setOutputDevice: (deviceId: string) => {
    set({ outputDeviceId: deviceId });
  },

  setAudioPermission: (status) => {
    set({ audioPermission: status });
  },

  setIsSpeaking: (speaking) => {
    set({ isSpeaking: speaking });
  },

  setPeerSpeaking: (peerId, speaking) => {
    set((state) => ({
      peersSpeaking: { ...state.peersSpeaking, [peerId]: speaking },
    }));
  },

  refreshAudioDevices: async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
      set({
        availableDevices: { audioInputs, audioOutputs },
      });
    } catch (e) {
      console.warn('Failed to enumerate audio devices', e);
    }
  },
}));
