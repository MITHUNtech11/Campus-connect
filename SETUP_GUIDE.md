# ⚙️ CampusConnect Setup & Deployment Guide

This guide provides step-by-step instructions to configure, run, seed, and test the **CampusConnect** application locally or deploy it in a production environment. 

CampusConnect is a role-based campus consultation platform featuring a React Web Frontend, an Express Backend API, and an Expo Mobile App, all backed by a Supabase PostgreSQL database.

---

## 📋 Prerequisites

Before starting, ensure your system has the following installed:

*   **Node.js**: `v18.x` or `v20.x` (LTS version recommended)
*   **npm**: `v9.x` or higher (comes with Node.js)
*   **Git**: For cloning and repository management
*   **Supabase Account**: A free project created at [supabase.com](https://supabase.com)
*   **Python**: `v3.10` or higher (only needed for running automated QA test suites)
*   **Expo Go**: Installed on a physical Android or iOS device (only needed for mobile app testing)

---

## 🛠️ Step 1: Supabase Database Setup

CampusConnect runs entirely on **Supabase Postgres**. Follow these steps to provision and structure your database:

### 1. Create a New Project
1. Log in to [Supabase Console](https://database.supabase.com) and click **New Project**.
2. Give your project a name (e.g., `CampusConnect`), set a database password, choose a region close to you, and click **Create New Project**.
3. Wait a few minutes for the database to provision.

### 2. Configure Extensions & Schema
Go to your project's **SQL Editor** in the Supabase sidebar and run the SQL migration files in the **exact order** specified below.

Copy the contents of each file from your project root and execute them:

1.  **Base Schema**: [`supabase_schema.sql`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/supabase_schema.sql)
    *   *Creates users, teacher tags, slots, bookings, ratings, community, and announcements tables. Enables RLS and permissive policies.*
2.  **Backend Migration**: [`supabase_migrations_backend.sql`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/supabase_migrations_backend.sql)
    *   *Adds user password columns, rating caching, audit logging, refresh tokens, and password reset tables.*
3.  **Onboarding Migration**: [`supabase_migrations_onboarding.sql`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/supabase_migrations_onboarding.sql)
    *   *Adds profile preferences and onboarding status wizard attributes to users.*
4.  **Performance Indexes**: [`supabase_migrations_performance.sql`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/supabase_migrations_performance.sql)
    *   *Indexes critical columns like user roles, tags, slot FKs, booking statuses, and token hashes to accelerate lookup speeds.*
5.  **Placement Portal Migration**: [`supabase_migrations_placement.sql`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/supabase_migrations_placement.sql)
    *   *Adds slot categories (`Academic`, `Mock Interview`, `Resume Review`, `Career Guidance`) and placement-specific booking columns (resume URL, target company, JD).*
6.  **Avatar Customization**: [`supabase_migrations_avatar.sql`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/supabase_migrations_avatar.sql)
    *   *Adds `avatar_seed` to public.users to persist personalized DiceBear avatars.*

---

## 🚀 Step 2: Backend API Configuration & Run

The backend is a Node.js + Express app that serves as the secure interface between the clients (Web/Mobile) and Supabase.

### 1. Install Dependencies
Navigate to the `backend` folder and install NPM packages:
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file by copying the template:
```bash
cp .env.example .env
```
Open `.env` and configure the following parameters:
*   `SUPABASE_URL`: Your Supabase Project URL (found in project settings).
*   `SUPABASE_SERVICE_ROLE_KEY`: The server-side private key (Project Settings -> API -> `service_role`). Keep this secret; it bypasses Row Level Security.
*   `JWT_SECRET`: A secure random string for signing JWT Access Tokens.
*   `JWT_REFRESH_SECRET`: A different random string for Refresh Tokens.
*   `QR_SECRET`: A secure secret string used for signing cabin check-in nonces.
*   `CORS_ORIGIN`: Set to `http://localhost:3000` (development Vite web server) or your production domain.
*   `PORT`: Port the backend listens on (defaults to `5000`).

### 3. Seed Database & Ingest Embeddings
The database needs seed data to run successfully (preloaded students, teachers, discussions).
Run the seeding script:
```bash
node scripts/seed_teachers.cjs
```
This generates mock students, 10+ teachers with schedules, mock announcements, and community discussions.

*(Optional)* Run the keyword vector ingest script:
```bash
npm run ingest
```
This builds and caches keyword embeddings for the vector search profile recommender system.

### 4. Start Backend Server
```bash
npm start
```
The server will start up. You can verify it is healthy by visiting:
*   Health Check: `http://localhost:5000/api/health`
*   Interactive Swagger Documentation: `http://localhost:5000/docs`

---

## 🌐 Step 3: Frontend Web Configuration & Run

The web application is built on React 19 + Vite 6 and styled using Tailwind CSS v4.

### 1. Install Dependencies
```bash
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file:
```bash
cp .env.example .env
```
Fill in the parameters:
*   `VITE_API_URL`: The URL of the running backend (`http://localhost:5000`).
*   `VITE_GOOGLE_CLIENT_ID`: (Optional) Your Google OAuth Client ID for SSO. If not configured, it will default to a placeholder and display a warning banner on the login screen.
*   `PORT`: Dev server port (defaults to `3000`).

### 3. Run Dev Server
```bash
npm run dev
```
Open `http://localhost:3000` in your web browser. Features HMR (Hot Module Replacement).

### 4. Build for Production
To bundle the frontend for static hosting:
```bash
npm run build
npm start
```
This compile-builds the files into `dist/` and runs a simple express host serving the static bundle.

---

## 🔐 Step 4: Google Sign-In SSO Configuration

CampusConnect supports Google Single Sign-On (SSO) login. To configure Google SSO:

### 1. GCP OAuth Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project (e.g., `CampusConnect`).
3. Set up the **OAuth Consent Screen** (User Type: External) and add basic scopes (`email`, `profile`, `openid`).
4. Go to **Credentials**, click **Create Credentials**, and select **OAuth client ID**.
5. Choose **Web application** as the Application Type.
6. Add the following to **Authorized JavaScript origins**:
   *   `http://localhost:3000`
   *   `http://localhost`
7. Add authorized redirect URIs if redirecting, or keep it blank for standard OneTap/GSI popups.
8. Click **Create** to receive your `Client ID` and `Client Secret`.

### 2. Apply configuration
*   **Frontend**: Set `VITE_GOOGLE_CLIENT_ID` in your `frontend/.env` to the Client ID you created.
*   **Google JSON**: You can store the credential details in `client_secret_*.json` in the root directory for developer reference (ensure this is git-ignored in production).

---

## 📱 Step 5: Mobile Client Setup (React Native + Expo)

The mobile client is located in `mobile/`. It uses Expo Go and NativeWind (Tailwind CSS v3 in React Native).

> [!WARNING]
> **Expo SDK Lock-in**: The project targets Expo SDK 54. Verify that your device's Expo Go app supports SDK 54. If you update the `expo` version in `mobile/package.json`, always run `npx expo install --fix` to update underlying dependencies to their locked compatible versions.

### 1. Install Dependencies
```bash
cd ../mobile
npm install
```

### 2. Configure LAN IP (.env)
Since the app runs on a physical device, it cannot connect to `localhost`. It must communicate with your dev machine over your local area network (LAN).
1. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Find your developer machine's **LAN IP**:
   *   **Windows**: Run `ipconfig` (Look for the Wi-Fi card's `IPv4 Address`, e.g., `192.168.1.10`)
   *   **macOS**: Run `ipconfig getifaddr en0`
   *   **Linux**: Run `hostname -I`
3. Edit `mobile/.env` and update the value:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:5000
   ```

### 3. Run Mobile App
Ensure **both your physical phone and dev machine are connected to the exact same Wi-Fi network**.
```bash
npx expo start
```
Metro Bundler will start and print a large QR code in the terminal.
*   **Android**: Open the **Expo Go app** and tap *Scan QR Code*.
*   **iOS**: Open the system **Camera app** and scan the QR code. Tap the Expo link to launch Expo Go.

---

## 🧪 Step 6: Local QA Automation Suite Run

CampusConnect has a testing automation suite comprising 1,200 unique test cases spanning Selenium, Appium, vulnerability checking, and load testing.

### 1. Install Python & Dependencies
1. Ensure Python `3.10+` is installed.
2. In the root project directory, create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   *   **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
   *   **macOS/Linux**: `source venv/bin/activate`
4. Install python dependencies:
   ```bash
   pip install openpyxl requests selenium
   ```

### 2. Run Master Test Suite
Start the backend and frontend servers, then execute the master test runner from the root folder:
```bash
python automation/run_all_tests.py
```
To run tests targeting a specific deployment (like GitHub Pages):
```bash
BASE_URL=https://<your-username>.github.io/Campus-connect/ python automation/run_all_tests.py
```

### 3. Access Reports
Test reports are compiled and written automatically to:
*   Excel: `Test Results/Excel/` (`Automation_Test_Report.xlsx`, `Appium_Test_Report.xlsx`, etc.)
*   HTML Dashboard: `Test Results/HTML/execution-report.html` and `dashboard.html`
*   JSON: `Test Results/JSON/execution-results.json`

---

## 🪟 Demo Accounts (Default Seed)

If you ran `node scripts/seed_teachers.cjs`, the following default demo accounts are available:

| Role | Email | Password | Details |
| --- | --- | --- | --- |
| **Admin** | `demo.admin@campusconnect.test` or `admin@college.edu` | `password123` | Full dashboard statistics, edit/delete users, audit logs |
| **Teacher** | `demo.teacher@campusconnect.test` or `vikram.sharma@college.edu` | `password123` | Broadcast cabin location, configure slots, accept bookings |
| **Student** | `demo.student@campusconnect.test` or `ananya.rao@college.edu` | `password123` | Search faculty, schedule consultations, submit reviews |

*(Note: Custom emails matching the regex `/teacher/` or `@faculty.` will register as Teachers, `/admin/` will register as Admins, and others as Students during Google SSO signup).*
