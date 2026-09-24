import React, { useState } from 'react';
import { AVATAR_PRESETS, PlayerProfile, loadPlayerProfile, savePlayerProfile } from '../logic/playerProfile';
import { soundManager } from '../audio/soundManager';
import { Sparkles, User, ArrowRight } from 'lucide-react';

interface OnboardingNameModalProps {
  isOpen: boolean;
  onComplete: (profile: PlayerProfile) => void;
}

export const OnboardingNameModal: React.FC<OnboardingNameModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [name, setName] = useState(() => loadPlayerProfile().name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(() => loadPlayerProfile().avatar || '🦊');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter your nickname');
      return;
    }
    if (cleanName.length > 18) {
      setError('Name must be 18 characters or less');
      return;
    }

    soundManager.playVictory();

    const existing = loadPlayerProfile();
    const newProfile: PlayerProfile = {
      ...existing,
      name: cleanName,
      avatar: selectedAvatar,
      hasCompletedOnboarding: true,
    };

    savePlayerProfile(newProfile);
    onComplete(newProfile);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#181b28] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-white">
        {/* Soft UI Glowing background accents */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-purple-500/20 border border-white/15 text-3xl shadow-inner mb-3">
            {selectedAvatar}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            Welcome, Commander! <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Choose your avatar and enter your nickname to begin your Color Wars journey.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Select Avatar
            </label>
            <div className="grid grid-cols-6 gap-2 bg-[#12141e] p-2.5 rounded-2xl border border-white/5 max-h-32 overflow-y-auto custom-scrollbar">
              {AVATAR_PRESETS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => {
                    setSelectedAvatar(avatar);
                    soundManager.playDotAdd(1);
                  }}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedAvatar === avatar
                      ? 'bg-gradient-to-br from-purple-500/40 to-amber-500/40 border-2 border-amber-300 scale-110 shadow-md'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
              Player Nickname
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Phoenix, Shadow, Alex..."
                maxLength={18}
                autoFocus
                className="w-full bg-[#12141e] border border-white/15 focus:border-amber-400 rounded-2xl px-4 py-3 pl-11 text-white text-base font-bold placeholder-neutral-500 focus:outline-none shadow-inner transition-colors"
              />
              <User className="absolute left-3.5 top-3.5 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>
            {error && <p className="text-xs text-red-400 mt-1.5 font-medium">{error}</p>}
          </div>

          {/* Initial Rank Info Notice */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-xs text-neutral-400 flex items-center gap-2">
            <span className="text-base">🤡</span>
            <span>You will start as Rank 1: <strong className="text-neutral-200">Fool</strong>. Win non-AI matches to rank up all the way to <strong className="text-amber-300">God</strong>!</span>
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-[0.98] text-neutral-900 shadow-[0_8px_25px_rgba(251,191,36,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Enter Color Wars</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
