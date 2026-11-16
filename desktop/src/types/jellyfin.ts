export interface DiscoveredServer {
  id: string;
  name: string;
  address: string;
  endpointAddress?: string;
  version?: string;
  source: 'udp' | 'lan-scan' | 'manual' | 'local';
  pingMs?: number;
  wizardCompleted?: boolean;
}

export interface UserSession {
  userId: string;
  username: string;
  accessToken: string;
  serverId: string;
  serverAddress: string;
  serverName: string;
}

export interface JellyfinLibrary {
  Id: string;
  Name: string;
  CollectionType?: string;
  Type: string;
}

export interface MediaItem {
  Id: string;
  Name: string;
  Type: string; // 'Movie', 'Series', 'Episode', 'Audio', 'Photo', 'Folder'
  RunTimeTicks?: number;
  ProductionYear?: number;
  CommunityRating?: number;
  Overview?: string;
  ImageTags?: {
    Primary?: string;
    Thumb?: string;
    Banner?: string;
    Backdrop?: string;
  };
  BackdropImageTags?: string[];
  ParentIndexNumber?: number;
  IndexNumber?: number;
  SeriesName?: string;
  Album?: string;
  Artists?: string[];
  Genres?: string[];
  Container?: string;
}
