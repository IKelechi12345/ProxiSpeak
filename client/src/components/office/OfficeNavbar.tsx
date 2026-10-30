import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Users,
  Settings,
  Activity,
  Layers,
  LogOut,
  Radio,
} from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import { useAudioStore } from '../../stores/audioStore';
import { socketService } from '../../services/socketService';
import { webrtcManager } from '../../services/webrtcManager';

interface OfficeNavbarProps {
  onOpenAudit: () => void;
  onOpenLayoutEditor: () => void;
  onOpenSettings: () => void;
  isOwner: boolean;
}

export const OfficeNavbar: React.FC<OfficeNavbarProps> = ({
  onOpenAudit,
  onOpenLayoutEditor,
  onOpenSettings,
  isOwner,
}) => {
  const navigate = useNavigate();
  const { currentOffice, isConnected, participants, nearbyPeers } = useOfficeStore();
  const { isMuted, isDeafened, isSpeaking, toggleMute, toggleDeafen } = useAudioStore();

  const handleMuteToggle = () => {
    const nextMuted = toggleMute();
    webrtcManager.setMute(nextMuted);
    socketService.sendMuteState(nextMuted);
  };

  const handleLeave = () => {
    socketService.leaveOffice();
    navigate('/dashboard');
  };

  return (
    <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
      {/* Left: Office Identity & Status */}
      <div className="flex items-center space-x-3 pointer-events-auto">
        <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center space-x-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <span className={`block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              {isConnected && <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />}
            </div>
            <h1 className="text-sm font-bold tracking-tight text-white truncate max-w-[220px]">
              {currentOffice?.name || 'ProxiSpeak Office'}
            </h1>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Connected Participants Counter */}
          <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-300">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span>{participants.size + 1} online</span>
          </div>

          {/* Nearby In-Range Counter */}
          <div className="flex items-center space-x-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{nearbyPeers.size} in voice range</span>
          </div>
        </div>
      </div>

      {/* Center / Right: Audio Controls & Tools */}
      <div className="flex items-center space-x-2.5 pointer-events-auto">
        {/* Microphone Toggle Button */}
        <button
          onClick={handleMuteToggle}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-lg transition-all ${
            isMuted
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
              : isSpeaking
              ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-400 shadow-glow-emerald ring-2 ring-emerald-400/50'
              : 'glass-panel text-slate-200 hover:text-white border-slate-700/60'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          <span>{isMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Mic On'}</span>
        </button>

        {/* Deafen Toggle */}
        <button
          onClick={toggleDeafen}
          className={`glass-panel p-2.5 rounded-2xl text-slate-300 hover:text-white transition-all ${
            isDeafened ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : ''
          }`}
          title={isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
        >
          {isDeafened ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Spatial Latency Audit Modal Trigger */}
        <button
          onClick={onOpenAudit}
          className="glass-panel px-3 py-2.5 rounded-2xl text-xs font-semibold text-sky-300 hover:text-sky-200 flex items-center space-x-1.5 transition-all hover:border-sky-500/40"
          title="Inspect Spatial Engine Performance & Benchmark"
        >
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">&lt;20ms Audit</span>
        </button>

        {/* Layout Editor Trigger (For Office Owner) */}
        {isOwner && (
          <button
            onClick={onOpenLayoutEditor}
            className="glass-panel px-3 py-2.5 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white flex items-center space-x-1.5 transition-all hover:border-slate-500/40"
            title="Edit Office Layout, Furniture & Obstacles"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Edit Layout</span>
          </button>
        )}

        {/* Settings Modal */}
        <button
          onClick={onOpenSettings}
          className="glass-panel p-2.5 rounded-2xl text-slate-300 hover:text-white transition-all hover:border-slate-500/40"
          title="Audio & Avatar Settings"
        >
          <Settings className="w-4 h-4 text-slate-300" />
        </button>

        {/* Leave Office Button */}
        <button
          onClick={handleLeave}
          className="glass-panel px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 border-rose-500/30 flex items-center space-x-1.5 transition-all"
          title="Leave Virtual Office"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </header>
  );
};
