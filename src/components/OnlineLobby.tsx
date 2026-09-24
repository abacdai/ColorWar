import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Minus,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Play,
  Send,
  Sparkles,
  Clock,
  ArrowLeft,
  X,
  Grid,
  Settings,
  Lock,
  Globe,
} from 'lucide-react';
import { OnlineRoomState, OnlineRoomInfo } from '../types/game';
import { onlineSocket } from '../services/onlineSocket';
import { soundManager } from '../audio/soundManager';
import { getBoardSizesForPlayers } from '../logic/constants';
import { loadPlayerProfile, savePlayerProfile } from '../logic/playerProfile';
import paintBucketsBg from '../assets/images/paint_buckets_menu_bg_1790179479488.jpg';

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
    const profile = loadPlayerProfile();
    if (profile.name) return profile.name;
    try {
      return localStorage.getItem('cw_player_name') || 'Player ' + Math.floor(Math.random() * 900 + 100);
    } catch {
      return 'Player ' + Math.floor(Math.random() * 900 + 100);
    }
  });
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');

  // Mode for room creation: 2 | 3 | 4 | 'custom'
  const [createMode, setCreateMode] = useState<'2p' | '3p' | '4p' | 'custom'>('2p');
  const [maxPlayers, setMaxPlayers] = useState<number>(2);
  const [boardSize, setBoardSize] = useState<number>(5);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);

  const [publicRooms, setPublicRooms] = useState<OnlineRoomInfo[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save nickname
  const handleNameChange = (val: string) => {
    setPlayerName(val);
    try {
      localStorage.setItem('cw_player_name', val);
    } catch {
      // Ignore Safari Private Browsing quota error
    }
    const curr = loadPlayerProfile();
    savePlayerProfile({
      ...curr,
      name: val,
      hasCompletedOnboarding: true,
    });
  };

  // Update presets when picking 2p, 3p, 4p
  const handleSelectCreateMode = (mode: '2p' | '3p' | '4p' | 'custom') => {
    setCreateMode(mode);
    soundManager.playDotAdd(1);
    if (mode === '2p') {
      setMaxPlayers(2);
      setBoardSize(5);
    } else if (mode === '3p') {
      setMaxPlayers(3);
      setBoardSize(6);
    } else if (mode === '4p') {
      setMaxPlayers(4);
      setBoardSize(7);
    } else {
      // Custom mode: defaults to 4 players, 8x8 board
      setMaxPlayers(4);
      setCustomBoardSizeSafe(8);
    }
  };

  const setCustomBoardSizeSafe = (sz: number) => {
    setBoardSize(Math.min(14, Math.max(4, sz)));
  };

  const setCustomPlayersSafe = (cnt: number) => {
    setMaxPlayers(Math.min(10, Math.max(2, cnt)));
  };

  const standardSizes = useMemo(() => {
    if (createMode === '2p') return getBoardSizesForPlayers(2);
    if (createMode === '3p') return getBoardSizesForPlayers(3);
    if (createMode === '4p') return getBoardSizesForPlayers(4);
    return getBoardSizesForPlayers(2);
  }, [createMode]);

  useEffect(() => {
    onlineSocket.connect();

    const unsubRooms = onlineSocket.on('rooms_list', (data) => {
      setPublicRooms(data.rooms || []);
    });

    const unsubError = onlineSocket.on('error', (data) => {
      setErrorMessage(data.message || 'An error occurred!');
      soundManager.playInvalid();
      setTimeout(() => setErrorMessage(null), 4000);
    });

    onlineSocket.getRooms();
    const interval = setInterval(() => {
      if (!roomState) {
        onlineSocket.getRooms();
      }
    }, 4000);

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
    onlineSocket.createRoom(playerName, boardSize, maxPlayers, isPrivate);
  };

  const handleJoinByCode = (codeToJoin?: string) => {
    const code = codeToJoin || roomCodeInput;
    if (!code.trim()) {
      setErrorMessage('Please enter a room code!');
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

  return (
    <div className="fixed inset-0 z-30 w-full h-full overflow-hidden select-none flex items-center justify-center bg-[#fedecd]">
      {/* 3D Isometric Paint Buckets Scene Background with subtle blur & milky frosted glaze */}
      <img
        src={paintBucketsBg}
        alt="Color War 3D Scene"
        className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] max-w-none object-cover object-[70%_center] lg:object-center pointer-events-none select-none filter blur-[2.5px] scale-[1.03] transition-opacity duration-700"
      />
      {/* Soft milky frosted glaze layer */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] pointer-events-none z-0" />

      {/* Dark Modal Backdrop */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-md animate-fade-in overflow-y-auto">
        
        {/* ROOM WAITING SCREEN */}
        {roomState && roomState.status === 'waiting' ? (
          <div className="relative w-full max-w-[520px] bg-[#1a1c29] text-white rounded-[36px] p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10 flex flex-col gap-4 max-h-[95vh] overflow-y-auto my-auto animate-scale-in">
            
            {/* Header with Back, Title & Leave (No pulsing dot) */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Leave</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-['Fredoka',sans-serif] font-black text-lg text-white tracking-wider">
                  ONLINE ROOM
                </span>
              </div>

              <button
                type="button"
                onClick={handleLeaveRoom}
                title="Leave room"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Room Code Showcase */}
            <div className="p-4 rounded-2xl bg-[#222536] border border-white/10 flex items-center justify-between gap-3 shadow-inner">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    ROOM CODE
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border ${
                      roomState.isPrivate
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {roomState.isPrivate ? (
                      <>
                        <Lock className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-2.5 h-2.5" />
                        <span>Public</span>
                      </>
                    )}
                  </span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-[#00c0f8] tracking-widest font-mono drop-shadow-[0_2px_8px_rgba(0,192,248,0.4)]">
                  {roomState.roomCode}
                </span>
                <span className="text-xs text-neutral-400 block mt-0.5 font-medium">
                  {roomState.boardSize}x{roomState.boardSize} Board • Up to {roomState.maxPlayers} Players
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#00c0f8] to-[#009bc8] hover:brightness-110 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Players Slots (Up to 10 players scrollable grid) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#00c0f8]" />
                  <span>Players ({roomState.players.length}/{roomState.maxPlayers})</span>
                </label>
                <span className="text-[11px] text-neutral-400">
                  {roomState.players.length < 2 ? 'Waiting for opponents...' : 'Ready to battle!'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {Array.from({ length: roomState.maxPlayers }).map((_, idx) => {
                  const player = roomState.players[idx];

                  if (player) {
                    const isMe = player.id === onlineSocket.myClientId;

                    return (
                      <div
                        key={player.id}
                        style={{ borderColor: player.color }}
                        className="p-3 rounded-2xl bg-[#222536] border-2 flex items-center justify-between gap-2.5 shadow-sm transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            style={{ backgroundColor: player.color }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm"
                          >
                            P{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white block truncate">
                              {player.name} {isMe && '(You)'}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-semibold block">
                              {player.isHost ? '👑 Host' : 'Player'}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Ready
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border-2 border-dashed border-white/10 bg-[#1a1c29]/50 flex items-center justify-center gap-2 text-neutral-500 text-xs font-bold"
                    >
                      <Clock className="w-4 h-4 text-neutral-500" />
                      <span>Slot {idx + 1} waiting...</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Chat / Messages */}
            <div className="bg-[#222536] rounded-2xl p-3 border border-white/5 space-y-2 shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Live Room Chat
              </span>

              {/* Chat Box */}
              <div className="h-28 overflow-y-auto space-y-1.5 text-xs pr-1 bg-[#1a1c29]/60 rounded-xl p-2 border border-white/5">
                {roomState.messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-1.5">
                    <span style={{ color: m.senderColor }} className="font-bold shrink-0">
                      {m.senderName}:
                    </span>
                    <span className="text-neutral-200 break-words">{m.text}</span>
                    <span className="text-[10px] text-neutral-500 ml-auto shrink-0">{m.time}</span>
                  </div>
                ))}
              </div>

              {/* Quick Emojis */}
              <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-1 no-scrollbar">
                {['🔥', '💥', '👋', '😎', '😱', '🤯', '👑'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleQuickEmoji(emoji)}
                    className="px-2 py-1 rounded-lg bg-[#1a1c29] hover:bg-white/10 text-sm transition cursor-pointer shrink-0 border border-white/5"
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
                  placeholder="Say something to the room..."
                  maxLength={80}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#1a1c29] border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#00c0f8]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#00c0f8] hover:bg-[#00aee0] active:scale-95 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>

            {/* Action button */}
            {roomState.hostId === onlineSocket.myClientId ? (
              <button
                type="button"
                disabled={roomState.players.length < 2}
                onClick={handleStartGame}
                className={`w-full py-3.5 rounded-2xl font-['Fredoka',sans-serif] font-bold text-white text-base shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                  roomState.players.length >= 2
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 active:scale-[0.98] shadow-[0_10px_24px_rgba(16,185,129,0.4)]'
                    : 'bg-[#222536] border border-white/10 cursor-not-allowed text-neutral-500 shadow-none'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{roomState.players.length >= 2 ? 'START BATTLE' : 'AT LEAST 2 PLAYERS NEEDED'}</span>
              </button>
            ) : (
              <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-2xl text-center text-xs font-bold text-blue-300">
                Waiting for the host to start the game...
              </div>
            )}
          </div>
        ) : (
          /* LOBBY SCREEN (CREATE / JOIN / ROOMS) */
          <div className="relative w-full max-w-[500px] bg-[#1a1c29] text-white rounded-[36px] p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10 flex flex-col gap-4 max-h-[95vh] overflow-y-auto my-auto animate-scale-in">
            
            {/* Header: Title says just "ONLINE", no pulsing dot */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-['Fredoka',sans-serif] font-black text-lg text-white tracking-wider">
                  ONLINE
                </span>
              </div>

              <button
                type="button"
                onClick={onBackToMenu}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Toast */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-bold flex items-center justify-between animate-shake">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-white font-black ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Player Display Name Input */}
            <div className="p-3.5 rounded-2xl bg-[#222536] border border-white/5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Your Nickname
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter your nickname..."
                maxLength={16}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1a1c29] border border-white/10 font-bold text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#00c0f8] shadow-inner"
              />
            </div>

            {/* 3 Tab Navigation (Single Player Segmented Capsule) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#222536] rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setTab('create');
                  soundManager.playDotAdd(1);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tab === 'create'
                    ? 'bg-gradient-to-r from-[#00c0f8] to-[#009bc8] text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Room
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('join');
                  soundManager.playDotAdd(1);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tab === 'join'
                    ? 'bg-gradient-to-r from-[#00c0f8] to-[#009bc8] text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Join by Code
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('list');
                  onlineSocket.getRooms();
                  soundManager.playDotAdd(1);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tab === 'list'
                    ? 'bg-gradient-to-r from-[#00c0f8] to-[#009bc8] text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Rooms ({publicRooms.length})
              </button>
            </div>

            {/* TAB 1: CREATE ROOM */}
            {tab === 'create' && (
              <div className="space-y-4 animate-fade-in">
                {/* Mode Selector Cards: 2P, 3P, 4P, and CUSTOM */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5 text-[#00c0f8]" />
                    <span>Room Mode</span>
                  </label>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { mode: '2p' as const, label: '2P' },
                      { mode: '3p' as const, label: '3P' },
                      { mode: '4p' as const, label: '4P' },
                      { mode: 'custom' as const, label: 'CUSTOM' },
                    ].map((item) => {
                      const isSelected = createMode === item.mode;
                      return (
                        <button
                          key={item.mode}
                          type="button"
                          onClick={() => handleSelectCreateMode(item.mode)}
                          className={`py-3 px-2 rounded-2xl flex items-center justify-center text-center transition-all cursor-pointer border ${
                            isSelected
                              ? item.mode === 'custom'
                                ? 'bg-gradient-to-b from-[#a855f7] to-[#7e22ce] text-white border-[#c084fc] shadow-[0_6px_16px_rgba(168,85,247,0.4)] scale-[1.02]'
                                : 'bg-gradient-to-b from-[#00c0f8] to-[#009bc8] text-white border-[#38cfff] shadow-[0_6px_16px_rgba(0,192,248,0.4)] scale-[1.02]'
                              : 'bg-[#222536] text-neutral-300 border-white/5 hover:bg-[#282b3d]'
                          }`}
                        >
                          <span className="font-['Fredoka',sans-serif] font-black text-sm sm:text-base leading-none">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STANDARD MODE BOARD CHOICES */}
                {createMode !== 'custom' && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 mb-2">
                      <Grid className="w-3.5 h-3.5 text-orange-400" />
                      <span>Board Size</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {standardSizes.map((b) => {
                        const isSelected = boardSize === b.size;
                        return (
                          <button
                            key={b.size}
                            type="button"
                            onClick={() => {
                              setBoardSize(b.size);
                              soundManager.playDotAdd(1);
                            }}
                            className={`py-3.5 px-3 rounded-2xl flex items-center justify-center text-center transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-gradient-to-b from-[#ff5d6d] to-[#ff4356] text-white border-[#ff7584] shadow-[0_6px_16px_rgba(255,67,86,0.4)] scale-[1.02]'
                                : 'bg-[#222536] text-neutral-300 border-white/5 hover:bg-[#282b3d]'
                            }`}
                          >
                            <span className="text-xl sm:text-2xl font-black font-['Fredoka',sans-serif]">
                              {b.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CUSTOM MODE CONTROLS */}
                {createMode === 'custom' && (
                  <div className="space-y-4 p-3.5 rounded-2xl bg-[#222536] border border-purple-500/20 shadow-inner">
                    {/* 1. Custom Player Capacity */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#d8b4fe]" />
                          <span>Players</span>
                        </label>
                        <span className="text-xs font-black text-[#e9d5ff] bg-[#2d1b4e]/80 px-3 py-1 rounded-full border border-[#d8b4fe]/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
                          {maxPlayers} Players
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={maxPlayers <= 2}
                          onClick={() => {
                            setCustomPlayersSafe(maxPlayers - 1);
                            soundManager.playDotAdd(1);
                          }}
                          className="w-10 h-10 rounded-2xl soft-neumorphic-btn disabled:opacity-30 flex items-center justify-center text-purple-200 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <input
                          type="range"
                          min={2}
                          max={10}
                          value={maxPlayers}
                          onChange={(e) => {
                            setCustomPlayersSafe(Number(e.target.value));
                            soundManager.playDotAdd(1);
                          }}
                          className="flex-1 accent-purple-500 cursor-pointer"
                        />

                        <button
                          type="button"
                          disabled={maxPlayers >= 10}
                          onClick={() => {
                            setCustomPlayersSafe(maxPlayers + 1);
                            soundManager.playDotAdd(1);
                          }}
                          className="w-10 h-10 rounded-2xl soft-neumorphic-btn disabled:opacity-30 flex items-center justify-center text-purple-200 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 2. Custom Board Size */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                          <Grid className="w-3.5 h-3.5 text-[#fed7aa]" />
                          <span>Board Size</span>
                        </label>
                        <span className="text-xs font-black text-[#ffedd5] bg-[#432311]/80 px-3 py-1 rounded-full border border-[#fba886]/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
                          {boardSize}x{boardSize}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={boardSize <= 4}
                          onClick={() => {
                            setCustomBoardSizeSafe(boardSize - 1);
                            soundManager.playDotAdd(1);
                          }}
                          className="w-10 h-10 rounded-2xl soft-neumorphic-btn disabled:opacity-30 flex items-center justify-center text-amber-200 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <input
                          type="range"
                          min={4}
                          max={14}
                          value={boardSize}
                          onChange={(e) => {
                            setCustomBoardSizeSafe(Number(e.target.value));
                            soundManager.playDotAdd(1);
                          }}
                          className="flex-1 accent-amber-500 cursor-pointer"
                        />

                        <button
                          type="button"
                          disabled={boardSize >= 14}
                          onClick={() => {
                            setCustomBoardSizeSafe(boardSize + 1);
                            soundManager.playDotAdd(1);
                          }}
                          className="w-10 h-10 rounded-2xl soft-neumorphic-btn disabled:opacity-30 flex items-center justify-center text-amber-200 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Room Privacy Selector: Public vs Private */}
                <div className="p-3.5 rounded-2xl bg-[#222536] border border-white/5 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#00c0f8]" />
                    <span>Room Privacy</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPrivate(false);
                        soundManager.playDotAdd(1);
                      }}
                      className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer border ${
                        !isPrivate
                          ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-md'
                          : 'bg-[#1a1c29] border-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Public</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPrivate(true);
                        soundManager.playDotAdd(1);
                      }}
                      className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer border ${
                        isPrivate
                          ? 'bg-amber-600/30 border-amber-400 text-amber-300 shadow-md'
                          : 'bg-[#1a1c29] border-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>Private</span>
                    </button>
                  </div>
                </div>

                {/* Submit Create Button */}
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="w-full py-3.5 bg-gradient-to-r from-[#00c0f8] to-[#009bc8] hover:brightness-110 active:scale-[0.98] text-white font-['Fredoka',sans-serif] font-bold rounded-2xl shadow-[0_12px_28px_rgba(0,192,248,0.45)] transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer mt-2"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>CREATE {isPrivate ? 'PRIVATE' : 'PUBLIC'} ROOM</span>
                </button>
              </div>
            )}

            {/* TAB 2: JOIN BY CODE */}
            {tab === 'join' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-[#222536] border border-white/5 text-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                    Enter Room Code (e.g. CW-8912)
                  </label>
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="CW-XXXX"
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-2xl bg-[#1a1c29] border border-white/10 font-mono font-black text-2xl text-[#00c0f8] uppercase tracking-widest text-center focus:outline-none focus:border-[#00c0f8] shadow-inner"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleJoinByCode()}
                  className="w-full py-3.5 bg-gradient-to-r from-[#00c0f8] to-[#009bc8] hover:brightness-110 active:scale-[0.98] text-white font-['Fredoka',sans-serif] font-bold rounded-2xl shadow-[0_12px_28px_rgba(0,192,248,0.45)] transition-all flex items-center justify-center gap-2.5 text-base cursor-pointer"
                >
                  <span>JOIN ROOM</span>
                  <ArrowRight className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            )}

            {/* TAB 3: AVAILABLE ROOMS */}
            {tab === 'list' && (
              <div className="space-y-3 animate-fade-in">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#00c0f8] shrink-0" />
                  <span>
                    Chỉ hiển thị các phòng <strong>Công khai (Public)</strong>. Phòng <strong>Riêng tư (Private)</strong> cần nhập mã ở tab "Join by Code".
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-400">
                    Open Public Lobbies ({publicRooms.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onlineSocket.getRooms();
                      soundManager.playDotAdd(1);
                    }}
                    className="flex items-center gap-1 text-xs text-[#00c0f8] font-bold hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {publicRooms.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500 text-xs font-medium bg-[#222536] rounded-2xl border border-dashed border-white/10">
                      No public rooms waiting right now. Click "Create Room" to start one!
                    </div>
                  ) : (
                    publicRooms.map((r) => (
                      <div
                        key={r.roomCode}
                        className="p-3 bg-[#222536] rounded-2xl border border-white/10 flex items-center justify-between gap-3 shadow-xs hover:border-[#00c0f8]/40 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-white text-sm">
                              {r.roomCode}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00c0f8]/20 text-[#00c0f8] border border-[#00c0f8]/30">
                              {r.boardSize}x{r.boardSize}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 font-medium block mt-0.5">
                            Host: <strong className="text-neutral-200">{r.hostName}</strong> • {r.playerCount}/{r.maxPlayers} Players
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={r.status !== 'waiting' || r.playerCount >= r.maxPlayers}
                          onClick={() => handleJoinByCode(r.roomCode)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                            r.status === 'waiting' && r.playerCount < r.maxPlayers
                              ? 'bg-[#00c0f8] text-white hover:bg-[#00aee0] shadow-xs active:scale-95'
                              : 'bg-white/10 text-neutral-500 cursor-not-allowed'
                          }`}
                        >
                          {r.playerCount >= r.maxPlayers ? 'Full' : 'Join'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
