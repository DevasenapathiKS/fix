# Fixzep Admin Frontend Plan

## Stack
- React 18 + Vite + TypeScript
- React Router DOM for routing
- Axios + React Query for API consumption
- Tailwind CSS + Headless UI primitives
- Zustand for lightweight global state (auth modal + drawer)

## Key Screens
1. **Login** – Admin JWT authentication and token persistence.
2. **Dashboard Overview** – KPIs, quick actions.
3. **Orders** – List/filter orders, inline technician assignment modal, reschedule panel.
4. **Technicians** – Availability viewer (read-only) and quick profile info.
5. **Catalog** – Manage service categories, service items, spare parts.
6. **Users** – Create Admin/Technician users via form (with skill selectors).

## Routes
```
/
/login
/orders
/orders/:orderId
/catalog
/spare-parts
/users/new
```

## State & Data Flow
- `AuthContext` handles login/logout, stores token in localStorage, attaches to Axios.
- `apiClient` configures base URL and interceptors for error messaging.
- React Query caches admin datasets (`orders`, `categories`, `serviceItems`, `spareParts`).

## UI System
- Tailwind base + custom theme tokens.
- Shared components: `Button`, `Card`, `Input`, `Select`, `Modal`, `DataTable`, `Tag`, `Sidebar`, `Topbar`.

## Integration Points
- Login → `POST /api/auth/login` with role `admin`.
- Orders list → `GET /api/orders`.
- Assign technician → `POST /api/admin/orders/:orderId/assign`.
- Catalog management → `POST /api/admin/categories`, `POST /api/admin/service-items` etc.
- Spare parts → `GET/POST /api/admin/spare-parts`.
- Create user → `POST /api/admin/users`.

## Enhancements
- Add toast notifications via `react-hot-toast`.
- Dark mode toggle storing preference.
- Responsive layout for tablet/desktop.
