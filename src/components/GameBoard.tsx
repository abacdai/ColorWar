import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
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
  // Container & viewport refs
  const viewportRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Drag tracking refs
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanMoveRef = useRef<boolean>(false);

  // Cell size calculation:
  // For small boards (<= 6), standard comfortable cell size
  // For oversized boards (>= 7), keep cells at generous min 52px so circles & dots remain legible!
  const cellSize = size <= 5 ? 70 : size <= 6 ? 64 : 54;
  const cellGap = size <= 6 ? 10 : 8;
  const boardPadding = 16;
  const naturalBoardWidth = size * cellSize + (size - 1) * cellGap + boardPadding * 2;

  // Auto-fit calculation
  const calculateFitZoom = useCallback(() => {
    if (!viewportRef.current) return 1;
    const vpWidth = viewportRef.current.clientWidth;
    const vpHeight = viewportRef.current.clientHeight;
    const available = Math.min(vpWidth, vpHeight) - 20;
    if (available <= 0) return 1;
    return Math.min(1.15, +(available / naturalBoardWidth).toFixed(2));
  }, [naturalBoardWidth]);

  // When board size changes, auto-fit or initialize zoom
  useEffect(() => {
    const fit = calculateFitZoom();
    // If board is oversized (fit < 0.95), start at fit zoom so whole board is visible initially,
    // but player can instantly zoom in to 100% or more!
    if (fit < 0.95) {
      setZoom(Math.max(0.4, fit));
    } else {
      setZoom(1);
    }
    setPan({ x: 0, y: 0 });
  }, [size, calculateFitZoom]);

  // Window resize & mobile device orientation change handler
  useEffect(() => {
    let resizeTimer: any = null;
    const handleWindowResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const fit = calculateFitZoom();
        setZoom((currentZoom) => {
          if (fit < 0.95 && currentZoom <= 1.05) {
            return Math.max(0.35, fit);
          }
          return currentZoom;
        });
      }, 150);
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [calculateFitZoom]);

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.35, +(z - 0.2).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitZoom = () => {
    const fit = calculateFitZoom();
    setZoom(Math.max(0.35, fit));
    setPan({ x: 0, y: 0 });
  };

  // Pointer / Mouse drag to pan (Only activates on real dragging, never blocks clicking cells)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only main left mouse button / touch
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    isPanMoveRef.current = false;
    // Note: Do NOT setPointerCapture here so child cell clicks dispatch cleanly!
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Only calculate if left button is pressed
    if (e.buttons !== 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!isPanMoveRef.current && Math.hypot(dx, dy) > 8) {
      isPanMoveRef.current = true;
      setIsDragging(true);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture fails
      }
    }

    if (isPanMoveRef.current) {
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
    // Briefly keep isPanMoveRef true to prevent accidental clicks only after a pan
    if (isPanMoveRef.current) {
      setTimeout(() => {
        isPanMoveRef.current = false;
      }, 50);
    } else {
      isPanMoveRef.current = false;
    }
  };

  // Safe cell click (fires immediately on direct clicks/taps)
  const handleCellClickWithPanCheck = (r: number, c: number) => {
    if (isPanMoveRef.current) return;
    onCellClick(r, c);
  };

  return (
    <div
      ref={viewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-full flex-1 min-h-[300px] flex items-center justify-center overflow-hidden select-none touch-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Transformed Board Wrapper */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging
            ? 'background-color 0.4s ease-in-out'
            : 'transform 0.12s ease-out, background-color 0.4s ease-in-out',
          width: `${naturalBoardWidth}px`,
          height: `${naturalBoardWidth}px`,
          backgroundColor: activePlayer.boardBgColor || activePlayer.lightColor || '#fba886',
        }}
        className="relative shrink-0 p-3 sm:p-4 rounded-3xl shadow-xl select-none"
      >
        {/* Dynamic CSS Grid with uncompressed cell size */}
        <div
          style={{
            gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${size}, ${cellSize}px)`,
            gap: `${cellGap}px`,
            width: '100%',
            height: '100%',
          }}
          className="grid items-center justify-center"
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const cellKey = `${r}-${c}`;
              const cellPlayer = cell.playerId ? players[cell.playerId] : null;

              const isInteractable =
                !isProcessingCascade &&
                ((isPlacementPhase && cell.playerId === null) ||
                  (!isPlacementPhase && cell.playerId === activePlayer.id));

              return (
                <div
                  key={`cell-wrapper-${cellKey}`}
                  style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                >
                  <CellTile
                    cell={cell}
                    player={cellPlayer}
                    activePlayer={activePlayer}
                    isInteractable={isInteractable}
                    isSplitting={splittingCellKeys.has(cellKey)}
                    isAbsorbing={Boolean(absorbingCells[cellKey])}
                    absorbingColor={absorbingCells[cellKey]}
                    isPlacementPhase={isPlacementPhase}
                    size={size}
                    onClick={() => handleCellClickWithPanCheck(r, c)}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Animated Smooth Cross Flying Projectiles Overlay (Scales together with board) */}
        {projectiles.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-3xl">
            {projectiles
              .filter(
                (proj) =>
                  proj.toRow >= 0 &&
                  proj.toRow < size &&
                  proj.toCol >= 0 &&
                  proj.toCol < size
              )
              .map((proj) => {
                const startX = ((proj.fromCol + 0.5) / size) * 100;
                const startY = ((proj.fromRow + 0.5) / size) * 100;
                const endX = ((proj.toCol + 0.5) / size) * 100;
                const endY = ((proj.toRow + 0.5) / size) * 100;

                const p = proj.progress;
                const currentX = startX + (endX - startX) * p;
                const currentY = startY + (endY - startY) * p;

                let scale = 1.0;
                if (p < 0.25) {
                  scale = 0.65 + (p / 0.25) * 0.45;
                } else if (p > 0.75) {
                  scale = 1.1 - ((p - 0.75) / 0.25) * 0.45;
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
                    className="absolute w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-transform"
                  >
                    <div className="w-2 h-2 bg-white rounded-full shadow-xs" />
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Floating Interactive Zoom & Pan HUD Controls */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 bg-[#1a1c29]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-xl text-white pointer-events-auto">
        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom out"
          disabled={zoom <= 0.35}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 disabled:opacity-40 flex items-center justify-center text-white transition-all cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Zoom percentage & reset toggle */}
        <button
          type="button"
          onClick={zoom === 1 ? handleFitZoom : handleResetZoom}
          title="Toggle 100% / Fit to screen"
          className="px-2 py-0.5 rounded-md hover:bg-white/10 text-xs font-mono font-bold tracking-tight text-white/90 hover:text-white transition-all cursor-pointer"
        >
          {Math.round(zoom * 100)}%
        </button>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom in"
          disabled={zoom >= 2.5}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 disabled:opacity-40 flex items-center justify-center text-white transition-all cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-white/20 mx-0.5" />

        {/* Fit Button */}
        <button
          type="button"
          onClick={handleFitZoom}
          title="Fit to screen"
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center text-white transition-all cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Reset Pan & Zoom Button */}
        {(pan.x !== 0 || pan.y !== 0 || zoom !== 1) && (
          <button
            type="button"
            onClick={handleResetZoom}
            title="Reset position & zoom"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 flex items-center justify-center text-amber-300 hover:text-amber-200 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
