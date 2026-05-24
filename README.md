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
