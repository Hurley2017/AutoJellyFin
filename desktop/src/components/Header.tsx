import React from 'react';
import {
  Server,
  LogOut,
  Minus,
  Square,
  X,
  Search,
  Tv,
  Globe,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { UserSession, DiscoveredServer } from '../types/jellyfin';

interface HeaderProps {
  currentServer: DiscoveredServer | null;
  userSession: UserSession | null;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onOpenDiscovery: () => void;
  onLogout: () => void;
  viewMode: 'native' | 'web';
  onToggleViewMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentServer,
  userSession,
  searchTerm,
  onSearchChange,
  onOpenDiscovery,
  onLogout,
  viewMode,
  onToggleViewMode,
}) => {
  const isElectron = typeof window !== 'undefined' && (window as any).jellyfinDesktop;

  const handleMinimize = () => {
    (window as any).jellyfinDesktop?.minimize?.();
  };

  const handleMaximize = () => {
    (window as any).jellyfinDesktop?.maximize?.();
  };

  const handleClose = () => {
    (window as any).jellyfinDesktop?.close?.();
  };

  const openServerInBrowser = () => {
    if (currentServer?.address) {
      (window as any).jellyfinDesktop?.openExternal?.(currentServer.address);
    }
  };

  return (
    <header className="drag-region h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 select-none z-50">
      {/* Brand & Server Badge */}
      <div className="flex items-center gap-3 no-drag">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Tv className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-cyan-400 via-indigo-300 to-white bg-clip-text text-transparent">
            AutoJellyFin
          </span>
        </div>

        {/* Server Status Pill */}
        {currentServer ? (
          <button
            onClick={onOpenDiscovery}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 transition-all hover:border-cyan-500/50 group"
            title="Click to switch or scan servers"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
            <span className="font-medium text-slate-200 group-hover:text-cyan-400 max-w-[140px] truncate">
              {currentServer.name}
            </span>
            {currentServer.pingMs !== undefined && (
              <span className="text-[10px] text-slate-400">{currentServer.pingMs}ms</span>
            )}
            <Server className="w-3 h-3 text-slate-400 group-hover:text-cyan-400" />
          </button>
        ) : (
          <button
            onClick={onOpenDiscovery}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/50 text-xs text-cyan-300 transition-all animate-pulse-subtle"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>Find Servers</span>
          </button>
        )}
      </div>

      {/* Center Search Bar (Visible when logged in & in native mode) */}
      {userSession && viewMode === 'native' && (
        <div className="flex-1 max-w-md mx-4 no-drag">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search movies, series, music..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Right Controls: View Switcher, User & Window Actions */}
      <div className="flex items-center gap-2 no-drag">
        {userSession && (
          <>
            {/* View Mode Toggle */}
            <button
              onClick={onToggleViewMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                viewMode === 'web'
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Toggle between Native App and Official Jellyfin Web Interface"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{viewMode === 'web' ? 'Web UI' : 'Native UI'}</span>
            </button>

            {/* Open in Browser */}
            <button
              onClick={openServerInBrowser}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
              title="Open Server in External Browser"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* User Info & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span className="text-xs font-medium text-slate-300">{userSession.username}</span>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                title="Disconnect & Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Window controls for frameless Electron window */}
        {isElectron && (
          <div className="flex items-center ml-2 border-l border-slate-800 pl-2">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded hover:bg-rose-600 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
