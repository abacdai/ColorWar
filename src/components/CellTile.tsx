import React from 'react';
import { CellData, Player } from '../types/game';

interface CellTileProps {
  cell: CellData;
  player: Player | null;
  activePlayer: Player;
  isInteractable: boolean;
  isSplitting?: boolean;
  isAbsorbing?: boolean;
  absorbingColor?: string;
  isPlacementPhase: boolean;
  onClick: () => void;
  size: number;
}

export const CellTile: React.FC<CellTileProps> = ({
  cell,
  player,
  activePlayer,
  isInteractable,
  isSplitting = false,
  isAbsorbing = false,
  absorbingColor,
  isPlacementPhase,
  onClick,
  size,
}) => {
  const isOwnedByCurrent = cell.playerId === activePlayer.id;
  const isReadyToExplode = cell.dots === 3 && isOwnedByCurrent;

  // Standard generous dot and circle sizes preserved across all board sizes
  const dotSizeClass = 'w-2.5 h-2.5 sm:w-3 sm:h-3';
  const circleSizeClass = 'w-[82%] h-[82%]';
  const tileRoundedClass = 'rounded-xl sm:rounded-2xl';

  // Tile background color:
  // If occupied, use player's light pastel tint
  // If empty, use clean crisp white with subtle warmth
  const tileBgColor = player ? player.lightColor : '#ffffff';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSplitting}
      aria-label={`Cell (${cell.row + 1}, ${cell.col + 1}) - ${
        cell.playerId ? `${player?.name || 'Player'}: ${cell.dots} dots` : 'Empty cell'
      }`}
      style={{
        backgroundColor: tileBgColor,
      }}
      className={`
        relative aspect-square w-full ${tileRoundedClass} flex items-center justify-center
        transition-colors duration-300 shadow-xs
        focus:outline-none select-none overflow-hidden
        ${isAbsorbing ? 'animate-absorb z-10' : ''}
        ${isInteractable ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.97]' : 'cursor-default'}
        ${isPlacementPhase && !cell.playerId ? 'hover:brightness-95' : ''}
        ${isInteractable && isOwnedByCurrent ? 'ring-2 ring-white ring-offset-2' : ''}
      `}
    >
      {/* Ripple ring on absorbing ("nhập vô") */}
      {isAbsorbing && absorbingColor && (
        <div
          style={{ borderColor: absorbingColor }}
          className="absolute inset-0 rounded-2xl md:rounded-3xl border-3 pointer-events-none animate-ripple"
        />
      )}

      {/* Circle Piece */}
      {cell.playerId && player && (
        <div
          style={{
            backgroundColor: player.color,
            boxShadow: `0 4px 14px ${player.borderGlow}`,
          }}
          className={`
            ${circleSizeClass} rounded-full flex items-center justify-center relative
            transition-transform duration-200
            ${isSplitting ? 'animate-split-disperse' : isAbsorbing ? 'animate-pop-in' : 'animate-pop-in'}
            ${isReadyToExplode ? 'animate-pulse' : ''}
          `}
        >
          {/* Subtle 3D glossy highlight on the circle */}
          <div className="absolute top-1.5 left-2 w-1/3 h-1/4 bg-white/25 rounded-full blur-[1px] pointer-events-none" />

          {/* Dots inside the circle */}
          {cell.dots === 1 && (
            <div className={`${dotSizeClass} bg-white rounded-full shadow-xs`} />
          )}

          {cell.dots === 2 && (
            <div className="flex items-center justify-center gap-1.5 md:gap-2">
              <div className={`${dotSizeClass} bg-white rounded-full shadow-xs`} />
              <div className={`${dotSizeClass} bg-white rounded-full shadow-xs`} />
            </div>
          )}

          {/* 3 Dots: Arranged as Triangle (1 on top, 2 at bottom) matching user screenshot */}
          {cell.dots === 3 && (
            <div className="flex flex-col items-center justify-center gap-1">
              <div className={`${dotSizeClass} bg-white rounded-full shadow-xs`} />
              <div className="flex items-center justify-center gap-2">
                <div className={`${dotSizeClass} bg-white rounded-full shadow-xs`} />
                <div className={`${dotSizeClass} bg-white rounded-full shadow-xs`} />
              </div>
            </div>
          )}

          {/* 4 Dots: Ready to Burst / In Explosion */}
          {cell.dots >= 4 && (
            <div className="grid grid-cols-2 gap-1.5 items-center justify-center">
              <div className={`${dotSizeClass} bg-white rounded-full shadow-xs animate-ping`} />
              <div className={`${dotSizeClass} bg-white rounded-full shadow-xs animate-ping`} />
              <div className={`${dotSizeClass} bg-white rounded-full shadow-xs animate-ping`} />
              <div className={`${dotSizeClass} bg-white rounded-full shadow-xs animate-ping`} />
            </div>
          )}
        </div>
      )}

      {/* Hover preview indicator during placement phase */}
      {isPlacementPhase && !cell.playerId && (
        <div
          style={{ backgroundColor: activePlayer.color }}
          className="w-4 h-4 rounded-full opacity-0 hover:opacity-40 transition-opacity"
        />
      )}
    </button>
  );
};
