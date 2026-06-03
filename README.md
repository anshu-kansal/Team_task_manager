# TaskMaster — Collaborative Workspace & Kanban Board

TaskMaster is a modern, responsive team workspace and project tracker designed to help teams collaborate, organize workflows, and measure productivity. Built on the MERN stack with real-time sync capabilities, it provides a clean SaaS-style dashboard, interactive Kanban pipelines, and team workspace management.

---

## 🚀 Key Features

* **Interactive Dashboards**: Clean SaaS dashboard with visual progress charts, status breakdown metrics, and recent team activity logs.
* **Kanban Workspaces**: A fluid drag-and-drop board powered by `@hello-pangea/dnd` to track task statuses (To Do, In Progress, Review, Done).
* **Decentralized Project Workspaces**: 
  - Standard users can create and own project workspaces.
  - Project owners and administrators can invite/remove teammates using an built-in email lookup system.
* **Granular Task Control**: Assign tasks, set priorities (Low, Medium, High, Urgent), define due dates, and track subtasks. Overdue tasks are automatically flagged.
* **Real-time Sync**: Uses WebSockets (`socket.io`) to update board changes across different team member screens instantly.
* **Polished Dark Mode**: Reusable animated theme toggle with system preference detection and smooth transitions.

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite), Zustand (State), Framer Motion (Transitions), Chart.js (Charts), Tailwind CSS (Theme styling)
* **Backend**: Node.js, Express, Socket.io (WebSockets)
* **Database**: MongoDB & Mongoose (Schema validation & persistence)
* **Authentication**: JSON Web Tokens (JWT) & bcryptjs (password hashing)

---

## 💻 Getting Started

You can run both the frontend and backend servers locally on your machine.

### Prerequisites
- Node.js (v18 or higher recommended)
- A running MongoDB instance (locally or cloud via MongoDB Atlas)

---

### Step 1: Backend Setup

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file by copying the example template:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your variables:
   - `PORT`: Server port (default: `4001`)
   - `JWT_SECRET`: A secure random secret key
   - `MONGO_URI`: Your MongoDB connection string (e.g. `mongodb://127.0.0.1:27017/team-task-manager`)
4. Install the dependencies:
   ```bash
   npm install
   ```
5. *(Optional)* Seed your database with development mock data:
   ```bash
   node scripts/migrate.js
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

---

### Step 2: Frontend Setup

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite bundler locally:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local address displayed in your terminal (typically `http://localhost:5173`).

---

## 🔑 Default Accounts (Seed Data)

If you seeded the database using the migration script, you can log in with:

| Account Type | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@teamtask.com` | `Admin@123` |

---

## ☁️ Production Deployment

### Backend (Render)
1. Set up a new **Web Service** on Render and link it to your GitHub repository.
2. Select `backend/` as the **Root Directory**.
3. Set the build and start commands:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In your Render service configuration, add the following environment variables:
   - `MONGO_URI`: Your cloud MongoDB connection string
   - `JWT_SECRET`: A secure production secret key
   - `ADMIN_CODE`: A secret string used for creating new admin users at signup

### Frontend (Vercel)
1. Set up a new project on Vercel and point it to the `frontend/` folder.
2. Under project settings, add the following **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com/api` *(make sure to include /api)*
   - `VITE_SOCKET_URL`: `https://your-backend-app.onrender.com`
3. Click deploy. Vercel will build the frontend using `npm run build`.
