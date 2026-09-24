import type { Player, PlayerId } from '../types/game.ts';

export const ALL_PLAYER_IDS: PlayerId[] = [
  'p1',
  'p2',
  'p3',
  'p4',
  'p5',
  'p6',
  'p7',
  'p8',
  'p9',
  'p10',
];

export const DEFAULT_PLAYERS_CONFIG: Record<
  PlayerId,
  Omit<Player, 'isAI' | 'aiDifficulty' | 'isEliminated' | 'tilesCount' | 'totalDots'>
> = {
  p1: {
    id: 'p1',
    name: 'Player 1',
    color: '#ff4759',       // Vibrant Coral Red (matches Card 1)
    lightColor: '#ffe8eb',  // Soft coral pink tint
    boardBgColor: '#fecdd3', // Lighter red tint
    borderGlow: 'rgba(255, 71, 89, 0.45)',
  },
  p2: {
    id: 'p2',
    name: 'Player 2',
    color: '#00c0f8',       // Vibrant Sky Cyan (matches Card 2)
    lightColor: '#e0f7ff',  // Soft cyan tint
    boardBgColor: '#bae6fd', // Lighter cyan/blue tint
    borderGlow: 'rgba(0, 192, 248, 0.45)',
  },
  p3: {
    id: 'p3',
    name: 'Player 3',
    color: '#10b981',       // Vibrant Emerald Green (matches Card 3)
    lightColor: '#d1fae5',  // Soft mint tint
    boardBgColor: '#a7f3d0', // Lighter green tint
    borderGlow: 'rgba(16, 185, 129, 0.45)',
  },
  p4: {
    id: 'p4',
    name: 'Player 4',
    color: '#f59e0b',       // Vibrant Amber Gold (matches Card 4)
    lightColor: '#fef3c7',  // Soft gold tint
    boardBgColor: '#fde68a', // Lighter amber tint
    borderGlow: 'rgba(245, 158, 11, 0.45)',
  },
  p5: {
    id: 'p5',
    name: 'Player 5',
    color: '#8b5cf6',       // Vibrant Violet Purple
    lightColor: '#ede9fe',
    boardBgColor: '#ddd6fe', // Lighter violet tint
    borderGlow: 'rgba(139, 92, 246, 0.45)',
  },
  p6: {
    id: 'p6',
    name: 'Player 6',
    color: '#ec4899',       // Vibrant Hot Pink
    lightColor: '#fce7f3',
    boardBgColor: '#fbcfe8', // Lighter hot pink tint
    borderGlow: 'rgba(236, 72, 153, 0.45)',
  },
  p7: {
    id: 'p7',
    name: 'Player 7',
    color: '#06b6d4',       // Vibrant Turquoise
    lightColor: '#cffafe',
    boardBgColor: '#a5f3fc', // Lighter turquoise tint
    borderGlow: 'rgba(6, 182, 212, 0.45)',
  },
  p8: {
    id: 'p8',
    name: 'Player 8',
    color: '#f97316',       // Vibrant Vivid Orange
    lightColor: '#ffedd5',
    boardBgColor: '#fed7aa', // Lighter orange tint
    borderGlow: 'rgba(249, 115, 22, 0.45)',
  },
  p9: {
    id: 'p9',
    name: 'Player 9',
    color: '#6366f1',       // Vibrant Royal Indigo
    lightColor: '#e0e7ff',
    boardBgColor: '#c7d2fe', // Lighter indigo tint
    borderGlow: 'rgba(99, 102, 241, 0.45)',
  },
  p10: {
    id: 'p10',
    name: 'Player 10',
    color: '#84cc16',      // Vibrant Lime Green
    lightColor: '#ecfccb',
    boardBgColor: '#d9f99d', // Lighter lime tint
    borderGlow: 'rgba(132, 204, 22, 0.45)',
  },
};

export interface BoardSizeOption {
  size: number;
  type: 'MIN' | 'MID' | 'MAX';
  label: string;
  badge?: string;
  description?: string;
}

/**
 * Calculates exactly 3 board size choices for a given player count:
 * - 2 players: 5x5, 6x6, 7x7
 * - 3 players: 6x6, 7x7, 8x8
 * - 4 players: 7x7, 8x8, 9x9
 * - N players: (N+3), (N+4), (N+5)
 */
export function getBoardSizesForPlayers(playerCount: number): BoardSizeOption[] {
  const effectiveCount = Math.max(2, playerCount);
  const minSize = effectiveCount + 3;
  const midSize = effectiveCount + 4;
  const maxSize = effectiveCount + 5;

  return [
    {
      size: minSize,
      type: 'MIN',
      label: `${minSize}x${minSize}`,
    },
    {
      size: midSize,
      type: 'MID',
      label: `${midSize}x${midSize}`,
    },
    {
      size: maxSize,
      type: 'MAX',
      label: `${maxSize}x${maxSize}`,
    },
  ];
}

export const BOARD_SIZES = [
  { size: 5, label: '5x5' },
  { size: 6, label: '6x6' },
  { size: 7, label: '7x7' },
];
