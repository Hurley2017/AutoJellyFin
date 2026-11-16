# 🍿 AutoJellyFin

> **Zero-configuration Jellyfin client for Windows and Android with automatic hostel & local network server discovery.**

AutoJellyFin solves the classic hostel & home LAN dilemma: IP addresses change constantly with DHCP, and nobody wants to memorize or re-type server IPs (`http://192.168.x.x:8096`). With AutoJellyFin, simply launch the app—it automatically sweeps the local network, discovers every hosted Jellyfin server on the Wi-Fi/LAN, displays their names and ping times, and lets you log in with your credentials and start watching immediately.

---

## 🚀 Key Features

- **⚡ Automatic Hostel & LAN Discovery:**
  - **UDP Port 7359 Broadcast:** Sends the standard Jellyfin `"who is JellyfinServer?"` discovery beacon to broadcast addresses.
  - **Concurrent Subnet Fast Ping:** Scans local IPv4 `/24` subnets (e.g. `192.168.0.1`–`254`) concurrently on port `8096` to bypass strict router AP client isolation often found in hostel/college networks.
  - **Instant Localhost Detection:** Immediately identifies if the local machine is running Jellyfin.
  - **Manual Fallback:** Add custom IPs, hostnames, or VPN addresses in one click.
- **💻 Windows Client (Electron + React 19 + Vite + Tailwind CSS):**
  - Frameless modern dark UI with custom draggable titlebar and window controls.
  - Fast media browsing with poster cards, ratings, runtimes, and metadata.
  - Built-in video player with seekbar, volume, shortcuts (Spacebar, Arrows, Escape), and fullscreen support.
  - **Dual Mode:** Instant toggle between the lightweight custom player and the full official Jellyfin Web interface.
- **📱 Android Client (Capacitor + Android Native Project):**
  - Native Android project configured in `android/android` ready to open in Android Studio.
  - Mobile-first responsive touch layout with gesture-friendly media browsing and video playback.
  - `usesCleartextTraffic` configured so Android connects to local HTTP LAN IPs without restriction.
- **🖥️ Integrated Windows Jellyfin Server:**
  - Portable Jellyfin Server installed at `%LOCALAPPDATA%\Programs\Jellyfin\jellyfin`.
  - Convenient 1-click startup script and Windows Firewall unblock script.

---

## 📁 Repository Structure

```
AutoJellyFin/
├── desktop/                  # Windows Electron App
│   ├── electron/
│   │   ├── main.ts           # Main process, UDP 7359 discovery & subnet scan engine
│   │   └── preload.ts        # Context bridge for safe renderer communication
│   ├── src/
│   │   ├── components/       # UI (Header, DiscoveryModal, LoginModal, MediaBrowser, VideoPlayer)
│   │   ├── services/         # Jellyfin API client & discovery hooks
│   │   ├── types/            # TypeScript definitions
│   │   ├── App.tsx           # Main application orchestrator
│   │   └── main.tsx
│   ├── dist-electron/        # Compiled Electron main process
│   ├── dist-renderer/        # Compiled Vite frontend
│   └── release/              # Packaged Windows binaries (AutoJellyFin.exe)
│
├── android/                  # Android Mobile Client
│   ├── android/              # Native Android Studio project (Gradle, AndroidManifest)
│   ├── src/                  # Mobile React UI & LAN discovery
│   ├── capacitor.config.json # Capacitor native configuration
│   └── dist/                 # Compiled mobile bundle synced into Android assets
│
├── scripts/
│   ├── start-jellyfin.bat    # 1-click launcher for local Jellyfin Server
│   └── setup-firewall.bat    # Opens ports 8096 & 7359 in Windows Firewall
│
└── package.json              # Monorepo root workspace scripts
```

---

## 🛠️ Quick Start

### 1. Running the Jellyfin Server on this Laptop

Jellyfin Server 12.4.0 is installed in `%LOCALAPPDATA%\Programs\Jellyfin\jellyfin`.

To start the server:
```cmd
scripts\start-jellyfin.bat
```
or from the root workspace:
```bash
npm run server:start
```

- Web Dashboard: [http://localhost:8096](http://localhost:8096)
- **First Time Setup:** If you haven't completed the Jellyfin startup wizard yet, visit [http://localhost:8096](http://localhost:8096) in your browser to create your admin username/password and add your media libraries (Movies, TV Shows, Anime, Music).

> **Important for Hostel Wi-Fi:** Run `scripts\setup-firewall.bat` as Administrator once to ensure Windows Firewall doesn't block incoming connections from other laptops or phones on your Wi-Fi!

---

### 2. Windows Client (Electron)

#### Run in Development Mode:
```bash
npm run desktop:dev
```

#### Run Packaged Build:
You can directly run the compiled executable:
```bash
.\desktop\release\win-unpacked\AutoJellyFin.exe
```

#### Build Installer / Executable:
```bash
npm run desktop:build
npm run desktop:package    # Creates release/win-unpacked directory
npm run desktop:dist       # Generates standalone installer and portable .exe
```

---

### 3. Android Client

#### Run in Mobile Dev Server:
```bash
npm run android:dev
```

#### Sync & Build Android APK:
```bash
npm run android:sync
```
To open the project in **Android Studio**:
```bash
npm run android:open
```
Inside Android Studio:
1. Connect your Android phone via USB (or start an Android Emulator).
2. Click **Run** (`Shift + F10`) or navigate to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 📡 How Server Discovery Works

AutoJellyFin uses a hybrid discovery mechanism designed specifically to overcome hostel and campus network limitations:

```
                  [ AutoJellyFin Client ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ UDP Port 7359 Probe ]          [ Concurrent Subnet Ping ]
   "who is JellyfinServer?"         HTTP GET :8096/System/Info/Public
            │                                 │
            ├───────────────┬─────────────────┤
            ▼               ▼                 ▼
     [ Localhost ]   [ Wi-Fi Host 1 ]   [ Wi-Fi Host 2 ]
```

1. **UDP Broadcast (Port 7359):** Sends a datagram message `"who is JellyfinServer?"` to `255.255.255.255` and local subnet broadcast addresses. Any Jellyfin server on the subnet responds with its server details and JSON payload.
2. **Subnet Fast Scan:** In hostels where the Wi-Fi router blocks UDP broadcast (client isolation), AutoJellyFin scans all IP addresses on the local `/24` subnet concurrently with a fast 800ms HTTP timeout probing `/System/Info/Public`.
3. **Local Machine Check:** Probes `127.0.0.1:8096` and `localhost:8096` to automatically find your own server without any network roundtrips.

---

## 🔒 Security & Privacy

- Credentials are authenticated directly against your local Jellyfin server via `POST /Users/AuthenticateByName`.
- All tokens are stored safely in local application storage.
- No third-party servers or telemetry: streaming happens 100% peer-to-peer over your local hostel/home Wi-Fi network.

---

## 📜 License

MIT License. Open source and free for personal and community use.
