export type RankTierId =
  | 'fool'
  | 'chicken'
  | 'peasant'
  | 'worker'
  | 'elite'
  | 'superman'
  | 'saint'
  | 'god';

export interface RankTier {
  id: RankTierId;
  name: string; // Fool, Chicken, Peasant, Worker, Elite, Superman, Saint, God
  originalConcept: string; // Ngu, Gà, Dân đen, Công Nhân, Thượng lưu, Siêu nhân, Thánh, Thần
  minWins: number;
  maxWins: number; // for progress calculation (Infinity for God)
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  glowColor: string;
  icon: string;
  title: string;
}

export const RANK_TIERS: RankTier[] = [
  {
    id: 'fool',
    name: 'Fool',
    originalConcept: 'Ngu',
    minWins: 0,
    maxWins: 2,
    badgeBg: 'bg-neutral-800/80',
    badgeBorder: 'border-neutral-600/40',
    textColor: 'text-neutral-300',
    glowColor: 'rgba(163, 163, 163, 0.3)',
    icon: '🤡',
    title: 'Rank 1: Fool',
  },
  {
    id: 'chicken',
    name: 'Chicken',
    originalConcept: 'Gà',
    minWins: 3,
    maxWins: 9,
    badgeBg: 'bg-amber-950/70',
    badgeBorder: 'border-amber-500/50',
    textColor: 'text-amber-300',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    icon: '🐣',
    title: 'Rank 2: Chicken',
  },
  {
    id: 'peasant',
    name: 'Peasant',
    originalConcept: 'Dân đen',
    minWins: 10,
    maxWins: 24,
    badgeBg: 'bg-stone-900/80',
    badgeBorder: 'border-stone-500/50',
    textColor: 'text-stone-300',
    glowColor: 'rgba(120, 113, 108, 0.4)',
    icon: '🌾',
    title: 'Rank 3: Peasant',
  },
  {
    id: 'worker',
    name: 'Worker',
    originalConcept: 'Công Nhân',
    minWins: 25,
    maxWins: 49,
    badgeBg: 'bg-blue-950/70',
    badgeBorder: 'border-blue-500/50',
    textColor: 'text-sky-300',
    glowColor: 'rgba(14, 165, 233, 0.4)',
    icon: '🔨',
    title: 'Rank 4: Worker',
  },
  {
    id: 'elite',
    name: 'Elite',
    originalConcept: 'Thượng lưu',
    minWins: 50,
    maxWins: 99,
    badgeBg: 'bg-purple-950/80',
    badgeBorder: 'border-purple-500/60',
    textColor: 'text-purple-300',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    icon: '🎩',
    title: 'Rank 5: Elite',
  },
  {
    id: 'superman',
    name: 'Superman',
    originalConcept: 'Siêu nhân',
    minWins: 100,
    maxWins: 199,
    badgeBg: 'bg-red-950/80',
    badgeBorder: 'border-red-500/60',
    textColor: 'text-red-300',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    icon: '🦸‍♂️',
    title: 'Rank 6: Superman',
  },
  {
    id: 'saint',
    name: 'Saint',
    originalConcept: 'Thánh',
    minWins: 200,
    maxWins: 499,
    badgeBg: 'bg-yellow-950/80',
    badgeBorder: 'border-yellow-400/70',
    textColor: 'text-yellow-300',
    glowColor: 'rgba(234, 179, 8, 0.7)',
    icon: '✨',
    title: 'Rank 7: Saint',
  },
  {
    id: 'god',
    name: 'God',
    originalConcept: 'Thần',
    minWins: 500,
    maxWins: Infinity,
    badgeBg: 'bg-gradient-to-r from-purple-950/90 via-amber-950/90 to-red-950/90',
    badgeBorder: 'border-amber-300/80',
    textColor: 'text-amber-200',
    glowColor: 'rgba(251, 191, 36, 0.9)',
    icon: '⚡👑',
    title: 'Rank 8: God',
  },
];

export interface PlayerProfile {
  name: string;
  avatar: string; // Emoji
  matchesPlayed: number; // Strictly excluding AI matches
  wins: number; // Strictly excluding AI matches
  losses: number; // Strictly excluding AI matches
  currentStreak: number;
  bestStreak: number;
  createdAt: number;
  hasCompletedOnboarding: boolean;
}

export const AVATAR_PRESETS = [
  '🦊', '🐯', '🦁', '🐼', '🦄', '🐲', 
  '⚡', '👑', '🚀', '🎯', '🔥', '💎',
  '👾', '🎮', '🪐', '🌟', '🍕', '🛡️'
];

const STORAGE_KEY = 'colorwars_player_profile';

export function getRankForWins(wins: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (wins >= RANK_TIERS[i].minWins) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export function getNextRank(currentRank: RankTier): RankTier | null {
  const currentIndex = RANK_TIERS.findIndex((r) => r.id === currentRank.id);
  if (currentIndex >= 0 && currentIndex < RANK_TIERS.length - 1) {
    return RANK_TIERS[currentIndex + 1];
  }
  return null;
}

export function getDefaultProfile(): PlayerProfile {
  return {
    name: '',
    avatar: '🦊',
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    createdAt: Date.now(),
    hasCompletedOnboarding: false,
  };
}

export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const fallbackName = localStorage.getItem('cw_player_name') || '';

    if (!raw) {
      if (fallbackName && fallbackName.trim().length > 0) {
        const migrated: PlayerProfile = {
          ...getDefaultProfile(),
          name: fallbackName.trim(),
          hasCompletedOnboarding: true,
        };
        savePlayerProfile(migrated);
        return migrated;
      }
      return getDefaultProfile();
    }

    const parsed = JSON.parse(raw);
    const existingName = (typeof parsed.name === 'string' ? parsed.name : fallbackName).trim();
    const hasValidName = existingName.length > 0;

    return {
      name: existingName,
      avatar: typeof parsed.avatar === 'string' && parsed.avatar ? parsed.avatar : '🦊',
      matchesPlayed: Number(parsed.matchesPlayed) || 0,
      wins: Number(parsed.wins) || 0,
      losses: Number(parsed.losses) || 0,
      currentStreak: Number(parsed.currentStreak) || 0,
      bestStreak: Number(parsed.bestStreak) || 0,
      createdAt: Number(parsed.createdAt) || Date.now(),
      // Remember account: if a name already exists, onboarding is strictly completed and will not re-prompt
      hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding || hasValidName),
    };
  } catch {
    return getDefaultProfile();
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    if (profile.name && profile.name.trim()) {
      localStorage.setItem('cw_player_name', profile.name.trim());
    }
  } catch (e) {
    console.error('Failed to save player profile to localStorage', e);
  }
}

/**
 * Record a completed non-AI match outcome.
 * AI games must NEVER invoke this function.
 */
export function recordPvPMatchResult(isWin: boolean): PlayerProfile {
  const current = loadPlayerProfile();
  const nextStreak = isWin ? current.currentStreak + 1 : 0;
  const updated: PlayerProfile = {
    ...current,
    matchesPlayed: current.matchesPlayed + 1,
    wins: isWin ? current.wins + 1 : current.wins,
    losses: isWin ? current.losses : current.losses + 1,
    currentStreak: nextStreak,
    bestStreak: Math.max(current.bestStreak, nextStreak),
  };
  savePlayerProfile(updated);
  return updated;
}
