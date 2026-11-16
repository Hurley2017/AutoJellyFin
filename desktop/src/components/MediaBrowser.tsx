import React from 'react';
import {
  Play,
  Film,
  Tv,
  Music,
  Folder,
  Star,
  Clock,
  FolderPlus,
  ExternalLink,
} from 'lucide-react';
import { JellyfinLibrary, MediaItem, UserSession } from '../types/jellyfin';
import { jellyfinApi } from '../services/jellyfinApi';

interface MediaBrowserProps {
  libraries: JellyfinLibrary[];
  items: MediaItem[];
  activeLibraryId: string;
  onSelectLibrary: (libId: string) => void;
  onPlayItem: (item: MediaItem) => void;
  userSession: UserSession;
  loading: boolean;
}

export const MediaBrowser: React.FC<MediaBrowserProps> = ({
  libraries,
  items,
  activeLibraryId,
  onSelectLibrary,
  onPlayItem,
  userSession,
  loading,
}) => {
  const formatDuration = (ticks?: number) => {
    if (!ticks) return '';
    const totalMinutes = Math.floor(ticks / 600000000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getLibraryIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'movies':
        return <Film className="w-3.5 h-3.5" />;
      case 'tvshows':
      case 'series':
        return <Tv className="w-3.5 h-3.5" />;
      case 'music':
      case 'audio':
        return <Music className="w-3.5 h-3.5" />;
      default:
        return <Folder className="w-3.5 h-3.5" />;
    }
  };

  const openAdminInBrowser = () => {
    (window as any).jellyfinDesktop?.openExternal?.(userSession.serverAddress);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Library Filter Bar */}
      <div className="h-12 border-b border-slate-800/80 px-6 flex items-center gap-2 overflow-x-auto bg-slate-900/30">
        <button
          onClick={() => onSelectLibrary('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeLibraryId === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>All Media</span>
        </button>

        {libraries.map((lib) => (
          <button
            key={lib.Id}
            onClick={() => onSelectLibrary(lib.Id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeLibraryId === lib.Id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {getLibraryIcon(lib.CollectionType || lib.Type)}
            <span>{lib.Name}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-slate-800/50 rounded-xl" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => {
              const imageUrl = jellyfinApi.getImageUrl(
                userSession.serverAddress,
                item.Id,
                'Primary',
                item.ImageTags?.Primary,
                300
              );

              return (
                <div
                  key={item.Id}
                  onClick={() => onPlayItem(item)}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all cursor-pointer transform hover:-translate-y-1"
                >
                  {/* Poster Image */}
                  <div className="aspect-[2/3] relative bg-slate-800 overflow-hidden flex items-center justify-center">
                    {item.ImageTags?.Primary ? (
                      <img
                        src={imageUrl}
                        alt={item.Name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-500 bg-gradient-to-b from-slate-800 to-slate-900 text-center">
                        <Film className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium text-slate-400 line-clamp-2">{item.Name}</span>
                      </div>
                    )}

                    {/* Play Button Overlay on Hover */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/50 transform scale-75 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>

                    {/* Rating Badge */}
                    {item.CommunityRating && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>{item.CommunityRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="p-3">
                    <h3 className="font-semibold text-xs text-slate-100 group-hover:text-cyan-300 line-clamp-1">
                      {item.Name}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      {item.ProductionYear && <span>{item.ProductionYear}</span>}
                      {item.RunTimeTicks && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-slate-500" />
                          {formatDuration(item.RunTimeTicks)}
                        </span>
                      )}
                      <span className="uppercase font-mono text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 ml-auto">
                        {item.Type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-500 mb-4">
              <FolderPlus className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">No Media Found in This Library</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              If this is a new Jellyfin server, add your media folders (Movies, TV Series, Music) in the Jellyfin Dashboard.
            </p>
            <button
              onClick={openAdminInBrowser}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all"
            >
              <span>Manage Libraries on Jellyfin</span>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
