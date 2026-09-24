import React, { useEffect, useState, useRef } from 'react';
import { soundManager } from '../audio/soundManager';

export interface TurnWheelPlayerItem {
  id: string;
  name: string;
  color: string;
  lightColor?: string;
  isAI?: boolean;
}

interface TurnWheelModalProps {
  isOpen: boolean;
  players: TurnWheelPlayerItem[];
  selectedWinnerId: string;
  onComplete: () => void;
}

export const TurnWheelModal: React.FC<TurnWheelModalProps> = ({
  isOpen,
  players,
  selectedWinnerId,
  onComplete,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const completedRef = useRef<boolean>(false);
  const timeoutRef = useRef<any>(null);

  const totalPlayers = Math.max(players.length, 1);
  const winnerIndex = Math.max(
    0,
    players.findIndex((p) => p.id === selectedWinnerId)
  );
  const winnerPlayer = players[winnerIndex] || players[0];

  useEffect(() => {
    if (!isOpen || players.length === 0) {
      setActiveIndex(0);
      setIsFinished(false);
      completedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    setActiveIndex(0);
    setIsFinished(false);
    completedRef.current = false;

    // Number of full cycles before landing on the chosen first player
    const fullLaps = totalPlayers >= 6 ? 2 : totalPlayers >= 4 ? 3 : 4;
    const totalSteps = fullLaps * totalPlayers + winnerIndex;

    let currentStep = 0;

    const runStep = () => {
      if (completedRef.current) return;

      const idx = currentStep % totalPlayers;
      setActiveIndex(idx);
      soundManager.playWheelTick();

      if (currentStep >= totalSteps) {
        // Stop on winner!
        setIsFinished(true);
        soundManager.playWheelWin();

        timeoutRef.current = setTimeout(() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        }, 850);
        return;
      }

      currentStep++;

      // Gradual deceleration curve
      const remainingSteps = totalSteps - currentStep;
      let stepDelay = 65;

      if (remainingSteps < 10) {
        const factor = Math.pow((10 - remainingSteps) / 10, 2);
        stepDelay = 65 + factor * 260;
      } else if (remainingSteps < 16) {
        stepDelay = 85;
      }

      timeoutRef.current = setTimeout(runStep, stepDelay);
    };

    // Short pause on start
    timeoutRef.current = setTimeout(runStep, 150);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, selectedWinnerId, players.length, totalPlayers, winnerIndex]);

  if (!isOpen || players.length === 0) return null;

  const handleFastSkip = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onComplete();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] animate-fade-in select-none"
      onClick={handleFastSkip}
    >
      {/* Central Clover Petal Cluster */}
      <div
        className="relative w-64 h-64 flex items-center justify-center cursor-pointer pointer-events-auto"
        onClick={(e) => {
          e.stopPropagation();
          handleFastSkip();
        }}
      >
        {players.map((p, idx) => {
          const isActive = !isFinished && idx === activeIndex;
          const isWinner = isFinished && idx === winnerIndex;
          const isOther = isFinished && idx !== winnerIndex;

          // Compute angle around circle in degrees
          // For 4 players: Top-Left (-135deg), Top-Right (-45deg), Bottom-Right (+45deg), Bottom-Left (+135deg)
          const angleStep = 360 / totalPlayers;
          const rotationAngle = idx * angleStep + (totalPlayers === 4 ? -135 : -90);

          return (
            <div
              key={p.id}
              style={{
                transformOrigin: 'bottom right',
                transform: `rotate(${rotationAngle}deg) ${
                  isWinner
                    ? 'scale(2.2) translate(14px, 14px)'
                    : isActive
                    ? 'scale(1.42) translate(8px, 8px)'
                    : isOther
                    ? 'scale(0) opacity-0'
                    : 'scale(1)'
                }`,
                backgroundColor: p.color,
                transition: isWinner
                  ? 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease'
                  : 'transform 0.12s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease',
                zIndex: isWinner ? 30 : isActive ? 20 : 10,
                opacity: isOther ? 0 : 1,
              }}
              className="absolute top-1/2 left-1/2 -translate-x-full -translate-y-full w-20 h-20 sm:w-24 sm:h-24 rounded-tl-full rounded-tr-full rounded-bl-full shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
            />
          );
        })}

        {/* Center Pivot Point */}
        <div className="absolute w-2 h-2 rounded-full bg-black/20 pointer-events-none z-40" />
      </div>
    </div>
  );
};
