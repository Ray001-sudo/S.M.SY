# Shule360 — First-Run Setup Guide

## Step 1: Install Prerequisites

Make sure you have these installed:
- **Node.js 20+** — https://nodejs.org
- **PostgreSQL 16** — https://postgresql.org/download
- **Redis 7** — https://redis.io/download (or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`)
- **Python 3.11+** — https://python.org

Or just use **Docker Desktop** and skip all of the above.

---

## Option A: Docker (Recommended — 5 minutes)

```bash
# 1. Copy environment files
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env
cp ai-service/.env.example ai-service/.env

# 2. Start all services
docker compose up -d

# 3. Run migrations (first time only)
docker compose exec backend node src/config/migrate.js

# 4. Load demo data (optional)
docker compose exec backend node src/config/seed.js

# 5. Open in browser
open http://localhost:3000
```

**Demo login:** `principal@uhuruhs.ac.ke` / `Demo@1234`

---

## Option B: Manual Setup

### Database setup

```sql
-- In psql as superuser:
CREATE DATABASE shule360_db;
CREATE USER shule360_user WITH PASSWORD 'shule360_password';
GRANT ALL PRIVILEGES ON DATABASE shule360_db TO shule360_user;
```

### Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT secrets, M-Pesa keys, SMS key

npm install
node src/config/migrate.js   # Creates all 18 tables
node src/config/seed.js      # Loads demo school + students
npm run dev
# → API running at http://localhost:5000
```

### Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# → App running at http://localhost:3000
```

### AI service setup

```bash
cd ai-service
cp .env.example .env
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → AI service running at http://localhost:8000
```

---

## Step 2: Configure M-Pesa (for fee payments)

1. Go to https://developer.safaricom.co.ke and create a Daraja account
2. Create a new app — get **Consumer Key** and **Consumer Secret**
3. Note your **Paybill number** and **Passkey**
4. Edit `backend/.env`:
   ```
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_PASSKEY=your_passkey
   MPESA_SHORTCODE=your_paybill_number
   MPESA_ENVIRONMENT=sandbox
   ```
5. For local testing, use ngrok to expose your callback:
   ```bash
   ngrok http 5000
   # Copy the https URL and set:
   MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/v1/payments/mpesa/callback
   ```

---

## Step 3: Configure SMS (for parent alerts)

1. Go to https://africastalking.com and create an account
2. In sandbox mode, use `username=sandbox`
3. Edit `backend/.env`:
   ```
   AT_API_KEY=your_api_key
   AT_USERNAME=sandbox
   AT_SENDER_ID=SHULE360
   ```

---

## Step 4: Register your school

After logging in as principal, go to **Settings → School Info** to:
- Set your school's M-Pesa Paybill number
- Configure which curricula are active (8-4-4, CBE, or both)
- Set which CBE pathways your senior school offers

---

## Step 5: Add your students

Two options:

**Manual:** Students → Add Student (one at a time)

**Bulk CSV import:**
```bash
# POST /api/v1/students/bulk-import
# Body: { "students": [ {...}, {...} ] }
# Each student needs: full_name, admission_number, intake_year, gender
# System auto-detects 8-4-4 vs CBE from intake_year
```

---

## Step 6: Generate fee invoices

1. Go to **Fees → Fee Structures**
2. Create a fee structure for the current term
3. Click **Generate Invoices** — system creates invoices for all students automatically

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `ECONNREFUSED 5432` | PostgreSQL not running. Start it or use Docker |
| `ECONNREFUSED 6379` | Redis not running. Start it or `docker run -d -p 6379:6379 redis:7-alpine` |
| M-Pesa callback not received | Check ngrok is running and MPESA_CALLBACK_URL is set correctly |
| AI service 502 error | AI service not running. Start it with `uvicorn main:app --port 8000` |
| Login fails | Run seed first: `node src/config/seed.js` |
