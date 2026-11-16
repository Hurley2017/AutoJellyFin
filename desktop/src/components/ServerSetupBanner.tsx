import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { DiscoveredServer } from '../types/jellyfin';

interface ServerSetupBannerProps {
  server: DiscoveredServer;
}

export const ServerSetupBanner: React.FC<ServerSetupBannerProps> = ({ server }) => {
  if (server.wizardCompleted !== false) return null;

  const handleOpenSetup = () => {
    (window as any).jellyfinDesktop?.openExternal?.(server.address);
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>{server.name}</strong> is fresh and requires completing the initial Jellyfin Setup Wizard (create admin account & media folders).
        </span>
      </div>
      <button
        onClick={handleOpenSetup}
        className="flex items-center gap-1 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium border border-amber-500/30 transition-all shrink-0 ml-4"
      >
        <span>Open Jellyfin Setup Wizard</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
