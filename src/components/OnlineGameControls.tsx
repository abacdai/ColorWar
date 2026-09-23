import React, { useState } from 'react';
import { MessageSquare, Send, Copy, Check, LogOut, RotateCcw } from 'lucide-react';
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

  const me = roomState.players.find((p) => p.playerId === myPlayerId);
  const isHost = roomState.hostId === onlineSocket.myClientId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    soundManager.playDotAdd(1);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatText.trim()) return;
    onlineSocket.sendChat(chatText.trim());
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
    <div className="w-full max-w-xl mx-auto mt-2 flex flex-col gap-2">
      {/* Top Online Status Bar */}
      <div className="bg-white/90 backdrop-blur-xs rounded-2xl px-3.5 py-2 border border-white/60 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-xl">
            <span className="text-[11px] font-bold text-neutral-500 uppercase">Phòng:</span>
            <span className="text-xs font-black font-mono text-neutral-900">{roomState.roomCode}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="ml-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              title="Sao chép mã"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {me && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs text-neutral-600 font-semibold hidden sm:inline">Bạn là:</span>
              <span
                style={{ backgroundColor: me.lightColor, color: me.color, borderColor: me.color }}
                className="text-xs font-black px-2 py-0.5 rounded-lg border truncate"
              >
                {me.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Chat Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold text-xs transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({roomState.messages.length})</span>
          </button>

          {/* Host Restart button */}
          {isHost && (
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition cursor-pointer"
              title="Khởi động lại ván mới"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ván mới</span>
            </button>
          )}

          {/* Leave room */}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition cursor-pointer"
            title="Rời phòng"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rời</span>
          </button>
        </div>
      </div>

      {/* Quick Emoji Bar always accessible during game */}
      <div className="flex items-center justify-between gap-1 bg-white/70 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-white/50 shadow-xs">
        <span className="text-[10px] font-bold text-neutral-500 uppercase shrink-0">Phản ứng:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {['🔥', '💥', '😎', '👏', '😱', '🤯', '👑'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickEmoji(emoji)}
              className="text-base hover:scale-125 active:scale-95 transition cursor-pointer px-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Chat drawer if open */}
      {isOpen && (
        <div className="bg-white rounded-2xl p-3 border-2 border-orange-200 shadow-xl space-y-2 animate-pop-in">
          <div className="flex items-center justify-between border-b pb-1.5">
            <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">
              Tin Nhắn Trực Tuyến
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-700 font-bold text-xs"
            >
              Đóng ✕
            </button>
          </div>

          <div className="h-32 overflow-y-auto space-y-1.5 text-xs pr-1">
            {roomState.messages.map((m) => (
              <div key={m.id} className="flex items-start gap-1.5">
                <span style={{ color: m.senderColor }} className="font-bold shrink-0">
                  {m.senderName}:
                </span>
                <span className="text-neutral-800 break-words">{m.text}</span>
                <span className="text-[10px] text-neutral-400 ml-auto shrink-0">{m.time}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2 pt-1">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Nhập tin nhắn..."
              maxLength={80}
              className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
