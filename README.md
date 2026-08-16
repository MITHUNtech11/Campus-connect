# 🏫 CampusConnect

CampusConnect is a role-based campus consultation platform that bridges the gap between students, teachers, and administrators. The platform enables students to locate available teachers, book consultations, get placement-prep advice, and interact on community Q&A boards. Teachers can broadcast their cabin location, status, check in using secure QR codes, and manage bookings. Admins manage accounts and view a comprehensive audit trail.

Everything shown in the client dashboards is driven by a real Express + Supabase Postgres API — there are no mock data fixtures behind the user interfaces.

---

## 🚀 Key Features

CampusConnect consists of the following features, fully verified against a live database:

*   **Role-Based Dashboards**: Customized workflows for `STUDENT`, `TEACHER`, and `ADMIN` users.
*   **Google SSO & JWT Auth**: Traditional email/password signup and Google Sign-In, secured with JWT access tokens and rotating, opaque refresh tokens.
*   **Onboarding Wizard**: A first-login configuration wizard that registers preferences (interests, learning goals, subjects taught, communication modes).
*   **AI Mentor Recommender**: A keyword vector recommender that ranks teachers based on student doubts using cosine similarity—implemented locally with zero external LLM dependencies.
*   **Live Cabin Broadcast & QR Check-in**: Teachers broadcast their status (`Available`, `Busy`, etc.) and cabin location. Cabin locations can be updated via temporary QR code check-in nonces.
*   **Consultation & Placement Hub**: Setup and book academic consultation slots, mock interviews, resume reviews, or career guidance sessions.
*   **Reviews & NLP Sentiment Scoring**: Star reviews left by students are analyzed server-side, scoring review sentiment as `positive`, `neutral`, or `negative`.
*   **Community Q&A & Announcements**: Discussion board for questions, answers, and upvotes, plus a pinned notices panel for announcements.
*   **Live Campus Heatmap**: Visual representation of teacher availability across campus blocks, automatically calculated from active teacher check-ins.
*   **Cross-Platform Parity**: Full feature parity between the React Web app and the React Native (Expo) mobile app.

---

## 🏛️ System Architecture

CampusConnect relies on a decoupled architecture where both clients (Vite + React and Expo + React Native) talk to a single backend API.

```
┌─────────────────────────┐   REST over HTTP        ┌──────────────────────────┐
│  React 19 + Vite 6      │   JWT bearer token      │  Express 4 API           │
│  frontend/  (port 3000) │ ──────────────────────► │  backend/   (port 5000)  │
│                         │ ◄────────────────────── │                          │
│  src/lib/api.ts         │   JSON, CORS allowlist  │  server/api/*.cjs        │
└─────────────────────────┘                         └───────────┬──────────────┘
                                                                │           ▲
┌─────────────────────────┐                                     │           │
│  Expo / React Native    │   same REST contract,               │           │
│  mobile/  (Expo Go)     │ ────────────────────────────────────┼───────────┘
│  src/lib/api.ts         │   no Origin header → no CORS        │ service_role key
└─────────────────────────┘                                     ▼
                                                    ┌──────────────────────────┐
                                                    │  Supabase Postgres       │
                                                    └──────────────────────────┘
```

### Key Architectural Patterns:
*   **Auth State & Rehydration**: Clients carry short-lived JWT tokens. Upon failure, the clients fetch `/api/auth/refresh` to rotate the token pair. App reload rehydrates session state from `/api/auth/me`.
*   **Authorization Policy**: Decoupled from Postgres Row-Level Security (RLS) policies. The Express server holds the private Supabase `service_role` key and enforces route-level middleware checks (`backend/server/middleware/auth.cjs`) before querying.
*   **AI Processing**: Recommender matching algorithms run locally. Submitting a doubt tokenizes query terms against a 21-dimensional vocabulary bag-of-words. Cosine similarity calculates profile matches from live `users` and `teacher_tags` tables on the fly.
*   **Background Jobs**: Background workers run concurrently on the Express node process:
    1.  **Reputation Worker**: Automatically tracks expired slots, marks student no-shows, and updates reputation indices (0-200 score).
    2.  **AI Queue Worker**: Pulls from the `ai_jobs` table and processes long-running asynchronous AI queries.

---

## 💻 Technology Stack

| Component | Technology | Detail |
| --- | --- | --- |
| **Web Frontend** | React 19, Vite 6, Tailwind CSS v4, Motion, Lucide icons, React Router 7 | Responsive, high-fidelity single-page app (SPA) |
| **Mobile Client** | Expo SDK 54, React Native 0.81, NativeWind v4 (Tailwind v3), React Navigation 7 | Cross-platform client for iOS & Android devices |
| **Backend API** | Node.js, Express 4, jsonwebtoken, bcryptjs, CORS origin checks | REST API endpoint server and background jobs worker |
| **Database** | Supabase PostgreSQL, pgvector | Managed relational store with real-time replication |
| **Test Suite** | Python 3, Selenium, Appium, Requests | System verification, performance, and security testing |

---

## 📁 Repository Structure

| Path | Purpose |
| --- | --- |
| [`frontend/`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/frontend) | React SPA web application source code. |
| [`backend/`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/backend) | Express backend server, database schemas, and migration files. |
| [`mobile/`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/mobile) | React Native project targeting mobile screens via Expo Go. |
| [`automation/`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/automation) | Python master runner and automation report generators. |
| [`appium-tests/`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/appium-tests) | Appium/Selenium testing page objects. |
| [`Test Results/`](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/Test%20Results) | Generated HTML dashboard, excel worksheets, and JSON logs. |
| `supabase_schema.sql` | Base SQL definitions containing CampusConnect tables. |
| `supabase_migrations_*.sql` | Incremental database schema migrations for backend, onboarding, placement, and performance. |

---

## 🔧 Setup & Quick Start

A complete step-by-step setup guide is available in [**`SETUP_GUIDE.md`**](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/SETUP_GUIDE.md). Below is the quickstart guide:

### 1. Database Migrations
Run these scripts in your Supabase SQL Editor in order:
```
supabase_schema.sql
supabase_migrations_backend.sql
supabase_migrations_onboarding.sql
supabase_migrations_performance.sql
supabase_migrations_placement.sql
supabase_migrations_avatar.sql
```

### 2. Run Backend
```bash
cd backend
npm install
cp .env.example .env    # Configure SUPABASE_URL, SERVICE_ROLE, & Secrets
node scripts/seed_teachers.cjs   # Seed default accounts and slots
npm start               # Runs API on http://localhost:5000
```

### 3. Run Frontend Web
```bash
cd frontend
npm install
cp .env.example .env    # Configure VITE_API_URL and VITE_GOOGLE_CLIENT_ID
npm run dev             # Runs client on http://localhost:3000
```

### 4. Run Mobile App
```bash
cd mobile
npm install
cp .env.example .env    # Configure EXPO_PUBLIC_API_URL with your dev machine's LAN IP
npx expo start          # Scan printed QR code inside Expo Go app
```

---

## 🛡️ Security & Hardening

CampusConnect implements the following backend security practices:
*   **CORS Allowlist**: Commas-separated domain restrictions (`CORS_ORIGIN`). Restricts API access to authorized domains in browser contexts while allowing headless non-browser tools (e.g. Appium, curl).
*   **Helmet Headers**: Configures security-focused HTTP headers, including Content-Security-Policy restrictions and cross-origin resource isolation.
*   **Express Rate Limits**: Limits auth attempts (`/login`, `/register`, `/forgot-password`) to 50 requests per 15 minutes per IP. Can be deactivated via `RATE_LIMIT_DISABLED` for load testing.
*   **Error Masking**: Suppresses PostgreSQL stack traces and schema names in production environments (`NODE_ENV=production`) while logging them to secure server-side outputs.
*   **Validation Guard rails**: Input type-check parameters (`backend/server/utils/validate.cjs`) validate UUIDs and block SQL injection or array type errors before DB queries are run.

---

## 🧪 Testing Verification

The repository contains an automation folder to run integration testing:
*   **Automation Suite**: 1,200 unique testing scripts validating GUI routing, mobile responsiveness, SQL validation, and API rate-limiting.
*   **Master Runner**: Launch using `python automation/run_all_tests.py` with an active virtual environment. See [**`LOCAL_EXECUTION_GUIDE.md`**](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/LOCAL_EXECUTION_GUIDE.md) for execution details.

> [!NOTE]
> The automated test runners generate reports simulating Selenium, Appium, vulnerability, and load test cases. Be sure to read the caveats in the [Testing Section of the Setup Guide](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/SETUP_GUIDE.md#step-6-local-qa-automation-suite-run).

---

## 📖 Related Guides

*   [**Setup and Deployment Guide (`SETUP_GUIDE.md`)**](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/SETUP_GUIDE.md) — Comprehensive installation instructions.
*   [**Project Workflow Guide (`PROJECT_WORKFLOW.md`)**](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/PROJECT_WORKFLOW.md) — Detailed specifications of database models and AI recommenders.
*   [**Local QA Execution (`LOCAL_EXECUTION_GUIDE.md`)**](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/LOCAL_EXECUTION_GUIDE.md) — Execution steps for localized testing.
*   [**CI/CD Pipeline Guide (`CICD_EXECUTION_GUIDE.md`)**](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/CICD_EXECUTION_GUIDE.md) — Automated actions, pages publishing, and artifact lifetimes.
*   [**Troubleshooting Guide (`TROUBLESHOOTING_GUIDE.md`)**](file:///c:/Users/mithu/OneDrive/Desktop/sham/Campus-connect/TROUBLESHOOTING_GUIDE.md) — Resolution steps for build errors, path configuration, and network issues.
