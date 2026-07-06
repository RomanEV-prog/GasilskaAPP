# GasilApp — Frontend (React Web Portal)

## Setup

```bash
npm create vite@latest gasilapp-frontend -- --template react-ts
cd gasilapp-frontend

npm install axios react-router-dom @tanstack/react-query
npm install react-hook-form zod @hookform/resolvers
npm install date-fns
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Struktura projekta

```
gasilapp-frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts          ← axios instance z interceptorjem
│   │   ├── auth.api.ts
│   │   ├── users.api.ts
│   │   ├── events.api.ts
│   │   ├── vehicles.api.ts
│   │   ├── trainings.api.ts
│   │   └── notifications.api.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useUsers.ts
│   │   ├── useEvents.ts
│   │   └── ...
│   ├── stores/
│   │   └── auth.store.ts      ← Zustand ali Context
│   ├── types/
│   │   └── index.ts           ← TypeScript tipi (user, event, vehicle...)
│   ├── components/
│   │   ├── ui/                ← base komponente (Button, Input, Modal...)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── AppLayout.tsx
│   │   └── shared/            ← shared med stranmi
│   └── pages/
│       ├── auth/
│       │   └── LoginPage.tsx
│       ├── dashboard/
│       │   └── DashboardPage.tsx
│       ├── members/
│       │   ├── MembersPage.tsx
│       │   ├── MemberDetailPage.tsx
│       │   └── MemberFormPage.tsx
│       ├── events/
│       │   ├── EventsPage.tsx
│       │   ├── EventDetailPage.tsx
│       │   └── EventFormPage.tsx
│       ├── vehicles/
│       │   ├── VehiclesPage.tsx
│       │   └── VehicleFormPage.tsx
│       ├── trainings/
│       │   └── TrainingsPage.tsx
│       └── notifications/
│           └── NotificationsPage.tsx
├── .env
└── package.json
```

## API client

```typescript
// src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
});

// Avtomatično dodaj JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect na login ob 401
api.interceptors.response.use(
  (res) => res.data.data,  // izvleči .data iz { success, data, timestamp }
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data);
  }
);

export default api;
```

## .env

```env
VITE_API_URL=http://localhost:4000/api/v1
```

## Strani (Pages) — prioriteta

### 1. Login (/login)
- Email + password form
- Redirect na dashboard po uspešni prijavi
- Shrani token v localStorage

### 2. Dashboard (/)
- Za vodstvo: statistike, opomniki, prihajajoči dogodki
- Za člane: naslednji dogodki, moja usposabljanja

### 3. Člani (/members)
- Tabela vseh članov z iskanjem in filtri
- Dodaj/uredi člana (form)
- Profil člana (detail)

### 4. Dogodki (/events)
- Mesečni/tedenski pogled
- Ustvari nov dogodek
- Detail: RSVP odzivi, prisotnost

### 5. Vozila (/vehicles)
- Kartice vozil z barvnimi opomniki za potek rokov
- Forma za urejanje

### 6. Usposabljanja (/trainings)
- Tabela z barvami (zelena/rumena/rdeča) glede na rok veljavnosti
- Dodaj usposabljanje za člana

### 7. Obvestila (/notifications)
- Seznam + form za pošiljanje novega

## Barvna shema

```css
/* Gasilska rdeča + nevtralna */
--primary: #CC2200;
--primary-dark: #991900;
--bg: #F8F8F8;
--card: #FFFFFF;
--text: #2D2D2D;
--text-muted: #888888;
--success: #16a34a;
--warning: #ca8a04;
--danger: #dc2626;
```

## Gotchas (naučeno)

- **UI `Input`/`Select` MORAJO uporabljati `forwardRef`** — react-hook-form veže polja prek `ref`. Brez tega `register()` tiho ne prebere vrednosti (obrazec izgleda "mrtev").
- **`vite-env.d.ts`** z `/// <reference types="vite/client" />` je nujen za `import.meta.env`.
- **API client** vrne `.data` iz `{success, data}` ovoja; response interceptor ob 401 preusmeri na `/login`.
- **Strict TS** (`noUnusedLocals`): odstrani neuporabljene importe/komponente, sicer `npm run build` pade.
