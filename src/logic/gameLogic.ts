import { CellData, PlayerId, Projectile, AIDifficulty, Player } from '../types/game';

// Create initial empty board of size N x N
export function createEmptyBoard(size: number): CellData[][] {
  const board: CellData[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        row: r,
        col: c,
        playerId: null,
        dots: 0,
      });
    }
    board.push(row);
  }
  return board;
}

// Deep clone board
export function cloneBoard(board: CellData[][]): CellData[][] {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
    }))
  );
}

// Get 4 orthogonal neighbors (North, South, West, East) - Standard Plus '+'
export function getOrthogonalNeighbors(
  row: number,
  col: number,
  size: number
): { row: number; col: number; inBounds: boolean }[] {
  const deltas = [
    { row: -1, col: 0 }, // North (Trên)
    { row: 1, col: 0 },  // South (Dưới)
    { row: 0, col: -1 }, // West (Trái)
    { row: 0, col: 1 },  // East (Phải)
  ];

  return deltas.map((d) => {
    const nr = row + d.row;
    const nc = col + d.col;
    return {
      row: nr,
      col: nc,
      inBounds: nr >= 0 && nr < size && nc >= 0 && nc < size,
    };
  });
}

// Validate move
export function isValidMove(
  board: CellData[][],
  row: number,
  col: number,
  playerId: PlayerId,
  phase: 'placement' | 'playing'
): { valid: boolean; reason?: string } {
  const size = board.length;
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return { valid: false, reason: 'Tọa độ ngoài bàn cờ!' };
  }

  const cell = board[row][col];

  if (phase === 'placement') {
    // In placement phase, cell MUST be empty
    if (cell.playerId !== null) {
      return { valid: false, reason: 'Chỉ được đặt vào ô còn trống!' };
    }
    return { valid: true };
  }

  // In playing phase:
  // Must click your own piece!
  if (cell.playerId === null) {
    return { valid: false, reason: 'Không thể chọn ô trống! Hãy chọn vòng tròn màu của bạn.' };
  }

  if (cell.playerId !== playerId) {
    return { valid: false, reason: 'Không phải quân của bạn! Hãy chọn đúng màu của mình.' };
  }

  return { valid: true };
}

// Get list of valid coordinates for a player
export function getValidMoves(
  board: CellData[][],
  playerId: PlayerId,
  phase: 'placement' | 'playing'
): { row: number; col: number }[] {
  const size = board.length;
  const valid: { row: number; col: number }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isValidMove(board, r, c, playerId, phase).valid) {
        valid.push({ row: r, col: c });
      }
    }
  }

  return valid;
}

// Recalculate tiles count and dots for each player
export function updatePlayerStats(
  board: CellData[][],
  players: Record<PlayerId, Player>,
  activePlayerIds: PlayerId[],
  phase: 'placement' | 'playing'
): Record<PlayerId, Player> {
  const updated: Record<PlayerId, Player> = {} as Record<PlayerId, Player>;

  for (const pid of activePlayerIds) {
    if (players[pid]) {
      updated[pid] = {
        ...players[pid],
        tilesCount: 0,
        totalDots: 0,
      };
    }
  }

  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      if (cell.playerId && updated[cell.playerId]) {
        updated[cell.playerId].tilesCount += 1;
        updated[cell.playerId].totalDots += cell.dots;
      }
    }
  }

  // In playing phase: A player with 0 tiles is eliminated!
  if (phase === 'playing') {
    for (const pid of activePlayerIds) {
      if (updated[pid]) {
        updated[pid].isEliminated = updated[pid].tilesCount === 0;
      }
    }
  }

  return updated;
}

// Check for victory condition
export function checkWinner(
  board: CellData[][],
  players: Record<PlayerId, Player>,
  activePlayerIds: PlayerId[],
  phase: 'placement' | 'playing'
): Player | null {
  if (phase === 'placement') return null;

  const totalBoardCells = board.length * board.length;
  const activePlayers = activePlayerIds.map((id) => players[id]).filter(Boolean);

  // Condition 1: A player controls 100% of the board
  for (const p of activePlayers) {
    if (p.tilesCount === totalBoardCells) {
      return p;
    }
  }

  // Condition 2: Only 1 player remains with non-zero tiles
  const surviving = activePlayers.filter((p) => !p.isEliminated && p.tilesCount > 0);
  if (surviving.length === 1 && activePlayers.length > 1) {
    return surviving[0];
  }

  return null;
}

export interface CascadeStep {
  explodingCells: { row: number; col: number; playerId: PlayerId }[];
  projectiles: Projectile[];
  boardAfterStep: CellData[][];
  newExplosionsTriggered: boolean;
}

// Process 1 explosion wave across the board
export function processOneExplosionWave(
  board: CellData[][],
  cascadeLevel: number,
  playerColorMap: Record<PlayerId, string>
): CascadeStep | null {
  const size = board.length;
  const explodingCells: { row: number; col: number; playerId: PlayerId }[] = [];

  // 1. Identify all cells that reached >= 4 dots
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c].dots >= 4 && board[r][c].playerId !== null) {
        explodingCells.push({
          row: r,
          col: c,
          playerId: board[r][c].playerId as PlayerId,
        });
      }
    }
  }

  if (explodingCells.length === 0) {
    return null;
  }

  const nextBoard = cloneBoard(board);
  const projectiles: Projectile[] = [];

  // 2. Clear all exploding cells first
  for (const exp of explodingCells) {
    nextBoard[exp.row][exp.col].playerId = null;
    nextBoard[exp.row][exp.col].dots = 0;
  }

  // 3. For each exploding cell, launch 4 orthogonal projectiles (+)
  for (const exp of explodingCells) {
    const neighbors = getOrthogonalNeighbors(exp.row, exp.col, size);
    const color = playerColorMap[exp.playerId] || '#00c0f8';

    for (let i = 0; i < neighbors.length; i++) {
      const n = neighbors[i];
      const projId = `proj-${exp.row}-${exp.col}-${n.row}-${n.col}-${cascadeLevel}-${i}`;

      projectiles.push({
        id: projId,
        fromRow: exp.row,
        fromCol: exp.col,
        toRow: n.row,
        toCol: n.col,
        color,
        progress: 0,
      });

      // 4. If destination cell is within the board boundary:
      // Convert to exploding player's color and add +1 dot
      if (n.inBounds) {
        const destCell = nextBoard[n.row][n.col];
        destCell.playerId = exp.playerId;
        destCell.dots += 1;
      }
    }
  }

  // Check if any destination cells reached >= 4 dots, triggering the next wave
  let newExplosionsTriggered = false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (nextBoard[r][c].dots >= 4 && nextBoard[r][c].playerId !== null) {
        newExplosionsTriggered = true;
        break;
      }
    }
    if (newExplosionsTriggered) break;
  }

  return {
    explodingCells,
    projectiles,
    boardAfterStep: nextBoard,
    newExplosionsTriggered,
  };
}

// Simulate move to evaluate score for AI
export function simulateMoveToEnd(
  board: CellData[][],
  row: number,
  col: number,
  playerId: PlayerId
): { finalBoard: CellData[][]; chainDepth: number; cellsGained: number } {
  let simBoard = cloneBoard(board);
  simBoard[row][col].playerId = playerId;
  simBoard[row][col].dots += 1;

  let chainDepth = 0;
  const playerColorMap: Record<PlayerId, string> = {
    p1: '#00c0f8',
    p2: '#ff5964',
    p3: '#10b981',
    p4: '#f59e0b',
  };

  while (chainDepth < 20) {
    const wave = processOneExplosionWave(simBoard, chainDepth + 1, playerColorMap);
    if (!wave) break;

    simBoard = wave.boardAfterStep;
    chainDepth++;

    if (!wave.newExplosionsTriggered) break;
  }

  let finalCount = 0;
  for (const r of simBoard) {
    for (const c of r) {
      if (c.playerId === playerId) finalCount++;
    }
  }

  return {
    finalBoard: simBoard,
    chainDepth,
    cellsGained: finalCount,
  };
}

// AI decision maker
export function computeAIMove(
  board: CellData[][],
  aiPlayerId: PlayerId,
  phase: 'placement' | 'playing',
  difficulty: AIDifficulty
): { row: number; col: number } | null {
  const validMoves = getValidMoves(board, aiPlayerId, phase);
  if (validMoves.length === 0) return null;

  const size = board.length;

  if (phase === 'placement') {
    if (difficulty === 'easy') {
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Medium & Hard: Pick strategic placement
    const center = (size - 1) / 2;
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      const distFromCenter = Math.abs(move.row - center) + Math.abs(move.col - center);
      const neighbors = getOrthogonalNeighbors(move.row, move.col, size).filter(
        (n) => n.inBounds
      );
      let score = neighbors.length * 3 - distFromCenter;
      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  // Phase: Playing
  if (difficulty === 'easy') {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // Medium: Pick a move that explodes or has highest dots
  if (difficulty === 'medium') {
    const explodingMoves = validMoves.filter((m) => board[m.row][m.col].dots === 3);
    if (explodingMoves.length > 0) {
      let bestMove = explodingMoves[0];
      let maxCaptured = -1;
      for (const m of explodingMoves) {
        const { cellsGained } = simulateMoveToEnd(board, m.row, m.col, aiPlayerId);
        if (cellsGained > maxCaptured) {
          maxCaptured = cellsGained;
          bestMove = m;
        }
      }
      return bestMove;
    }

    let bestMove = validMoves[0];
    let maxDots = -1;
    for (const m of validMoves) {
      const d = board[m.row][m.col].dots;
      if (d > maxDots) {
        maxDots = d;
        bestMove = m;
      }
    }
    return bestMove;
  }

  // Hard difficulty: Full simulation & heuristic evaluation
  let bestMove = validMoves[0];
  let bestScore = -Infinity;

  for (const move of validMoves) {
    const { finalBoard, chainDepth, cellsGained } = simulateMoveToEnd(
      board,
      move.row,
      move.col,
      aiPlayerId
    );

    let score = cellsGained * 10 + chainDepth * 5;

    let enemyCells = 0;
    let enemyDots = 0;
    for (const row of finalBoard) {
      for (const cell of row) {
        if (cell.playerId && cell.playerId !== aiPlayerId) {
          enemyCells++;
          enemyDots += cell.dots;
        }
      }
    }

    score -= enemyCells * 8;
    score -= enemyDots * 2;

    if (board[move.row][move.col].dots === 3) {
      score += 15;
    }

    score += Math.random() * 1.5;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
