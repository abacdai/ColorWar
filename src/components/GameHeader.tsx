import React from 'react';
import { Home, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Player, PlayerId } from '../types/game';
import { PlayerProfile, getRankForWins } from '../logic/playerProfile';

interface GameHeaderProps {
  activePlayer: Player;
  players: Record<PlayerId, Player>;
  activePlayerIds: PlayerId[];
  isPlacementPhase: boolean;
  cascadeLevel: number;
  isMuted: boolean;
  onToggleSound: () => void;
  onRestart: () => void;
  onBackToMenu: () => void;
  onOpenRules: () => void;
  profile: PlayerProfile;
  onOpenProfile: () => void;
  statusMessage?: string | null;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  activePlayer,
  players,
  activePlayerIds,
  isMuted,
  onToggleSound,
  onRestart,
  onBackToMenu,
  profile,
  onOpenProfile,
}) => {
  const currentRank = getRankForWins(profile.wins);

  return (
    <div className="w-full max-w-2xl mx-auto mb-1.5 space-y-2 shrink-0">
      {/* Top Bar: Action Buttons Only */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white text-neutral-800 font-bold text-xs shadow-xs transition backdrop-blur-xs cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Menu</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSound}
            className="p-1.5 sm:p-2 rounded-xl bg-white/70 hover:bg-white text-neutral-800 font-bold text-xs shadow-xs transition backdrop-blur-xs cursor-pointer"
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-green-600" />}
          </button>

          {/* Profile & Rank Avatar Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-white/80 hover:bg-white text-neutral-800 font-bold text-xs shadow-xs transition backdrop-blur-xs cursor-pointer"
            title={`Player Profile: ${profile.name || 'Commander'} (${currentRank.name})`}
          >
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400/25 to-purple-500/25 flex items-center justify-center text-sm shadow-xs border border-white/50">
              {profile.avatar || '🦊'}
            </span>
            <span className="hidden sm:inline text-xs font-black text-neutral-800 max-w-[80px] truncate">
              {profile.name || 'Profile'}
            </span>
            <span className={`hidden md:inline text-[10px] font-black px-1.5 py-0.2 rounded-full border ${currentRank.badgeBg} ${currentRank.badgeBorder} ${currentRank.textColor}`}>
              {currentRank.name}
            </span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#ff5964] hover:bg-[#fa4350] text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </div>

      {/* Pure number score boxes on dark pill matching user's image */}
      <div className="flex items-center justify-center gap-2.5 flex-wrap px-1">
        {activePlayerIds.map((pid) => {
          const p = players[pid];
          if (!p) return null;
          const isCurrent = p.id === activePlayer.id;

          return (
            <div
              key={p.id}
              style={{
                borderColor: isCurrent ? p.color : 'transparent',
                boxShadow: isCurrent ? `0 0 14px ${p.borderGlow}` : '0 2px 6px rgba(0,0,0,0.15)',
              }}
              className={`
                min-w-[54px] sm:min-w-[62px] h-9 sm:h-10 px-3 rounded-2xl bg-[#1f242e] flex items-center justify-center border-2 transition-all select-none
                ${p.isEliminated ? 'opacity-30 grayscale' : ''}
                ${isCurrent ? 'scale-105' : ''}
              `}
            >
              <span
                style={{ color: p.color }}
                className="text-xl sm:text-2xl font-black tracking-tight leading-none"
              >
                {p.tilesCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
