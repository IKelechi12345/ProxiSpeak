import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOfficeStore } from '../stores/officeStore';
import { useAuthStore } from '../stores/authStore';
import { useAudioStore } from '../stores/audioStore';
import { socketService } from '../services/socketService';
import { webrtcManager } from '../services/webrtcManager';
import { spatialAudioEngine } from '../services/spatialAudioEngine';
import { OfficeCanvas } from '../components/office/OfficeCanvas';
import { OfficeNavbar } from '../components/office/OfficeNavbar';
import { NearbyUsersPanel } from '../components/office/NearbyUsersPanel';
import { SpatialAuditModal } from '../components/office/SpatialAuditModal';
import { LayoutEditorModal } from '../components/office/LayoutEditorModal';
import { SettingsModal } from '../components/office/SettingsModal';
import { ChatDrawer } from '../components/office/ChatDrawer';
import { QuickActionBar } from '../components/office/QuickActionBar';
import { ScreenShareModal } from '../components/office/ScreenShareModal';
import { Volume2 } from 'lucide-react';

export const OfficePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user, token } = useAuthStore();
  const { currentOffice } = useOfficeStore();
  const { setIsSpeaking } = useAudioStore();

  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  // Initialize Socket.io and WebRTC on mount
  useEffect(() => {
    if (!id || !token || !user) {
      navigate('/dashboard');
      return;
    }

    const initOffice = async () => {
      try {
        // Connect authenticated socket
        socketService.connect(token, user.id);

        // Join target office
        await socketService.joinOffice(id);

        // Setup local microphone stream
        await webrtcManager.initializeLocalStream();

        // Voice Activity Detection callback
        webrtcManager.setSpeakingCallback((speaking) => {
          setIsSpeaking(speaking);
          socketService.sendSpeakingState(speaking);
        });

        // Test if audio needs autoplay unlocking
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const testCtx = new AudioCtx();
          if (testCtx.state === 'suspended') {
            setAudioNeedsUnlock(true);
          }
          testCtx.close();
        }
      } catch (err: any) {
        console.error('Failed to initialize office session:', err);
      }
    };

    initOffice();

    return () => {
      socketService.leaveOffice();
      webrtcManager.cleanup();
    };
  }, [id, token, user?.id]);

  const handleUnlockAudio = async () => {
    await spatialAudioEngine.unlock();
    setAudioNeedsUnlock(false);
  };

  const isOwner = currentOffice?.ownerId === user?.id;

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden select-none">
      {/* Autoplay Audio Unlock Notice */}
      {audioNeedsUnlock && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-sky-500/90 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-md animate-bounce">
          <Volume2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-bold">Browser Audio requires a click to enable spatial sound:</span>
          <button
            onClick={handleUnlockAudio}
            className="px-3 py-1 bg-white text-sky-900 rounded-xl text-xs font-bold shadow hover:bg-slate-100 transition-colors"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <OfficeNavbar
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenLayoutEditor={() => setIsLayoutOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOwner={isOwner}
      />

      {/* Main HTML5 60 FPS Canvas Rendering Engine */}
      <OfficeCanvas />

      {/* Nearby Peers Sound Panel */}
      <NearbyUsersPanel />

      {/* Quick Action Bar (Statuses, Emotes, Screen Share, Chat Trigger, Zone HUD) */}
      <QuickActionBar />

      {/* In-Office Spatial Chat Drawer */}
      <ChatDrawer />

      {/* Screen Share Overlay Modal */}
      <ScreenShareModal />

      {/* Control Hint Footer Pill */}
      <div className="absolute bottom-5 left-6 z-30 pointer-events-none hidden md:block">
        <div className="glass-panel px-3.5 py-1.5 rounded-full text-[11px] text-slate-400 font-medium flex items-center space-x-2 border border-slate-800">
          <span className="text-slate-300 font-semibold">Controls:</span>
          <span>WASD / Arrow Keys</span>
          <span className="text-slate-600">•</span>
          <span>Shift to Sprint</span>
          <span className="text-slate-600">•</span>
          <span>Click floor to walk</span>
        </div>
      </div>

      {/* Modals */}
      <SpatialAuditModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
      <LayoutEditorModal isOpen={isLayoutOpen} onClose={() => setIsLayoutOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
