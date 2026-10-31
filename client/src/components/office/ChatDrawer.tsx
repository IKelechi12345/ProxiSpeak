import React, { useState, useRef, useEffect } from 'react';
import { useOfficeStore } from '../../stores/officeStore';
import { useAuthStore } from '../../stores/authStore';
import { socketService } from '../../services/socketService';
import { ChatMessageType } from '@proxispeak/shared';
import {
  MessageSquare,
  X,
  Send,
  Radio,
  Lock,
  Globe,
  Smile,
  Users,
} from 'lucide-react';

export const ChatDrawer: React.FC = () => {
  const {
    isChatOpen,
    setChatOpen,
    messages,
    nearbyPeers,
    currentZone,
  } = useOfficeStore();

  const { user } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const [chatType, setChatType] = useState<ChatMessageType>('proximity');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages.length, isChatOpen]);

  if (!isChatOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socketService.sendChatMessage(inputText, chatType, targetUserId || undefined);
    setInputText('');
    setShowEmojiPicker(false);
  };

  const quickEmojis = ['👋', '👍', '👏', '💡', '❤️', '☕', '🎉', '🔥'];

  const nearbyList = Array.from(nearbyPeers.values());

  return (
    <div className="absolute top-16 right-5 bottom-20 w-96 bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
              <span>Spatial Office Chat</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentZone ? (
                <span className="text-emerald-400 font-semibold">📍 {currentZone.name}</span>
              ) : (
                <span>Range: 120px Proximity</span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setChatOpen(false)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scope Selector Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setChatType('proximity')}
          className={`flex-1 py-1.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
            chatType === 'proximity'
              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Proximity</span>
        </button>

        <button
          type="button"
          onClick={() => setChatType('whisper')}
          className={`flex-1 py-1.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
            chatType === 'whisper'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Whisper</span>
        </button>

        <button
          type="button"
          onClick={() => setChatType('broadcast')}
          className={`flex-1 py-1.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
            chatType === 'broadcast'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>All</span>
        </button>
      </div>

      {/* Whisper recipient select */}
      {chatType === 'whisper' && (
        <div className="px-4 py-2 border-b border-slate-800 bg-violet-950/20 flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-violet-300">Whisper To:</span>
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500"
          >
            <option value="">Select a nearby colleague...</option>
            {nearbyList.map((peer) => (
              <option key={peer.peerId} value={peer.peerId}>
                {peer.username} ({peer.distance}px away)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Users className="w-10 h-10 mb-2.5 opacity-30" />
            <p className="text-xs font-medium">No messages in range yet</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
              Walk closer to colleagues to chat, or send a room broadcast.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-300">
                    {isSelf ? 'You' : msg.senderName}
                  </span>
                  {msg.type === 'whisper' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">
                      Whisper
                    </span>
                  )}
                  {msg.type === 'broadcast' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      Broadcast
                    </span>
                  )}
                  {msg.zoneName && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                      {msg.zoneName}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                    isSelf
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-1">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                socketService.sendEmote(emoji);
                setShowEmojiPicker(false);
              }}
              className="text-lg p-1 hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Smile className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              chatType === 'proximity'
                ? 'Type to colleagues in proximity...'
                : chatType === 'whisper'
                ? 'Type private whisper...'
                : 'Broadcast announcement to entire office...'
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-sky-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

