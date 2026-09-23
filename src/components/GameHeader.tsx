import React from 'react';
import { Home, RotateCcw, Volume2, VolumeX, HelpCircle, Sparkles, AlertCircle } from 'lucide-react';
import { Player, PlayerId } from '../types/game';

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
  statusMessage?: string | null;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  activePlayer,
  players,
  activePlayerIds,
  isPlacementPhase,
  cascadeLevel,
  isMuted,
  onToggleSound,
  onRestart,
  onBackToMenu,
  onOpenRules,
  statusMessage,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto mb-3 space-y-2.5">
      {/* Top Bar: Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 hover:bg-white text-neutral-800 font-bold text-xs shadow-xs transition backdrop-blur-xs"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Menu</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-neutral-800 font-bold text-xs shadow-xs transition backdrop-blur-xs"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-green-600" />}
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/70 hover:bg-white text-neutral-800 font-bold text-xs shadow-xs transition backdrop-blur-xs"
            title="Xem Luật Chơi"
          >
            <HelpCircle className="w-4 h-4 text-orange-600" />
            <span className="hidden sm:inline">Luật Chơi</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5964] hover:bg-[#fa4350] text-white font-bold text-xs shadow-xs transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chơi Lại</span>
          </button>
        </div>
      </div>

      {/* Active Turn Banner */}
      <div
        style={{
          borderLeftColor: activePlayer.color,
        }}
        className="relative bg-[#fff9f2] rounded-2xl p-3 sm:p-3.5 shadow-md border-l-8 flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-3">
          {/* Avatar / Color indicator */}
          <div
            style={{
              backgroundColor: activePlayer.color,
              boxShadow: `0 0 10px ${activePlayer.borderGlow}`,
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm relative shrink-0"
          >
            {isPlacementPhase ? (
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-1 h-1 bg-white rounded-full" />
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-white rounded-full" />
                  <div className="w-1 h-1 bg-white rounded-full" />
                </div>
              </div>
            ) : (
              <div className="w-2.5 h-2.5 bg-white rounded-full" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                {isPlacementPhase ? 'Giai đoạn khởi đầu' : 'Đang tới lượt'}
              </span>
              {activePlayer.isAI && (
                <span className="text-[10px] bg-neutral-200 text-neutral-700 font-bold px-1.5 py-0.5 rounded-md">
                  Máy (AI)
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-neutral-800 leading-tight">
              {activePlayer.name}
            </h2>
            <p className="text-xs text-neutral-600 font-medium">
              {isPlacementPhase
                ? 'Đặt 1 vòng tròn 3 chấm vào ô trống bất kỳ'
                : 'Bấm quân của bạn (+1 chấm, 4 chấm nổ 4 hướng thẳng)'}
            </p>
          </div>
        </div>

        {/* Chain Reaction Combo Indicator */}
        {cascadeLevel > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 text-white font-black text-xs shadow-md animate-bounce">
            <Sparkles className="w-4 h-4 fill-white" />
            <span>NỔ x{cascadeLevel}</span>
          </div>
        )}
      </div>

      {/* Disallowed click toast / warning */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-red-100/90 border border-red-300 text-red-800 text-xs font-semibold animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Player Scoreboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {activePlayerIds.map((pid) => {
          const p = players[pid];
          const isCurrent = p.id === activePlayer.id;

          return (
            <div
              key={p.id}
              style={{
                backgroundColor: p.isEliminated ? '#f3f4f6' : isCurrent ? p.lightColor : '#ffffff',
                borderColor: isCurrent ? p.color : 'transparent',
              }}
              className={`
                p-2 rounded-xl border-2 flex items-center justify-between shadow-xs transition-all
                ${p.isEliminated ? 'opacity-40 grayscale' : ''}
                ${isCurrent ? 'scale-[1.02] shadow-sm' : ''}
              `}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  style={{ backgroundColor: p.color }}
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                />
                <span className="text-xs font-bold text-neutral-800 truncate">
                  {p.name}
                </span>
              </div>

              <div className="text-right shrink-0">
                {p.isEliminated ? (
                  <span className="text-[10px] font-bold text-neutral-400">Bị loại</span>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-bold text-neutral-700">
                    <span>{p.tilesCount} ô</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
