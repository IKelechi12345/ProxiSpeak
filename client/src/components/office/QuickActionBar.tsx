import React, { useState } from 'react';
import { useOfficeStore } from '../../stores/officeStore';
import { useAuthStore } from '../../stores/authStore';
import { socketService } from '../../services/socketService';
import { UserStatus } from '@proxispeak/shared';
import {
  MessageSquare,
  Monitor,
  Smile,
  Shield,
  ChevronUp,
  Radio,
} from 'lucide-react';

export const QuickActionBar: React.FC = () => {
  const {
    userStatus,
    currentZone,
    isChatOpen,
    setChatOpen,
    unreadChatCount,
    screenSharing,
    setScreenSharing,
  } = useOfficeStore();

  const { user } = useAuthStore();
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const statuses: Array<{ id: UserStatus; label: string; dotColor: string; bg: string }> = [
    { id: 'available', label: 'Available', dotColor: 'bg-emerald-400', bg: 'hover:bg-emerald-500/10' },
    { id: 'busy', label: 'In a Meeting', dotColor: 'bg-rose-500', bg: 'hover:bg-rose-500/10' },
    { id: 'focus', label: 'Focus Mode (DND)', dotColor: 'bg-purple-400', bg: 'hover:bg-purple-500/10' },
    { id: 'away', label: 'Coffee Break', dotColor: 'bg-amber-400', bg: 'hover:bg-amber-500/10' },
  ];

  const quickEmotes = ['👋', '👍', '💡', '☕', '❤️', '🎉'];

  const handleSelectStatus = (status: UserStatus) => {
    socketService.updateUserStatus(status);
    setIsStatusDropdownOpen(false);
  };

  const handleTriggerEmote = (emoji: string) => {
    socketService.sendEmote(emoji);
    if (user?.id) {
      useOfficeStore.getState().triggerEmote(user.id, emoji);
    }
  };

  const handleToggleScreenShare = async () => {
    if (screenSharing.isSharing) {
      if (screenSharing.stream) {
        screenSharing.stream.getTracks().forEach((track) => track.stop());
      }
      socketService.sendScreenState(false);
      setScreenSharing({ isSharing: false });
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Screen sharing is not supported in this browser environment.');
          return;
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: false,
        });

        // Listen for browser native "Stop Sharing" button
        stream.getVideoTracks()[0].onended = () => {
          socketService.sendScreenState(false);
          setScreenSharing({ isSharing: false });
        };

        setScreenSharing({
          isSharing: true,
          userId: user?.id,
          username: user?.username,
          stream,
        });
        socketService.sendScreenState(true);
      } catch (err: any) {
        console.warn('Screen share canceled or denied:', err.message);
      }
    }
  };

  const currentStatusObj = statuses.find((s) => s.id === userStatus) || statuses[0];

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2">
      {/* Current Zone HUD pill */}
      {currentZone && (
        <div className="glass-panel px-3 py-1.5 rounded-full border border-slate-700/80 bg-slate-900/90 shadow-xl flex items-center space-x-2 text-xs font-semibold animate-in fade-in">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentZone.color || '#38bdf8' }}
          />
          <span className="text-white font-bold">{currentZone.name}</span>
          {currentZone.isPrivate && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 flex items-center space-x-1">
              <Shield className="w-3 h-3 inline mr-0.5" />
              Soundproof
            </span>
          )}
        </div>
      )}

      {/* Main Bar */}
      <div className="glass-panel px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl flex items-center space-x-2">
        {/* User Presence Status Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-750 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full ${currentStatusObj.dotColor}`} />
            <span>{currentStatusObj.label}</span>
            <ChevronUp className={`w-3 h-3 text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isStatusDropdownOpen && (
            <div className="absolute bottom-10 left-0 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1 z-50 overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Set Presence
              </div>
              {statuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStatus(s.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium text-slate-200 flex items-center space-x-2 transition-colors ${s.bg}`}
                >
                  <div className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-slate-700" />

        {/* Quick Emote Reactions */}
        <div className="flex items-center space-x-1">
          {quickEmotes.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleTriggerEmote(emoji)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-800 hover:scale-125 transition-all text-sm"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="h-4 w-[1px] bg-slate-700" />

        {/* Screen Share Button */}
        <button
          onClick={handleToggleScreenShare}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
            screenSharing.isSharing
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
          title="Share Screen"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>{screenSharing.isSharing ? 'Stop Share' : 'Share'}</span>
        </button>

        {/* Chat Toggle Button */}
        <button
          onClick={() => setChatOpen(!isChatOpen)}
          className={`relative flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
            isChatOpen
              ? 'bg-sky-600 text-white shadow-sky-600/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full animate-bounce shadow">
              {unreadChatCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

