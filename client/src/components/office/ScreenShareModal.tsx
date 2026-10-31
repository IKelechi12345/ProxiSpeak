import React, { useRef, useEffect } from 'react';
import { useOfficeStore } from '../../stores/officeStore';
import { socketService } from '../../services/socketService';
import { Monitor, X, Maximize2, Minimize2 } from 'lucide-react';

export const ScreenShareModal: React.FC = () => {
  const { screenSharing, setScreenSharing } = useOfficeStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMinimized, setIsMinimized] = React.useState(false);

  useEffect(() => {
    if (videoRef.current && screenSharing.stream) {
      videoRef.current.srcObject = screenSharing.stream;
    }
  }, [screenSharing.stream, screenSharing.isSharing]);

  if (!screenSharing.isSharing) return null;

  const handleStopSharing = () => {
    if (screenSharing.stream) {
      screenSharing.stream.getTracks().forEach((track) => track.stop());
    }
    socketService.sendScreenState(false);
    setScreenSharing({ isSharing: false });
  };

  return (
    <div
      className={`fixed transition-all duration-300 z-50 bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden ${
        isMinimized
          ? 'bottom-24 right-6 w-72 h-44'
          : 'bottom-20 right-6 w-[560px] h-[360px] max-w-[90vw] max-h-[80vh]'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Monitor className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">
            {screenSharing.username ? `${screenSharing.username}'s Screen` : 'Your Screen Stream'}
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
            Live
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleStopSharing}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
            title="Stop Screen Share"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Content */}
      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        {screenSharing.stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center p-6 text-slate-500 flex flex-col items-center">
            <Monitor className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
            <p className="text-xs font-semibold text-slate-300">
              {screenSharing.username || 'Peer'} is presenting
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Screen stream synchronized via WebRTC
            </p>
          </div>
        )}
      </div>

      {/* Footer controls if active sharer */}
      <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>WebRTC DisplayMedia Track</span>
        <button
          onClick={handleStopSharing}
          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          Stop Sharing
        </button>
      </div>
    </div>
  );
};

