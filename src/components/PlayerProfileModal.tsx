import React, { useState } from 'react';
import {
  PlayerProfile,
  RANK_TIERS,
  getRankForWins,
  getNextRank,
  savePlayerProfile,
  AVATAR_PRESETS,
} from '../logic/playerProfile';
import { soundManager } from '../audio/soundManager';
import {
  X,
  Edit2,
  Check,
  Trophy,
  Flame,
  Award,
  Zap,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateProfile: (updated: PlayerProfile) => void;
  onOpenRules: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  onOpenRules,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(profile.name || 'Commander');
  const [tempAvatar, setTempAvatar] = useState(profile.avatar || '🦊');
  const [showLadder, setShowLadder] = useState(false);

  if (!isOpen) return null;

  const currentRank = getRankForWins(profile.wins);
  const nextRank = getNextRank(currentRank);

  const winRate =
    profile.matchesPlayed > 0
      ? Math.round((profile.wins / profile.matchesPlayed) * 100)
      : 0;

  // Calculate progress to next rank
  let rankProgressPercent = 100;
  let winsNeededForNext = 0;
  if (nextRank) {
    const range = nextRank.minWins - currentRank.minWins;
    const currentProgress = profile.wins - currentRank.minWins;
    rankProgressPercent = Math.min(
      100,
      Math.max(0, Math.round((currentProgress / range) * 100))
    );
    winsNeededForNext = nextRank.minWins - profile.wins;
  }

  const handleSaveEdit = () => {
    const cleanName = tempName.trim() || 'Commander';
    const updated: PlayerProfile = {
      ...profile,
      name: cleanName,
      avatar: tempAvatar,
    };
    savePlayerProfile(updated);
    onUpdateProfile(updated);
    setIsEditing(false);
    soundManager.playDotAdd(1);
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#181b28] border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-white my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
              Player Profile & Rank
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenRules();
              }}
              title="Game Rules"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Profile Card & Avatar Editing */}
        <div className="mt-4 p-4 rounded-2xl bg-[#12141e] border border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="relative group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-amber-500/20 border border-white/15 flex items-center justify-center text-3xl shadow-inner">
                  {isEditing ? tempAvatar : profile.avatar || '🦊'}
                </div>
              </div>

              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={18}
                    className="bg-[#1a1c29] border border-amber-400 rounded-xl px-3 py-1 text-sm font-bold text-white focus:outline-none w-40"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      {profile.name || 'Commander'}
                    </h3>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-neutral-400">Rank:</span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full border ${currentRank.badgeBg} ${currentRank.badgeBorder} ${currentRank.textColor}`}
                  >
                    {currentRank.icon} {currentRank.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit / Save Button */}
            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempName(profile.name);
                  setTempAvatar(profile.avatar);
                  setIsEditing(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-bold text-xs flex items-center gap-1.5 border border-white/5 cursor-pointer transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Avatar Preset Picker (when editing) */}
          {isEditing && (
            <div className="pt-2 border-t border-white/5">
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                Choose Avatar
              </label>
              <div className="grid grid-cols-6 gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                {AVATAR_PRESETS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setTempAvatar(av)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition cursor-pointer ${
                      tempAvatar === av
                        ? 'bg-amber-400/20 border-2 border-amber-300 scale-105'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current Rank Banner */}
        <div
          className={`mt-4 p-4 rounded-2xl border ${currentRank.badgeBg} ${currentRank.badgeBorder} relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{currentRank.icon}</span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Current Rank
                </div>
                <div
                  className={`text-xl font-black tracking-wide ${currentRank.textColor}`}
                >
                  {currentRank.name}
                  <span className="text-xs font-normal text-neutral-400 ml-2">
                    ({currentRank.originalConcept})
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-neutral-400">PvP Wins:</span>
              <div className="text-xl font-black text-amber-300">
                {profile.wins}
              </div>
            </div>
          </div>

          {/* Progress bar to next rank */}
          {nextRank ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-neutral-300 mb-1 font-semibold">
                <span>Next: {nextRank.name} ({nextRank.originalConcept})</span>
                <span className="text-amber-400">
                  {winsNeededForNext} {winsNeededForNext === 1 ? 'win' : 'wins'} needed
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-purple-400 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${rankProgressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>MAXIMUM RANK ACHIEVED! You are a supreme God of Color Wars!</span>
            </div>
          )}
        </div>

        {/* Non-AI PvP Stats Grid */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-300" />
              <span>Competitive Record (PvP / Online)</span>
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Matches */}
            <div className="p-3 rounded-2xl bg-[#12141e] border border-white/5 text-center">
              <div className="text-[11px] font-bold text-neutral-400 uppercase">
                Played
              </div>
              <div className="text-xl font-black text-white mt-0.5">
                {profile.matchesPlayed}
              </div>
            </div>

            {/* Wins */}
            <div className="p-3 rounded-2xl bg-[#12141e] border border-white/5 text-center">
              <div className="text-[11px] font-bold text-emerald-400 uppercase">
                Wins
              </div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {profile.wins}
              </div>
            </div>

            {/* Losses */}
            <div className="p-3 rounded-2xl bg-[#12141e] border border-white/5 text-center">
              <div className="text-[11px] font-bold text-red-400 uppercase">
                Losses
              </div>
              <div className="text-xl font-black text-red-400 mt-0.5">
                {profile.losses}
              </div>
            </div>

            {/* Win Rate */}
            <div className="p-3 rounded-2xl bg-[#12141e] border border-white/5 text-center">
              <div className="text-[11px] font-bold text-sky-400 uppercase">
                Win Rate
              </div>
              <div className="text-xl font-black text-sky-300 mt-0.5">
                {winRate}%
              </div>
            </div>

            {/* Current Streak */}
            <div className="p-3 rounded-2xl bg-[#12141e] border border-white/5 text-center">
              <div className="text-[11px] font-bold text-amber-400 uppercase flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Streak</span>
              </div>
              <div className="text-xl font-black text-amber-400 mt-0.5">
                {profile.currentStreak}
              </div>
            </div>

            {/* Best Streak */}
            <div className="p-3 rounded-2xl bg-[#12141e] border border-white/5 text-center">
              <div className="text-[11px] font-bold text-purple-400 uppercase flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3 text-purple-400" />
                <span>Best</span>
              </div>
              <div className="text-xl font-black text-purple-300 mt-0.5">
                {profile.bestStreak}
              </div>
            </div>
          </div>
        </div>

        {/* Notice: AI Matches are NOT counted */}
        <div className="mt-3.5 p-3 rounded-2xl bg-amber-950/30 border border-amber-500/20 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            All rankings and statistics count <strong>exclusively</strong> for non-AI matches (Pass & Play PvP and Online Multiplayer). AI training matches are excluded.
          </p>
        </div>

        {/* Rank Ladder Expandable Accordion */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowLadder(!showLadder)}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white py-1 cursor-pointer transition"
          >
            <span className="flex items-center gap-1.5">
              <span>View All Rank Tiers (Ladder)</span>
            </span>
            {showLadder ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showLadder && (
            <div className="mt-3 space-y-1.5 animate-fade-in">
              {RANK_TIERS.map((tier) => {
                const isCurrent = tier.id === currentRank.id;
                const isPassed = profile.wins >= tier.minWins;

                return (
                  <div
                    key={tier.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                      isCurrent
                        ? `${tier.badgeBg} ${tier.badgeBorder} border-2 shadow-md`
                        : isPassed
                        ? 'bg-white/5 border-white/10 text-neutral-300'
                        : 'bg-black/30 border-white/5 text-neutral-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{tier.icon}</span>
                      <div>
                        <span className={`font-black ${isCurrent ? tier.textColor : 'text-neutral-200'}`}>
                          {tier.name}
                        </span>
                        <span className="text-[11px] text-neutral-400 ml-1.5">
                          ({tier.originalConcept})
                        </span>
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                            Current
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="font-mono text-neutral-400 font-bold">
                      {tier.minWins === 0
                        ? '0 - 2 Wins'
                        : tier.maxWins === Infinity
                        ? `${tier.minWins}+ Wins`
                        : `${tier.minWins} - ${tier.maxWins} Wins`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
