import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
  Bot,
  Users,
  Play,
  Grid,
  Settings,
  Plus,
  Minus,
  ArrowLeft,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { GameMode, AIDifficulty, PlayerId, CustomPlayerConfig } from '../types/game.ts';
import {
  DEFAULT_PLAYERS_CONFIG,
  ALL_PLAYER_IDS,
  getBoardSizesForPlayers,
} from '../logic/constants.ts';
import { soundManager } from '../audio/soundManager.ts';
import paintBucketsBg from '../assets/images/paint_buckets_menu_bg_1790179479488.jpg';
import { PlayerProfile, getRankForWins } from '../logic/playerProfile';

interface StartMenuProps {
  onStartGame: (config: {
    mode: GameMode;
    boardSize: number;
    aiDifficulty: AIDifficulty;
    playerCount?: number;
    customPlayers?: CustomPlayerConfig[];
  }) => void;
  onOpenOnline: () => void;
  onOpenRules: () => void;
  profile: PlayerProfile;
  onOpenProfile: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  onStartGame,
  onOpenOnline,
  onOpenRules,
  profile,
  onOpenProfile,
}) => {
  // Modal visibility
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Modal navigation step: 'cards' (the clean 2x2 cards view) or 'adjust' (opened after picking a card)
  const [configStep, setConfigStep] = useState<'cards' | 'adjust'>('cards');

  // Selected card option: '1p' | '2p' | '3p' | '4p' | 'custom'
  const [selectedOption, setSelectedOption] = useState<GameMode>('1p');

  // Selected board size for standard modes
  const [standardBoardSize, setStandardBoardSize] = useState<number>(5);

  // AI difficulty (for 1p or AI players)
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');

  // Play vs AI or Pass & Play for 2p, 3p, 4p
  const [playWithAI, setPlayWithAI] = useState<boolean>(false);

  // Custom mode state (Up to 10 players, completely unconstrained board size 4-12)
  const [customPlayerCount, setCustomPlayerCount] = useState<number>(4);
  const [customBoardSize, setCustomBoardSize] = useState<number>(8);
  const [customPlayers, setCustomPlayers] = useState<CustomPlayerConfig[]>(() =>
    ALL_PLAYER_IDS.map((pid, idx) => ({
      id: pid,
      name: `Player ${idx + 1}`,
      isAI: idx > 0, // p1 is Human, others default to AI
      aiDifficulty: 'medium',
    }))
  );

  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playDotAdd(1);
    }
  };

  // Compute the 3 board size choices for standard mode based on player count
  // 1P (vs AI) = 2 players -> min 5x5, mid 6x6, max 7x7
  // 2P = 2 players -> min 5x5, mid 6x6, max 7x7
  // 3P = 3 players -> min 6x6, mid 7x7, max 8x8
  // 4P = 4 players -> min 7x7, mid 8x8, max 9x9
  const currentStandardPlayerCount = useMemo(() => {
    if (selectedOption === '1p') return 2;
    if (selectedOption === '2p') return 2;
    if (selectedOption === '3p') return 3;
    if (selectedOption === '4p') return 4;
    return 2;
  }, [selectedOption]);

  const availableBoardSizes = useMemo(() => {
    return getBoardSizesForPlayers(currentStandardPlayerCount);
  }, [currentStandardPlayerCount]);

  // When user clicks a card: does NOT expand downward, but opens the dedicated adjust screen
  const handleCardClick = (opt: GameMode) => {
    soundManager.playDotAdd(1);
    setSelectedOption(opt);

    if (opt !== 'custom') {
      const count = opt === '1p' || opt === '2p' ? 2 : opt === '3p' ? 3 : 4;
      const sizes = getBoardSizesForPlayers(count);
      setStandardBoardSize(sizes[0].size); // Default to MIN
    }

    // Open adjustment view directly
    setConfigStep('adjust');
  };

  // Toggle Human / AI for a custom player
  const handleToggleCustomPlayerAI = (pid: PlayerId) => {
    soundManager.playDotAdd(1);
    setCustomPlayers((prev) =>
      prev.map((p) => (p.id === pid ? { ...p, isAI: !p.isAI } : p))
    );
  };

  // Start game handler
  const handleStart = () => {
    soundManager.playDotAdd(3);
    setIsConfigModalOpen(false);

    if (selectedOption === 'custom') {
      const activeCustom = customPlayers.slice(0, customPlayerCount);
      onStartGame({
        mode: 'custom',
        boardSize: customBoardSize,
        aiDifficulty,
        playerCount: customPlayerCount,
        customPlayers: activeCustom,
      });
    } else {
      // 1p, 2p, 3p, 4p
      const count = selectedOption === '1p' ? 2 : selectedOption === '2p' ? 2 : selectedOption === '3p' ? 3 : 4;
      
      let pConfigs: CustomPlayerConfig[] | undefined;
      if (selectedOption === '1p') {
        pConfigs = [
          { id: 'p1', isAI: false },
          { id: 'p2', isAI: true, aiDifficulty },
        ];
      } else if (playWithAI) {
        // Player 1 is human, others are AI
        pConfigs = ALL_PLAYER_IDS.slice(0, count).map((pid, idx) => ({
          id: pid,
          isAI: idx > 0,
          aiDifficulty,
        }));
      }

      onStartGame({
        mode: selectedOption,
        boardSize: standardBoardSize,
        aiDifficulty,
        playerCount: count,
        customPlayers: pConfigs,
      });
    }
  };

  // Mode badge details helper
  const getModeInfo = (mode: GameMode) => {
    switch (mode) {
      case '1p':
        return {
          title: '1 PLAYER',
          subtitle: 'Solo vs AI Bot',
          color: '#ff4759',
          bgPill: 'bg-[#ff4759]',
        };
      case '2p':
        return {
          title: '2 PLAYERS',
          subtitle: '2-Player Duel',
          color: '#00c0f8',
          bgPill: 'bg-[#00c0f8]',
        };
      case '3p':
        return {
          title: '3 PLAYERS',
          subtitle: '3-Way Battle',
          color: '#10b981',
          bgPill: 'bg-[#10b981]',
        };
      case '4p':
        return {
          title: '4 PLAYERS',
          subtitle: '4-Player Mayhem',
          color: '#f59e0b',
          bgPill: 'bg-[#f59e0b]',
        };
      case 'custom':
        return {
          title: 'CUSTOM GAME',
          subtitle: 'Up to 10 players & free board size',
          color: '#a855f7',
          bgPill: 'bg-[#a855f7]',
        };
      default:
        return {
          title: 'SINGLE PLAYER',
          subtitle: 'Game Setup',
          color: '#ff4759',
          bgPill: 'bg-[#ff4759]',
        };
    }
  };

  const currentModeInfo = getModeInfo(selectedOption);

  return (
    <div className="fixed inset-0 z-30 w-full h-full overflow-hidden select-none flex items-center bg-[#fedecd]">
      {/* 3D Isometric Paint Buckets Scene Background with subtle blur & milky frosted glaze */}
      <img
        src={paintBucketsBg}
        alt="Color War 3D Scene"
        className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] max-w-none object-cover object-[70%_center] lg:object-center pointer-events-none select-none filter blur-[2.5px] scale-[1.03] transition-opacity duration-700"
      />
      {/* Soft milky frosted glaze layer */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] pointer-events-none z-0" />

      {/* Modern Minimalist Glass Utility Buttons (Top-Right) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-7 z-20 flex items-center gap-2.5 sm:gap-3">
        <PWAInstallButton />

        <button
          type="button"
          onClick={handleToggleSound}
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/75 hover:bg-white active:scale-90 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,0.9)] border border-white/80 flex items-center justify-center text-neutral-700 transition-all duration-200 cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-emerald-600" />}
        </button>

        {/* Profile & Rank Avatar Button */}
        {(() => {
          const currentRank = getRankForWins(profile.wins);
          return (
            <button
              type="button"
              onClick={onOpenProfile}
              title={`Profile: ${profile.name || 'Commander'} (${currentRank.name})`}
              className="h-11 sm:h-12 px-2.5 sm:px-3 rounded-full bg-white/80 hover:bg-white active:scale-95 backdrop-blur-md shadow-[0_8px_20px_rgba(0,0,0,0.08),inset_0_2px_4px_rgba(255,255,255,0.9)] border border-white/90 flex items-center gap-2 text-neutral-800 transition-all duration-200 cursor-pointer group"
            >
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400/25 to-purple-500/25 flex items-center justify-center text-lg shadow-inner border border-white/60">
                {profile.avatar || '🦊'}
              </span>
              <div className="flex flex-col items-start pr-1">
                <span className="text-xs font-black tracking-tight text-neutral-800 max-w-[80px] sm:max-w-[100px] truncate leading-tight">
                  {profile.name || 'Commander'}
                </span>
                <span className="text-[10px] font-black text-amber-600 leading-tight">
                  {currentRank.name}
                </span>
              </div>
            </button>
          );
        })()}
      </div>

      {/* Main Menu Left Section (Soft UI + Modern Minimalism) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10 md:px-16 lg:px-24 py-8 flex flex-col justify-center items-center lg:items-start min-h-[100dvh] h-full">
        <div className="w-full max-w-[440px] sm:max-w-[480px] flex flex-col items-center lg:items-start gap-8 sm:gap-10">
          
          {/* Neumorphic Marshmallow Cloud Logo Badge */}
          <div className="relative inline-block filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:scale-[1.02]">
            {/* Top-left Pastel Coral Red Droplets with glossy highlight */}
            <div className="absolute -top-5 -left-2 pointer-events-none z-20">
              <div className="relative w-4 h-7 bg-gradient-to-br from-[#ff6876] to-[#ff4759] rounded-full rotate-[-42deg] shadow-xs">
                <div className="absolute top-1 left-1 w-1.5 h-2 bg-white/80 rounded-full" />
              </div>
              <div className="relative w-3 h-4.5 bg-gradient-to-br from-[#ff6876] to-[#ff4759] rounded-full rotate-[-15deg] ml-6 -mt-4 shadow-xs">
                <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/80 rounded-full" />
              </div>
            </div>

            {/* Top-right Pastel Yellow & Cyan Droplets */}
            <div className="absolute -top-5 right-14 pointer-events-none z-20">
              <div className="relative w-3.5 h-6 bg-gradient-to-br from-[#fed558] to-[#f59e0b] rounded-full rotate-[25deg] shadow-xs">
                <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/85 rounded-full" />
              </div>
            </div>
            <div className="absolute -top-3.5 right-6 pointer-events-none z-20">
              <div className="relative w-3 h-5 bg-gradient-to-br from-[#38cfff] to-[#00b2e3] rounded-full rotate-[45deg] shadow-xs">
                <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/85 rounded-full" />
              </div>
            </div>

            {/* Bottom-right Cyan Droplet */}
            <div className="absolute -bottom-2.5 right-2 pointer-events-none z-20">
              <div className="relative w-3.5 h-5 bg-gradient-to-br from-[#38cfff] to-[#00b2e3] rounded-full rotate-[35deg] shadow-xs">
                <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/85 rounded-full" />
              </div>
            </div>

            {/* Puffy Marshmallow Clay Badge (Neumorphic Dual Shadow) */}
            <div className="relative bg-white/95 px-8 py-3.5 sm:px-10 sm:py-4.5 rounded-[46px] border-[6px] border-white shadow-[0_16px_36px_rgba(0,0,0,0.1),inset_0_4px_10px_rgba(255,255,255,1),inset_0_-4px_8px_rgba(225,215,210,0.4)] flex items-center justify-center gap-2.5 select-none">
              <span
                className="text-5xl sm:text-6xl md:text-7xl font-black font-['Fredoka',sans-serif] tracking-tight leading-none text-[#ff4e5b]"
                style={{
                  textShadow: '0 4px 0 #cc2233, 0 8px 18px rgba(204, 34, 51, 0.4)',
                }}
              >
                Color
              </span>
              <span
                className="text-5xl sm:text-6xl md:text-7xl font-black font-['Fredoka',sans-serif] tracking-tight leading-none text-[#00c0f8]"
                style={{
                  textShadow: '0 4px 0 #008eb7, 0 8px 18px rgba(0, 192, 248, 0.4)',
                }}
              >
                War
              </span>
            </div>
          </div>

          {/* Neumorphic Capsule Buttons */}
          <div className="w-full flex flex-col gap-6 sm:gap-7 items-center lg:items-start">
            
            {/* 1. SINGLE PLAYER BUTTON */}
            <button
              type="button"
              onClick={() => {
                soundManager.playDotAdd(1);
                setConfigStep('cards');
                setIsConfigModalOpen(true);
              }}
              className="group relative w-full transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-2 focus:outline-none cursor-pointer"
            >
              {/* Three Red Accent Splash Marks with Specular Glints */}
              <div className="absolute -top-4 left-6 flex items-end gap-1.5 pointer-events-none z-20">
                <div className="relative w-2.5 h-5 bg-gradient-to-b from-[#ff6b7a] to-[#ff4356] rounded-full rotate-[-40deg] shadow-xs">
                  <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/70 rounded-full" />
                </div>
                <div className="relative w-3 h-7 bg-gradient-to-b from-[#ff6b7a] to-[#ff4356] rounded-full rotate-[-15deg] -translate-y-1.5 shadow-xs">
                  <div className="absolute top-0.5 left-0.5 w-1 h-2 bg-white/70 rounded-full" />
                </div>
                <div className="relative w-2.5 h-4.5 bg-gradient-to-b from-[#ff6b7a] to-[#ff4356] rounded-full rotate-[20deg] shadow-xs">
                  <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/70 rounded-full" />
                </div>
              </div>

              {/* 3D Soft UI Bottom Cushion Layer (Pastel Coral Red) */}
              <div className="absolute inset-0 rounded-[40px] bg-gradient-to-b from-[#ff6273] to-[#e6364a] shadow-[0_16px_32px_rgba(230,54,74,0.4)] translate-y-2.5 group-active:translate-y-1 transition-all" />

              {/* Capsule Body (Deep Soft Navy with Inset Specular Bevel) */}
              <div className="relative rounded-[40px] bg-[#22244a] hover:bg-[#282b56] h-[72px] sm:h-[84px] px-6 sm:px-8 flex items-center justify-between border-t border-white/25 shadow-[inset_0_3px_6px_rgba(255,255,255,0.22),inset_0_-3px_6px_rgba(0,0,0,0.2)] transition-all">
                <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_3px_6px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)]">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6 sm:w-7 sm:h-7 fill-[#22244a]"
                    >
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>

                  <span className="text-white/35 text-2xl font-light select-none">|</span>

                  <span className="text-white font-['Fredoka',sans-serif] font-bold text-2xl sm:text-3xl tracking-wider uppercase truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                    SINGLE PLAYER
                  </span>
                </div>

                <div className="text-white group-hover:translate-x-1.5 transition-transform shrink-0 ml-2">
                  <ChevronRight className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3.5]" />
                </div>
              </div>
            </button>

            {/* 2. ONLINE BUTTON */}
            <button
              type="button"
              onClick={() => {
                soundManager.playDotAdd(2);
                onOpenOnline();
              }}
              className="group relative w-full transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-2 focus:outline-none cursor-pointer"
            >
              {/* Three Cyan Accent Splash Marks with Specular Glints */}
              <div className="absolute -top-4 left-6 flex items-end gap-1.5 pointer-events-none z-20">
                <div className="relative w-2.5 h-5 bg-gradient-to-b from-[#38cfff] to-[#00b2e3] rounded-full rotate-[-40deg] shadow-xs">
                  <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/70 rounded-full" />
                </div>
                <div className="relative w-3 h-7 bg-gradient-to-b from-[#38cfff] to-[#00b2e3] rounded-full rotate-[-15deg] -translate-y-1.5 shadow-xs">
                  <div className="absolute top-0.5 left-0.5 w-1 h-2 bg-white/70 rounded-full" />
                </div>
                <div className="relative w-2.5 h-4.5 bg-gradient-to-b from-[#38cfff] to-[#00b2e3] rounded-full rotate-[20deg] shadow-xs">
                  <div className="absolute top-0.5 left-0.5 w-1 h-1.5 bg-white/70 rounded-full" />
                </div>
              </div>

              {/* 3D Soft UI Bottom Cushion Layer (Cyan Sky Blue) */}
              <div className="absolute inset-0 rounded-[40px] bg-gradient-to-b from-[#00c0f8] to-[#009bc8] shadow-[0_16px_32px_rgba(0,192,248,0.4)] translate-y-2.5 group-active:translate-y-1 transition-all" />

              {/* Capsule Body */}
              <div className="relative rounded-[40px] bg-[#22244a] hover:bg-[#282b56] h-[72px] sm:h-[84px] px-6 sm:px-8 flex items-center justify-between border-t border-white/25 shadow-[inset_0_3px_6px_rgba(255,255,255,0.22),inset_0_-3px_6px_rgba(0,0,0,0.2)] transition-all">
                <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_3px_6px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)]">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6 sm:w-7 sm:h-7 fill-[#22244a]"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                  </div>

                  <span className="text-white/35 text-2xl font-light select-none">|</span>

                  <span className="text-white font-['Fredoka',sans-serif] font-bold text-2xl sm:text-3xl tracking-wider uppercase truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                    ONLINE
                  </span>
                </div>

                <div className="text-white group-hover:translate-x-1.5 transition-transform shrink-0 ml-2">
                  <ChevronRight className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3.5]" />
                </div>
              </div>
            </button>

          </div>
        </div>
      </div>

      {/* SINGLE PLAYER CONFIG MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          
          {/* STEP 1: CARDS VIEW (Clean 2x2 cards + Custom bar, matching the user's uploaded image exactly) */}
          {configStep === 'cards' && (
            <div className="relative w-full max-w-[420px] bg-[#1a1c29] text-white rounded-[36px] p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10 flex flex-col gap-4 max-h-[95vh] overflow-y-auto my-auto animate-scale-in">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="font-['Fredoka',sans-serif] text-xl sm:text-2xl font-black text-white tracking-wide">
                    SELECT PLAYERS
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 2X2 GRID OF 4 DARK CARDS */}
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4 w-full">
                
                {/* Card 1: 1 PLAYER */}
                <button
                  type="button"
                  onClick={() => handleCardClick('1p')}
                  className="group relative rounded-[26px] sm:rounded-[30px] p-4 sm:p-5 flex flex-col items-center justify-between min-h-[145px] sm:min-h-[165px] bg-[#222536] hover:bg-[#272b3e] active:scale-95 transition-all duration-200 cursor-pointer border border-transparent hover:border-[#ff4759]/50 hover:shadow-[0_0_24px_rgba(255,71,89,0.35)]"
                >
                  <span className="font-['Fredoka',sans-serif] font-black text-6xl sm:text-7xl text-[#ff4759] tracking-tight leading-none drop-shadow-sm mt-1 group-hover:scale-105 transition-transform">
                    1
                  </span>
                  <div className="w-full mt-2.5">
                    <span className="block w-full py-1.5 px-2 rounded-full bg-[#ff4759] text-white font-bold text-xs sm:text-sm tracking-wider uppercase text-center shadow-md">
                      1 PLAYER
                    </span>
                  </div>
                </button>

                {/* Card 2: 2 PLAYERS */}
                <button
                  type="button"
                  onClick={() => handleCardClick('2p')}
                  className="group relative rounded-[26px] sm:rounded-[30px] p-4 sm:p-5 flex flex-col items-center justify-between min-h-[145px] sm:min-h-[165px] bg-[#222536] hover:bg-[#272b3e] active:scale-95 transition-all duration-200 cursor-pointer border border-transparent hover:border-[#00c0f8]/50 hover:shadow-[0_0_24px_rgba(0,192,248,0.35)]"
                >
                  <span className="font-['Fredoka',sans-serif] font-black text-6xl sm:text-7xl text-[#00c0f8] tracking-tight leading-none drop-shadow-sm mt-1 group-hover:scale-105 transition-transform">
                    2
                  </span>
                  <div className="w-full mt-2.5">
                    <span className="block w-full py-1.5 px-2 rounded-full bg-[#00c0f8] text-white font-bold text-xs sm:text-sm tracking-wider uppercase text-center shadow-md">
                      2 PLAYERS
                    </span>
                  </div>
                </button>

                {/* Card 3: 3 PLAYERS */}
                <button
                  type="button"
                  onClick={() => handleCardClick('3p')}
                  className="group relative rounded-[26px] sm:rounded-[30px] p-4 sm:p-5 flex flex-col items-center justify-between min-h-[145px] sm:min-h-[165px] bg-[#222536] hover:bg-[#272b3e] active:scale-95 transition-all duration-200 cursor-pointer border border-transparent hover:border-[#10b981]/50 hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                >
                  <span className="font-['Fredoka',sans-serif] font-black text-6xl sm:text-7xl text-[#10b981] tracking-tight leading-none drop-shadow-sm mt-1 group-hover:scale-105 transition-transform">
                    3
                  </span>
                  <div className="w-full mt-2.5">
                    <span className="block w-full py-1.5 px-2 rounded-full bg-[#10b981] text-white font-bold text-xs sm:text-sm tracking-wider uppercase text-center shadow-md">
                      3 PLAYERS
                    </span>
                  </div>
                </button>

                {/* Card 4: 4 PLAYERS */}
                <button
                  type="button"
                  onClick={() => handleCardClick('4p')}
                  className="group relative rounded-[26px] sm:rounded-[30px] p-4 sm:p-5 flex flex-col items-center justify-between min-h-[145px] sm:min-h-[165px] bg-[#222536] hover:bg-[#272b3e] active:scale-95 transition-all duration-200 cursor-pointer border border-transparent hover:border-[#f59e0b]/50 hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]"
                >
                  <span className="font-['Fredoka',sans-serif] font-black text-6xl sm:text-7xl text-[#f59e0b] tracking-tight leading-none drop-shadow-sm mt-1 group-hover:scale-105 transition-transform">
                    4
                  </span>
                  <div className="w-full mt-2.5">
                    <span className="block w-full py-1.5 px-2 rounded-full bg-[#f59e0b] text-white font-bold text-xs sm:text-sm tracking-wider uppercase text-center shadow-md">
                      4 PLAYERS
                    </span>
                  </div>
                </button>
              </div>

              {/* CUSTOM WIDE CAPSULE BAR */}
              <button
                type="button"
                onClick={() => handleCardClick('custom')}
                className="w-full rounded-[24px] sm:rounded-[28px] p-3 sm:p-4 bg-[#222536] hover:bg-[#282b3d] active:scale-95 flex items-center justify-between transition-all duration-200 cursor-pointer border border-transparent hover:border-[#a855f7]/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.35)]"
              >
                <div className="flex items-center gap-3 ml-2">
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-[#c084fc]" />
                  <span className="font-['Fredoka',sans-serif] font-black text-lg sm:text-xl text-white tracking-widest uppercase">
                    CUSTOM
                  </span>
                </div>
                <div className="px-3.5 py-1.5 rounded-full bg-[#49226d] text-white font-bold text-xs sm:text-sm shadow-inner flex items-center gap-1.5">
                  <span>2-10 PLAYERS</span>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: DEDICATED ADJUSTMENT VIEW (Opened upon selecting a card) */}
          {configStep === 'adjust' && (
            <div className="relative w-full max-w-[480px] bg-[#1a1c29] text-white rounded-[36px] p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10 flex flex-col gap-4 max-h-[95vh] overflow-y-auto my-auto animate-scale-in">
              
              {/* Header with Back Button, Selected Mode Badge, and Close Button */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playDotAdd(1);
                    setConfigStep('cards');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {/* Current Mode Badge */}
                <div className="flex items-center gap-2">
                  <span className="font-['Fredoka',sans-serif] font-black text-lg text-white tracking-wider">
                    {currentModeInfo.title}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* DEDICATED ADJUSTMENT CONTENT */}

              {/* STANDARD MODES (1P, 2P, 3P, 4P) */}
              {selectedOption !== 'custom' && (
                <div className="flex flex-col gap-4">
                  
                  {/* Board Size Selection */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5 mb-2">
                      <Grid className="w-3.5 h-3.5 text-orange-400" />
                      <span>Board Size</span>
                    </label>

                    <div className="grid grid-cols-3 gap-2.5">
                      {availableBoardSizes.map((opt) => {
                        const isSelected = standardBoardSize === opt.size;
                        return (
                          <button
                            key={opt.size}
                            type="button"
                            onClick={() => {
                              setStandardBoardSize(opt.size);
                              soundManager.playDotAdd(1);
                            }}
                            className={`py-3.5 px-3 rounded-2xl flex items-center justify-center text-center transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-gradient-to-b from-[#ff5d6d] to-[#ff4356] text-white border-[#ff7584] shadow-[0_6px_16px_rgba(255,67,86,0.4)] scale-[1.02]'
                                : 'bg-[#222536] text-neutral-300 border-white/5 hover:bg-[#282b3d]'
                            }`}
                          >
                            <span className="text-xl sm:text-2xl font-black font-['Fredoka',sans-serif]">
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Difficulty for 1 Player */}
                  {selectedOption === '1p' && (
                    <div className="p-3.5 rounded-2xl bg-[#222536] border border-white/5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                        Bot Difficulty
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { id: 'easy', label: 'Easy' },
                            { id: 'medium', label: 'Medium' },
                            { id: 'hard', label: 'Hard' },
                          ] as const
                        ).map((diff) => (
                          <button
                            key={diff.id}
                            type="button"
                            onClick={() => {
                              setAiDifficulty(diff.id);
                              soundManager.playDotAdd(1);
                            }}
                            className={`py-2.5 px-2 rounded-xl text-center font-bold text-xs transition-all cursor-pointer border ${
                              aiDifficulty === diff.id
                                ? 'bg-[#00c0f8] text-white border-[#38cfff] shadow-[0_4px_12px_rgba(0,192,248,0.3)]'
                                : 'bg-[#1a1c29] text-neutral-400 border-white/5 hover:text-white'
                            }`}
                          >
                            <span>{diff.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opponent Mode for 2P, 3P, 4P */}
                  {selectedOption !== '1p' && (
                    <div className="p-3.5 rounded-2xl bg-[#222536] border border-white/5 flex items-center justify-between">
                      <span className="text-xs text-white font-bold">
                        Opponent
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setPlayWithAI(!playWithAI);
                          soundManager.playDotAdd(1);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          playWithAI
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
                            : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {playWithAI ? <Bot className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        <span>{playWithAI ? 'Vs AI' : 'Pass & Play'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOM MODE */}
              {selectedOption === 'custom' && (
                <div className="flex flex-col gap-4">
                  
                  {/* 1. Player Count Stepper */}
                  <div className="p-3.5 rounded-2xl bg-[#222536] border border-purple-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-purple-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#d8b4fe]" />
                        <span>Players</span>
                      </label>
                      <span className="text-xs font-black text-[#e9d5ff] bg-[#2d1b4e]/80 px-3 py-1 rounded-full border border-[#d8b4fe]/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
                        {customPlayerCount} Players
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={customPlayerCount <= 2}
                        onClick={() => {
                          setCustomPlayerCount((prev) => Math.max(2, prev - 1));
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
                        value={customPlayerCount}
                        onChange={(e) => {
                          setCustomPlayerCount(Number(e.target.value));
                          soundManager.playDotAdd(1);
                        }}
                        className="flex-1 accent-purple-500 cursor-pointer"
                      />

                      <button
                        type="button"
                        disabled={customPlayerCount >= 10}
                        onClick={() => {
                          setCustomPlayerCount((prev) => Math.min(10, prev + 1));
                          soundManager.playDotAdd(1);
                        }}
                        className="w-10 h-10 rounded-2xl soft-neumorphic-btn disabled:opacity-30 flex items-center justify-center text-purple-200 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 2. Board Size Stepper */}
                  <div className="p-3.5 rounded-2xl bg-[#222536] border border-amber-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5 text-[#fed7aa]" />
                        <span>Board Size</span>
                      </label>
                      <span className="text-xs font-black text-[#ffedd5] bg-[#432311]/80 px-3 py-1 rounded-full border border-[#fba886]/30 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
                        {customBoardSize}x{customBoardSize}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={customBoardSize <= 4}
                        onClick={() => {
                          setCustomBoardSize((prev) => Math.max(4, prev - 1));
                          soundManager.playDotAdd(1);
                        }}
                        className="w-10 h-10 rounded-2xl soft-neumorphic-btn disabled:opacity-30 flex items-center justify-center text-amber-200 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="range"
                        min={4}
                        max={12}
                        value={customBoardSize}
                        onChange={(e) => {
                          setCustomBoardSize(Number(e.target.value));
                          soundManager.playDotAdd(1);
                        }}
                        className="flex-1 accent-amber-500 cursor-pointer"
                      />

                      <button
                        type="button"
                        disabled={customBoardSize >= 12}
                        onClick={() => {
                          setCustomBoardSize((prev) => Math.min(12, prev + 1));
                          soundManager.playDotAdd(1);
                        }}
                        className="w-10 h-10 rounded-2xl soft-neumorphic-btn disabled:opacity-30 flex items-center justify-center text-amber-200 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3. Players Configuration (Toggle Human / AI) */}
                  <div className="p-3.5 rounded-2xl bg-[#222536] border border-white/5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">
                      Configure Players:
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                      {ALL_PLAYER_IDS.slice(0, customPlayerCount).map((pid, idx) => {
                        const cfg = DEFAULT_PLAYERS_CONFIG[pid];
                        const cp = customPlayers[idx];
                        return (
                          <div
                            key={pid}
                            className="p-2 rounded-xl bg-[#1a1c29] border border-white/10 flex items-center justify-between gap-1.5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                style={{ backgroundColor: cfg.color }}
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                              />
                              <span className="text-xs font-bold text-neutral-200 truncate">
                                {cfg.name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleCustomPlayerAI(pid)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer ${
                                cp.isAI
                                ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {cp.isAI ? 'AI Bot' : 'Human'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Big Action Button */}
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-3.5 bg-gradient-to-r from-[#ff5d6d] to-[#ff4356] hover:brightness-110 active:scale-[0.98] text-white font-['Fredoka',sans-serif] font-bold rounded-2xl shadow-[0_12px_28px_rgba(255,67,86,0.45),inset_0_2px_4px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-3 text-lg tracking-wider cursor-pointer mt-1"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START MATCH</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
