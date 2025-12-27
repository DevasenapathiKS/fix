# FIXZEP — Backend API System

Production-grade backend for Fixzep, a service marketplace for on-demand home services (plumbing, electrical, installation, civil works). Built with Node.js, Express, MongoDB, and Mongoose with JWT-based RBAC.

## 1. Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

- Update `.env` with Mongo URI, JWT secret, and notification topics.
- Dev server runs on `http://57.159.28.81:4000` by default.
- Interactive Swagger UI available at `http://57.159.28.81:4000/docs` (raw spec at `/docs.json`).

## 2. Folder Structure

```
fixzep/
├── package.json
├── .env.example
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── env.js
│   │   └── database.js
│   ├── constants/
│   │   └── index.js
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── order.controller.js
│   │   ├── payment.controller.js
│   │   └── technician.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validate.middleware.js
│   ├── models/
│   │   ├── availability.model.js
│   │   ├── calendar.model.js
│   │   ├── jobcard.model.js
│   │   ├── order.model.js
│   │   ├── payment.model.js
│   │   ├── service-category.model.js
│   │   ├── service-item.model.js
│   │   ├── spare-part.model.js
│   │   ├── technician-profile.model.js
│   │   └── user.model.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── index.js
│   │   ├── order.routes.js
│   │   ├── payment.routes.js
│   │   └── technician.routes.js
│   ├── services/
│   │   ├── admin.service.js
│   │   ├── assignment.service.js
│   │   ├── auth.service.js
│   │   ├── jobcard.service.js
│   │   ├── notification.service.js
│   │   ├── order.service.js
│   │   ├── payment.service.js
│   │   └── technician.service.js
│   └── utils/
│       ├── api-error.js
│       ├── async-handler.js
│       ├── availability.js
│       ├── response.js
│       └── time-slots.js
├── frontend/
│   ├── package.json
│   ├── README.md
│   └── (React admin console)
└── docs/
  └── architecture.md
```

## 3. High-Level Modules
- **Authentication** – Admin/Technician login with JWT and role guard middleware.
- **Orders** – Customer order intake, scheduling, status tracking, reschedules with audit history.
- **Technician Management** – Skill profiles, availability calendar, slot blocking.
- **Assignment Workflow** – Skill validation, availability checks, calendar blocking, notifications.
- **Job Execution** – Technician check-ins, jobcard editing (extra work, spare parts, estimates).
- **Payments** – Cash/UPI capture, jobcard locking, webhook placeholder.
- **Notifications** – Pluggable service ready for FCM/SNS integration.
- **Admin APIs** – Catalog management, spare parts, time slots, technician availability, order filters.

### Admin Frontend (React)
- Located under `frontend/`, built with Vite + TypeScript + Tailwind.
- Implements admin login, orders dashboard, technician assignment, catalog management, spare parts, and user creation flows.
- Configure `.env` with `VITE_API_URL` then run `npm install && npm run dev` inside `frontend/`.

## 4. Database Relationships
- `User (admin/technician)` ↔ `TechnicianProfile` (1:1)
- `ServiceCategory` → `ServiceItem` (1:N)
- `Order` → `JobCard` (1:1) and references `ServiceCategory`, `ServiceItem`, `User (technician)`
- `JobCard` → `Payment` (1:N)
- `TechnicianAvailability` defines weekly schedule; `TechnicianCalendar` stores concrete bookings per order.
- `SparePart` referenced inside `JobCard.sparePartsUsed` for audit & inventory.

## 5. Core Utilities
- `time-slots.js` – Generates dynamic slots honoring configured working hours and 60m granularity (configurable).
- `availability.js` – Slot overlap detection & calendar blocking helper.
- `notification.service.js` – Console-based stub; swap `dispatch` with actual FCM/SNS integration later.
- `api-error.js` & `error.middleware.js` – Centralized error propagation.

## 6. API Surface

| Module | Method | Path | Description | Auth |
| --- | --- | --- | --- | --- |
| Auth | POST | `/api/auth/login` | Admin/technician login | Public |
| Orders | POST | `/api/orders` | Customer places order | Public |
| Orders | GET | `/api/orders` | List orders (filter) | Admin |
| Orders | GET | `/api/orders/:id` | Order detail | Admin |
| Orders | POST | `/api/orders/:id/reschedule` | Reschedule & notify | Admin |
| Admin | GET | `/api/admin/orders` | Admin order dashboard | Admin |
| Admin | POST | `/api/admin/orders/:orderId/assign` | Assign technician | Admin |
| Admin | GET | `/api/admin/technicians/:technicianId/availability` | View availability | Admin |
| Admin | POST | `/api/admin/users` | Create admin/technician user | Admin |
| Admin | POST | `/api/admin/categories` | Add/edit category | Admin |
| Admin | POST | `/api/admin/service-items` | Add/edit service item | Admin |
| Admin | POST | `/api/admin/spare-parts` | Add/edit spare part | Admin |
| Admin | GET | `/api/admin/time-slots` | List reusable time slot templates | Admin |
| Admin | POST | `/api/admin/time-slots` | Create a new time slot template | Admin |
| Admin | PUT | `/api/admin/time-slots/:timeSlotId` | Update a time slot template | Admin |
| Admin | DELETE | `/api/admin/time-slots/:timeSlotId` | Remove a time slot template | Admin |
| Technician | POST | `/api/technician/availability` | Update working slots | Technician |
| Technician | GET | `/api/technician/availability` | View availability | Technician |
| Technician | POST | `/api/technician/jobcards/:jobCardId/check-in` | Check-in w/ GPS | Technician |
| Technician | POST | `/api/technician/jobcards/:jobCardId/extra-work` | Add extra work | Technician |
| Technician | POST | `/api/technician/jobcards/:jobCardId/spare-parts` | Record parts used | Technician |
| Technician | POST | `/api/technician/jobcards/:jobCardId/estimate` | Update estimate | Technician |
| Technician | POST | `/api/technician/jobcards/:jobCardId/complete` | Mark job done | Technician |
| Payments | POST | `/api/payments` | Record payment (cash/UPI) | Admin |
| Payments | POST | `/api/payments/webhook` | Inbound processor webhook | Public |

## 7. Sample Postman Requests

Each object can be imported into Postman as a raw request.

<details>
<summary>Auth – Admin Login</summary>

```json
{
  "name": "Admin Login",
  "request": {
    "method": "POST",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "url": "{{baseUrl}}/api/auth/login",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"email\": \"admin@fixzep.com\",\n  \"password\": \"Pass@123\",\n  \"role\": \"admin\"\n}"
    }
  }
}
```
</details>

<details>
<summary>Orders – Customer Creates Order</summary>

```json
{
  "name": "Create Order",
  "request": {
    "method": "POST",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "url": "{{baseUrl}}/api/orders",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"customer\": {\n    \"name\": \"Riya Singh\",\n    \"phone\": \"+911234567890\",\n    \"addressLine1\": \"221B Baker Street\",\n    \"city\": \"Bangalore\",\n    \"state\": \"KA\",\n    \"postalCode\": \"560001\"\n  },\n  \"serviceCategory\": \"{{categoryId}}\",\n  \"serviceItem\": \"{{serviceItemId}}\",\n  \"scheduledAt\": \"2025-11-26T09:00:00+05:30\",\n  \"timeWindowStart\": \"2025-11-26T09:00:00+05:30\",\n  \"timeWindowEnd\": \"2025-11-26T11:00:00+05:30\",\n  \"notes\": \"Need ceiling fan installation\"\n}"
    }
  }
}
```
</details>

<details>
<summary>Admin – Assign Technician</summary>

```json
{
  "name": "Assign Technician",
  "request": {
    "method": "POST",
    "header": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Authorization", "value": "Bearer {{adminToken}}" }
    ],
    "url": "{{baseUrl}}/api/admin/orders/{{orderId}}/assign",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"technicianId\": \"{{technicianUserId}}\"\n}"
    }
  }
}
```
</details>

<details>
<summary>Admin – Create Technician User</summary>

```json
{
  "name": "Create Technician",
  "request": {
    "method": "POST",
    "header": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Authorization", "value": "Bearer {{adminToken}}" }
    ],
    "url": "{{baseUrl}}/api/admin/users",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"name\": \"Arun Kumar\",\n  \"email\": \"arun.tech@fixzep.com\",\n  \"phone\": \"+919876543210\",\n  \"password\": \"Tech@123\",\n  \"role\": \"technician\",\n  \"serviceItems\": [\"{{serviceItemId}}\"],\n  \"skills\": [\"Fan installation\", \"Wiring\"],\n  \"experienceYears\": 5\n}"
    }
  }
}
```
</details>

<details>
<summary>Technician – Job Check-in</summary>

```json
{
  "name": "Technician Check-In",
  "request": {
    "method": "POST",
    "header": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Authorization", "value": "Bearer {{technicianToken}}" }
    ],
    "url": "{{baseUrl}}/api/technician/jobcards/{{jobCardId}}/check-in",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"lat\": 12.9716,\n  \"lng\": 77.5946,\n  \"note\": \"Reached customer site\"\n}"
    }
  }
}
```
</details>

<details>
<summary>Payment – Capture Cash</summary>

```json
{
  "name": "Record Payment",
  "request": {
    "method": "POST",
    "header": [
      { "key": "Content-Type", "value": "application/json" },
      { "key": "Authorization", "value": "Bearer {{adminToken}}" }
    ],
    "url": "{{baseUrl}}/api/payments",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"orderId\": \"{{orderId}}\",\n  \"jobCardId\": \"{{jobCardId}}\",\n  \"method\": \"cash\",\n  \"amount\": 1850,\n  \"transactionRef\": \"CASH-1850\"\n}"
    }
  }
}
```
</details>

## 8. Time Slot & Availability Workflow
1. Admin defines technician skills (TechnicianProfile.serviceItems) and availability (`TechnicianAvailability`).
2. Customers request slots; order creation stores preferred window.
3. `AssignmentService.assignTechnician` checks skill match + `TechnicianCalendar` overlaps before blocking.
4. Reschedules push order to `RESCHEDULED`, emit notifications, and free up technicians manually if required.

## 9. Notifications
`notification.service.js` currently logs events. Integrate FCM by replacing `dispatch` with actual SDK call. Events triggered:
- `ORDER_CREATED` – on customer order placement (admin topic)
- `TECHNICIAN_ASSIGNED` – when admin assigns a technician (admin + specific technician topic)
- `ORDER_RESCHEDULED` – when schedule changes (admin + technician)
- `JOB_UPDATED` – on technician check-ins/updates (admin)

## 10. Optional Improvements
1. Integrate Firebase Cloud Messaging for push notifications.
2. Add customer authentication plus self-service order history.
3. Implement automated technician matching & suggestions before admin confirmation.
4. Add webhooks/events for payment gateways (Razorpay/Stripe) with signature verification.
5. Build comprehensive analytics dashboards (technician utilization, SLA adherence).
6. Add pagination to listing endpoints and caching for service catalog.
7. Integrate background jobs (BullMQ) for reminders and follow-ups.

## 11. Testing & Quality
- Add unit tests for services (Jest) and contract tests for controllers.
- Use MongoMemoryServer for isolated test runs.
- Configure CI (GitHub Actions) with lint + test jobs.

> ✅ Backend is ready for deployment — connect to real notification/payment providers and plug this API into your admin + technician + customer apps.
