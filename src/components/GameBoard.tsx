import React from 'react';
import { CellData, Player, PlayerId, Projectile } from '../types/game';
import { CellTile } from './CellTile';

interface GameBoardProps {
  board: CellData[][];
  players: Record<PlayerId, Player>;
  activePlayer: Player;
  isPlacementPhase: boolean;
  isProcessingCascade: boolean;
  projectiles: Projectile[];
  splittingCellKeys: Set<string>;
  absorbingCells: Record<string, string>; // cell key -> player color
  size: number;
  onCellClick: (row: number, col: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  players,
  activePlayer,
  isPlacementPhase,
  isProcessingCascade,
  projectiles,
  splittingCellKeys,
  absorbingCells,
  size,
  onCellClick,
}) => {
  // Grid column classes based on size
  const gridColClass =
    size === 7
      ? 'grid-cols-7 gap-1.5 sm:gap-2'
      : size === 6
      ? 'grid-cols-6 gap-2 sm:gap-2.5'
      : 'grid-cols-5 gap-2 sm:gap-3';

  return (
    <div
      className="relative w-full max-w-[480px] sm:max-w-[520px] aspect-square mx-auto p-2.5 sm:p-3.5 rounded-3xl bg-[#fba886] select-none"
    >
      {/* Board Grid */}
      <div className={`grid ${gridColClass} w-full h-full`}>
        {board.map((row, r) =>
          row.map((cell, c) => {
            const cellKey = `${r}-${c}`;
            const cellPlayer = cell.playerId ? players[cell.playerId] : null;

            // An interactable cell is:
            // 1. In placement phase: an empty cell
            // 2. In playing phase: a cell owned by current active player
            const isInteractable =
              !isProcessingCascade &&
              ((isPlacementPhase && cell.playerId === null) ||
                (!isPlacementPhase && cell.playerId === activePlayer.id));

            return (
              <CellTile
                key={`cell-${cellKey}`}
                cell={cell}
                player={cellPlayer}
                activePlayer={activePlayer}
                isInteractable={isInteractable}
                isSplitting={splittingCellKeys.has(cellKey)}
                isAbsorbing={Boolean(absorbingCells[cellKey])}
                absorbingColor={absorbingCells[cellKey]}
                isPlacementPhase={isPlacementPhase}
                size={size}
                onClick={() => onCellClick(r, c)}
              />
            );
          })
        )}
      </div>

      {/* Animated Smooth Cross Flying Projectiles Overlay */}
      {projectiles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-3xl">
          {projectiles.map((proj) => {
            const startX = ((proj.fromCol + 0.5) / size) * 100;
            const startY = ((proj.fromRow + 0.5) / size) * 100;
            const endX = ((proj.toCol + 0.5) / size) * 100;
            const endY = ((proj.toRow + 0.5) / size) * 100;

            const p = proj.progress;
            const currentX = startX + (endX - startX) * p;
            const currentY = startY + (endY - startY) * p;

            // Smooth scale transition: expands on split, shrinks into target on merge
            let scale = 1.0;
            if (p < 0.25) {
              scale = 0.65 + (p / 0.25) * 0.45; // 0.65 -> 1.1
            } else if (p > 0.75) {
              scale = 1.1 - ((p - 0.75) / 0.25) * 0.45; // 1.1 -> 0.65
            }

            return (
              <div
                key={proj.id}
                style={{
                  left: `${currentX}%`,
                  top: `${currentY}%`,
                  backgroundColor: proj.color,
                  boxShadow: `0 0 14px ${proj.color}, 0 0 6px #ffffff`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                }}
                className="absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center transition-transform"
              >
                {/* Center dot in projectile matching theme */}
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full shadow-xs" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
