import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-xl bg-neutral-900/90 text-white px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-xs border border-white/10 animate-pulse">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Offline Mode — Service Worker Active</span>
    </div>
  );
};
