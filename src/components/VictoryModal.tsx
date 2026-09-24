import React, { useEffect, useMemo } from 'react';
import { Trophy, RotateCcw, Home, Sparkles, Zap } from 'lucide-react';
import { Player } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { loadPlayerProfile, getRankForWins } from '../logic/playerProfile';

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
  const profile = useMemo(() => loadPlayerProfile(), []);
  const isHumanPlayer1 = winner.id === 'p1';
  const playerRank = useMemo(() => getRankForWins(profile.wins), [profile.wins]);

  useEffect(() => {
    soundManager.playWin();
  }, [winner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md animate-fade-in select-none">
      {/* Neumorphic Soft UI Pastel Card */}
      <div className="relative w-full max-w-[390px] bg-[#f4f5f9] rounded-[36px] p-6 sm:p-7 text-center shadow-[18px_18px_45px_rgba(160,175,200,0.35),-14px_-14px_35px_rgba(255,255,255,0.95)] border-[3px] border-white/90 animate-pop-in overflow-hidden">
        
        {/* Soft Ambient Pastel Glow from Winner's Color */}
        <div
          style={{ backgroundColor: winner.color }}
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-52 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        />

        {/* Neumorphic Sunken Emblem Well */}
        <div className="relative mx-auto mb-4 w-24 h-24 rounded-full p-2.5 bg-[#edf0f7] shadow-[inset_5px_5px_10px_rgba(165,175,195,0.3),inset_-5px_-5px_10px_rgba(255,255,255,0.9)] flex items-center justify-center">
          {/* Raised Center Trophy / Avatar Bubble */}
          <div className="relative w-full h-full rounded-full bg-white shadow-[5px_5px_12px_rgba(165,175,195,0.3),-4px_-4px_10px_rgba(255,255,255,0.95)] border border-white flex items-center justify-center">
            {isHumanPlayer1 ? (
              <span className="text-4xl filter drop-shadow-xs">
                {profile.avatar || '🦊'}
              </span>
            ) : (
              <div
                style={{ backgroundColor: winner.lightColor || '#fef3c7' }}
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner"
              >
                <Trophy
                  style={{ color: winner.color }}
                  className="w-7 h-7 drop-shadow-xs"
                />
              </div>
            )}

            {/* Floating Mini Trophy Badge */}
            <div
              style={{ backgroundColor: winner.color }}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full text-white flex items-center justify-center shadow-[2px_3px_6px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.6)] border-2 border-white"
            >
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Minimalist Title Section */}
        <div className="space-y-1 mb-5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Victory Achieved</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-snug">
            {winner.name}
          </h2>

          <p className="text-xs text-slate-500 font-medium">
            Controlled the battlefield with total color dominance
          </p>

          {isHumanPlayer1 && (
            <div className="pt-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="text-slate-400">Rank:</span>
              <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${playerRank.badgeBg} ${playerRank.badgeBorder} ${playerRank.textColor}`}>
                {playerRank.name}
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid: Soft UI Sunken Neumorphic Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4.5">
          {/* Turns Card */}
          <div className="p-3.5 rounded-2xl bg-[#edf0f7] shadow-[inset_3px_3px_6px_rgba(165,175,195,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] border border-white/60 text-center">
            <span className="block text-2xl font-black text-slate-800 font-mono tabular-nums leading-none mb-1">
              {totalTurns}
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Turns
            </span>
          </div>

          {/* Max Combo Card */}
          <div className="p-3.5 rounded-2xl bg-[#edf0f7] shadow-[inset_3px_3px_6px_rgba(165,175,195,0.25),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] border border-white/60 text-center">
            <div className="flex items-center justify-center gap-1 leading-none mb-1">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-2xl font-black text-amber-600 font-mono tabular-nums leading-none">
                x{maxCombo || 1}
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Max Reaction
            </span>
          </div>
        </div>

        {/* Winner's Color Preview Strip */}
        <div className="mb-5 p-2.5 rounded-2xl bg-white/70 shadow-[2px_2px_8px_rgba(165,175,195,0.15)] border border-white flex items-center justify-between px-3.5">
          <span className="text-xs font-semibold text-slate-500">Conquering Color</span>
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: winner.color }}
              className="w-3.5 h-3.5 rounded-full shadow-xs border border-white/80"
            />
            <span className="text-xs font-bold text-slate-700">{winner.name}</span>
          </div>
        </div>

        {/* Soft UI Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Primary Play Again Button (Neumorphic Extruded Pastel Pill) */}
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#ff6879] to-[#ff5265] hover:from-[#ff7787] hover:to-[#ff5f71] text-white font-black text-sm tracking-wide shadow-[0_8px_20px_rgba(255,82,101,0.32),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.1)] active:scale-[0.98] active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span>Play Again</span>
          </button>

          {/* Secondary Menu Button (Soft UI Embossed Pastel Button) */}
          <button
            type="button"
            onClick={onBackToMenu}
            className="w-full py-3 px-5 rounded-2xl bg-[#edf0f7] hover:bg-[#e6eaf3] text-slate-600 hover:text-slate-800 font-bold text-xs tracking-wide shadow-[4px_4px_10px_rgba(165,175,195,0.25),-3px_-3px_8px_rgba(255,255,255,0.9)] border border-white/80 active:shadow-[inset_2px_2px_5px_rgba(165,175,195,0.25),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4 stroke-[2]" />
            <span>Back to Menu</span>
          </button>
        </div>

      </div>
    </div>
  );
};
