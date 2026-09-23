import React, { useState } from 'react';
import { Play, Volume2, VolumeX, HelpCircle, Bot, Users, Sparkles, Grid, Globe, ArrowRight } from 'lucide-react';
import { GameMode, AIDifficulty } from '../types/game';
import { BOARD_SIZES } from '../logic/constants';
import { soundManager } from '../audio/soundManager';

interface StartMenuProps {
  onStartGame: (config: {
    mode: GameMode;
    boardSize: number;
    aiDifficulty: AIDifficulty;
  }) => void;
  onOpenOnline: () => void;
  onOpenRules: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({ onStartGame, onOpenOnline, onOpenRules }) => {
  const [mode, setMode] = useState<GameMode>('1p');
  const [boardSize, setBoardSize] = useState<number>(5);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playDotAdd(1);
    }
  };

  const handleStart = () => {
    soundManager.playDotAdd(3);
    onStartGame({
      mode,
      boardSize,
      aiDifficulty,
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 flex flex-col items-center">
      {/* App Header / Logo */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/40 backdrop-blur-xs text-neutral-800 text-xs font-bold uppercase tracking-wider mb-2.5 shadow-xs border border-white/50">
          <Sparkles className="w-4 h-4 text-orange-600" />
          <span>Game Chiến Thuật Phản Ứng Dây Chuyền</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
          COLOR WARS
        </h1>
        <p className="text-white/90 text-sm sm:text-base font-semibold mt-1">
          Nhuộm màu toàn bộ bàn cờ với phản ứng nổ 4 chấm!
        </p>
      </div>

      {/* Mini Board Mockup */}
      <div className="w-40 h-40 sm:w-48 sm:h-48 bg-[#fba886] rounded-3xl p-2.5 shadow-lg border-2 border-white/40 mb-5 flex flex-col justify-between">
        <div className="grid grid-cols-5 gap-1.5 w-full h-full">
          {Array.from({ length: 25 }).map((_, idx) => {
            const row = Math.floor(idx / 5);
            const col = idx % 5;

            // Blue circles around center: (1,2), (2,1), (2,3), (3,2)
            const isBlue =
              (row === 1 && col === 2) ||
              (row === 2 && col === 1) ||
              (row === 2 && col === 3) ||
              (row === 3 && col === 2);

            // Red circle at (4,3) with 3 dots and light pink background
            const isRed = row === 4 && col === 3;

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: isRed ? '#fed5ce' : '#fff3e2',
                }}
                className="rounded-lg sm:rounded-xl aspect-square flex items-center justify-center shadow-xs transition"
              >
                {isBlue && (
                  <div className="w-4/5 h-4/5 rounded-full bg-[#00c0f8] flex items-center justify-center shadow-xs">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                )}
                {isRed && (
                  <div className="w-4/5 h-4/5 rounded-full bg-[#ff5964] flex flex-col items-center justify-center gap-0.5 shadow-xs">
                    <div className="w-1 h-1 bg-white rounded-full" />
                    <div className="flex items-center gap-0.5">
                      <div className="w-1 h-1 bg-white rounded-full" />
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="w-full bg-[#fff9f2] rounded-3xl p-5 sm:p-6 shadow-xl border-4 border-white/80 space-y-4">
        {/* Banner: Play Online (Real-time Multiplayer) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playDotAdd(2);
            onOpenOnline();
          }}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-between group cursor-pointer border border-white/30"
        >
          <div className="flex items-center gap-3 text-left min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm sm:text-base font-black tracking-wide flex items-center gap-1.5 truncate">
                CHƠI ONLINE TRỰC TUYẾN
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-neutral-950 text-[10px] font-black uppercase">
                  Mới
                </span>
              </span>
              <span className="block text-[11px] text-white/85 font-medium truncate">
                Tạo phòng, nhập mã & so tài cùng bạn bè từ xa!
              </span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform ml-2" />
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-neutral-300"></div>
          <span className="flex-shrink mx-3 text-neutral-400 text-xs font-bold uppercase tracking-wider">
            Hoặc Chơi Cục Bộ (Offline)
          </span>
          <div className="flex-grow border-t border-neutral-300"></div>
        </div>

        {/* Game Mode */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
            Chế Độ Chơi Cục Bộ
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('1p');
                soundManager.playDotAdd(1);
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition border-2 cursor-pointer ${
                mode === '1p'
                  ? 'bg-[#00c0f8] text-white border-[#00a6d6] shadow-md scale-[1.02]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Bot className="w-5 h-5" />
              <span>Đấu Với Máy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('2p');
                soundManager.playDotAdd(1);
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition border-2 cursor-pointer ${
                mode === '2p'
                  ? 'bg-[#ff5964] text-white border-[#e04550] shadow-md scale-[1.02]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>2 Người Chơi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('3p');
                soundManager.playDotAdd(1);
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition border-2 cursor-pointer ${
                mode === '3p'
                  ? 'bg-[#10b981] text-white border-[#059669] shadow-md scale-[1.02]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>3 Người Chơi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('4p');
                soundManager.playDotAdd(1);
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition border-2 cursor-pointer ${
                mode === '4p'
                  ? 'bg-[#f59e0b] text-white border-[#d97706] shadow-md scale-[1.02]'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>4 Người Chơi</span>
            </button>
          </div>
        </div>

        {/* AI Difficulty (if mode === '1p') */}
        {mode === '1p' && (
          <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 mb-1.5">
              Độ Khó Của Máy (AI)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'easy', label: 'Dễ', desc: 'Thư giãn' },
                  { id: 'medium', label: 'Trung Bình', desc: 'Cân não' },
                  { id: 'hard', label: 'Cao Thủ', desc: 'Tính nổ sâu' },
                ] as const
              ).map((diff) => (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => {
                    setAiDifficulty(diff.id);
                    soundManager.playDotAdd(1);
                  }}
                  className={`py-2 px-2 rounded-xl text-center font-bold text-xs transition cursor-pointer ${
                    aiDifficulty === diff.id
                      ? 'bg-[#00c0f8] text-white shadow-sm'
                      : 'bg-white text-neutral-700 hover:bg-blue-100/60'
                  }`}
                >
                  <span className="block">{diff.label}</span>
                  <span className="text-[10px] font-normal opacity-85 block">{diff.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Board Size */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
            Kích Thước Bàn Cờ
          </label>
          <div className="grid grid-cols-3 gap-2">
            {BOARD_SIZES.map((b) => (
              <button
                key={b.size}
                type="button"
                onClick={() => {
                  setBoardSize(b.size);
                  soundManager.playDotAdd(1);
                }}
                className={`p-2.5 rounded-2xl text-center font-bold text-xs transition border-2 cursor-pointer ${
                  boardSize === b.size
                    ? 'bg-orange-500 text-white border-orange-600 shadow-md scale-[1.02]'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Grid className="w-3.5 h-3.5" />
                  <span className="text-sm font-extrabold">{b.size}x{b.size}</span>
                </div>
                <span className="text-[10px] block opacity-85">{b.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Controls Row (Sound toggle & Rules button) */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleToggleSound}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-green-600" />}
            <span>Âm thanh: {isMuted ? 'TẮT' : 'BẬT'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-xs transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Xem Luật Chơi</span>
          </button>
        </div>

        {/* Start Offline Match Button */}
        <button
          type="button"
          onClick={handleStart}
          className="w-full py-4 bg-[#ff5964] hover:bg-[#fa4350] active:scale-[0.98] text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-lg tracking-wide cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white" />
          <span>BẮT ĐẦU CHƠI CỤC BỘ</span>
        </button>
      </div>
    </div>
  );
};
