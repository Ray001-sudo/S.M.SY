# Shule360 v2.0

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3670A0?style=flat-square&logo=python&logoColor=ffdd54)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)]()

> Dual-curriculum school management platform for Kenyan boarding high schools — the only system that handles 8-4-4 and CBC/CBE simultaneously in a single deployment.

---

## Table of Contents

1. [What This System Does](#1-what-this-system-does)
2. [Architecture](#2-architecture)
3. [Curriculum Auto-Detection](#3-curriculum-auto-detection)
4. [Module Reference](#4-module-reference)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Tech Stack](#6-tech-stack)
7. [Prerequisites](#7-prerequisites)
8. [Local Development Setup](#8-local-development-setup)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Project Structure](#10-project-structure)
11. [Environment Variables](#11-environment-variables)
12. [Production Deployment](#12-production-deployment)
13. [License](#13-license)

---

## 1. What This System Does

Kenya's education system is mid-transition. Schools currently carry two student cohorts under two entirely different curricula — the legacy 8-4-4 system (Forms 1–4, KCSE examinations, A–E grading) and the new CBC/CBE system (Grades 7–12, KJSEA assessment, competency-based ratings). Every other platform on the market handles one or the other. Shule360 handles both, in the same system, for the same school, at the same time.

The platform detects each student's curriculum from their admission record and automatically presents the correct grading tools, assessment types, report card format, and AI model. Teachers see what they need for each student without configuration. Administrators get a unified view across both cohorts. Parents see their child's progress in the format that applies to them.

Beyond curriculum management, Shule360 is a complete school operations platform: M-Pesa fee collection with automated receipts, AI-driven at-risk student prediction, CBE digital portfolio management, KJSEA pathway-fit recommendations, and a parent communication layer — all built specifically for the operational reality of Kenyan boarding schools.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                               │
│                                                                       │
│   Next.js 14 Frontend (App Router)                                   │
│   TanStack Query · Zustand · TailwindCSS                             │
│   Curriculum-aware UI — renders 8-4-4 or CBE components per student │
└───────────────────────────┬──────────────────────────────────────────┘
                            │  REST API  /api/v1
┌───────────────────────────▼──────────────────────────────────────────┐
│                          API LAYER                                    │
│                                                                       │
│   Node.js 20 + Express.js                                            │
│   JWT + RBAC middleware                                               │
│   Curriculum detector middleware (auto 8-4-4 / CBE routing)         │
│   M-Pesa STK Push + C2B · Africa's Talking SMS                      │
└──────────────┬────────────────────────────┬──────────────────────────┘
               │                            │  HTTP  /predict
┌──────────────▼──────────┐    ┌────────────▼────────────────────────┐
│      DATA LAYER          │    │           AI SERVICE                 │
│                          │    │                                      │
│  PostgreSQL 16           │    │  Python 3.11 + FastAPI              │
│  Row-Level Security      │    │  scikit-learn + SHAP                │
│  Redis 7 (cache +        │    │  At-risk prediction (both curricula)│
│  session + rate limit)   │    │  KCSE grade projection (8-4-4)      │
│  AWS S3 + CloudFront     │    │  Pathway-fit scoring (CBE Grade 9)  │
│  (portfolio files)       │    │  Weekly batch scheduler             │
└──────────────────────────┘    └─────────────────────────────────────┘
```

---

## 3. Curriculum Auto-Detection

Shule360 determines each student's curriculum from their admission record and routes all downstream behaviour accordingly. No manual configuration is required after initial student registration.

| Admission Profile | Curriculum | Assessment Model | Grading | Report Card Format |
|-------------------|-----------|-----------------|---------|-------------------|
| Admitted ≤ Form 1 in 2023 | 8-4-4 | CATs + End of Term exams | A, B, C, D, E | Class position + KCSE projection |
| Admitted Grade 7 in 2024+ | CBC / CBE | SBA + Projects + Portfolio | EE / ME / AE / BE | Competency profile + pathway-fit score |

The `curriculum_mode` field on each student record drives:
- which grade entry form a teacher sees
- which report card template is generated
- which AI model is invoked for risk prediction
- whether the portfolio module is visible
- whether KJSEA pathway tools are accessible

All routing is handled in `middleware/curriculumDetector.js`. No conditional logic is scattered through controllers.

---

## 4. Module Reference

### Student Management
Full dual-curriculum student records including guardian contacts, boarding house allocation, bursary tracking, and academic history. Curriculum mode is set on admission and propagates automatically.

### Academics and Grading
- **8-4-4:** Subject gradebook with A–E letter grades, class position ranking, end-of-term aggregates, KCSE subject entry tracking
- **CBE:** Competency ratings (Exceeds Expectation / Meets Expectation / Approaches Expectation / Below Expectation) per strand, attendance tracking per period

### Examinations and SBA
- **8-4-4:** Question bank, CAT paper generation, invigilator assignment, mark entry, grade computation
- **CBE:** SBA task management, teacher assessment workflow, KJSEA composite score calculator across all strands

### Digital Portfolio (CBE only)
Evidence collection and management for CBC portfolio requirements. Teachers review and approve submissions. Parents have read-only visibility into their child's portfolio. Files stored on AWS S3 with CloudFront delivery.

### Pathways (CBE Grade 9+)
KJSEA score aggregation and AI-powered pathway-fit recommendation across STEM, Social Sciences, and Arts & Sports tracks. Senior school enrolment management once pathway is confirmed.

### Fees and Finance
- M-Pesa STK Push for parent-initiated payments
- C2B Paybill for bulk payments and bank deposits
- Auto-invoicing per term with fee structure templates
- Bursar dashboard with outstanding balance tracking
- Automated SMS receipts via Africa's Talking on payment confirmation
- Bursary and scholarship tracking per student

### Communication
- Official notice board with role-targeted visibility
- Parent-teacher direct messaging
- Digital consent forms with electronic acknowledgement tracking
- School event calendar with parent notifications

### AI Insights
- **At-risk prediction:** Weekly batch job scores all students in both curricula on likelihood of academic failure. Features include attendance trends, grade trajectory, fee payment history, and co-curricular participation. SHAP values provide per-student explainability so counsellors understand why a student was flagged.
- **KCSE grade projection (8-4-4):** Subject-level predicted grades based on CAT performance, attendance, and historical cohort data.
- **Pathway-fit recommendation (CBE Grade 9):** Competency profile matching against pathway requirements, surfaced to counsellors and students during KJSEA preparation.

---

## 5. User Roles and Permissions

Access control is enforced via JWT claims and RBAC middleware on every API route. Roles are not hierarchical — each has an explicit permission set.

| Role | Access Scope |
|------|-------------|
| Principal / Admin | Full system access including school settings, user management, and all reports |
| Deputy Principal | Academics, attendance, examinations, AI risk dashboard |
| Teacher | Grade entry and attendance for own assigned subjects only |
| Class Teacher | All of the above, plus full profiles for all students in assigned class |
| Bursar | Fee module only — no access to academic or communication modules |
| Counsellor | Student profiles, AI risk dashboard, pathway guidance tools |
| Parent / Guardian | Own child only — grades, fee balance, portfolio (read-only), school notices |

---

## 6. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend framework | Next.js | 14 | App Router, SSR, API routes |
| UI | React + TailwindCSS | 18 / 3.x | Component library and styling |
| State management | Zustand + TanStack Query | latest | Auth state + server data caching |
| API server | Node.js + Express.js | 20 / 4.x | REST API, middleware, business logic |
| Query builder | Knex.js | latest | SQL query building and migrations |
| Database | PostgreSQL | 16 | Primary data store with RLS |
| Cache and sessions | Redis | 7 | Session storage, rate limiting, caching |
| AI service | Python + FastAPI | 3.11 | ML inference, batch prediction jobs |
| ML framework | scikit-learn + SHAP | latest | Prediction models + explainability |
| Payments | Safaricom Daraja API | v3 | M-Pesa STK Push and C2B Paybill |
| SMS | Africa's Talking | latest | Fee receipts and school notifications |
| File storage | AWS S3 + CloudFront | — | Portfolio files and documents |

---

## 7. Prerequisites

**All setups:**
```bash
node --version       # Required: v20.x
docker --version     # Required: 24.0+  (Docker setup only)
docker compose version  # Required: v2.20+  (Docker setup only)
```

**Manual setup (additional):**
```bash
psql --version       # Required: PostgreSQL 16
redis-server --version  # Required: Redis 7
python3 --version    # Required: 3.11.x
```

---

## 8. Local Development Setup

### Option A — Docker (recommended)

The fastest path to a running system. All services start in the correct order with health checks.

```bash
# Step 1 — Clone
git clone https://github.com/Ray001-sudo/S.M.SY.git
cd shule360

# Step 2 — Configure environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai-service/.env.example ai-service/.env
# Edit backend/.env — add M-Pesa keys, SMS key, JWT secret, DB credentials

# Step 3 — Start all services
docker compose up -d

# Step 4 — Run database migrations
docker compose exec backend node src/config/migrate.js

# Step 5 — Access the application
# Frontend:   http://localhost:3000
# API:        http://localhost:5000
# AI Service: http://localhost:8000
```

### Option B — Manual Setup

Use this if you prefer to run services directly on your machine.

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
node src/config/migrate.js
npm run dev
# API running at http://localhost:5000
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Dashboard running at http://localhost:3000
```

**AI Service:**
```bash
cd ai-service
cp .env.example .env
python3 -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# AI service running at http://localhost:8000
```

---

## 9. Third-Party Integrations

### M-Pesa (Safaricom Daraja API v3)

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app — copy the Consumer Key and Consumer Secret
3. Add your Paybill shortcode and Lipa Na M-Pesa Passkey to `backend/.env`
4. Set `MPESA_ENVIRONMENT=sandbox` for testing, `production` for live
5. The M-Pesa callback URL must be publicly reachable. For local development, use ngrok:

```bash
ngrok http 5000
# Copy the HTTPS URL and set:
# MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/v1/payments/mpesa/callback
```

### Africa's Talking SMS

1. Register at [africastalking.com](https://africastalking.com)
2. Copy your API key. Use username `sandbox` for testing
3. Add to `backend/.env`:

```
AT_API_KEY=your_api_key
AT_USERNAME=sandbox
AT_SENDER_ID=SHULE360
```

### AWS S3 (Portfolio File Storage)

1. Create an S3 bucket in your preferred region
2. Create a CloudFront distribution pointing to the bucket
3. Create an IAM user with `s3:PutObject` and `s3:GetObject` on the bucket
4. Add the access key, secret, bucket name, and CloudFront domain to `backend/.env`

---

## 10. Project Structure

```
shule360/
├── backend/
│   ├── src/
│   │   ├── server.js                    # Express app entry point
│   │   ├── config/
│   │   │   ├── database.js              # Knex PostgreSQL configuration
│   │   │   ├── redis.js                 # Redis client
│   │   │   └── migrate.js               # Database migration runner
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT validation + RBAC enforcement
│   │   │   └── curriculumDetector.js    # Auto 8-4-4 / CBE routing
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── student.controller.js
│   │   │   ├── grade.controller.js
│   │   │   ├── fee.controller.js
│   │   │   ├── attendance.controller.js
│   │   │   ├── portfolio.controller.js
│   │   │   ├── kjsea.controller.js
│   │   │   ├── communication.controller.js
│   │   │   └── ai.controller.js
│   │   ├── routes/                      # Express routers (one per domain)
│   │   ├── services/
│   │   │   ├── mpesa.service.js         # Daraja STK Push + C2B
│   │   │   └── sms.service.js           # Africa's Talking
│   │   └── utils/
│   │       └── logger.js
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/                         # Next.js App Router
│   │   │   ├── auth/login/
│   │   │   ├── dashboard/
│   │   │   ├── students/
│   │   │   ├── grades/                  # Dual-curriculum grade entry
│   │   │   ├── exams/                   # CATs (8-4-4) + SBA (CBE)
│   │   │   ├── fees/                    # Fee management + M-Pesa
│   │   │   ├── communication/
│   │   │   ├── portfolio/               # CBE digital portfolios
│   │   │   ├── pathways/                # KJSEA + pathway management
│   │   │   ├── ai/                      # AI risk + pathway dashboard
│   │   │   ├── reports/
│   │   │   └── admin/                   # School settings
│   │   ├── components/
│   │   │   └── layout/Sidebar.tsx
│   │   ├── store/
│   │   │   └── auth.store.ts            # Zustand auth state
│   │   └── lib/
│   │       ├── api.ts                   # Axios client + token auto-refresh
│   │       └── utils.ts                 # Grade helpers, formatters
│   └── Dockerfile
│
├── ai-service/
│   ├── main.py                          # FastAPI application
│   ├── src/
│   │   ├── features/
│   │   │   └── extractor.py             # Feature engineering (8-4-4 + CBE)
│   │   ├── models/
│   │   │   └── predictors.py            # Risk + pathway-fit models
│   │   ├── api/
│   │   │   ├── predict.py               # POST /predict/risk, /predict/pathway
│   │   │   └── batch.py                 # POST /batch/risk (weekly job)
│   │   └── scheduler/
│   │       └── jobs.py                  # Weekly cron scheduler
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 11. Environment Variables

Each service has its own `.env.example`. The tables below document every variable.

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing secret — minimum 64 characters |
| `JWT_EXPIRY` | No | Token expiry duration. Default: `8h` |
| `MPESA_CONSUMER_KEY` | Yes* | Safaricom Daraja consumer key |
| `MPESA_CONSUMER_SECRET` | Yes* | Safaricom Daraja consumer secret |
| `MPESA_SHORTCODE` | Yes* | M-Pesa Paybill shortcode |
| `MPESA_PASSKEY` | Yes* | Lipa Na M-Pesa passkey |
| `MPESA_CALLBACK_URL` | Yes* | Publicly accessible callback URL |
| `MPESA_ENVIRONMENT` | No | `sandbox` or `production`. Default: `sandbox` |
| `AT_API_KEY` | Yes* | Africa's Talking API key |
| `AT_USERNAME` | Yes* | Africa's Talking username (`sandbox` for testing) |
| `AT_SENDER_ID` | No | SMS sender ID. Default: `SHULE360` |
| `AWS_ACCESS_KEY_ID` | Yes* | IAM user access key for S3 |
| `AWS_SECRET_ACCESS_KEY` | Yes* | IAM user secret key |
| `AWS_S3_BUCKET` | Yes* | S3 bucket name for portfolio files |
| `AWS_CLOUDFRONT_DOMAIN` | Yes* | CloudFront distribution domain |
| `AI_SERVICE_URL` | No | AI service base URL. Default: `http://localhost:8000` |
| `PORT` | No | API server port. Default: `5000` |

*Required only if the associated feature is enabled.

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL |

### AI Service (`ai-service/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (read access for feature extraction) |
| `PORT` | No | Service port. Default: `8000` |

---

## 12. Production Deployment

### Minimum server specifications
- CPU: 4 vCPUs
- RAM: 8 GB
- Disk: 100 GB SSD
- OS: Ubuntu 22.04 LTS

### Steps

```bash
# 1. Provision server and install dependencies
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
systemctl enable --now docker

# 2. Clone and configure
git clone https://github.com/Ray001-sudo/S.M.SY.git /var/www/shule360
cd /var/www/shule360
cp backend/.env.example backend/.env
# Fill in all production values — use strong, randomly generated secrets

# 3. Start services
docker compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker compose exec backend node src/config/migrate.js

# 5. Configure Nginx as reverse proxy and obtain TLS certificates
certbot --nginx \
  -d app.yourdomain.com \
  -d api.yourdomain.com \
  --non-interactive --agree-tos -m your@email.com

# 6. Lock down the firewall
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw deny 5000/tcp && ufw deny 8000/tcp
ufw deny 5432/tcp && ufw deny 6379/tcp
ufw enable
```

---

## 13. License

Proprietary — All rights reserved. © Hexaflow Labs.

Unauthorised copying, distribution, or modification of this software or its documentation is strictly prohibited. For licensing enquiries, contact bensonray25@gmail.com.

---

<div align="center">
<sub>Built by <a href="https://bensonray.pages.dev">Benson Ray</a> at <strong>Hexaflow Labs</strong> · Nairobi, Kenya</sub>
</div>
