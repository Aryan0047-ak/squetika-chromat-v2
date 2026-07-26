<p align="center">
  <img src="https://img.shields.io/badge/21%20CFR%20Part%2011-Compliant-228B22" alt="21 CFR Part 11">
  <img src="https://img.shields.io/badge/FastAPI-2.0-009688" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18-61DAFB" alt="React 18">
  <img src="https://img.shields.io/badge/SHA--256-Hash%20Chain-blue" alt="SHA-256">
  <img src="https://img.shields.io/badge/JWT-Auth-orange" alt="JWT Auth">
</p>

# Squetika Chromat — HPLC Digital LIS Demo

A **21 CFR Part 11 compliant** Laboratory Information System (LIS) demo for HPLC chromatographic data management. Provides tamper-proof digital records with SHA-256 hash chaining, electronic signatures with password re-entry, role-based access control, and a complete audit trail with cryptographic integrity verification.

Built for regulated GxP environments where data integrity, electronic records compliance (FDA 21 CFR Part 11 / EU Annex 11), and auditability are mandatory.

---

## Features

### Regulatory Compliance

| Requirement | Implementation |
|---|---|
| **21 CFR 11.10(a)** — Validation | SHA-256 hash chain on all audit entries |
| **21 CFR 11.10(b)** — Audit Trail | Immutable audit log with chain verification endpoint |
| **21 CFR 11.10(d)** — Access Control | JWT-based auth, 4 roles (Admin, QA Manager, Reviewer, Analyst) |
| **21 CFR 11.10(e)** — Authority Checks | Role-based route guards on all API endpoints |
| **21 CFR 11.50** — Signed records | E-signatures with meaning, timestamp, and user identity |
| **21 CFR 11.70** — Password re-entry | Password re-authentication before every signature |
| **21 CFR 11.200** — Electronic signatures | Unique user ID + password combo, linked to audit trail |
| **21 CFR 11.300** — Signature controls | Account lockout after 5 failed attempts |

### Core Capabilities

- **Role-Based Dashboard** — Live metrics per role: total records, today's injections, OOS counts, instrument status
- **Chromatogram Viewer** — Browse HPLC records with synthetic signal generation (Gaussian peak modeling)
- **SHA-256 Hash Chain** — Every audit entry cryptographically linked to its predecessor; chain integrity endpoint
- **Electronic Signatures** — 4 pending signature workflows with password re-entry and audit trail linkage
- **Pagination & Filtering** — Server-side pagination for audit trail with action/outcome filters
- **Token-Based Auth** — Access + refresh token flow, 60-min access token expiry, secure HTTP-only storage
- **Instrument Management** — Dashboard shows live instrument status per sequence (running, hold, error, pending, scheduled)
- **Out-of-Spec (OOS) Tracking** — Dashboard counts and dedicated endpoint for OOS records flagged by peak passing criteria

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (localhost:5173)                  │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────────────┐   │
│  │Dashboard │ │Chromato- │ │ Audit  │ │ E-Signature    │   │
│  │          │ │grams     │ │ Trail  │ │                │   │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └───────┬────────┘   │
│       │            │           │              │            │
│  ┌────┴────────────┴───────────┴──────────────┴─────┐     │
│  │              client.ts (API Layer)                │     │
│  │   prepends /api, attaches JWT, handles 401/423   │     │
│  └──────────────────────┬───────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────┘
                          │  Vite Dev Proxy (5173 → 8000)
                          │  /api/* → http://localhost:8000
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                FastAPI Backend (localhost:8000)              │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐    │
│  │ Auth     │  │Dashboard │  │ Audit   │  │Signature │    │
│  │ Routes   │  │ Routes   │  │ Routes  │  │ Routes   │    │
│  └────┬─────┘  └────┬─────┘  └────┬────┘  └────┬─────┘    │
│       │             │             │            │          │
│  ┌────┴─────────────┴─────────────┴────────────┴────┐     │
│  │              SQLite (demo.db)                     │     │
│  │  ┌──────────┐ ┌─────────┐ ┌──────────────┐      │     │
│  │  │ raw_     │ │ audit_  │ │ hash_chain_  │      │     │
│  │  │ records  │ │ log     │ │ state + log  │      │     │
│  │  ├──────────┤ ├─────────┤ ├──────────────┤      │     │
│  │  │signatures│ │ users   │ │ sequences_   │      │     │
│  │  └──────────┘ └─────────┘ └──────────────┘      │     │
│  └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12+, FastAPI, Uvicorn, PyJWT |
| **Database** | SQLite 3 (WAL mode, foreign keys enforced) |
| **Frontend** | React 18, TypeScript, Vite 6, Recharts |
| **Auth** | PBKDF2-SHA256 password hashing, HS256 JWT tokens |
| **Hash Chain** | SHA-256 cryptographic linking |
| **API Style** | RESTful, JSON, Bearer token auth |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm or yarn

### 1. Clone & Install

```bash
git clone <your-repo-url> squetika-chromat
cd squetika-chromat/demo

# Backend
cd backend
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 2. Start Backend

```bash
cd backend
python main.py
# → Server running on http://localhost:8000
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
# → Dev server on http://localhost:5173
```

### 4. Open Browser

Navigate to **http://localhost:5173** and log in.

---

## Demo Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@squetika.com` | `Admin@123` | Full access, user management, all routes |
| **QA Manager** | `qa@squetika.com` | `QaDemo@123` | Review records, e-signatures, OOS oversight |
| **Reviewer** | `reviewer@squetika.com` | `Review@123` | View records, sign, audit review |
| **Analyst** | `analyst@squetika.com` | `Analyst@123` | Enter data, view sequences |

The demo seeds **5 diverse HPLC records** (Paracetamol, Amoxicillin, Impurity A/B, Benzene Residual Solvents) across **6 instrument types** (Agilent 1260/1290/8890, Waters Acquity UPLC/Xevo TQ-XS, Thermo Vanquish Flex, Shimadzu LC-20AT) with **7 active sequences** and **20+ audit events** — all on first startup.

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Authenticate with email + password |
| POST | `/api/auth/refresh` | Bearer | Refresh access token |
| POST | `/api/auth/logout` | Bearer | Logout (client-side token removal) |
| POST | `/api/auth/change-password` | Bearer | Change password with history (last 5) |

### Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard` | Bearer | Live dashboard metrics (records, instruments, OOS, activity, alerts) |
| GET | `/api/dashboard/instruments` | Bearer | Instrument status list |
| GET | `/api/dashboard/oos-today` | Bearer | Out-of-specification records today |

### Records & Chromatograms

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/chromatograms` | Bearer | List all records with metadata and peak counts |
| GET | `/api/chromatograms/{record_id}` | Bearer | Detail view with synthetic signal + annotations |

### Audit Trail

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/audit` | Bearer | Paginated audit log (supports `action`, `outcome` filters) |
| GET | `/api/audit/chain-verify` | Bearer | Verify SHA-256 hash chain integrity |

### Electronic Signatures

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/signatures/pending` | Bearer | Pending signature items |
| POST | `/api/v1/signatures` | Bearer | Execute signature (requires password re-entry) |
| GET | `/api/v1/signatures/{record_id}` | Bearer | Signature history for a record |

### Sequences

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/sequences` | Bearer | All sequences with instrument, method, progress |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | No | Health check with record/audit counts + chain tip |

---

## Project Structure

```
demo/
├── backend/
│   ├── main.py              # FastAPI application (572 lines)
│   │                        #   - All API routes
│   │                        #   - Seed data (5 records, 7 sequences, 20+ audit entries)
│   │                        #   - Hash chain computation
│   │                        #   - PBKDF2 password hashing + JWT token management
│   │                        #   - Account lockout logic
│   ├── demo.db              # SQLite database (auto-created + seeded on first run)
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Root component — auth state, routing, layout
│   │   ├── index.css        # Design system, dark sidebar, responsive
│   │   ├── pages/
│   │   │   ├── Login.tsx       # Login form + credentials hint panel
│   │   │   ├── Dashboard.tsx   # Live metrics, instrument table, activity, alerts
│   │   │   ├── Chromatograms.tsx # Record list + chromatogram detail view
│   │   │   ├── Audit.tsx       # Audit table + hash chain verification
│   │   │   ├── ESignature.tsx  # Pending signatures + sign modal
│   │   │   └── Sequences.tsx   # Sequence table with status badges
│   │   ├── api/
│   │   │   ├── client.ts       # HTTP client — JWT injection, 401/423 handling
│   │   │   ├── auth.ts         # Login/logout API interfaces
│   │   │   └── dashboard.ts    # Dashboard data types
│   │   └── components/
│   │       └── Layout.tsx      # Sidebar navigation + auth state
│   ├── index.html
│   ├── vite.config.ts       # Vite config with /api proxy → :8000
│   └── package.json         # React 18, Recharts, TypeScript, Vite 6
│
├── start.bat               # One-click launcher (double-click)
└── README.md               # This file
```

---

## How It Works

### Data Flow

1. **Records arrive** from HPLC instruments via the connector (seeded on startup for demo)
2. **SHA-256 hash is computed** for each record: `SHA256(record_id|event_id|connector_id|metadata|peaks|previous_hash)`
3. **Hash chain is updated** — each new hash references the previous tip (`previous_hash` field links to prior record)
4. **Audit events are chained** — every action (login, signature, record ingest) creates an audit entry linked to the chain
5. **Analyst views records** — chromatogram list shows metadata; detail view generates synthetic signal traces from stored peak data
6. **QA reviews & signs** — e-signatures require password re-entry (21 CFR 11.200), creating an `ESIG_SUBMITTED` audit event
7. **Chain verification** — the `/api/audit/chain-verify` endpoint iterates the entire hash chain log to detect tampering

### Security Model

- Passwords hashed with **PBKDF2-SHA256** (100,000 iterations, 16-byte salt)
- JWTs signed with **HS256** using server-side secret
- Account lockout after **5 failed login attempts** (30-minute cooldown)
- Password history enforced — **last 5 passwords** tracked, cannot reuse
- All API routes (except login + health) require **Bearer token** authentication
- Frontend **auto-redirects to login** on 401/423 responses

---

## Screenshots

<!-- Add screenshots here for your GitHub README -->
<!-- 
  - Login page with credential hints
  - Dashboard with live metrics
  - Chromatogram detail with peak annotations
  - Audit trail with hash chain verification
  - E-signature modal
  - Sequence table with instrument status
-->

---

## Development

### Backend

```bash
cd demo/backend
python main.py
# Auto-reload on file changes:
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd demo/frontend
npm run dev      # Dev server with HMR
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

### Adding Seed Data

Edit the `seed_data()` function in `demo/backend/main.py`. Records, sequences, users, and audit events are defined as Python lists and inserted on first database creation.

---

## License

This project is provided for demonstration and evaluation purposes.

---

<p align="center">
  <sub>Built with reference to 21 CFR Part 11, EU Annex 11, and GAMP 5 guidelines for regulated laboratory environments.</sub>
</p>
