import React, { useState } from 'react';
import { useOfficeStore } from '../../stores/officeStore';
import { useAudioStore } from '../../stores/audioStore';
import { Radio, ChevronRight, ChevronLeft, ShieldAlert, Volume2, UserCheck } from 'lucide-react';

export const NearbyUsersPanel: React.FC = () => {
  const { nearbyPeers, participants } = useOfficeStore();
  const { peersSpeaking } = useAudioStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const peersList = Array.from(nearbyPeers.values());

  return (
    <aside
      className={`absolute bottom-6 right-6 z-30 transition-all duration-300 pointer-events-auto ${
        isCollapsed ? 'translate-x-[calc(100%-48px)]' : 'translate-x-0'
      }`}
    >
      <div className="glass-panel w-80 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/60 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Nearby Proximity ({peersList.length})
            </h3>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 max-h-72 overflow-y-auto space-y-2.5">
          {peersList.length === 0 ? (
            <div className="py-6 px-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
                <Radio className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-xs text-slate-300 font-medium">No colleagues in range</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Walk within <span className="text-sky-400 font-semibold">100px</span> of another avatar using WASD or arrow keys to start hearing them.
              </p>
            </div>
          ) : (
            peersList.map((peer) => {
              const isSpeaking = !!peersSpeaking[peer.peerId];
              const volPercent = Math.round(peer.attenuation * 100);
              const panPercent = Math.round(peer.relativeX * 100);
              const panLabel =
                Math.abs(panPercent) < 15
                  ? 'Center'
                  : panPercent > 0
                  ? `R ${panPercent}%`
                  : `L ${Math.abs(panPercent)}%`;

              return (
                <div
                  key={peer.peerId}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isSpeaking
                      ? 'bg-emerald-950/40 border-emerald-500/40 shadow-glow-emerald'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          isSpeaking ? 'bg-emerald-600 ring-2 ring-emerald-400' : 'bg-indigo-600'
                        }`}
                      >
                        {peer.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-1">
                          <span className="truncate max-w-[110px]">{peer.username}</span>
                          {isSpeaking && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-normal animate-pulse">
                              Speaking
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {Math.round(peer.distance)}px away • Stereo {panLabel}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-sky-400">{volPercent}%</span>
                      <div className="text-[9px] text-slate-500">volume</div>
                    </div>
                  </div>

                  {/* Volume Attenuation Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        peer.isObstructed ? 'bg-amber-500' : 'bg-gradient-to-r from-sky-500 to-emerald-400'
                      }`}
                      style={{ width: `${volPercent}%` }}
                    />
                  </div>

                  {/* Acoustic Obstruction Alert */}
                  {peer.isObstructed && (
                    <div className="mt-1.5 flex items-center space-x-1 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                      <span>Audio muffled by sound-blocking partition</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
