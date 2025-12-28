# Fixzep Client Portal (React)

Executive-grade customer workspace for Fixzep. Built with React 19, Vite, TypeScript, React Router, TanStack Query, React Hook Form, and a minimalist corporate design system.

## 1. Getting Started

```bash
cd client
npm install
cp .env.example .env        # optional helper - see env section
npm run dev
```

The portal boots on `admin.eopsys.xyz:5173`. Point `VITE_API_URL` to the running Fixzep backend (defaults to `admin.eopsys.xyz/api`).

## 2. Environment

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_URL` | Base URL for Fixzep backend REST API | `admin.eopsys.xyz/api` |

Environment variables must be prefixed with `VITE_` for Vite to expose them at build time.

## 3. Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production bundle |
| `npm run lint` | Run ESLint over the project |

## 4. Feature Highlights

- **Authentication** – Customer login & registration backed by the `/customer/auth/*` APIs with persisted JWT session.
- **Command Center Dashboard** – KPI tiles, upcoming visits, technician presence, and quick scheduling.
- **Services Catalog + Booking Wizard** – Browse categories, pick addresses, reserve pro-level slots, and create orders end-to-end.
- **Order Lifecycle** – Filterable order list, detail view with approvals, technician tracking, invoice summary, and customer rating capture.
- **Payments Hub** – Initiate customer payments (cash / UPI), surface QR payloads, and confirm receipts.
- **Profiles & Addresses** – Manage multiple service locations with default selection.

## 5. Tech Stack & Structure

```

├── components/        # Design system + layout shell
├── config/            # Environment helpers
├── hooks/             # Zustand selectors & helpers
├── pages/             # Route-level screens (auth, dashboard, services, etc.)
├── router/            # Route table + guards
├── services/          # API client bindings
├── store/             # Zustand auth store
├── types/             # Shared TypeScript models
└── utils/             # Formatters, error helpers
```

## 6. API Integration Notes

- All HTTP calls flow through `src/lib/api-client.ts`, which automatically injects the JWT from the Zustand store and logs the user out on `401` responses.
- React Query powers data fetching/caching. Query keys follow `['entity', optionalContext]` naming to keep cache invalidation predictable.
- Forms use React Hook Form + Zod for schema validation and instant inline errors.
- Styling relies on CSS Modules with a shared token sheet in `src/index.css` for the corporate gradient/typography system.

## 7. Next Steps

- Plug the notification channel of your choice into the backend to light up real-time updates.
- Add analytics widgets or SLA charts by extending the dashboard query set.
- Wrap UPI payloads with a QR renderer for instant mobile scanning.

Happy shipping!
  },
