# Team Task Manager

A team task management app built for collaboration, simple workflows, and easy project tracking.

## Overview
This repository includes:
- A React + Vite frontend for sign-in, dashboards, project boards, and task management.
- An Express backend with JWT authentication, role-based access, and project/task APIs.
- Local JSON-backed storage for development using lowdb.

## Key features
- Login / signup with secure token-based authentication
- Admin and member roles with access control
- Project creation, member assignment, and project details view
- Task board with drag-and-drop status updates
- Task assignment, due dates, priority levels, and overdue marking
- Dashboard metrics, charts, and recent task activity

## Quick start
### Backend
1. Open a terminal in `backend`
2. Copy `.env.example` to `.env`
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the backend:
   ```bash
   npm run dev
   ```
5. By default, the backend listens on `http://localhost:4001`

### Frontend
1. Open a terminal in `frontend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```
4. Open the app at `http://localhost:5173`

## Build for production
### Frontend
```bash
cd frontend
npm install
npm run build
```

### Backend
```bash
cd backend
npm install
npm start
```

## Default account
- Email: `admin@teamtask.com`
- Password: `Admin@123`

## Configuration
The backend loads environment variables from `backend/.env`. Available settings include:
- `PORT` — server port (defaults to `4001` if not set)
- `JWT_SECRET` — secret for signing tokens
- `ADMIN_CODE` — invite code for admin registration
- `DATABASE_FILE` — local lowdb file path

## Notes
- Project data is stored in `backend/dev.json` for local development.
- The frontend is configured to proxy API calls to the backend at `http://localhost:4001`.
- Overdue tasks are flagged automatically when the due date passes and the task is not complete.
- Admin users can add members to projects and manage project assignments.

## Project structure
- `backend/` — Express API, authentication, routes, and data storage
- `frontend/` — React UI, pages, components, and styles
- `backend/dev.json` — development data store

## Running locally
Use two terminals:
- one for `backend` running `npm run dev`
- one for `frontend` running `npm run dev`

Then visit `http://localhost:5173` to access the app.

## Deployment (Vercel frontend, Render backend)

Follow these steps to deploy the frontend to Vercel and the backend to Render.

**Backend (Render)**
- Create a new Web Service on Render.
- Connect your repo and select the `backend/` folder as the deploy root.
- Set the build and start commands:
   - Build command: `npm install`
   - Start command: `npm start`
- Add the following environment variables in Render (set secure values):
   - **`PORT`**: `4001` (Render sets this automatically, but you can provide a default)
   - **`JWT_SECRET`**: your JWT secret
   - **`ADMIN_CODE`**: your admin invite code
   - **`DATABASE_FILE`**: `./dev.json` or an absolute writable path
- Ensure `uploads/` is configured or use external storage for persistent uploads.

**Frontend (Vercel)**
- Create a new project on Vercel and point it to the `frontend/` folder.
- In Vercel Project Settings → Environment Variables, add:
   - **`VITE_API_URL`** = `https://<your-backend>.onrender.com/api` or `https://<your-backend>.onrender.com`
   - **`VITE_SOCKET_URL`** = `https://<your-backend>.onrender.com`
- If you want a `staging` environment, add a Vercel Environment named `staging` and attach the same variables (or different ones).
- Deploy the project — Vercel will build using `npm run build` from the `frontend` folder.

Notes:
- The frontend uses `VITE_API_URL` at runtime (falls back to `/api` for local dev). Be sure to include the protocol (`https://`).
- `vite.config.js` proxy only affects local `npm run dev` behavior and is ignored in production builds.
- After setting variables, re-deploy the frontend on Vercel so the build picks up the environment.

If you'd like, I can add a `.vercelignore` or more detailed Render service settings next.
