# Fixzep Backend Architecture Plan

## Tech Stack
- Node.js 20 + Express
- MongoDB + Mongoose ODM
- JWT for authentication & RBAC
- Firebase Cloud Messaging (stub) for notifications
- Nodemon for local development

## High-Level Modules
1. **Authentication** – Login for admins and technicians, JWT issuance, role-based access middleware.
2. **Orders** – Customer order intake, category/sub-service selection, scheduling, admin notifications, status tracking.
3. **Technician Availability & Calendar** – Skill management, availability windows, generated time slots, calendar reservations.
4. **Assignment Workflow** – Technician matching, availability validation, calendar blocking, notifications.
5. **Job Execution** – Technician check-in, GPS logging, jobcard management, parts usage, estimates.
6. **Payments** – Capture payment info, lock jobcard on completion, webhook placeholder.
7. **Notifications** – Pluggable service for admin and technician events.
8. **Admin Panel APIs** – Service catalog management, spare parts, rescheduling, technician oversight.

## Folder Structure
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
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── order.controller.js
│   │   ├── technician.controller.js
│   │   └── payment.controller.js
│   ├── services/
│   │   ├── admin.service.js
│   │   ├── auth.service.js
│   │   ├── assignment.service.js
│   │   ├── notification.service.js
│   │   ├── order.service.js
│   │   ├── payment.service.js
│   │   ├── technician.service.js
│   │   └── jobcard.service.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── technician-profile.model.js
│   │   ├── service-category.model.js
│   │   ├── service-item.model.js
│   │   ├── spare-part.model.js
│   │   ├── availability.model.js
│   │   ├── calendar.model.js
│   │   ├── order.model.js
│   │   ├── jobcard.model.js
│   │   └── payment.model.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── index.js
│   │   ├── order.routes.js
│   │   ├── payment.routes.js
│   │   └── technician.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validate.middleware.js
│   ├── utils/
│   │   ├── time-slots.js
│   │   ├── availability.js
│   │   └── response.js
│   └── constants/
│       └── index.js
└── README.md
```

## Data Relationships
- `User` (Admin/Technician) → `TechnicianProfile` (one-to-one) storing skills, working hours, service areas.
- `ServiceCategory` → multiple `ServiceItem` (sub-services).
- `Order` references `ServiceCategory`, `ServiceItem`, embedded customer info, `assignedTechnician`, `jobCard`, `rescheduleHistory`.
- `TechnicianAvailability` stores standard working windows per technician; `TechnicianCalendar` holds specific bookings.
- `JobCard` references `Order`, `Technician`, contains extra work lines, spare parts usage, check-ins, cost estimate.
- `Payment` references `Order` & `JobCard`.

## Cross-Cutting Concerns
- Centralized `ApiError`/`errorHandler` middleware.
- Config helper for typed env variables.
- Notification service stub with hooks for future FCM integration.
- Utility helpers for generating slots, validating availability, and formatting responses.
- Request validation middleware to enforce payload contracts (extendable to Joi/Zod later).

This plan will guide the subsequent implementation steps.
