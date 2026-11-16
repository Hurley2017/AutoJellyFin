import React, { useState } from 'react';
import {
  Radio,
  Server,
  RefreshCw,
  Plus,
  Wifi,
  Laptop,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { DiscoveredServer } from '../types/jellyfin';

interface ServerDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: DiscoveredServer[];
  isScanning: boolean;
  onRescan: () => void;
  onSelectServer: (server: DiscoveredServer) => void;
  onManualConnect: (url: string) => Promise<boolean>;
  localIps: string[];
}

export const ServerDiscoveryModal: React.FC<ServerDiscoveryModalProps> = ({
  isOpen,
  onClose,
  servers,
  isScanning,
  onRescan,
  onSelectServer,
  onManualConnect,
  localIps,
}) => {
  const [manualIp, setManualIp] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  if (!isOpen) return null;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    setManualLoading(true);
    setManualError(null);
    try {
      const ok = await onManualConnect(manualIp.trim());
      if (!ok) {
        setManualError('No Jellyfin server found at that address. Make sure port 8096 is open.');
      } else {
        setManualIp('');
      }
    } catch (err: any) {
      setManualError(err.message || 'Failed to reach server');
    } finally {
      setManualLoading(false);
    }
  };

  const copyLocalIp = () => {
    if (localIps.length > 0) {
      navigator.clipboard.writeText(`http://${localIps[0]}:8096`);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  const openSetup = (address: string) => {
    (window as any).jellyfinDesktop?.openExternal?.(address);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Network Jellyfin Servers
                {isScanning && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-normal animate-pulse">
                    <Radio className="w-3 h-3 animate-spin" /> Scanning Hostel LAN...
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Auto-discovering Jellyfin media servers running on your Wi-Fi & local network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRescan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Rescan</span>
            </button>
            {servers.length > 0 && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Server List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Hostel Host Share Tip Banner */}
          {localIps.length > 0 && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs text-indigo-300">
                <Laptop className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  This laptop IP on Wi-Fi: <strong className="text-white">{localIps[0]}</strong> (Port 8096)
                </span>
              </div>
              <button
                onClick={copyLocalIp}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-medium border border-indigo-500/30 transition-all"
                title="Copy Server URL to share with hostel friends"
              >
                {copiedIp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedIp ? 'Copied URL!' : 'Share URL'}</span>
              </button>
            </div>
          )}

          {/* Discovered Server Cards */}
          {servers.length > 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Discovered Servers ({servers.length})</span>
                <span className="text-[11px] text-slate-500 font-normal">Click a server to connect</span>
              </div>

              {servers.map((server) => (
                <div
                  key={server.id || server.address}
                  className="group relative p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/50 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-100 group-hover:text-cyan-300 text-sm">
                          {server.name}
                        </h4>
                        {server.version && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-mono">
                            v{server.version}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 font-medium">
                          {server.source === 'udp' ? 'UDP 7359' : server.source === 'local' ? 'Local Host' : 'LAN Probe'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1">
                        <span className="font-mono text-slate-300">{server.address}</span>
                        {server.pingMs !== undefined && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {server.pingMs}ms
                          </span>
                        )}
                      </div>
                      {server.wizardCompleted === false && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] text-amber-300 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            New server: Needs initial setup wizard
                          </span>
                          <button
                            onClick={() => openSetup(server.address)}
                            className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            Open Setup Wizard <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectServer(server)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Connect</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500">
                <Radio className={`w-8 h-8 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                {isScanning ? 'Scanning Local Network...' : 'No Jellyfin Servers Found Yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {isScanning
                  ? 'Listening for UDP announcements and scanning local IP ranges...'
                  : 'Ensure Jellyfin is running on this laptop or another device connected to this Wi-Fi.'}
              </p>
            </div>
          )}

          {/* Manual Server Connect Form */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              Connect by IP Address manually
            </h4>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="e.g. 192.168.0.150:8096 or http://my-hostel-jellyfin:8096"
                className="flex-1 bg-slate-950/70 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={manualLoading || !manualIp.trim()}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {manualLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Add Server'}
              </button>
            </form>
            {manualError && (
              <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {manualError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
