# Fixzep Client Portal

A modern client portal built with React, TypeScript, and Vite.

## Features

- 🔐 **Authentication** - Login and Signup pages with API integration
- 🎨 **Banner Display** - Dynamic banner carousel with auto-rotation
- 🎯 **Responsive Design** - Mobile-first design with Tailwind CSS
- 🚀 **Modern Stack** - React 18, TypeScript, Vite, TanStack Query
- 📱 **Real-time** - Socket.io integration ready
- 🎭 **Animations** - Smooth transitions with Framer Motion

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router DOM** - Routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Headless UI** - Accessible UI components
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications
- **Socket.io Client** - Real-time communication

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_API_URL=https://admin.eopsys.xyz/api
```

### Development

```bash
npm run dev
```

The app will be available at `https://fixzep.com`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable components
│   │   ├── common/       # Common components (Topbar, etc.)
│   │   └── ui/           # UI components
│   ├── pages/            # Page components
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── BannerPage.tsx
│   ├── services/         # API services
│   │   ├── authService.ts
│   │   └── bannerService.ts
│   ├── store/            # State management
│   │   └── authStore.ts
│   ├── lib/              # Utilities and configs
│   │   └── api-client.ts
│   ├── types/            # TypeScript types
│   ├── utils/            # Helper functions
│   ├── App.tsx           # Main App component
│   └── main.tsx          # Entry point
└── public/               # Static assets
```

## Available Pages

- **/** - Home page with banner carousel
- **/login** - User login
- **/signup** - User registration
- **/banners** - Banner showcase

## API Integration

All API services are configured in the `src/services/` directory:

- **authService.ts** - Authentication (login, signup, logout)
- **bannerService.ts** - Banner operations (fetch active banners)

The API client automatically handles:
- JWT token injection
- 401 error handling
- Request/response interceptors

## State Management

- **Zustand** for global state (authentication)
- **TanStack Query** for server state (data fetching, caching)
- Persistent auth state using localStorage

## License

Private

