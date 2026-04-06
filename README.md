# Shule360 v2.0 — Dual-Curriculum School Management Platform

> **Supports 8-4-4 (Forms 1–4 / KCSE) AND CBC/CBE (Grades 7–12 / KJSEA / Pathways) simultaneously.**

---

## What is Shule360?

Shule360 is a full-stack, AI-powered school management platform built specifically for Kenyan boarding high schools. It is the only platform that handles both the 8-4-4 and CBC/CBE curricula in a single system — automatically detecting each student's curriculum mode and presenting the correct tools without any manual configuration.

---

## Modules

| Module | Description |
|---|---|
| **Student Profiles** | Dual-curriculum student records, guardian contacts, boarding allocation, bursary tracking |
| **Academics & Grades** | 8-4-4 gradebook (A–E) + CBE competency ratings (EE/ME/AE/BE), attendance per period |
| **Exams & SBA** | Question bank, CAT generation (8-4-4), SBA management + KJSEA composite calculator (CBE) |
| **Digital Portfolio** | CBE-only evidence collection, teacher review workflow, parent visibility |
| **Pathways** | KJSEA scoring, AI pathway-fit recommendation, senior school enrolment (STEM / Social Sciences / Arts & Sports) |
| **Fees & Finance** | M-Pesa STK Push + C2B Paybill, auto-invoicing, bursar dashboard, automated SMS receipts |
| **Communication** | Official notice board, parent-teacher messaging, digital consent forms, event calendar |
| **AI Insights** | Weekly at-risk student prediction (both curricula) + KCSE grade projection (8-4-4) + pathway-fit AI (CBE Grade 9) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TailwindCSS, TanStack Query, Zustand |
| Backend | Node.js 20, Express.js, Knex |
| Database | PostgreSQL 16 with Row-Level Security |
| Cache | Redis 7 |
| AI Service | Python 3.11, FastAPI, scikit-learn, SHAP |
| Payments | Safaricom Daraja API v3 (STK Push + C2B) |
| SMS | Africa's Talking API |
| File Storage | AWS S3 + CloudFront |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter the project
cd shule360

# 2. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai-service/.env.example ai-service/.env

# 3. Edit backend/.env — add your M-Pesa keys, SMS key, etc.

# 4. Start everything
docker compose up -d

# 5. Run database migrations
docker compose exec backend node src/config/migrate.js

# 6. Open the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# AI Service: http://localhost:8000
```

---

## Manual Setup (No Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7
- Python 3.11+

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
node src/config/migrate.js   # Create all tables
npm run dev                  # Start on port 5000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                  # Start on port 3000
```

### AI Service

```bash
cd ai-service
cp .env.example .env
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## M-Pesa Setup

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an app and get your Consumer Key + Consumer Secret
3. Add your Paybill number and Passkey to `backend/.env`
4. Set `MPESA_ENVIRONMENT=sandbox` for testing, `production` for live
5. Configure your callback URL (must be publicly accessible — use ngrok for local dev)

```bash
# For local testing with ngrok
ngrok http 5000
# Then set MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/v1/payments/mpesa/callback
```

---

## Africa's Talking SMS Setup

1. Register at [africastalking.com](https://africastalking.com)
2. Get your API key (use `sandbox` username for testing)
3. Add to `backend/.env`:
   ```
   AT_API_KEY=your_key
   AT_USERNAME=sandbox
   AT_SENDER_ID=SHULE360
   ```

---

## Project Structure

```
shule360/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app entry point
│   │   ├── config/
│   │   │   ├── database.js        # Knex PostgreSQL config
│   │   │   ├── redis.js           # Redis client
│   │   │   └── migrate.js         # Full database migration
│   │   ├── controllers/           # All business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── student.controller.js
│   │   │   ├── grade.controller.js
│   │   │   ├── fee.controller.js
│   │   │   ├── attendance.controller.js
│   │   │   ├── portfolio.controller.js
│   │   │   ├── kjsea.controller.js
│   │   │   ├── communication.controller.js
│   │   │   └── ai.controller.js
│   │   ├── routes/                # Express routers
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT + RBAC
│   │   │   └── curriculumDetector.js  # Auto 8-4-4/CBE detection
│   │   ├── services/
│   │   │   ├── mpesa.service.js   # Daraja STK Push + C2B
│   │   │   └── sms.service.js     # Africa's Talking
│   │   └── utils/logger.js
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   │   ├── auth/login/        # Login page
│   │   │   ├── dashboard/         # Main dashboard
│   │   │   ├── students/          # Student management
│   │   │   ├── grades/            # Dual-curriculum grade entry
│   │   │   ├── exams/             # Exams & SBA
│   │   │   ├── fees/              # Fee management + M-Pesa
│   │   │   ├── communication/     # Notices, messages, consent
│   │   │   ├── portfolio/         # CBE digital portfolios
│   │   │   ├── pathways/          # KJSEA + pathway management
│   │   │   ├── ai/                # AI risk + pathway dashboard
│   │   │   ├── reports/           # Analytics & reports
│   │   │   └── admin/             # School settings
│   │   ├── components/
│   │   │   └── layout/Sidebar.tsx # Navigation sidebar
│   │   ├── store/auth.store.ts    # Zustand auth state
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios client + auto-refresh
│   │   │   └── utils.ts           # Grade helpers, formatters
│   │   └── app/globals.css        # Tailwind + custom classes
│   └── Dockerfile
│
├── ai-service/
│   ├── main.py                    # FastAPI app
│   ├── src/
│   │   ├── features/extractor.py  # Feature engineering (8-4-4 + CBE)
│   │   ├── models/predictors.py   # Risk + pathway fit models
│   │   ├── api/
│   │   │   ├── predict.py         # /predict/risk + /predict/pathway
│   │   │   └── batch.py           # /batch/risk (weekly job)
│   │   └── scheduler/jobs.py      # Weekly cron scheduler
│   ├── requirements.txt
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Curriculum Mode Auto-Detection

Shule360 automatically determines which curriculum to apply per student:

| Student Intake | Curriculum Mode | Assessment Type | Report Card |
|---|---|---|---|
| Admitted ≤ Form 1 in 2023 | 8-4-4 | CATs, End of Term (A–E grades) | Class position, KCSE projection |
| Admitted Grade 7 in 2024+ | CBE | SBA, Projects, Portfolio (EE/ME/AE/BE) | Competency profile, pathway fit |

The `curriculum_mode` field on each student record drives all downstream behaviour automatically. No manual switching required.

---

## User Roles

| Role | Access |
|---|---|
| Principal / Admin | Everything |
| Deputy Principal | Academics, attendance, exams, AI dashboard |
| Teacher | Own subjects' grades, attendance |
| Class Teacher | Above + full class profiles |
| Bursar | Full fee module only |
| Counsellor | Student profiles, pathway guidance, AI risk |
| Parent / Guardian | Own child: grades, fees, portfolio (view), notices |

---

## Environment Variables

See `backend/.env.example`, `frontend/.env.example`, and `ai-service/.env.example` for the complete list.

---

## License

Proprietary — PentaFlow Labs Team © 2026
