import { DiscoveredServer } from '../types/jellyfin';
import { jellyfinApi } from './jellyfinApi';

export async function scanMobileNetwork(
  onServerFound: (server: DiscoveredServer) => void
): Promise<DiscoveredServer[]> {
  const discoveredMap = new Map<string, DiscoveredServer>();

  const checkCandidate = async (url: string, source: 'local' | 'lan-scan') => {
    const start = Date.now();
    const info = await jellyfinApi.getPublicInfo(url, 1200);
    if (info && (info.Id || info.ServerName)) {
      const pingMs = Date.now() - start;
      const s: DiscoveredServer = {
        id: info.Id || url,
        name: info.ServerName || 'Jellyfin Server',
        address: url,
        version: info.Version,
        source,
        pingMs,
        wizardCompleted: info.StartupWizardCompleted !== false,
      };
      if (!discoveredMap.has(s.id)) {
        discoveredMap.set(s.id, s);
        onServerFound(s);
      }
    }
  };

  // 1. Immediately check emulator host & local
  await Promise.all([
    checkCandidate('http://10.0.2.2:8096', 'local'),
    checkCandidate('http://localhost:8096', 'local'),
    checkCandidate('http://127.0.0.1:8096', 'local'),
  ]);

  // 2. Scan standard hostel subnets
  const candidateSubnets = [
    '192.168.0',
    '192.168.1',
    '192.168.43', // Android Hotspot default subnet
    '10.0.0',
  ];

  // Concurrently scan the most likely IPs (.1 to .254) in batches
  for (const subnet of candidateSubnets) {
    const commonIps: string[] = [];
    // Prioritize lower and common server IPs first
    for (let i = 1; i <= 254; i++) {
      commonIps.push(`${subnet}.${i}`);
    }

    const batchSize = 25;
    for (let i = 0; i < commonIps.length; i += batchSize) {
      const batch = commonIps.slice(i, i + batchSize);
      await Promise.all(
        batch.map((ip) => checkCandidate(`http://${ip}:8096`, 'lan-scan'))
      );
      // If we found a server on this subnet, prioritize finishing it
      if (discoveredMap.size > 0 && subnet === candidateSubnets[0]) {
        // Continue but yield
      }
    }
  }

  return Array.from(discoveredMap.values());
}
