import { Player, PlayerId } from '../types/game';

export const DEFAULT_PLAYERS_CONFIG: Record<PlayerId, Omit<Player, 'isAI' | 'aiDifficulty' | 'isEliminated' | 'tilesCount' | 'totalDots'>> = {
  p1: {
    id: 'p1',
    name: 'Người Chơi 1',
    color: '#00c0f8',       // Bright vivid Cyan/Sky Blue matching image
    lightColor: '#e0f4ff',  // Soft ice cyan
    borderGlow: 'rgba(0, 192, 248, 0.4)',
  },
  p2: {
    id: 'p2',
    name: 'Người Chơi 2',
    color: '#ff5964',       // Coral Red matching image
    lightColor: '#fed5ce',  // Soft coral pink matching image
    borderGlow: 'rgba(255, 89, 100, 0.4)',
  },
  p3: {
    id: 'p3',
    name: 'Người Chơi 3',
    color: '#10b981',       // Emerald Green
    lightColor: '#d1fae5',  // Soft mint
    borderGlow: 'rgba(16, 185, 129, 0.4)',
  },
  p4: {
    id: 'p4',
    name: 'Người Chơi 4',
    color: '#f59e0b',       // Amber Gold
    lightColor: '#fef3c7',  // Soft gold
    borderGlow: 'rgba(245, 158, 11, 0.4)',
  },
};

export const BOARD_SIZES = [
  { size: 5, label: '5x5 (Kinh Điển - Theo Ảnh)', description: 'Nhanh & căng thẳng' },
  { size: 6, label: '6x6 (Mở Rộng)', description: 'Cân bằng & chiến thuật' },
  { size: 7, label: '7x7 (Đại Chiến)', description: 'Bản đồ lớn, nhiều nổ dây chuyền' },
];
