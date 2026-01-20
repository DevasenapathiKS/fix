# Fixzep Admin Frontend

Modern React admin console designed for the Fixzep backend. Built with Vite + TypeScript, Tailwind, React Query, and a bespoke UI system.

**Now available as a standalone desktop application!** 🖥️

## Quick Start

### Web Development
```bash
cd frontend
cp .env.example .env          # configure VITE_API_URL to backend server
npm install
npm run dev
```

Visit https://fixzep.com and log in with an admin user from the backend API.

### Desktop App Development
```bash
npm run electron:dev
```
This starts both the Vite dev server and Electron simultaneously. The app will auto-reload on code changes.

## Desktop App (Standalone)

### Build for Your Platform

```bash
# Build for current platform
npm run electron:build

# Build for specific platforms
npm run electron:build:mac    # macOS (.dmg, .zip)
npm run electron:build:win    # Windows (.exe, portable)
npm run electron:build:linux  # Linux (.AppImage, .deb)
```

### Build Output
After building, you'll find the installers in the `release/` directory:
- **macOS**: `Fixzep Admin-{version}.dmg`, `Fixzep Admin-{version}-mac.zip`
- **Windows**: `Fixzep Admin Setup {version}.exe`, `Fixzep Admin {version}.exe` (portable)
- **Linux**: `Fixzep Admin-{version}.AppImage`, `fixzep-admin_{version}_amd64.deb`

### Custom Icons
To use custom app icons, place your icons in the `public/` folder:
- `icon.icns` - macOS icon (512x512 recommended)
- `icon.ico` - Windows icon
- `icon.png` - Linux icon (512x512 recommended)

You can generate these from `icon.svg` using tools like:
- [electron-icon-maker](https://www.npmjs.com/package/electron-icon-maker)
- [iconutil](https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html) (macOS)

## Features
- 🔐 JWT login with persistent session via `AuthContext`
- 📊 Protected dashboard layout with responsive sidebar/topbar
- 📦 Orders console: status filters, technician assignment modal, reschedule dialog tied to live APIs
- 📋 Catalog builder: manage service categories/items
- 🔧 Spare parts inventory manager
- 👷 Admin/technician onboarding form with skill checklist
- 🔔 Real-time WebSocket notifications with sound
- 🖥️ Native desktop app with system tray integration
- 💬 Toast notifications, React Query caching, Tailwind component system

## Structure
```
frontend/
├── electron/               # Electron main process files
│   ├── main.cjs            # Main process entry point
│   └── preload.cjs         # Preload script for secure IPC
├── src/
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── SocketContext.tsx  # WebSocket notifications
│   ├── router/AppRouter.tsx
│   ├── layouts/DashboardLayout.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── CatalogPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── TechniciansPage.tsx
│   │   ├── SparePartsPage.tsx
│   │   └── CreateUserPage.tsx
│   ├── components/
│   │   ├── common (Sidebar, Topbar, ProtectedRoute)
│   │   └── ui (Button, Card, Modal, Drawer, Input, Select, Badge, TextArea)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useElectron.ts  # Desktop app utilities
│   ├── services/ (apiClient, adminApi)
│   ├── store/uiStore.ts
│   ├── lib/queryClient.ts
│   ├── types/
│   │   ├── index.ts
│   │   └── electron.d.ts   # Electron API types
│   └── utils/format.ts
├── public/
│   ├── notification.wav    # Notification sound
│   ├── icon.svg            # App icon source
│   └── vite.svg
└── release/                # Built installers output
```

## Environment Variables
- `VITE_API_URL` — Backend base URL (defaults to admin.eopsys.xyz/api if unset)

Example `.env`:
```env
VITE_API_URL=https://admin.fixzep.com/api
```

## Production Build

### Web Build
```bash
npm run build
npm run preview
```
Deploy `dist/` via any static host (Vercel, Netlify, S3). Ensure backend CORS allows the deployed origin.

### Desktop Build
```bash
npm run electron:build
```
Distribute the installers from the `release/` folder.

## Desktop App Features
- **System Tray**: Minimize to tray, quick access menu
- **Native Notifications**: System-level notifications for new orders and updates
- **Auto-updates**: (Coming soon) Automatic app updates
- **Offline Support**: (Coming soon) Basic offline functionality

## Troubleshooting

### Electron not starting
Make sure both Vite dev server and Electron are ready:
```bash
npm run dev  # Start web server first
# Then in another terminal:
npx electron .
```

### Build errors on Windows
Ensure you have the necessary build tools:
```bash
npm install --global windows-build-tools
```

### macOS code signing
For distribution, you'll need an Apple Developer certificate. Set in your environment:
```bash
export CSC_LINK=path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
```
