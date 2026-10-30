import React, { useEffect } from 'react';
import { X, Mic, Volume2, UserCheck, Check } from 'lucide-react';
import { useAudioStore } from '../../stores/audioStore';
import { useAuthStore } from '../../stores/authStore';
import { webrtcManager } from '../../services/webrtcManager';
import { spatialAudioEngine } from '../../services/spatialAudioEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    masterVolume,
    setMasterVolume,
    inputDeviceId,
    setInputDevice,
    availableDevices,
    refreshAudioDevices,
  } = useAudioStore();

  const { user, updateProfile } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      refreshAudioDevices();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVolume(val);
    spatialAudioEngine.setMasterVolume(val);
  };

  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = e.target.value;
    setInputDevice(deviceId);
    await webrtcManager.initializeLocalStream(deviceId);
  };

  const handleAvatarSelect = async (avatarId: string) => {
    await updateProfile({ avatar: avatarId });
  };

  const avatarOptions = [
    { id: 'avatar-1', label: 'Engineer Blue', color: 'from-sky-500 to-blue-600' },
    { id: 'avatar-2', label: 'Emerald Lead', color: 'from-emerald-500 to-teal-600' },
    { id: 'avatar-3', label: 'Purple Architect', color: 'from-purple-500 to-indigo-600' },
    { id: 'avatar-4', label: 'Amber Product', color: 'from-amber-500 to-orange-600' },
    { id: 'avatar-5', label: 'Rose Designer', color: 'from-rose-500 to-pink-600' },
    { id: 'avatar-6', label: 'Cyber Violet', color: 'from-violet-500 to-fuchsia-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Audio & Avatar Preferences</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Microphone Device Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Mic className="w-4 h-4 text-sky-400" />
              <span>Microphone Input Device</span>
            </label>
            <select
              value={inputDeviceId}
              onChange={handleDeviceChange}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="default">Default System Microphone</option>
              {availableDevices.audioInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone (${d.deviceId.slice(0, 8)})`}
                </option>
              ))}
            </select>
          </div>

          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Spatial Audio Master Volume</span>
              </span>
              <span className="font-mono text-emerald-400">{Math.round(masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={handleVolumeChange}
              className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Avatar Persona Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Avatar Persona Style</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {avatarOptions.map((av) => {
                const isSelected = (user?.avatar || 'avatar-1') === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => handleAvatarSelect(av.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center space-y-1.5 transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-sky-400 ring-2 ring-sky-400/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${av.color} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                      {user?.username?.charAt(0) || 'U'}
                    </div>
                    <span className="text-[10px] font-medium text-slate-300 truncate w-full text-center">
                      {av.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
