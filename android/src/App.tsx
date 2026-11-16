import React, { useState, useEffect, useCallback } from 'react';
import {
  Tv,
  Radio,
  Server,
  LogOut,
  RefreshCw,
  Search,
  Plus,
  Play,
  Film,
  Folder,
  Music,
  Star,
  Clock,
  ArrowLeft,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { DiscoveredServer, UserSession, JellyfinLibrary, MediaItem } from './types/jellyfin';
import { jellyfinApi } from './services/jellyfinApi';
import { scanMobileNetwork } from './services/discovery';

const STORAGE_KEY_SESSION = 'autojellyfin_mobile_session';
const STORAGE_KEY_SERVER = 'autojellyfin_mobile_server';

export const App: React.FC = () => {
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedServer, setSelectedServer] = useState<DiscoveredServer | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [libraries, setLibraries] = useState<JellyfinLibrary[]>([]);
  const [activeLibraryId, setActiveLibraryId] = useState<string>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [viewMode, setViewMode] = useState<'native' | 'web'>('native');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Manual IP input
  const [manualIp, setManualIp] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    try {
      await scanMobileNetwork((newServer) => {
        setServers((prev) => {
          const map = new Map<string, DiscoveredServer>();
          prev.forEach((s) => map.set(s.id, s));
          map.set(newServer.id, newServer);
          return Array.from(map.values());
        });
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
      const savedServer = localStorage.getItem(STORAGE_KEY_SERVER);
      if (savedSession && savedServer) {
        setUserSession(JSON.parse(savedSession));
        setSelectedServer(JSON.parse(savedServer));
      } else {
        setShowDiscovery(true);
        startScan();
      }
    } catch {
      setShowDiscovery(true);
      startScan();
    }
  }, [startScan]);

  const loadMedia = useCallback(async () => {
    if (!userSession) return;
    setLoadingItems(true);
    try {
      const [libs, mediaItems] = await Promise.all([
        jellyfinApi.getLibraries(userSession.serverAddress, userSession.userId, userSession.accessToken),
        jellyfinApi.getItems(
          userSession.serverAddress,
          userSession.userId,
          userSession.accessToken,
          activeLibraryId === 'all' ? undefined : activeLibraryId,
          searchTerm
        ),
      ]);
      setLibraries(libs);
      setItems(mediaItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  }, [userSession, activeLibraryId, searchTerm]);

  useEffect(() => {
    if (userSession) loadMedia();
  }, [userSession, activeLibraryId, searchTerm, loadMedia]);

  const handleSelectServer = (server: DiscoveredServer) => {
    setSelectedServer(server);
    setShowDiscovery(false);
    setShowLogin(true);
    setLoginError(null);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    let url = manualIp.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = `http://${url}`;
    if (!url.match(/:\d+$/)) url = `${url}:8096`;

    setManualLoading(true);
    const info = await jellyfinApi.getPublicInfo(url);
    setManualLoading(false);

    if (info) {
      const s: DiscoveredServer = {
        id: info.Id || url,
        name: info.ServerName || 'Custom Server',
        address: url,
        version: info.Version,
        source: 'manual',
        wizardCompleted: info.StartupWizardCompleted !== false,
      };
      setServers((prev) => [s, ...prev.filter((x) => x.id !== s.id)]);
      handleSelectServer(s);
      setManualIp('');
    } else {
      alert('Could not connect to Jellyfin at ' + url);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer || !username.trim()) return;
    setLoginLoading(true);
    setLoginError(null);

    try {
      const session = await jellyfinApi.authenticate(selectedServer.address, username.trim(), password);
      setUserSession(session);
      setShowLogin(false);
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      localStorage.setItem(STORAGE_KEY_SERVER, JSON.stringify(selectedServer));
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check username and password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    setShowDiscovery(true);
    startScan();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Tv className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-cyan-400 to-indigo-300 bg-clip-text text-transparent">
            AutoJellyFin
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedServer && (
            <button
              onClick={() => setShowDiscovery(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 max-w-[140px] truncate"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">{selectedServer.name}</span>
            </button>
          )}

          {userSession && (
            <>
              <button
                onClick={() => setViewMode((m) => (m === 'native' ? 'web' : 'native'))}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{viewMode === 'web' ? 'Web' : 'App'}</span>
              </button>
              <button onClick={handleLogout} className="p-1.5 rounded-lg bg-slate-800 text-rose-400">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main View */}
      {userSession ? (
        viewMode === 'native' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search bar */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search media..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Library Pills */}
            <div className="px-3 py-2 flex gap-2 overflow-x-auto border-b border-slate-800/60 bg-slate-900/20 shrink-0">
              <button
                onClick={() => setActiveLibraryId('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  activeLibraryId === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                All
              </button>
              {libraries.map((lib) => (
                <button
                  key={lib.Id}
                  onClick={() => setActiveLibraryId(lib.Id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    activeLibraryId === lib.Id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {lib.Name}
                </button>
              ))}
            </div>

            {/* Media Items Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {loadingItems ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[2/3] bg-slate-800 rounded-xl" />
                  ))}
                </div>
              ) : items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {items.map((item) => (
                    <div
                      key={item.Id}
                      onClick={() => setPlayingItem(item)}
                      className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col active:scale-95 transition-transform"
                    >
                      <div className="aspect-[2/3] relative bg-slate-800 flex items-center justify-center">
                        {item.ImageTags?.Primary ? (
                          <img
                            src={jellyfinApi.getImageUrl(
                              userSession.serverAddress,
                              item.Id,
                              'Primary',
                              item.ImageTags.Primary,
                              300
                            )}
                            alt={item.Name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="w-8 h-8 text-slate-600" />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white/80 fill-current" />
                        </div>
                      </div>
                      <div className="p-2">
                        <h4 className="text-xs font-semibold text-slate-100 truncate">{item.Name}</h4>
                        <span className="text-[10px] text-slate-400">{item.ProductionYear || item.Type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs">
                  No media items found in this library.
                </div>
              )}
            </div>
          </div>
        ) : (
          <iframe
            src={`${userSession.serverAddress}/web/index.html`}
            className="flex-1 w-full h-full border-0"
            title="Jellyfin Mobile Web"
          />
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
            <Radio className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white">AutoJellyFin Android</h2>
          <p className="text-xs text-slate-400 max-w-xs mt-1 mb-6">
            Searching your hostel Wi-Fi for Jellyfin media servers...
          </p>
          <button
            onClick={() => {
              setShowDiscovery(true);
              startScan();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25"
          >
            Find Servers
          </button>
        </div>
      )}

      {/* Video Player Modal */}
      {playingItem && userSession && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between">
          <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setPlayingItem(null)}
              className="p-2 rounded-full bg-slate-900/60 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-white truncate max-w-[200px]">
              {playingItem.Name}
            </span>
          </div>

          <video
            src={jellyfinApi.getStreamUrl(userSession.serverAddress, playingItem.Id, userSession.accessToken)}
            controls
            autoPlay
            playsInline
            className="w-full max-h-[85vh] object-contain"
          />

          <div className="h-6" />
        </div>
      )}

      {/* Discovery Bottom Sheet / Modal */}
      {showDiscovery && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl max-h-[85vh] flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 text-cyan-400 ${isScanning ? 'animate-spin' : ''}`} />
                <h3 className="font-bold text-sm text-white">Hostel Jellyfin Servers</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={startScan}
                  disabled={isScanning}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Scan</span>
                </button>
                <button onClick={() => setShowDiscovery(false)} className="p-1 text-slate-400 text-sm">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {servers.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectServer(s)}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between active:bg-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="font-semibold text-xs text-white">{s.name}</h4>
                      <p className="font-mono text-[10px] text-slate-400">{s.address}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">
                    Connect
                  </span>
                </div>
              ))}

              {servers.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">
                  {isScanning ? 'Scanning Wi-Fi subnet...' : 'No servers discovered automatically.'}
                </p>
              )}

              {/* Manual IP Add */}
              <form onSubmit={handleManualAdd} className="pt-2 flex gap-2">
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="Manual IP (e.g. 192.168.0.201:8096)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                />
                <button
                  type="submit"
                  disabled={manualLoading || !manualIp.trim()}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-cyan-400"
                >
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && selectedServer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5">
            <h3 className="font-bold text-base text-white text-center">Sign In</h3>
            <p className="text-xs text-center text-cyan-400 font-mono mt-1 mb-4">{selectedServer.name}</p>

            {loginError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 text-xs mb-3">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
                  placeholder="Username"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-100"
                    placeholder="Password (if any)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs mt-3 flex items-center justify-center gap-2"
              >
                {loginLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Log In & Watch'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLogin(false);
                  setShowDiscovery(true);
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-1"
              >
                Change Server
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
