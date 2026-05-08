# Axiom — Mission Control Platform

> A premium full-stack space mission operations management platform built with Next.js 16, Prisma, and Tailwind CSS v4.

## 🌐 Live Demo
**[https://axiom-mission.up.railway.app](https://axiom-mission.up.railway.app)**

### Demo Credentials
| Email | Password | Role |
|-------|----------|------|
| alice@axiom.io | password123 | Mission Director |
| bob@axiom.io   | password123 | Operator |
| carol@axiom.io | password123 | Observer |

---

## ✨ Features

### Frontend
- **Authentication** — JWT-based signup/login with full form validation and error states
- **Mission Registry** — Create, filter, and manage space missions with color-coded cards
- **Operations Board** — Tabular view of all tasks with inline status updates
- **Mission Detail** — Tabbed interface: Operations, Crew Management, Activity Log
- **Command Center Dashboard** — Live metrics, bar charts, assigned ops, activity feed
- **Role-Based UI** — Directors see all controls, Operators can edit, Observers are read-only
- **Loading States** — Skeleton loaders on every data-fetching view
- **Empty States** — Friendly illustrations when no data exists
- **Toast Notifications** — Success/error/info toasts for all actions

### Backend
- **REST API** — `GET/POST/PATCH/DELETE` for Missions, Operations, Members, Auth
- **JWT Authentication** — Secure HTTP-only cookies with 7-day sessions
- **RBAC** — Director / Operator / Observer roles enforced at the API layer
- **Input Validation** — Zod schemas on all endpoints
- **Activity Logging** — Automatic audit trail for all mutations
- **Prisma ORM** — Type-safe queries with SQLite (PostgreSQL-ready for production)

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Prisma |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | Custom JWT with `jose` |
| Hashing | bcryptjs |
| Validation | Zod |
| Deployment | Railway |

---

## 🚀 Local Development

```bash
# 1. Clone and install
git clone <repo-url>
cd ethara
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Run database migrations and seed
npx prisma migrate dev
npx tsx prisma/seed.ts

# 4. Start dev server
npm run dev
```

Visit `http://localhost:3000`

---

## 🗄 Database Schema

```
User ──┬── owns ──► Mission ──┬── has ──► MissionMember (roles)
       │                      └── has ──► Operation ──► Comment
       └── logs ──► ActivityLog          └── ActivityLog
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login + set cookie |
| GET  | `/api/auth/me` | Get current session |
| DELETE | `/api/auth/me` | Logout |
| GET  | `/api/missions` | List user's missions |
| POST | `/api/missions` | Create mission |
| GET  | `/api/missions/:id` | Get mission detail + ops |
| PATCH | `/api/missions/:id` | Update mission |
| DELETE | `/api/missions/:id` | Delete (Director only) |
| POST | `/api/missions/:id/members` | Add member |
| DELETE | `/api/missions/:id/members` | Remove member |
| GET  | `/api/operations` | List operations (filterable) |
| POST | `/api/operations` | Create operation |
| GET  | `/api/operations/:id` | Get operation detail |
| PATCH | `/api/operations/:id` | Update operation |
| DELETE | `/api/operations/:id` | Delete operation |
| GET  | `/api/dashboard` | Aggregated metrics |

---

## 🚢 Railway Deployment

1. Push to GitHub
2. Create new Railway project → Deploy from GitHub
3. Add PostgreSQL plugin
4. Set environment variables:
   - `DATABASE_URL` — auto-set by Railway plugin
   - `JWT_SECRET` — random 64-char string
5. Add build command: `npx prisma migrate deploy && npm run build`
6. Deploy!
