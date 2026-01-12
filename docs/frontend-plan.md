# Fixzep Admin Frontend Plan

## Stack
- React 18 + Vite
- TypeScript for type safety
- React Router v6 for routing
- TanStack Query for API data fetching/caching
- Axios for HTTP client
- Zustand for lightweight global auth state
- Tailwind CSS + Headless UI + Heroicons for rapid UI styling

## Screens
1. **Login** – Admin credential form, obtains JWT and stores securely.
2. **Dashboard Overview** – Quick stats (orders by status, technicians, upcoming jobs).
3. **Orders Management**
   - List/filter orders
   - View order detail sidebar
   - Reschedule modal
   - Assign technician drawer
4. **Technician Management**
   - List technicians (from users endpoint filtering role)
   - Create technician (uses Create User API)
   - View technician availability calendar
5. **Service Catalog**
   - Categories + service items CRUD
   - Spare parts management
6. **Payments**
   - Record payment form (optional for MVP, route wiring only)

## UI Layout
- Responsive two-column layout
- Left navigation rail with links for Dashboard / Orders / Technicians / Catalog / Payments / Settings
- Top bar with user info + logout

## API Integration Map
| Page | Endpoint |
| --- | --- |
| Login | `POST /api/auth/login` |
| Orders list | `GET /api/orders?status=...` |
| Order detail | `GET /api/orders/:id` |
| Reschedule | `POST /api/orders/:id/reschedule` |
| Assign technician | `POST /api/admin/orders/:orderId/assign` |
| Technician availability | `GET /api/admin/technicians/:id/availability` |
| Create technician | `POST /api/admin/users` |
| Categories list | `GET /api/admin/categories` |
| Service item list | `GET /api/admin/service-items` |
| Spare parts list | `GET /api/admin/spare-parts` |
| Category/service/spare CRUD | respective POST endpoints |

## Auth Flow
- Login form requests token
- Store token in memory (Zustand) + localStorage for persistence
- Axios interceptor injects `Authorization` header
- 401 response triggers logout redirect

## Styling
- Tailwind config with Fixzep primary palette (#374151 / #1d4ed8) and accent (#f97316)
- Use Headless UI Dialogs for modals/drawers, Heroicons for consistent iconography

## Additional Enhancements
- Skeleton loaders + toast notifications (react-hot-toast)
- Error boundaries per route
- Reusable form components using React Hook Form + Zod validation

This plan will guide the implementation of the admin React application.
