# Squetika Chromat Demo v2.0

## Quick Start

1. **Start backend** (Terminal 1):
   ```bash
   cd demo\backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Start frontend** (Terminal 2):
   ```bash
   cd demo\frontend
   npm run dev
   ```

3. Open **http://localhost:5173**

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin (full access) | admin@squetika.com | Admin@123 |
| QA Manager | qa@squetika.com | QaDemo@123 |
| Reviewer | reviewer@squetika.com | Review@123 |
| Analyst | analyst@squetika.com | Analyst@123 |

## What Works

- **Login** with JWT tokens, account lockout (5 attempts), role-based access
- **Dashboard** with real data from SQLite (instruments, activity, alerts)
- **Sequences** table from database
- **Audit Trail** with pagination + SHA-256 hash chain verification
- **E-Signatures** with password re-entry (21 CFR 11.200), 4 pending items
- **Signature workflow**: select meaning → enter password → hash-linked to audit
- **Health endpoint**: /api/v1/health

## API Endpoints (backend:8000)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | No | Login |
| POST | /api/auth/refresh | Yes | Refresh token |
| POST | /api/auth/logout | Yes | Logout |
| POST | /api/auth/change-password | Yes | Change password |
| GET | /api/dashboard | Yes | Dashboard metrics |
| GET | /api/dashboard/instruments | Yes | Instrument status |
| GET | /api/dashboard/oos-today | Yes | OOS records today |
| GET | /api/audit | Yes | Paginated audit trail |
| GET | /api/audit/chain-verify | Yes | Verify hash chain |
| GET | /api/v1/signatures/pending | Yes | Pending signatures |
| POST | /api/v1/signatures | Yes | Create signature (password re-entry) |
| GET | /api/v1/signatures/{record_id} | Yes | Get signatures for record |
| GET | /api/v1/sequences | Yes | All sequences |
| GET | /api/v1/reports/{record_id} | Yes | Report for record |
| GET | /api/v1/health | No | Health check |
| GET | /api/v1/users | Yes | User list (admin/qa_manager) |

## To Continue Later

Files to modify if you want to add more:

- `backend/main.py` — All API routes, seed data, database logic
- `frontend/src/pages/` — React page components
- `frontend/src/api/` — API client calls

## File Structure

```
demo/
├── backend/
│   ├── main.py          # FastAPI app (all routes + seed data)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx      # Root with auth state routing
│   │   ├── pages/
│   │   │   ├── Login.tsx       # Login page with credentials panel
│   │   │   ├── Dashboard.tsx   # Live dashboard from API
│   │   │   ├── Audit.tsx       # Audit trail with hash chain
│   │   │   ├── ESignature.tsx  # E-sign with password re-entry
│   │   │   └── Sequences.tsx   # Sequence table
│   │   ├── api/         # API client (auth, dashboard)
│   │   ├── components/  # Layout with sidebar
│   │   └── index.css    # Design system
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── start.bat            # One-click launcher (double-click)
└── README.md
```
