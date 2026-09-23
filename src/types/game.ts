export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GameMode = '1p' | '2p' | '3p' | '4p' | 'online';

export interface Player {
  id: PlayerId;
  name: string;
  color: string;       // Primary circle color
  lightColor: string;  // Cell background tint
  borderGlow: string;  // Highlight glow
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  isEliminated: boolean;
  tilesCount: number;
  totalDots: number;
}

export interface CellData {
  row: number;
  col: number;
  playerId: PlayerId | null;
  dots: number; // 0, 1, 2, 3, 4
  isExploding?: boolean;
  justReceived?: boolean;
}

export type GamePhase = 'menu' | 'placement' | 'playing' | 'gameover';

export interface Projectile {
  id: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  color: string;
  progress: number;
}

export interface MoveHistoryItem {
  playerId: PlayerId;
  row: number;
  col: number;
  phase: 'placement' | 'playing';
  chainDepth: number;
}

// Online Multiplayer Types
export interface OnlinePlayer {
  id: string; // client socket id
  name: string;
  playerId: PlayerId;
  color: string;
  lightColor: string;
  isHost: boolean;
  isReady: boolean;
}

export interface OnlineRoomInfo {
  roomCode: string;
  hostName: string;
  maxPlayers: number;
  playerCount: number;
  boardSize: number;
  status: 'waiting' | 'in_game' | 'finished';
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderColor: string;
  text: string;
  time: string;
}

export interface OnlineRoomState {
  roomCode: string;
  hostId: string;
  boardSize: number;
  maxPlayers: number;
  status: 'waiting' | 'placement' | 'playing' | 'gameover';
  players: OnlinePlayer[];
  board: CellData[][];
  activePlayerIds: PlayerId[];
  currentTurnIndex: number;
  winnerPlayerId: PlayerId | null;
  totalTurns: number;
  maxCombo: number;
  messages: ChatMessage[];
}
