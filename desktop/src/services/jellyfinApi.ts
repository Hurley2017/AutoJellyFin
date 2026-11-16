import { JellyfinLibrary, MediaItem, UserSession } from '../types/jellyfin';

const CLIENT_NAME = 'AutoJellyFin';
const DEVICE_NAME = 'AutoJellyFin Client';
const DEVICE_ID = 'autojellyfin-desktop-app-v1';
const CLIENT_VERSION = '1.0.0';

function getAuthHeader(token?: string): string {
  let header = `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${CLIENT_VERSION}"`;
  if (token) {
    header += `, Token="${token}"`;
  }
  return header;
}

export const jellyfinApi = {
  // Login
  async authenticate(serverUrl: string, username: string, pw: string): Promise<UserSession> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': getAuthHeader(),
      },
      body: JSON.stringify({
        Username: username,
        Pw: pw,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Authentication failed (${res.status}): ${errorText || 'Invalid username or password'}`);
    }

    const data = await res.json();
    return {
      userId: data.User.Id,
      username: data.User.Name,
      accessToken: data.AccessToken,
      serverId: data.ServerId,
      serverAddress: cleanUrl,
      serverName: data.User.ServerName || 'Jellyfin Server',
    };
  },

  // Get user libraries / views
  async getLibraries(serverUrl: string, userId: string, token: string): Promise<JellyfinLibrary[]> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/Users/${userId}/Views`, {
      headers: {
        'X-Emby-Authorization': getAuthHeader(token),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to load libraries: ${res.statusText}`);
    }

    const data = await res.json();
    return data.Items || [];
  },

  // Get media items
  async getItems(
    serverUrl: string,
    userId: string,
    token: string,
    parentId?: string,
    searchTerm?: string
  ): Promise<MediaItem[]> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const params = new URLSearchParams({
      UserId: userId,
      Recursive: 'true',
      Fields: 'PrimaryImageAspectRatio,Overview,ProductionYear,CommunityRating,RunTimeTicks,Genres,BackdropImageTags',
      Limit: '100',
    });

    if (parentId && parentId !== 'all') {
      params.append('ParentId', parentId);
    }

    if (searchTerm && searchTerm.trim()) {
      params.append('SearchTerm', searchTerm.trim());
    }

    const res = await fetch(`${cleanUrl}/Users/${userId}/Items?${params.toString()}`, {
      headers: {
        'X-Emby-Authorization': getAuthHeader(token),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to load items: ${res.statusText}`);
    }

    const data = await res.json();
    return data.Items || [];
  },

  // Get image URL
  getImageUrl(
    serverUrl: string,
    itemId: string,
    imageType: 'Primary' | 'Backdrop' | 'Thumb' | 'Banner' = 'Primary',
    tag?: string,
    maxWidth: number = 400
  ): string {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    let url = `${cleanUrl}/Items/${itemId}/Images/${imageType}?maxWidth=${maxWidth}&quality=90`;
    if (tag) {
      url += `&tag=${tag}`;
    }
    return url;
  },

  // Direct video stream URL
  getStreamUrl(serverUrl: string, itemId: string, token: string): string {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    // Standard direct stream URL
    return `${cleanUrl}/Videos/${itemId}/stream?static=true&api_key=${token}`;
  },

  // Public server info
  async getPublicInfo(serverUrl: string) {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/System/Info/Public`);
    if (!res.ok) return null;
    return await res.json();
  },
};
