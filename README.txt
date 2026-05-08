Axiom - Mission Control Platform

A premium full-stack space mission operations management platform built with
Next.js 16, Prisma, PostgreSQL, and Tailwind CSS v4.

Live Demo
https://axiom-mission.up.railway.app

Features

Frontend
- Authentication with signup/login and validation
- Mission registry for creating and managing missions
- Operations board with inline status updates
- Mission detail view with operations, crew, and activity
- Dashboard with metrics and charts
- Role-based UI for directors, operators, and observers
- Loading states, empty states, and toast notifications

Backend
- REST API for auth, missions, operations, dashboard, and members
- JWT authentication with secure cookies
- Role-based access control
- Zod validation on API inputs
- Activity logging for mutations
- Prisma ORM with PostgreSQL for production deployment

Tech Stack
- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4
- ORM: Prisma 7
- Database: PostgreSQL
- Auth: Custom JWT with jose
- Hashing: bcryptjs
- Validation: Zod
- Deployment: Railway

Project Structure
- src/app: App Router pages and API routes
- src/components: shared UI components
- src/contexts: auth and toast providers
- src/lib: Prisma and auth utilities
- prisma/schema.prisma: database schema
- prisma/migrations: Prisma migrations
- prisma/seed.ts: seed script

Local Development
1. Install dependencies
   npm install

2. Set environment variables in .env
   DATABASE_URL=your_postgres_connection_string
   JWT_SECRET=your_secret_key

3. Run migrations
   npx prisma migrate dev

4. Optional: seed demo data
   npm run seed

5. Start the dev server
   npm run dev

6. Open
   http://localhost:3000

Production Deployment on Railway
1. Push this repository to GitHub
2. Create a Railway project from the GitHub repository
3. Add a PostgreSQL service in Railway
4. In the app service, add these variables:
   DATABASE_URL -> reference from the PostgreSQL service
   JWT_SECRET -> long random secret
   NODE_ENV=production
5. Set the pre-deploy command:
   npx prisma migrate deploy
6. Deploy the service
7. Generate a public domain from Settings -> Networking

Important Notes
- The app requires DATABASE_URL to be set at runtime
- Prisma client is configured for PostgreSQL
- Run migrations before first production start
- Seed only if you want demo data in production

Main Routes
- /login
- /register
- /dashboard
- /missions
- /missions/[id]
- /operations

API Routes
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- DELETE /api/auth/me
- GET /api/missions
- POST /api/missions
- GET /api/missions/:id
- PATCH /api/missions/:id
- DELETE /api/missions/:id
- POST /api/missions/:id/members
- DELETE /api/missions/:id/members
- GET /api/operations
- POST /api/operations
- GET /api/operations/:id
- PATCH /api/operations/:id
- DELETE /api/operations/:id
- GET /api/dashboard
