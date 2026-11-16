import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as dgram from 'dgram';
import * as os from 'os';
import * as http from 'http';

interface DiscoveredServer {
  id: string;
  name: string;
  address: string;
  endpointAddress?: string;
  version?: string;
  source: 'udp' | 'lan-scan' | 'manual' | 'local';
  pingMs?: number;
  wizardCompleted?: boolean;
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'AutoJellyFin',
    backgroundColor: '#020617',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Required to stream from LAN HTTP IPs without CORS/mixed content issues
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window controls
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('open-external', async (_, url: string) => {
  if (url) {
    await shell.openExternal(url);
  }
});

// Get local IPv4 addresses
function getLocalIPv4s(): { ip: string; subnet: string; broadcast: string }[] {
  const interfaces = os.networkInterfaces();
  const results: { ip: string; subnet: string; broadcast: string }[] = [];

  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;

    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        if (parts.length === 4) {
          const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
          const broadcast = `${parts[0]}.${parts[1]}.${parts[2]}.255`;
          results.push({ ip: iface.address, subnet, broadcast });
        }
      }
    }
  }
  return results;
}

ipcMain.handle('get-local-ips', () => {
  return getLocalIPv4s().map((i) => i.ip);
});

// Fast HTTP probe for Jellyfin public info
function probeJellyfinHttp(url: string, timeoutMs: number = 1500): Promise<Partial<DiscoveredServer> | null> {
  return new Promise((resolve) => {
    try {
      const cleanUrl = url.replace(/\/+$/, '');
      const parsed = new URL(`${cleanUrl}/System/Info/Public`);
      const startTime = Date.now();

      const req = http.get(
        parsed,
        {
          timeout: timeoutMs,
          headers: {
            Accept: 'application/json',
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const info = JSON.parse(data);
              const pingMs = Date.now() - startTime;
              resolve({
                id: info.Id || cleanUrl,
                name: info.ServerName || 'Jellyfin Server',
                address: cleanUrl,
                version: info.Version,
                wizardCompleted: info.StartupWizardCompleted !== false,
                pingMs,
              });
            } catch {
              resolve(null);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });

      req.on('error', () => {
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

// Single server manual check
ipcMain.handle('check-server', async (_, targetUrl: string) => {
  let url = targetUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  if (!url.match(/:\d+$/)) {
    url = `${url}:8096`;
  }
  const result = await probeJellyfinHttp(url, 2500);
  if (result && result.id) {
    return {
      ...result,
      source: 'manual',
    } as DiscoveredServer;
  }
  return null;
});

// Network Discovery Handler (UDP 7359 + Local Subnet Fast Probe + Localhost)
ipcMain.handle('discover-servers', async (event) => {
  const discoveredMap = new Map<string, DiscoveredServer>();

  const emitServers = () => {
    const list = Array.from(discoveredMap.values());
    event.sender.send('discovery-update', list);
  };

  // 1. Immediately check localhost / 127.0.0.1
  const localPromise = (async () => {
    const localTargets = ['http://127.0.0.1:8096', 'http://localhost:8096'];
    for (const target of localTargets) {
      const info = await probeJellyfinHttp(target, 800);
      if (info && info.id) {
        discoveredMap.set(info.id, {
          id: info.id,
          name: info.name || 'Local Host Jellyfin',
          address: info.address || target,
          version: info.version,
          source: 'local',
          pingMs: info.pingMs || 1,
          wizardCompleted: info.wizardCompleted,
        });
        emitServers();
        break;
      }
    }
  })();

  // 2. Start UDP Discovery (Port 7359)
  const udpPromise = new Promise<void>((resolve) => {
    let client: dgram.Socket | null = null;
    try {
      client = dgram.createSocket('udp4');

      client.on('error', (err) => {
        console.error('UDP Discovery error:', err);
        try {
          client?.close();
        } catch {}
        resolve();
      });

      client.on('message', async (msg, rinfo) => {
        try {
          const raw = msg.toString('utf-8');
          const data = JSON.parse(raw);
          const serverId = data.Id || data.Address || rinfo.address;
          const address = data.Address || `http://${rinfo.address}:8096`;

          // Verify and enrich with public info
          const enriched = await probeJellyfinHttp(address, 1200);

          discoveredMap.set(serverId, {
            id: serverId,
            name: (enriched?.name) || data.Name || `Jellyfin (${rinfo.address})`,
            address: address,
            endpointAddress: data.EndpointAddress || rinfo.address,
            version: enriched?.version,
            source: 'udp',
            pingMs: enriched?.pingMs,
            wizardCompleted: enriched?.wizardCompleted,
          });
          emitServers();
        } catch (e) {
          console.error('Error parsing UDP message:', e);
        }
      });

      client.bind(() => {
        try {
          client?.setBroadcast(true);
          const packet = Buffer.from('who is JellyfinServer?');
          
          // Send broadcast to 255.255.255.255
          client?.send(packet, 0, packet.length, 7359, '255.255.255.255');

          // Send to each network interface's broadcast address
          const localIfaces = getLocalIPv4s();
          for (const iface of localIfaces) {
            client?.send(packet, 0, packet.length, 7359, iface.broadcast);
          }
        } catch (e) {
          console.error('Failed to send UDP broadcast:', e);
        }
      });

      // Keep listening for 4 seconds
      setTimeout(() => {
        try {
          client?.close();
        } catch {}
        resolve();
      }, 4000);
    } catch {
      resolve();
    }
  });

  // 3. Subnet Fast Ping (in case AP isolation drops UDP)
  const subnetPromise = (async () => {
    const localIfaces = getLocalIPv4s();
    if (localIfaces.length === 0) return;

    // Concurrently scan the local /24 subnet (e.g. 192.168.0.1 - 254)
    // We chunk it into batches of 32 for optimal concurrency without socket exhaustion
    const primarySubnet = localIfaces[0].subnet;
    const currentHostIp = localIfaces[0].ip;
    const ipsToScan: string[] = [];

    for (let i = 1; i <= 254; i++) {
      const ip = `${primarySubnet}.${i}`;
      if (ip !== currentHostIp) {
        ipsToScan.push(ip);
      }
    }

    const batchSize = 32;
    for (let i = 0; i < ipsToScan.length; i += batchSize) {
      const batch = ipsToScan.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (ip) => {
          const candidateUrl = `http://${ip}:8096`;
          const info = await probeJellyfinHttp(candidateUrl, 800);
          if (info && info.id) {
            if (!discoveredMap.has(info.id)) {
              discoveredMap.set(info.id, {
                id: info.id,
                name: info.name || `Hostel Jellyfin (${ip})`,
                address: candidateUrl,
                endpointAddress: ip,
                version: info.version,
                source: 'lan-scan',
                pingMs: info.pingMs,
                wizardCompleted: info.wizardCompleted,
              });
              emitServers();
            }
          }
        })
      );
    }
  })();

  await Promise.all([localPromise, udpPromise, subnetPromise]);

  return Array.from(discoveredMap.values());
});
