import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Play,
  Send,
  Sparkles,
  Smile,
  Shield,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { OnlineRoomState, OnlineRoomInfo, ChatMessage } from '../types/game';
import { onlineSocket } from '../services/onlineSocket';
import { soundManager } from '../audio/soundManager';

interface OnlineLobbyProps {
  onBackToMenu: () => void;
  roomState: OnlineRoomState | null;
  onGameStarted: (room: OnlineRoomState) => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  onBackToMenu,
  roomState,
  onGameStarted,
}) => {
  const [tab, setTab] = useState<'create' | 'join' | 'list'>('create');
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('cw_player_name') || 'Người Chơi ' + Math.floor(Math.random() * 900 + 100);
  });
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [boardSize, setBoardSize] = useState<number>(5);
  const [maxPlayers, setMaxPlayers] = useState<number>(2);
  const [publicRooms, setPublicRooms] = useState<OnlineRoomInfo[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save nickname
  const handleNameChange = (val: string) => {
    setPlayerName(val);
    localStorage.setItem('cw_player_name', val);
  };

  useEffect(() => {
    onlineSocket.connect();

    const unsubRooms = onlineSocket.on('rooms_list', (data) => {
      setPublicRooms(data.rooms || []);
    });

    const unsubError = onlineSocket.on('error', (data) => {
      setErrorMessage(data.message || 'Có lỗi xảy ra!');
      soundManager.playInvalid();
      setTimeout(() => setErrorMessage(null), 4000);
    });

    onlineSocket.getRooms();
    const interval = setInterval(() => {
      if (!roomState) {
        onlineSocket.getRooms();
      }
    }, 5000);

    return () => {
      unsubRooms();
      unsubError();
      clearInterval(interval);
    };
  }, [roomState]);

  // Check if room started
  useEffect(() => {
    if (roomState && (roomState.status === 'placement' || roomState.status === 'playing')) {
      onGameStarted(roomState);
    }
  }, [roomState, onGameStarted]);

  const handleCreateRoom = () => {
    soundManager.playDotAdd(2);
    setErrorMessage(null);
    onlineSocket.createRoom(playerName, boardSize, maxPlayers);
  };

  const handleJoinByCode = (codeToJoin?: string) => {
    const code = codeToJoin || roomCodeInput;
    if (!code.trim()) {
      setErrorMessage('Vui lòng nhập mã phòng!');
      return;
    }
    soundManager.playDotAdd(1);
    setErrorMessage(null);
    onlineSocket.joinRoom(code.trim(), playerName);
  };

  const handleStartGame = () => {
    soundManager.playExplosion(1);
    onlineSocket.startGame();
  };

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    soundManager.playDotAdd(1);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    onlineSocket.sendChat(chatInput.trim());
    setChatInput('');
  };

  const handleQuickEmoji = (emoji: string) => {
    onlineSocket.sendChat(emoji);
    soundManager.playDotAdd(1);
  };

  const handleLeaveRoom = () => {
    onlineSocket.leaveRoom();
    soundManager.playTurnSwitch();
  };

  // If inside a room that is waiting to start
  if (roomState && roomState.status === 'waiting') {
    const isHost = roomState.hostId === onlineSocket.myClientId;
    const canStart = isHost && roomState.players.length >= 2;

    return (
      <div className="w-full max-w-xl mx-auto p-4 sm:p-5 flex flex-col items-center animate-fade-in">
        <div className="w-full bg-[#fff9f2] rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-white/90 space-y-5">
          {/* Room Header */}
          <div className="flex items-center justify-between border-b border-orange-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Phòng Chờ Trực Tuyến
              </span>
            </div>

            <button
              type="button"
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Rời Phòng</span>
            </button>
          </div>

          {/* Room Code Showcase */}
          <div className="p-4 bg-gradient-to-r from-orange-100/90 to-amber-100/80 rounded-2xl border-2 border-orange-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 block">
                Mã Phòng Của Bạn
              </span>
              <span className="text-3xl font-black text-neutral-900 tracking-wider font-mono">
                {roomState.roomCode}
              </span>
              <span className="text-xs text-neutral-600 block mt-0.5">
                Bàn {roomState.boardSize}x{roomState.boardSize} • Tối đa {roomState.maxPlayers} người chơi
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Đã Sao Chép!' : 'Sao Chép Mã'}</span>
            </button>
          </div>

          {/* Players Slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                Người Chơi Trong Phòng ({roomState.players.length}/{roomState.maxPlayers})
              </label>
              <span className="text-xs text-neutral-500 font-medium">
                {roomState.players.length < 2 ? 'Đang đợi thêm đối thủ...' : 'Đã sẵn sàng chiến đấu!'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.from({ length: roomState.maxPlayers }).map((_, idx) => {
                const player = roomState.players[idx];

                if (player) {
                  const isMe = player.id === onlineSocket.myClientId;

                  return (
                    <div
                      key={player.id}
                      style={{ backgroundColor: player.lightColor, borderColor: player.color }}
                      className="p-3 rounded-2xl border-2 flex items-center justify-between gap-2.5 shadow-xs transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          style={{ backgroundColor: player.color }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs"
                        >
                          P{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-neutral-900 block truncate">
                            {player.name} {isMe && '(Bạn)'}
                          </span>
                          <span className="text-[10px] text-neutral-600 font-semibold block">
                            {player.isHost ? '👑 Chủ phòng' : 'Thành viên'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 text-neutral-800 shadow-xs">
                        Sẵn Sàng
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border-2 border-dashed border-neutral-300 bg-white/60 flex items-center justify-center gap-2 text-neutral-400 text-xs font-bold"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Đang chờ người chơi {idx + 1}...</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Chat / Messages */}
          <div className="bg-white rounded-2xl p-3 border border-neutral-200 shadow-xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block">
              Trò Chuyện & Cảm Xúc
            </span>

            {/* Chat Box */}
            <div className="h-28 overflow-y-auto space-y-1.5 text-xs pr-1">
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

            {/* Quick Emojis */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
              {['🔥', '💥', '👋', '😎', '😱', '🤯', '👑'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleQuickEmoji(emoji)}
                  className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-sm transition cursor-pointer shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhắn tin với mọi người..."
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

          {/* Action button */}
          {isHost ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={handleStartGame}
              className={`w-full py-3.5 rounded-2xl font-black text-white text-base shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                canStart
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105 active:scale-[0.98]'
                  : 'bg-neutral-300 cursor-not-allowed text-neutral-500 shadow-none'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{canStart ? 'BẮT ĐẦU TRẬN ĐẤU' : 'CẦN ÍT NHẤT 2 NGƯỜI CHƠI'}</span>
            </button>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-center text-xs font-bold text-blue-800">
              Đang chờ chủ phòng bấm bắt đầu trận đấu...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not in a room: Show Lobby Tabs
  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-5 flex flex-col items-center animate-fade-in">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/40 backdrop-blur-xs text-neutral-800 text-xs font-bold uppercase tracking-wider mb-2 border border-white/50 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>Real-time Multiplayer Online</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
          ĐẤU TRỰC TUYẾN
        </h1>
        <p className="text-white/90 text-xs sm:text-sm font-semibold mt-1">
          Chơi cùng bạn bè qua mã phòng hoặc tham gia phòng chờ công khai
        </p>
      </div>

      <div className="w-full bg-[#fff9f2] rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-white/90 space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-100 border border-red-300 text-red-800 text-xs font-bold flex items-center justify-between animate-shake">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800 font-black ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Player Nickname Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
            Tên Hiển Thị Của Bạn
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Nhập biệt danh của bạn..."
            maxLength={16}
            className="w-full px-4 py-2.5 rounded-2xl border-2 border-neutral-200 bg-white font-bold text-sm text-neutral-800 focus:outline-none focus:border-orange-500 shadow-xs"
          />
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setTab('create');
              soundManager.playDotAdd(1);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'create'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Tạo Phòng Mới
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('join');
              soundManager.playDotAdd(1);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'join'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Nhập Mã Phòng
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('list');
              onlineSocket.getRooms();
              soundManager.playDotAdd(1);
            }}
            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'list'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Phòng Chờ ({publicRooms.length})
          </button>
        </div>

        {/* Tab 1: Create Room */}
        {tab === 'create' && (
          <div className="space-y-4 animate-fade-in">
            {/* Number of Players */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                Số Lượng Người Chơi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setMaxPlayers(count);
                      soundManager.playDotAdd(1);
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs transition border-2 cursor-pointer ${
                      maxPlayers === count
                        ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {count} Người Chơi
                  </button>
                ))}
              </div>
            </div>

            {/* Board Size */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                Kích Thước Bàn Cờ
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { size: 5, label: '5x5', desc: 'Kinh điển' },
                  { size: 6, label: '6x6', desc: 'Mở rộng' },
                  { size: 7, label: '7x7', desc: 'Đại chiến' },
                ].map((b) => (
                  <button
                    key={b.size}
                    type="button"
                    onClick={() => {
                      setBoardSize(b.size);
                      soundManager.playDotAdd(1);
                    }}
                    className={`py-2 rounded-xl font-bold text-xs transition border-2 cursor-pointer ${
                      boardSize === b.size
                        ? 'bg-[#00c0f8] text-white border-[#00a6d6] shadow-sm'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="block text-sm font-extrabold">{b.label}</span>
                    <span className="text-[10px] block opacity-80">{b.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Create */}
            <button
              type="button"
              onClick={handleCreateRoom}
              className="w-full py-4 bg-[#ff5964] hover:bg-[#fa4350] active:scale-[0.98] text-white font-black rounded-2xl shadow-xl transition flex items-center justify-center gap-2.5 text-base cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>TẠO PHÒNG ONLINE NGAY</span>
            </button>
          </div>
        )}

        {/* Tab 2: Join By Code */}
        {tab === 'join' && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                Nhập Mã Phòng (Ví dụ: CW-8912)
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="CW-XXXX"
                maxLength={10}
                className="w-full px-4 py-3 rounded-2xl border-2 border-neutral-200 bg-white font-mono font-black text-lg text-neutral-900 uppercase tracking-widest text-center focus:outline-none focus:border-orange-500 shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => handleJoinByCode()}
              className="w-full py-4 bg-[#00c0f8] hover:bg-[#00aee0] active:scale-[0.98] text-white font-black rounded-2xl shadow-xl transition flex items-center justify-center gap-2.5 text-base cursor-pointer"
            >
              <span>VÀO PHÒNG CHIẾN ĐẤU</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        )}

        {/* Tab 3: Public Rooms List */}
        {tab === 'list' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600">
                Phòng Đang Đợi Người ({publicRooms.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  onlineSocket.getRooms();
                  soundManager.playDotAdd(1);
                }}
                className="flex items-center gap-1 text-xs text-orange-600 font-bold hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm mới</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {publicRooms.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs font-medium bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                  Chưa có phòng nào đang mở. Hãy bấm "Tạo Phòng Mới" để bắt đầu!
                </div>
              ) : (
                publicRooms.map((r) => (
                  <div
                    key={r.roomCode}
                    className="p-3 bg-white rounded-2xl border-2 border-neutral-200 flex items-center justify-between gap-3 shadow-xs hover:border-orange-300 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-neutral-900 text-sm">
                          {r.roomCode}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                          {r.boardSize}x{r.boardSize}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500 font-medium block">
                        Chủ phòng: <strong className="text-neutral-700">{r.hostName}</strong> • {r.playerCount}/{r.maxPlayers} người
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={r.status !== 'waiting' || r.playerCount >= r.maxPlayers}
                      onClick={() => handleJoinByCode(r.roomCode)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        r.status === 'waiting' && r.playerCount < r.maxPlayers
                          ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xs'
                          : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      {r.playerCount >= r.maxPlayers ? 'Đã Đầy' : 'Tham Gia'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Back to main menu */}
        <div className="pt-2 border-t border-neutral-200 flex justify-center">
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay Về Menu Chính</span>
          </button>
        </div>
      </div>
    </div>
  );
};
