import { contextBridge, ipcRenderer } from 'electron';

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

contextBridge.exposeInMainWorld('jellyfinDesktop', {
  discoverServers: (): Promise<DiscoveredServer[]> => ipcRenderer.invoke('discover-servers'),
  checkServer: (url: string): Promise<DiscoveredServer | null> => ipcRenderer.invoke('check-server', url),
  getLocalIps: (): Promise<string[]> => ipcRenderer.invoke('get-local-ips'),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url),
  onDiscoveryUpdate: (callback: (servers: DiscoveredServer[]) => void) => {
    const listener = (_: any, servers: DiscoveredServer[]) => callback(servers);
    ipcRenderer.on('discovery-update', listener);
    return () => ipcRenderer.removeListener('discovery-update', listener);
  },
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
});
