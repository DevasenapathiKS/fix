# Fixzep Admin Frontend

Modern React admin console designed for the Fixzep backend. Built with Vite + TypeScript, Tailwind, React Query, and a bespoke UI system.

## Quick Start

```bash
cd frontend
cp .env.example .env          # configure VITE_API_URL to backend server
npm install
npm run dev
```

Visit http://localhost:5173 and log in with an admin user from the backend API.

## Features
- JWT login with persistent session via `AuthContext`.
- Protected dashboard layout with responsive sidebar/topbar.
- Orders console: status filters, technician assignment modal, reschedule dialog tied to live APIs.
- Catalog builder: manage service categories/items.
- Spare parts inventory manager.
- Admin/technician onboarding form with skill checklist.
- Toast notifications, React Query caching, Tailwind component system.

## Structure
```
src/
├── context/AuthContext.tsx
├── router/AppRouter.tsx
├── layouts/DashboardLayout.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── OrdersPage.tsx
│   ├── CatalogPage.tsx
│   ├── SparePartsPage.tsx
│   └── CreateUserPage.tsx
├── components/
│   ├── common (Sidebar, Topbar, ProtectedRoute)
│   └── ui (Button, Card, Modal, Input, Select, Badge, TextArea)
├── services/ (apiClient, adminApi)
├── store/uiStore.ts
├── lib/queryClient.ts
├── types/
└── utils/format.ts
```

## Environment
- `VITE_API_URL` — backend base URL (defaults to http://localhost:4000/api if unset)

## Production Build
```bash
npm run build
npm run preview
```

Deploy `dist/` via any static host (Vercel, Netlify, S3). Ensure backend CORS allows the deployed origin.
