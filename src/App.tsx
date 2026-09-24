/**
 * Color Wars - Main Application
 * Features accurate dot mechanics, chain reaction cascade explosions,
 * AI opponents, Web Audio synthesizer, and Real-time Online Multiplayer over WebSockets!
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Player,
  PlayerId,
  CellData,
  GamePhase,
  GameMode,
  AIDifficulty,
  Projectile,
  OnlineRoomState,
  CustomPlayerConfig,
} from './types/game';
import { DEFAULT_PLAYERS_CONFIG, ALL_PLAYER_IDS } from './logic/constants';
import {
  createEmptyBoard,
  cloneBoard,
  isValidMove,
  updatePlayerStats,
  checkWinner,
  processOneExplosionWave,
  computeAIMove,
} from './logic/gameLogic';
import { soundManager } from './audio/soundManager';
import { onlineSocket } from './services/onlineSocket';
import { StartMenu } from './components/StartMenu';
import { GameBoard } from './components/GameBoard';
import { GameHeader } from './components/GameHeader';
import { RulesModal } from './components/RulesModal';
import { VictoryModal } from './components/VictoryModal';
import { OnlineLobby } from './components/OnlineLobby';
import { OnlineGameControls } from './components/OnlineGameControls';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TurnWheelModal, TurnWheelPlayerItem } from './components/TurnWheelModal';
import {
  PlayerProfile,
  loadPlayerProfile,
  recordPvPMatchResult,
} from './logic/playerProfile';
import { OnboardingNameModal } from './components/OnboardingNameModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';

export default function App() {
  // Player Profile & Onboarding State
  const [profile, setProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    const p = loadPlayerProfile();
    return !p.hasCompletedOnboarding && (!p.name || p.name.trim().length === 0);
  });
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const hasRecordedMatchResultRef = useRef<boolean>(false);

  // Game Setup
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [boardSize, setBoardSize] = useState<number>(5);
  const [mode, setMode] = useState<GameMode>('1p');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // Wheel Spinner state for picking who goes first
  const [wheelState, setWheelState] = useState<{
    isOpen: boolean;
    players: TurnWheelPlayerItem[];
    winnerId: string;
  }>({
    isOpen: false,
    players: [],
    winnerId: '',
  });

  // Online Multiplayer State
  const [isOnlineView, setIsOnlineView] = useState<boolean>(false);
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomState | null>(null);

  // Local Board State
  const [board, setBoard] = useState<CellData[][]>(() => createEmptyBoard(5));
  const [players, setPlayers] = useState<Record<PlayerId, Player>>({} as Record<PlayerId, Player>);
  const [activePlayerIds, setActivePlayerIds] = useState<PlayerId[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [totalTurns, setTotalTurns] = useState<number>(0);

  // Cascade & Animation State
  const [isProcessingCascade, setIsProcessingCascade] = useState<boolean>(false);
  const [cascadeLevel, setCascadeLevel] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [splittingCellKeys, setSplittingCellKeys] = useState<Set<string>>(new Set());
  const [absorbingCells, setAbsorbingCells] = useState<Record<string, string>>({});

  // Modals & UI Feedback
  const [winner, setWinner] = useState<Player | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // AI execution timer ref to prevent race conditions
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null);
    }, 2400);
  };

  // Connect to Online WebSocket server on mount
  useEffect(() => {
    onlineSocket.connect();

    const unsubJoined = onlineSocket.on('room_joined', (data) => {
      setOnlineRoom(data.room);
      soundManager.playTurnSwitch();
    });

    const unsubUpdate = onlineSocket.on('room_update', (data) => {
      const room: OnlineRoomState = data.room;
      setOnlineRoom((prev) => {
        // Detect online match start (from waiting/gameover to placement)
        if (
          (!prev || prev.status === 'waiting' || (prev.status === 'gameover' && room.status === 'placement')) &&
          room.status === 'placement' &&
          room.totalTurns === 0 &&
          room.activePlayerIds.length > 0
        ) {
          hasRecordedMatchResultRef.current = false;
          const startingPid = room.activePlayerIds[room.currentTurnIndex] || room.players[0]?.playerId;
          const wheelPlayers: TurnWheelPlayerItem[] = room.players.map((op) => {
            const cfg = DEFAULT_PLAYERS_CONFIG[op.playerId] || { color: op.color };
            return {
              id: op.playerId,
              name: op.name,
              color: op.color || cfg.color,
              lightColor: op.lightColor || cfg.lightColor,
            };
          });

          setWheelState({
            isOpen: true,
            players: wheelPlayers,
            winnerId: startingPid,
          });
        }

        // Detect online match victory/gameover to record stats (non-AI by definition)
        if (
          room.status === 'gameover' &&
          prev?.status !== 'gameover' &&
          room.winnerPlayerId &&
          !hasRecordedMatchResultRef.current
        ) {
          hasRecordedMatchResultRef.current = true;
          const isWin = room.winnerPlayerId === onlineSocket.myPlayerId;
          const updated = recordPvPMatchResult(isWin);
          setProfile(updated);
        }

        if (
          prev &&
          (room.status === 'placement' || room.status === 'playing') &&
          prev.currentTurnIndex !== room.currentTurnIndex
        ) {
          soundManager.playTurnSwitch();
        }
        return room;
      });
    });

    const unsubChat = onlineSocket.on('chat_message', (data) => {
      const newMsg = data.message;
      if (!newMsg) return;
      setOnlineRoom((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === newMsg.id)) return prev;
        return {
          ...prev,
          messages: [...prev.messages, newMsg],
        };
      });
      soundManager.playDotAdd(1);
    });

    const unsubWave = onlineSocket.on('cascade_wave', async (data) => {
      const { cascadeLevel: waveLevel, explodingCells, projectiles: waveProj } = data;
      setCascadeLevel(waveLevel);
      soundManager.playExplosion(waveLevel);

      // Splitting effect
      const splitting = new Set<string>(explodingCells.map((c: any) => `${c.row}-${c.col}`));
      setSplittingCellKeys(splitting);
      setProjectiles(waveProj);

      // Animate projectiles
      const startTime = performance.now();
      const flightDuration = 240;

      await new Promise<void>((resolve) => {
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const rawProgress = Math.min(elapsed / flightDuration, 1);
          const easeProgress = 1 - Math.pow(1 - rawProgress, 3);

          setProjectiles((prev) =>
            prev.map((p) => ({
              ...p,
              progress: easeProgress,
            }))
          );

          if (rawProgress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(animate);
      });

      setSplittingCellKeys(new Set());
      setProjectiles([]);
      soundManager.playDotAdd(Math.min(waveLevel, 4));
    });

    const unsubLeft = onlineSocket.on('left_room', () => {
      setOnlineRoom(null);
    });

    return () => {
      unsubJoined();
      unsubUpdate();
      unsubChat();
      unsubWave();
      unsubLeft();
    };
  }, []);

  // Determine current active player
  const isOnlineActive = isOnlineView && onlineRoom && onlineRoom.status !== 'waiting';

  // Construct players map for either online or local
  const currentPlayers: Record<PlayerId, Player> = isOnlineActive
    ? (() => {
        const map: Record<PlayerId, Player> = {} as Record<PlayerId, Player>;
        onlineRoom.players.forEach((op) => {
          const cfg = DEFAULT_PLAYERS_CONFIG[op.playerId] || {
            color: op.color,
            lightColor: op.lightColor,
            boardBgColor: '#fecdd3',
            borderGlow: 'rgba(255, 71, 89, 0.45)',
          };
          map[op.playerId] = {
            id: op.playerId,
            name: op.name,
            color: op.color || cfg.color,
            lightColor: op.lightColor || cfg.lightColor,
            boardBgColor: op.boardBgColor || cfg.boardBgColor || cfg.lightColor,
            borderGlow: op.borderGlow || cfg.borderGlow || `${op.color}70`,
            isAI: false,
            isEliminated: false,
            tilesCount: 0,
            totalDots: 0,
          };
        });
        // Count tiles & dots
        onlineRoom.board.forEach((r) => {
          r.forEach((c) => {
            if (c.playerId && map[c.playerId]) {
              map[c.playerId].tilesCount += 1;
              map[c.playerId].totalDots += c.dots;
            }
          });
        });
        if (onlineRoom.status === 'playing') {
          onlineRoom.activePlayerIds.forEach((pid) => {
            if (map[pid]) {
              map[pid].isEliminated = map[pid].tilesCount === 0;
            }
          });
        }
        return map;
      })()
    : players;

  const currentActivePlayerIds: PlayerId[] = isOnlineActive
    ? onlineRoom.activePlayerIds
    : activePlayerIds;

  const currentTurnIdx = isOnlineActive ? onlineRoom.currentTurnIndex : currentTurnIndex;
  const currentBoard = isOnlineActive ? onlineRoom.board : board;
  const currentSize = isOnlineActive ? onlineRoom.boardSize : boardSize;
  const currentPhase: GamePhase = isOnlineActive
    ? onlineRoom.status === 'placement'
      ? 'placement'
      : onlineRoom.status === 'playing'
      ? 'playing'
      : 'gameover'
    : phase;

  const activePlayer = currentPlayers[currentActivePlayerIds[currentTurnIdx]] || null;

  // Start new local game
  const handleStartLocalGame = (config: {
    mode: GameMode;
    boardSize: number;
    aiDifficulty: AIDifficulty;
    playerCount?: number;
    customPlayers?: CustomPlayerConfig[];
  }) => {
    setIsOnlineView(false);
    setOnlineRoom(null);
    setMode(config.mode);
    setBoardSize(config.boardSize);
    setAiDifficulty(config.aiDifficulty);

    let pIds: PlayerId[] = ['p1', 'p2'];
    if (config.mode === '3p') pIds = ['p1', 'p2', 'p3'];
    if (config.mode === '4p') pIds = ['p1', 'p2', 'p3', 'p4'];
    if (config.mode === 'custom' && config.playerCount) {
      pIds = ALL_PLAYER_IDS.slice(0, Math.min(10, Math.max(2, config.playerCount)));
    }

    const newPlayers: Record<PlayerId, Player> = {} as Record<PlayerId, Player>;
    pIds.forEach((pid, idx) => {
      const cfg = DEFAULT_PLAYERS_CONFIG[pid];
      const customP = config.customPlayers?.find((p) => p.id === pid);
      const isAI = customP !== undefined ? customP.isAI : (config.mode === '1p' && idx > 0);
      const diff = customP?.aiDifficulty || config.aiDifficulty;

      const defaultHumanName = pid === 'p1' && profile.name ? profile.name : `Player ${idx + 1}`;
      newPlayers[pid] = {
        ...cfg,
        name: isAI ? `AI Bot ${idx + 1} (${diff.toUpperCase()})` : defaultHumanName,
        isAI,
        aiDifficulty: isAI ? diff : undefined,
        isEliminated: false,
        tilesCount: 0,
        totalDots: 0,
      };
    });

    const randomStartIndex = Math.floor(Math.random() * pIds.length);
    const chosenStartingPid = pIds[randomStartIndex];

    hasRecordedMatchResultRef.current = false;
    setPlayers(newPlayers);
    setActivePlayerIds(pIds);
    setCurrentTurnIndex(randomStartIndex);
    setBoard(createEmptyBoard(config.boardSize));
    setPhase('placement');
    setTotalTurns(0);
    setCascadeLevel(0);
    setMaxCombo(0);
    setWinner(null);
    setProjectiles([]);
    setSplittingCellKeys(new Set());
    setAbsorbingCells({});
    setIsProcessingCascade(false);

    // Launch Wheel of Fortune First Player animation
    const wheelPlayers: TurnWheelPlayerItem[] = pIds.map((pid) => ({
      id: pid,
      name: newPlayers[pid].name,
      color: newPlayers[pid].color,
      lightColor: newPlayers[pid].lightColor,
      isAI: newPlayers[pid].isAI,
    }));

    setWheelState({
      isOpen: true,
      players: wheelPlayers,
      winnerId: chosenStartingPid,
    });

    const firstP = newPlayers[chosenStartingPid];
    showStatus(`Random first turn: ${firstP.name}! Place your 3-dot circle.`);
  };

  // Advance turn in local mode
  const advanceTurn = useCallback(
    (
      currentIdx: number,
      currentPIds: PlayerId[],
      cPlayers: Record<PlayerId, Player>,
      cPhase: GamePhase
    ) => {
      if (cPhase === 'placement') {
        const nextIdx = (currentIdx + 1) % currentPIds.length;
        setCurrentTurnIndex(nextIdx);
        soundManager.playTurnSwitch();
        return;
      }

      let nextIdx = (currentIdx + 1) % currentPIds.length;
      let count = 0;
      while (cPlayers[currentPIds[nextIdx]].isEliminated && count < currentPIds.length) {
        nextIdx = (nextIdx + 1) % currentPIds.length;
        count++;
      }

      setCurrentTurnIndex(nextIdx);
      soundManager.playTurnSwitch();
    },
    []
  );

  // Run local explosion sequence
  const runLocalExplosionSequence = async (startBoard: CellData[][]): Promise<CellData[][]> => {
    let curBoard = cloneBoard(startBoard);
    let level = 1;
    let localMaxCombo = maxCombo;

    const playerColorMap = {} as Record<PlayerId, string>;
    ALL_PLAYER_IDS.forEach((pid) => {
      playerColorMap[pid] = players[pid]?.color || DEFAULT_PLAYERS_CONFIG[pid].color;
    });

    while (true) {
      const wave = processOneExplosionWave(curBoard, level, playerColorMap);
      if (!wave) break;

      setCascadeLevel(level);
      localMaxCombo = Math.max(localMaxCombo, level);
      setMaxCombo(localMaxCombo);

      soundManager.playExplosion(level);

      const splittingSet = new Set(wave.explodingCells.map((c) => `${c.row}-${c.col}`));
      setSplittingCellKeys(splittingSet);
      setProjectiles(wave.projectiles);

      const startTime = performance.now();
      const flightDuration = 240;

      await new Promise<void>((resolve) => {
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const rawProgress = Math.min(elapsed / flightDuration, 1);
          const easeProgress = 1 - Math.pow(1 - rawProgress, 3);

          setProjectiles((prev) =>
            prev.map((p) => ({
              ...p,
              progress: easeProgress,
            }))
          );

          if (rawProgress < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(animate);
      });

      setSplittingCellKeys(new Set());

      const newAbsorbing: Record<string, string> = {};
      for (const proj of wave.projectiles) {
        if (
          proj.toRow >= 0 &&
          proj.toRow < boardSize &&
          proj.toCol >= 0 &&
          proj.toCol < boardSize
        ) {
          newAbsorbing[`${proj.toRow}-${proj.toCol}`] = proj.color;
        }
      }
      setAbsorbingCells(newAbsorbing);

      setProjectiles([]);
      curBoard = wave.boardAfterStep;
      setBoard(curBoard);

      soundManager.playDotAdd(Math.min(level, 4));

      level++;
      await new Promise((resolve) => setTimeout(resolve, 200));
      setAbsorbingCells({});

      if (!wave.newExplosionsTriggered) break;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setCascadeLevel(0);
    return curBoard;
  };

  // Handle cell click (Local or Online)
  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      // ONLINE MODE
      if (isOnlineActive) {
        if (!onlineRoom) return;
        const myPid = onlineSocket.myPlayerId;
        const curPid = onlineRoom.activePlayerIds[onlineRoom.currentTurnIndex];

        if (myPid !== curPid) {
          soundManager.playInvalid();
          showStatus("Not your turn! Waiting for opponent's move.");
          return;
        }

        const onlinePhase = onlineRoom.status === 'placement' ? 'placement' : 'playing';
        const check = isValidMove(onlineRoom.board, row, col, myPid, onlinePhase);
        if (!check.valid) {
          soundManager.playInvalid();
          showStatus(check.reason || 'Invalid move!');
          return;
        }

        soundManager.playDotAdd(1);
        onlineSocket.makeMove(row, col);
        return;
      }

      // LOCAL MODE
      if (isProcessingCascade || phase === 'menu' || phase === 'gameover') return;
      if (!activePlayer) return;

      const localPhase = phase === 'placement' ? 'placement' : 'playing';
      const check = isValidMove(board, row, col, activePlayer.id, localPhase);

      if (!check.valid) {
        soundManager.playInvalid();
        showStatus(check.reason || 'Invalid move!');
        return;
      }

      setStatusMessage(null);

      // Phase 1: Placement
      if (phase === 'placement') {
        soundManager.playDotAdd(3);

        const newBoard = cloneBoard(board);
        newBoard[row][col].playerId = activePlayer.id;
        newBoard[row][col].dots = 3;
        setBoard(newBoard);

        const nextTotalTurns = totalTurns + 1;
        setTotalTurns(nextTotalTurns);

        const updatedStats = updatePlayerStats(newBoard, players, activePlayerIds, 'placement');
        setPlayers(updatedStats);

        if (nextTotalTurns >= activePlayerIds.length) {
          setPhase('playing');
          soundManager.playTurnSwitch();
          showStatus('Placement phase complete! Tap your circles to add dots and trigger explosions!');
        }

        advanceTurn(currentTurnIndex, activePlayerIds, updatedStats, phase);
        return;
      }

      // Phase 2: Playing
      setIsProcessingCascade(true);
      soundManager.playDotAdd(board[row][col].dots + 1);

      let workingBoard = cloneBoard(board);
      workingBoard[row][col].dots += 1;
      setBoard(workingBoard);

      const nextTurns = totalTurns + 1;
      setTotalTurns(nextTurns);

      if (workingBoard[row][col].dots >= 4) {
        workingBoard = await runLocalExplosionSequence(workingBoard);
      }

      const updatedPlayers = updatePlayerStats(workingBoard, players, activePlayerIds, 'playing');
      setPlayers(updatedPlayers);

      const winCandidate = checkWinner(workingBoard, updatedPlayers, activePlayerIds, 'playing');
      if (winCandidate) {
        setWinner(winCandidate);
        setPhase('gameover');
        soundManager.playVictory();
        setIsProcessingCascade(false);

        // Record stats ONLY for non-AI games (Pass & Play PvP)
        const hasAI = Object.values(updatedPlayers).some((p) => p.isAI);
        if (!hasAI && !hasRecordedMatchResultRef.current) {
          hasRecordedMatchResultRef.current = true;
          const isWin = winCandidate.id === 'p1';
          const updated = recordPvPMatchResult(isWin);
          setProfile(updated);
        }
        return;
      }

      advanceTurn(currentTurnIndex, activePlayerIds, updatedPlayers, 'playing');
      setIsProcessingCascade(false);
    },
    [
      isOnlineActive,
      onlineRoom,
      isProcessingCascade,
      phase,
      activePlayer,
      board,
      totalTurns,
      players,
      activePlayerIds,
      currentTurnIndex,
      advanceTurn,
    ]
  );

  // Handle AI turn execution in local mode
  useEffect(() => {
    if (
      isOnlineActive ||
      phase !== 'placement' && phase !== 'playing' ||
      isProcessingCascade ||
      !activePlayer ||
      !activePlayer.isAI ||
      activePlayer.isEliminated
    ) {
      return;
    }

    const aiPhase = phase === 'placement' ? 'placement' : 'playing';
    const aiMove = computeAIMove(
      board,
      activePlayer.id,
      aiPhase,
      activePlayer.aiDifficulty || 'medium'
    );

    if (aiMove) {
      const thinkDelay = aiPhase === 'placement' ? 600 : 750;
      aiTimerRef.current = setTimeout(() => {
        handleCellClick(aiMove.row, aiMove.col);
      }, thinkDelay);
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, [isOnlineActive, phase, isProcessingCascade, activePlayer, board, handleCellClick]);

  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playDotAdd(1);
    }
  };

  const handleRestart = () => {
    if (isOnlineActive) {
      onlineSocket.restartGame();
    } else {
      handleStartLocalGame({
        mode,
        boardSize,
        aiDifficulty,
      });
    }
  };

  const handleBackToMenu = () => {
    if (isOnlineActive) {
      onlineSocket.leaveRoom();
    }
    setIsOnlineView(false);
    setOnlineRoom(null);
    setPhase('menu');
  };

  // Check online game winner
  const onlineWinner =
    isOnlineActive && onlineRoom?.status === 'gameover' && onlineRoom.winnerPlayerId
      ? currentPlayers[onlineRoom.winnerPlayerId] || null
      : null;

  const isPlayingMatch = isOnlineActive || (!isOnlineView && phase !== 'menu');

  const currentGameBgColor =
    isPlayingMatch && activePlayer
      ? activePlayer.boardBgColor || activePlayer.lightColor || '#fba886'
      : '#fba886';

  // Synchronize document.body and document.documentElement for desktop / whole viewport
  useEffect(() => {
    document.body.style.backgroundColor = currentGameBgColor;
    document.body.style.transition = 'background-color 0.4s ease-in-out';
    document.documentElement.style.backgroundColor = currentGameBgColor;
    document.documentElement.style.transition = 'background-color 0.4s ease-in-out';
  }, [currentGameBgColor]);

  return (
    <main
      style={{
        backgroundColor: currentGameBgColor,
        transition: 'background-color 0.4s ease-in-out',
      }}
      className="h-[100dvh] max-h-screen w-full flex flex-col items-center justify-center select-none relative overflow-hidden"
    >
      {/* Decorative ambient background accents */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Screen 1: Start Menu */}
      {!isOnlineView && phase === 'menu' && (
        <div className="w-full h-full overflow-y-auto flex items-center justify-center p-3 sm:p-5">
          <StartMenu
            onStartGame={handleStartLocalGame}
            onOpenOnline={() => {
              setIsOnlineView(true);
              onlineSocket.connect();
            }}
            onOpenRules={() => setIsRulesOpen(true)}
            profile={profile}
            onOpenProfile={() => setIsProfileOpen(true)}
          />
        </div>
      )}

      {/* Screen 2: Online Lobby */}
      {isOnlineView && (!onlineRoom || onlineRoom.status === 'waiting') && (
        <OnlineLobby
          roomState={onlineRoom}
          onBackToMenu={handleBackToMenu}
          onGameStarted={(room) => setOnlineRoom(room)}
        />
      )}

      {/* Screen 3: Game in Progress (Local OR Online) - Automatically fits screen */}
      {((!isOnlineView && phase !== 'menu') || isOnlineActive) && activePlayer && (
        <div className="w-full h-full flex-1 min-h-0 max-w-3xl mx-auto flex flex-col items-center justify-between p-2 sm:p-3 overflow-hidden">
          <GameHeader
            activePlayer={activePlayer}
            players={currentPlayers}
            activePlayerIds={currentActivePlayerIds}
            isPlacementPhase={currentPhase === 'placement'}
            cascadeLevel={cascadeLevel}
            isMuted={isMuted}
            onToggleSound={handleToggleSound}
            onRestart={handleRestart}
            onBackToMenu={handleBackToMenu}
            onOpenRules={() => setIsRulesOpen(true)}
            profile={profile}
            onOpenProfile={() => setIsProfileOpen(true)}
            statusMessage={statusMessage}
          />

          <GameBoard
            board={currentBoard}
            players={currentPlayers}
            activePlayer={activePlayer}
            isPlacementPhase={currentPhase === 'placement'}
            isProcessingCascade={isProcessingCascade}
            projectiles={projectiles}
            splittingCellKeys={splittingCellKeys}
            absorbingCells={absorbingCells}
            size={currentSize}
            onCellClick={handleCellClick}
          />

          {/* Online Controls & Live Chat Bar if in Online Match */}
          {isOnlineActive && onlineRoom && (
            <div className="shrink-0 w-full max-w-xl mx-auto pt-1">
              <OnlineGameControls
                roomState={onlineRoom}
                myPlayerId={onlineSocket.myPlayerId}
                onLeaveRoom={handleBackToMenu}
              />
            </div>
          )}
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />

      {/* First-Time Visit Onboarding Name Modal */}
      <OnboardingNameModal
        isOpen={isOnboardingOpen}
        onComplete={(newProfile) => {
          setProfile(newProfile);
          setIsOnboardingOpen(false);
        }}
      />

      {/* Player Profile & Rank Modal */}
      <PlayerProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onUpdateProfile={(updated) => setProfile(updated)}
        onOpenRules={() => {
          setIsProfileOpen(false);
          setIsRulesOpen(true);
        }}
      />

      {/* Victory Celebration Modal */}
      {((!isOnlineView && winner && phase === 'gameover') || (isOnlineActive && onlineWinner)) && (
        <VictoryModal
          winner={isOnlineActive ? onlineWinner! : winner!}
          totalTurns={isOnlineActive ? onlineRoom!.totalTurns : totalTurns}
          maxCombo={isOnlineActive ? onlineRoom!.maxCombo : maxCombo}
          onPlayAgain={handleRestart}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {/* Turn Order Wheel of Fortune Modal */}
      <TurnWheelModal
        isOpen={wheelState.isOpen}
        players={wheelState.players}
        selectedWinnerId={wheelState.winnerId}
        onComplete={() => setWheelState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Offline PWA Connectivity Indicator */}
      <OfflineIndicator />
    </main>
  );
}
