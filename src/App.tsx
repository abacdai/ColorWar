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
} from './types/game';
import { DEFAULT_PLAYERS_CONFIG } from './logic/constants';
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

export default function App() {
  // Game Setup
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [boardSize, setBoardSize] = useState<number>(5);
  const [mode, setMode] = useState<GameMode>('1p');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

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
      setOnlineRoom(room);
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
          map[op.playerId] = {
            id: op.playerId,
            name: op.name,
            color: op.color,
            lightColor: op.lightColor,
            borderGlow: `rgba(0, 192, 248, 0.4)`,
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
  }) => {
    setIsOnlineView(false);
    setOnlineRoom(null);
    setMode(config.mode);
    setBoardSize(config.boardSize);
    setAiDifficulty(config.aiDifficulty);

    let pIds: PlayerId[] = ['p1', 'p2'];
    if (config.mode === '3p') pIds = ['p1', 'p2', 'p3'];
    if (config.mode === '4p') pIds = ['p1', 'p2', 'p3', 'p4'];

    const newPlayers: Record<PlayerId, Player> = {} as Record<PlayerId, Player>;
    pIds.forEach((pid, idx) => {
      const isAI = config.mode === '1p' && idx > 0;
      const cfg = DEFAULT_PLAYERS_CONFIG[pid];
      newPlayers[pid] = {
        ...cfg,
        name: isAI ? `Máy AI (${config.aiDifficulty.toUpperCase()})` : `Người Chơi ${idx + 1}`,
        isAI,
        aiDifficulty: isAI ? config.aiDifficulty : undefined,
        isEliminated: false,
        tilesCount: 0,
        totalDots: 0,
      };
    });

    const randomStartIndex = Math.floor(Math.random() * pIds.length);

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

    const firstP = newPlayers[pIds[randomStartIndex]];
    showStatus(`Lượt đầu tiên ngẫu nhiên: ${firstP.name}! Hãy đặt vòng tròn 3 chấm.`);
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

    const playerColorMap: Record<PlayerId, string> = {
      p1: players.p1?.color || '#00c0f8',
      p2: players.p2?.color || '#ff5964',
      p3: players.p3?.color || '#10b981',
      p4: players.p4?.color || '#f59e0b',
    };

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
          showStatus('Chưa tới lượt của bạn! Đang chờ đối thủ ra đòn.');
          return;
        }

        const onlinePhase = onlineRoom.status === 'placement' ? 'placement' : 'playing';
        const check = isValidMove(onlineRoom.board, row, col, myPid, onlinePhase);
        if (!check.valid) {
          soundManager.playInvalid();
          showStatus(check.reason || 'Nước đi không hợp lệ!');
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
        showStatus(check.reason || 'Nước đi không hợp lệ!');
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
          showStatus('Giai đoạn khởi đầu hoàn tất! Bấm vào quân của bạn để cộng chấm và kích nổ!');
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

  return (
    <main className="min-h-screen w-full bg-[#fba886] flex flex-col items-center justify-center p-3 sm:p-5 select-none relative overflow-x-hidden">
      {/* Decorative ambient background accents */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Screen 1: Start Menu */}
      {!isOnlineView && phase === 'menu' && (
        <StartMenu
          onStartGame={handleStartLocalGame}
          onOpenOnline={() => {
            setIsOnlineView(true);
            onlineSocket.connect();
          }}
          onOpenRules={() => setIsRulesOpen(true)}
        />
      )}

      {/* Screen 2: Online Lobby */}
      {isOnlineView && (!onlineRoom || onlineRoom.status === 'waiting') && (
        <OnlineLobby
          roomState={onlineRoom}
          onBackToMenu={handleBackToMenu}
          onGameStarted={(room) => setOnlineRoom(room)}
        />
      )}

      {/* Screen 3: Game in Progress (Local OR Online) */}
      {((!isOnlineView && phase !== 'menu') || isOnlineActive) && activePlayer && (
        <div className="w-full max-w-xl mx-auto flex flex-col items-center">
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
            <OnlineGameControls
              roomState={onlineRoom}
              myPlayerId={onlineSocket.myPlayerId}
              onLeaveRoom={handleBackToMenu}
            />
          )}
        </div>
      )}

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
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
    </main>
  );
}
