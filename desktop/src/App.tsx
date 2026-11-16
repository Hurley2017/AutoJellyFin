import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ServerDiscoveryModal } from './components/ServerDiscoveryModal';
import { LoginModal } from './components/LoginModal';
import { MediaBrowser } from './components/MediaBrowser';
import { VideoPlayer } from './components/VideoPlayer';
import { ServerSetupBanner } from './components/ServerSetupBanner';
import { DiscoveredServer, UserSession, JellyfinLibrary, MediaItem } from './types/jellyfin';
import { jellyfinApi } from './services/jellyfinApi';

const STORAGE_KEY_SESSION = 'autojellyfin_user_session';
const STORAGE_KEY_SERVER = 'autojellyfin_last_server';

export const App: React.FC = () => {
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [localIps, setLocalIps] = useState<string[]>([]);

  const [selectedServer, setSelectedServer] = useState<DiscoveredServer | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [libraries, setLibraries] = useState<JellyfinLibrary[]>([]);
  const [activeLibraryId, setActiveLibraryId] = useState<string>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [playingItem, setPlayingItem] = useState<MediaItem | null>(null);
  const [viewMode, setViewMode] = useState<'native' | 'web'>('native');

  // Load saved session or start server discovery
  useEffect(() => {
    // 1. Fetch host local IPs
    if ((window as any).jellyfinDesktop?.getLocalIps) {
      (window as any).jellyfinDesktop.getLocalIps().then((ips: string[]) => {
        setLocalIps(ips || []);
      });
    }

    // 2. Setup discovery stream listener
    if ((window as any).jellyfinDesktop?.onDiscoveryUpdate) {
      const cleanup = (window as any).jellyfinDesktop.onDiscoveryUpdate((discoveredList: DiscoveredServer[]) => {
        setServers((prev) => {
          const map = new Map<string, DiscoveredServer>();
          prev.forEach((s) => map.set(s.id || s.address, s));
          discoveredList.forEach((s) => map.set(s.id || s.address, s));
          return Array.from(map.values());
        });
      });

      // Start initial scan
      triggerScan();

      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    } else {
      // Fallback for browser preview: check localhost
      jellyfinApi.getPublicInfo('http://127.0.0.1:8096').then((info) => {
        if (info) {
          const localServer: DiscoveredServer = {
            id: info.Id || 'local',
            name: info.ServerName || 'Local Host Jellyfin',
            address: 'http://127.0.0.1:8096',
            version: info.Version,
            source: 'local',
            wizardCompleted: info.StartupWizardCompleted !== false,
          };
          setServers([localServer]);
        }
      });
    }

    // 3. Restore session
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);
      const savedServer = localStorage.getItem(STORAGE_KEY_SERVER);
      if (savedSession && savedServer) {
        const session: UserSession = JSON.parse(savedSession);
        const server: DiscoveredServer = JSON.parse(savedServer);
        setUserSession(session);
        setSelectedServer(server);
      } else {
        // No session: open server discovery
        setShowDiscoveryModal(true);
      }
    } catch {
      setShowDiscoveryModal(true);
    }
  }, []);

  const triggerScan = useCallback(async () => {
    setIsScanning(true);
    try {
      if ((window as any).jellyfinDesktop?.discoverServers) {
        const results = await (window as any).jellyfinDesktop.discoverServers();
        if (results && results.length > 0) {
          setServers((prev) => {
            const map = new Map<string, DiscoveredServer>();
            prev.forEach((s) => map.set(s.id || s.address, s));
            results.forEach((s: DiscoveredServer) => map.set(s.id || s.address, s));
            return Array.from(map.values());
          });
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Fetch libraries & media items whenever session or active library changes
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
      console.error('Error loading media:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [userSession, activeLibraryId, searchTerm]);

  useEffect(() => {
    if (userSession) {
      loadMedia();
    }
  }, [userSession, activeLibraryId, searchTerm, loadMedia]);

  const handleSelectServer = (server: DiscoveredServer) => {
    setSelectedServer(server);
    setShowDiscoveryModal(false);
    setShowLoginModal(true);
  };

  const handleManualConnect = async (url: string): Promise<boolean> => {
    if ((window as any).jellyfinDesktop?.checkServer) {
      const server = await (window as any).jellyfinDesktop.checkServer(url);
      if (server) {
        setServers((prev) => {
          const map = new Map<string, DiscoveredServer>();
          prev.forEach((s) => map.set(s.id || s.address, s));
          map.set(server.id || server.address, server);
          return Array.from(map.values());
        });
        handleSelectServer(server);
        return true;
      }
    } else {
      const info = await jellyfinApi.getPublicInfo(url);
      if (info) {
        const server: DiscoveredServer = {
          id: info.Id || url,
          name: info.ServerName || 'Custom Server',
          address: url,
          version: info.Version,
          source: 'manual',
          wizardCompleted: info.StartupWizardCompleted !== false,
        };
        handleSelectServer(server);
        return true;
      }
    }
    return false;
  };

  const handleLogin = async (username: string, password: string, remember: boolean) => {
    if (!selectedServer) return;
    const session = await jellyfinApi.authenticate(selectedServer.address, username, password);
    setUserSession(session);
    setShowLoginModal(false);

    if (remember) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
      localStorage.setItem(STORAGE_KEY_SERVER, JSON.stringify(selectedServer));
    }
  };

  const handleLogout = () => {
    setUserSession(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    setShowDiscoveryModal(true);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        currentServer={selectedServer}
        userSession={userSession}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenDiscovery={() => setShowDiscoveryModal(true)}
        onLogout={handleLogout}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((m) => (m === 'native' ? 'web' : 'native'))}
      />

      {/* Warning banner if server is fresh & needs setup wizard */}
      {selectedServer && <ServerSetupBanner server={selectedServer} />}

      {/* Main View Area */}
      {userSession ? (
        viewMode === 'native' ? (
          <MediaBrowser
            libraries={libraries}
            items={items}
            activeLibraryId={activeLibraryId}
            onSelectLibrary={setActiveLibraryId}
            onPlayItem={(item) => setPlayingItem(item)}
            userSession={userSession}
            loading={loadingItems}
          />
        ) : (
          /* Embedded Official Jellyfin Web Interface */
          <div className="flex-1 w-full h-full bg-slate-950">
            <iframe
              src={`${userSession.serverAddress}/web/index.html`}
              className="w-full h-full border-0"
              title="Jellyfin Web"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            />
          </div>
        )
      ) : (
        /* Welcome / Server Not Connected Hero Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-900/40 via-slate-950 to-slate-950">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/20 mb-6">
            <span className="text-3xl font-black text-white">AJ</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-indigo-300 to-white bg-clip-text text-transparent">
            AutoJellyFin
          </h1>
          <p className="text-sm text-slate-400 max-w-md mt-2 mb-8 leading-relaxed">
            Auto-discovering Jellyfin servers across your local Wi-Fi and hostel network. Click below to view available servers or connect directly.
          </p>

          <button
            onClick={() => setShowDiscoveryModal(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>Scan Network & Select Server</span>
          </button>
        </div>
      )}

      {/* Video Player Overlay */}
      {playingItem && userSession && (
        <VideoPlayer
          item={playingItem}
          userSession={userSession}
          onClose={() => setPlayingItem(null)}
        />
      )}

      {/* Server Discovery Modal */}
      <ServerDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        servers={servers}
        isScanning={isScanning}
        onRescan={triggerScan}
        onSelectServer={handleSelectServer}
        onManualConnect={handleManualConnect}
        localIps={localIps}
      />

      {/* Login Modal */}
      {selectedServer && (
        <LoginModal
          isOpen={showLoginModal}
          server={selectedServer}
          onLogin={handleLogin}
          onChangeServer={() => {
            setShowLoginModal(false);
            setShowDiscoveryModal(true);
          }}
        />
      )}
    </div>
  );
};

export default App;
