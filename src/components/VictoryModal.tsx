import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles } from 'lucide-react';
import { Player } from '../types/game';
import { soundManager } from '../audio/soundManager';

interface VictoryModalProps {
  winner: Player;
  totalTurns: number;
  maxCombo: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  totalTurns,
  maxCombo,
  onPlayAgain,
  onBackToMenu,
}) => {
  useEffect(() => {
    soundManager.playWin();

    // Trigger colorful confetti shower
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: [winner.color, '#ffffff', '#ffd166', '#06d6a0'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: [winner.color, '#ffffff', '#ffd166', '#06d6a0'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [winner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-pop-in">
      <div className="relative w-full max-w-md bg-[#fff9f2] rounded-3xl shadow-2xl border-4 border-[#fba886] p-7 text-center overflow-hidden">
        {/* Decorative Top Glow */}
        <div
          style={{ backgroundColor: winner.color }}
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full opacity-20 blur-2xl"
        />

        {/* Trophy Icon */}
        <div className="relative mx-auto mb-4 w-20 h-20 rounded-3xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-500 shadow-md animate-bounce">
          <Trophy className="w-12 h-12" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CHIẾN THẮNG TUYỆT ĐỐI!</span>
        </div>

        <h2 className="text-3xl font-extrabold text-neutral-800 mb-1">
          {winner.name}
        </h2>
        <p className="text-sm text-neutral-600 mb-6 font-medium">
          Đã thống trị và nhuộm toàn bộ bàn cờ về một màu duy nhất!
        </p>

        {/* Winner Badge */}
        <div className="flex items-center justify-center gap-3 p-3.5 bg-white rounded-2xl border border-neutral-100 shadow-sm mb-6">
          <div
            style={{ backgroundColor: winner.color }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-white font-bold"
          >
            ★
          </div>
          <div className="text-left">
            <p className="text-xs text-neutral-500 font-semibold uppercase">Đại Diện Màu</p>
            <p className="text-base font-bold text-neutral-800">{winner.name}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200 text-center">
            <span className="block text-2xl font-black text-neutral-800">{totalTurns}</span>
            <span className="text-xs text-neutral-600 font-medium">Tổng Lượt Đi</span>
          </div>
          <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200 text-center">
            <span className="block text-2xl font-black text-orange-600">x{maxCombo || 1}</span>
            <span className="text-xs text-neutral-600 font-medium">Nổ Dây Chuyền Tối Đa</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 bg-[#fba886] hover:bg-[#fa9670] active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-base"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Chơi Ván Mới Ngay</span>
          </button>
          <button
            onClick={onBackToMenu}
            className="w-full py-3 bg-neutral-200 hover:bg-neutral-300 active:scale-[0.98] text-neutral-700 font-bold rounded-2xl transition flex items-center justify-center gap-2 text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Quay Lại Menu Chính</span>
          </button>
        </div>
      </div>
    </div>
  );
};
