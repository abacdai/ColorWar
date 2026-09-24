import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Copy, Check, LogOut, RotateCcw, X, Lock, Globe } from 'lucide-react';
import { OnlineRoomState, PlayerId } from '../types/game';
import { onlineSocket } from '../services/onlineSocket';
import { soundManager } from '../audio/soundManager';

interface OnlineGameControlsProps {
  roomState: OnlineRoomState;
  myPlayerId: PlayerId | null;
  onLeaveRoom: () => void;
}

export const OnlineGameControls: React.FC<OnlineGameControlsProps> = ({
  roomState,
  myPlayerId,
  onLeaveRoom,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [chatText, setChatText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const me = roomState.players.find((p) => p.playerId === myPlayerId);
  const isHost = roomState.hostId === onlineSocket.myClientId;

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [roomState.messages, isOpen]);

  const handleCopyCode = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(roomState.roomCode).catch(() => {
          fallbackCopyText(roomState.roomCode);
        });
      } else {
        fallbackCopyText(roomState.roomCode);
      }
    } catch {
      fallbackCopyText(roomState.roomCode);
    }
    setCopied(true);
    soundManager.playDotAdd(1);
    setTimeout(() => setCopied(false), 2000);
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (e) {
      console.warn('Fallback copy error:', e);
    }
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatText.trim()) return;
    onlineSocket.sendChat(chatText.trim());
    soundManager.playDotAdd(1);
    setChatText('');
  };

  const handleQuickEmoji = (emoji: string) => {
    onlineSocket.sendChat(emoji);
    soundManager.playDotAdd(1);
  };

  const handleRestart = () => {
    soundManager.playDotAdd(2);
    onlineSocket.restartGame();
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-1.5 select-none relative z-30">
      {/* Top Online Status Bar: Responsive & Clean (No Overlapping) */}
      <div className="bg-[#1a1c29]/95 backdrop-blur-md rounded-2xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex items-center justify-between gap-1.5 text-white">
        {/* Left Side: Room Code + Privacy Badge + You Pill */}
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          {/* Room Code Badge */}
          <div className="flex items-center gap-1.5 bg-[#222536] px-2 py-1 rounded-xl border border-white/5 shadow-inner shrink-0 whitespace-nowrap">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider hidden xs:inline">
              ROOM
            </span>
            <span className="text-xs font-black font-mono text-[#00c0f8] tracking-wider whitespace-nowrap">
              {roomState.roomCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-neutral-400 hover:text-white transition cursor-pointer p-0.5"
              title="Copy room code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center gap-0.5 shrink-0 ${
                roomState.isPrivate ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {roomState.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
              <span>{roomState.isPrivate ? 'Priv' : 'Pub'}</span>
            </span>
          </div>

          {/* Player Badge */}
          {me && (
            <div className="hidden sm:flex items-center gap-1 truncate shrink-0">
              <span className="text-xs text-neutral-400 font-semibold">You:</span>
              <span
                style={{ backgroundColor: `${me.color}25`, color: me.color, borderColor: me.color }}
                className="text-xs font-black px-2 py-0.5 rounded-lg border truncate max-w-[100px]"
              >
                {me.name}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Action Controls (Chat, Restart, Leave) */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          {/* Quick Chat Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#00c0f8]/20 hover:bg-[#00c0f8]/30 text-[#00c0f8] border border-[#00c0f8]/30 font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
            {roomState.messages.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#00c0f8] text-neutral-900 text-[10px] font-black">
                {roomState.messages.length}
              </span>
            )}
          </button>

          {/* Host Restart button */}
          {isHost && (
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
              title="Restart game"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Restart</span>
            </button>
          )}

          {/* Leave room */}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
            title="Leave match"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Quick Emoji Reaction Bar */}
      <div className="flex items-center justify-between gap-1.5 bg-[#1a1c29]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-sm text-white">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">React:</span>
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
          {['🔥', '💥', '😎', '👏', '😱', '🤯', '👑', '🥳', '🎯', '😂'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickEmoji(emoji)}
              className="text-base hover:scale-130 active:scale-90 transition transform cursor-pointer px-1 shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Modal Dialog: Centered / Bottom Sheet Overlay with plenty of screen clearance */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#1a1c29] text-white rounded-3xl p-4 sm:p-5 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] space-y-3 animate-pop-in mb-2 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#00c0f8]/20 text-[#00c0f8]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-['Fredoka',sans-serif] tracking-wide text-white">
                    LIVE MATCH CHAT
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-medium">
                    Room {roomState.roomCode} • {roomState.players.length} Players
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 font-bold text-xs cursor-pointer flex items-center justify-center transition"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={chatScrollRef}
              className="h-52 sm:h-60 overflow-y-auto space-y-2 text-xs pr-1 bg-[#222536]/90 rounded-2xl p-3 border border-white/5 scroll-smooth"
            >
              {roomState.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs text-center p-4">
                  <MessageSquare className="w-8 h-8 mb-1.5 opacity-30 text-[#00c0f8]" />
                  <span>Chưa có tin nhắn nào.</span>
                  <span className="text-[11px] text-neutral-600">Gửi biểu cảm hoặc trò chuyện với đối thủ!</span>
                </div>
              ) : (
                roomState.messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-2 animate-fade-in bg-[#1a1c29]/50 p-2 rounded-xl border border-white/5">
                    <span
                      style={{ color: m.senderColor }}
                      className="font-bold shrink-0 text-xs font-['Fredoka',sans-serif]"
                    >
                      {m.senderName}:
                    </span>
                    <span className="text-neutral-100 break-words flex-1 text-xs leading-relaxed">
                      {m.text}
                    </span>
                    <span className="text-[10px] text-neutral-500 shrink-0 self-start mt-0.5">
                      {m.time}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* In-Chat Quick Emoji Palette */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar border-t border-white/5 pt-2">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
                React:
              </span>
              {['🔥', '💥', '😎', '👏', '😱', '🤯', '👑', '🥳', '🎯', '😂'].map((emoji) => (
                <button
                  key={`modal-${emoji}`}
                  type="button"
                  onClick={() => handleQuickEmoji(emoji)}
                  className="text-lg hover:scale-135 active:scale-90 transition transform cursor-pointer p-1 shrink-0 rounded-lg hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                maxLength={80}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#222536] border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#00c0f8] shadow-inner"
              />
              <button
                type="submit"
                disabled={!chatText.trim()}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 ${
                  chatText.trim()
                    ? 'bg-gradient-to-r from-[#00c0f8] to-[#009bc8] text-white hover:brightness-110 active:scale-95'
                    : 'bg-white/10 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
