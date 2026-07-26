import sqlite3, hashlib, uuid, json, os, hmac
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import secrets, base64
import jwt

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pwhash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"pbkdf2:sha256:100000:{salt}:{base64.b64encode(pwhash).decode()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        parts = stored.split(':')
        if len(parts) != 5: return False
        _, _, iterations, salt, expected_b64 = parts
        pwhash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), int(iterations))
        return hmac.compare_digest(base64.b64encode(pwhash).decode(), expected_b64)
    except: return False

DB_PATH = os.path.join(os.path.dirname(__file__), "demo.db")
JWT_SECRET = "squetika-demo-secret-key-2026"
JWT_ALGO = "HS256"
ACCESS_EXPIRE = 60
REFRESH_EXPIRE = 30

security = HTTPBearer(auto_error=False)

# ---------- SQLite Setup ----------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','qa_manager','reviewer','analyst')),
            is_active INTEGER DEFAULT 1, failed_attempts INTEGER DEFAULT 0,
            locked_until TEXT, created_at TEXT DEFAULT (datetime('now')),
            password_changed_at TEXT DEFAULT (datetime('now')),
            password_history TEXT DEFAULT '[]', lab_id TEXT,
            last_login_at TEXT
        );
        CREATE TABLE IF NOT EXISTS raw_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT, event_id TEXT UNIQUE NOT NULL,
            lab_id TEXT, connector_id TEXT, source_system TEXT, schema_version TEXT DEFAULT '2.0',
            metadata_json TEXT, peaks_json TEXT, raw_signal_b64 TEXT,
            record_hash TEXT, previous_hash TEXT DEFAULT 'GENESIS',
            batch_number TEXT, product_license_no TEXT, manufacture_date TEXT, expiry_date TEXT,
            manufacturing_site TEXT, duplicate_count INTEGER DEFAULT 0,
            received_at_utc TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, event_time_utc TEXT DEFAULT (datetime('now')),
            connector_id TEXT, user_id TEXT, user_email TEXT, action TEXT NOT NULL,
            module TEXT NOT NULL, detail TEXT, record_id TEXT, outcome TEXT NOT NULL,
            ip_address TEXT, session_id TEXT, lab_id TEXT,
            row_hash TEXT, prev_row_hash TEXT
        );
        CREATE TABLE IF NOT EXISTS hash_chain_state (
            chain_name TEXT PRIMARY KEY, chain_value TEXT NOT NULL DEFAULT 'GENESIS',
            updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS hash_chain_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT, chain_name TEXT NOT NULL,
            previous_hash TEXT NOT NULL, new_hash TEXT NOT NULL, record_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS signatures_ (
            id TEXT PRIMARY KEY, record_id TEXT NOT NULL, user_id TEXT, user_email TEXT,
            full_name TEXT, meaning TEXT, signature_hash TEXT, signed_at_utc TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS connector_heartbeats (
            id INTEGER PRIMARY KEY AUTOINCREMENT, connector_id TEXT, connector_version TEXT,
            last_sequence_id TEXT, record_count_since_last INTEGER DEFAULT 0,
            status TEXT DEFAULT 'online', drift_seconds REAL, received_at_utc TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS sequences_ (
            id TEXT PRIMARY KEY, instrument TEXT, method TEXT, batch TEXT,
            progress INTEGER DEFAULT 0, total INTEGER DEFAULT 0, status TEXT DEFAULT 'running',
            analyst TEXT, created_at TEXT DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO hash_chain_state (chain_name, chain_value) VALUES ('audit_log', 'GENESIS');
        INSERT OR IGNORE INTO hash_chain_state (chain_name, chain_value) VALUES ('raw_records', 'GENESIS');
        INSERT OR IGNORE INTO hash_chain_state (chain_name, chain_value) VALUES ('signatures', 'GENESIS');
    """)
    conn.commit()
    conn.close()

def compute_hash_chain(conn, chain_name, hash_input, record_id):
    cur = conn.execute("SELECT chain_value FROM hash_chain_state WHERE chain_name = ?", (chain_name,))
    row = cur.fetchone()
    prev = row["chain_value"] if row else "GENESIS"
    combined = f"{prev}{hash_input}{record_id}"
    new_hash = hashlib.sha256(combined.encode()).hexdigest()
    conn.execute("INSERT OR REPLACE INTO hash_chain_state (chain_name, chain_value, updated_at) VALUES (?, ?, datetime('now'))",
                 (chain_name, new_hash))
    conn.execute("INSERT INTO hash_chain_log (chain_name, previous_hash, new_hash, record_id) VALUES (?, ?, ?, ?)",
                 (chain_name, prev, new_hash, record_id))
    return new_hash, prev

def seed_data():
    conn = get_db()
    existing = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()
    if existing["c"] > 0:
        conn.close()
        return
    users = [
        ("admin@squetika.com", "Admin@123", "Dr. Reena Shah", "admin", None),
        ("qa@squetika.com", "QaDemo@123", "Dr. Arjun Mehta", "qa_manager", None),
        ("reviewer@squetika.com", "Review@123", "Dr. Priya Kapoor", "reviewer", None),
        ("analyst@squetika.com", "Analyst@123", "Arjun Iyer", "analyst", None),
        ("analyst2@squetika.com", "Analyst@123", "Vikram Rao", "analyst", None),
    ]
    for email, pw, name, role, lab in users:
        uid = str(uuid.uuid4())
        pw_hash = hash_password(pw)
        ph = json.dumps([pw_hash])
        conn.execute("INSERT INTO users (id, email, password_hash, full_name, role, password_history) VALUES (?, ?, ?, ?, ?, ?)",
                     (uid, email, pw_hash, name, role, ph))
    records = [
        ("REC-0247", "EVT-001", "HPLC-QC-01", "Chromeleon", {"instrument":"Agilent 1260 Infinity II","method":"Assay_Paracetamol_v3","sample":"Paracetamol 500mg"}, [{"peak":"Paracetamol","rt":4.23,"area":1254789,"is_passing":True}], "b1","LIC-001","2026-05-01","2027-05-01","Hyderabad"),
        ("REC-0246", "EVT-002", "UHPLC-QC-02", "Chromeleon", {"instrument":"Waters Acquity UPLC H-Class","method":"Impurity_Profile_Method","sample":"Impurity A"}, [{"peak":"Impurity-A","rt":6.88,"area":234567,"is_passing":True}], "b2","LIC-001","2026-05-01","2027-05-01","Hyderabad"),
        ("REC-0245", "EVT-003", "HPLC-QC-01", "Chromeleon", {"instrument":"Agilent 1260 Infinity II","method":"Dissolution_Amoxicillin","sample":"Amoxicillin 250mg"}, [{"peak":"Amoxicillin","rt":2.15,"area":3456789,"is_passing":True}], "b3","LIC-002","2026-04-15","2027-04-15","Mumbai"),
        ("REC-0244", "EVT-004", "LC-MS-01", "Chromeleon", {"instrument":"Thermo Vanquish Flex","method":"Residual_Solvents_ICH_Q3C","sample":"Benzene 100ppm"}, [{"peak":"Benzene","rt":1.05,"area":56789,"is_passing":True}], "b4","LIC-003","2026-05-10","2027-05-10","Hyderabad"),
        ("REC-0243", "EVT-005", "UHPLC-QC-02", "Chromeleon", {"instrument":"Waters Acquity UPLC H-Class","method":"Impurity_Profile_Method","sample":"Impurity B"}, [{"peak":"Impurity-B","rt":7.82,"area":34567,"is_passing":False}], "b2","LIC-001","2026-05-01","2027-05-01","Hyderabad"),
    ]
    for r in records:
        rid, eid, cid, src, meta, peaks, batch, lic, mfg, exp, site = r
        meta_j = json.dumps(meta, sort_keys=True)
        peaks_j = json.dumps(peaks, sort_keys=True)
        prev_hash = "GENESIS"
        hash_input = f"{rid}|{eid}|{cid}|{src}|{meta_j}|{peaks_j}||{prev_hash}"
        rhash = hashlib.sha256(hash_input.encode()).hexdigest()
        conn.execute("""INSERT INTO raw_records (record_id, event_id, connector_id, source_system, metadata_json, peaks_json, record_hash, previous_hash, batch_number, product_license_no, manufacture_date, expiry_date, manufacturing_site) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                     (rid, eid, cid, src, meta_j, peaks_j, rhash, prev_hash, batch, lic, mfg, exp, site))
        new_hash, prev = compute_hash_chain(conn, "raw_records", hash_input, eid)
    seqs = [
        ("SEQ-PARA-0519","HPLC-QC-01","Agilent 1260 Infinity II","Assay_Paracetamol_v3","A-2026-0519-01",14,30,"running","Arjun Iyer"),
        ("SEQ-IMP-0519","UHPLC-QC-02","Waters Acquity UPLC H-Class","Impurity_Profile_Method","B-2026-0519-02",6,20,"hold","Arjun Iyer"),
        ("SEQ-DIS-0519-A","HPLC-QC-03","Shimadzu LC-20AT","Dissolution_Amoxicillin_500mg","C-2026-0519-03",0,12,"scheduled","Vikram Rao"),
        ("SEQ-DIS-0519-B","HPLC-QC-04","Agilent 8890 GC","Dissolution_Ibuprofen_400mg","C-2026-0519-04",0,8,"scheduled","Priya Menon"),
        ("SEQ-PARA-B","HPLC-QC-05","Agilent 1290 Infinity II","Paracetamol_Assay","-",0,0,"error","-"),
        ("SEQ-RES-0519-A","LC-MS-01","Thermo Vanquish Flex","Residual_Solvents_ICH_Q3C","D-2026-0519-01",0,15,"pending","Vikram Rao"),
        ("SEQ-RES-0519-B","LC-MS-02","Waters Xevo TQ-XS","Residual_Solvents_Method_B","D-2026-0519-02",0,10,"ready","Priya Menon"),
    ]
    for s in seqs:
        conn.execute("INSERT INTO sequences_ (id, instrument, method, batch, progress, total, status, analyst) VALUES (?,?,?,?,?,?,?,?)", (s[0],s[2],s[3],s[4],s[5],s[6],s[7],s[8]))
    actions = ["INGEST_RECORD","LOGIN_SUCCESS","ESIG_SUBMITTED","VIEW_AUDIT_TRAIL","SYSTEM_STARTUP","INTEGRITY_CHECK","OOS_FLAGGED","SESSION_TIMEOUT"]
    for i in range(20):
        action = actions[i % len(actions)]
        user = users[i % len(users)]
        uid = conn.execute("SELECT id FROM users WHERE email=?", (user[0],)).fetchone()["id"]
        detail = f"Demo event #{i+1}: {action}"
        hash_input = f"{datetime.now(timezone.utc).isoformat()}|{action}|audit|{detail}|SUCCESS|{uid}"
        new_hash, prev = compute_hash_chain(conn, "audit_log", hash_input, f"audit-{i}")
        conn.execute("""INSERT INTO audit_log (action, module, detail, outcome, user_id, user_email, row_hash, prev_row_hash, lab_id) VALUES (?,?,?,?,?,?,?,?,?)""",
                     (action, "demo", detail, "SUCCESS", uid, user[0], new_hash, prev, user[4]))
    conn.commit()
    conn.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_data()
    yield

app = FastAPI(title="Squetika Chromat Demo", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ---------- Auth helpers ----------

def create_token(user_id: str, email: str, role: str, lab_id: Optional[str], jti: str, type_: str, exp_m: int):
    exp = datetime.now(timezone.utc) + timedelta(minutes=exp_m)
    return jwt.encode({"sub": user_id, "email": email, "role": role, "lab_id": lab_id, "jti": jti, "type": type_, "exp": exp, "iat": datetime.now(timezone.utc)}, JWT_SECRET, algorithm=JWT_ALGO)

def verify_token(token: str, expected_type: str = "access"):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get("type") != expected_type:
            return None
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (payload["sub"],)).fetchone()
    conn.close()
    if user is None or not user["is_active"]:
        raise HTTPException(status_code=401, detail="User not found")
    return {"sub": user["id"], "email": user["email"], "role": user["role"], "lab_id": user["lab_id"], "full_name": user["full_name"]}

# ---------- Schemas ----------

class LoginReq(BaseModel):
    email: str
    password: str

class TokenResp(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    email: str
    role: str
    full_name: str
    lab_id: Optional[str] = None

class SignReq(BaseModel):
    record_id: str
    password: str
    meaning: str = "Reviewed and Approved"

class SignResp(BaseModel):
    id: str
    record_id: str
    user_id: str
    user_email: str
    full_name: str
    meaning: str
    signed_at_utc: str
    signature_hash: str

class AuditEntry(BaseModel):
    id: int
    event_time_utc: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    module: str
    detail: Optional[str] = None
    record_id: Optional[str] = None
    outcome: str
    ip_address: Optional[str] = None
    lab_id: Optional[str] = None
    row_hash: Optional[str] = None
    prev_row_hash: Optional[str] = None

# ---------- Auth Routes ----------

@app.post("/api/auth/login")
async def login(req: LoginReq):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (req.email.lower().strip(),)).fetchone()
    if user is None:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user["is_active"]:
        conn.close()
        raise HTTPException(status_code=401, detail="Account deactivated")
    if user["locked_until"]:
        try:
            locked = datetime.fromisoformat(user["locked_until"])
            if datetime.now(timezone.utc) < locked:
                conn.close()
                raise HTTPException(status_code=423, detail="Account locked")
        except:
            pass
    if not verify_password(req.password, user["password_hash"]):
        attempts = user["failed_attempts"] + 1
        if attempts >= 5:
            lock_until = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
            conn.execute("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?", (attempts, lock_until, user["id"]))
            conn.commit()
        else:
            conn.execute("UPDATE users SET failed_attempts=? WHERE id=?", (attempts, user["id"]))
            conn.commit()
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    conn.execute("UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=datetime('now') WHERE id=?", (user["id"],))
    conn.commit()
    jti = str(uuid.uuid4())
    at = create_token(user["id"], user["email"], user["role"], user["lab_id"], jti, "access", ACCESS_EXPIRE)
    rt = create_token(user["id"], user["email"], user["role"], user["lab_id"], jti, "refresh", REFRESH_EXPIRE * 1440)
    conn.close()
    return TokenResp(access_token=at, refresh_token=rt, expires_in=ACCESS_EXPIRE * 60,
                     user_id=user["id"], email=user["email"], role=user["role"],
                     full_name=user["full_name"], lab_id=user["lab_id"])

@app.post("/api/auth/refresh")
async def refresh(refresh_token: str, current_user: dict = Depends(get_current_user)):
    payload = verify_token(refresh_token, "refresh")
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    jti = str(uuid.uuid4())
    at = create_token(current_user["sub"], current_user["email"], current_user["role"], current_user["lab_id"], jti, "access", ACCESS_EXPIRE)
    rt = create_token(current_user["sub"], current_user["email"], current_user["role"], current_user["lab_id"], jti, "refresh", REFRESH_EXPIRE * 1440)
    return TokenResp(access_token=at, refresh_token=rt, expires_in=ACCESS_EXPIRE * 60,
                     user_id=current_user["sub"], email=current_user["email"], role=current_user["role"],
                     full_name=current_user["full_name"], lab_id=current_user["lab_id"])

@app.post("/api/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    return {"message": "Logged out"}

@app.post("/api/auth/change-password")
async def change_password(old_pw: str, new_pw: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (current_user["sub"],)).fetchone()
    if not verify_password(old_pw, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=400, detail="Current password incorrect")
    new_hash = hash_password(new_pw)
    history = json.loads(user["password_history"])
    history.append(new_hash)
    if len(history) > 5:
        history = history[-5:]
    conn.execute("UPDATE users SET password_hash=?, password_history=?, password_changed_at=datetime('now') WHERE id=?",
                 (new_hash, json.dumps(history), user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Password changed"}

# ---------- Dashboard Routes ----------

@app.get("/api/dashboard")
async def dashboard(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    total = conn.execute("SELECT COUNT(*) as c FROM raw_records").fetchone()["c"]
    today_count = conn.execute("SELECT COUNT(*) as c FROM raw_records WHERE received_at_utc >= ?", (today,)).fetchone()["c"]
    oos = conn.execute("SELECT COUNT(*) as c FROM raw_records WHERE peaks_json LIKE '%is_passing\": false%' AND received_at_utc >= ?", (today,)).fetchone()["c"]
    insts = conn.execute("SELECT id, instrument, status, method, progress, total FROM sequences_ ORDER BY created_at").fetchall()
    audits = conn.execute("SELECT id, action, user_email, detail, event_time_utc FROM audit_log ORDER BY id DESC LIMIT 10").fetchall()
    alerts = conn.execute("SELECT id, action, detail, event_time_utc FROM audit_log WHERE outcome='FAILURE' ORDER BY id DESC LIMIT 5").fetchall()
    conn.close()
    return {
        "total_instruments": len(insts),
        "active_sequences": sum(1 for i in insts if i["status"] == "running"),
        "pending_reviews": conn.execute("SELECT COUNT(*) as c FROM signatures_").fetchone()["c"] if False else 4,
        "oos_count": oos,
        "system_uptime": "99.97%",
        "today_injections": today_count,
        "total_records": total,
        "instruments": [{"name": i["instrument"], "status": i["status"], "method": i["method"], "progress": int(i["progress"] / i["total"] * 100) if i["total"] > 0 else 0} for i in insts],
        "recent_activity": [{"action": a["action"], "user": a["user_email"], "target": a["detail"] or "", "time": a["event_time_utc"]} for a in audits],
        "recent_alerts": [{"id": a["id"], "action": a["action"], "detail": a["detail"]} for a in alerts],
    }

@app.get("/api/dashboard/instruments")
async def instr_status(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT instrument, status, method, progress, total, analyst FROM sequences_ ORDER BY created_at").fetchall()
    conn.close()
    return {"instruments": [{"connector_id": r["instrument"], "record_count": 0, "last_seen": None, "status": r["status"], "method": r["method"], "analyst": r["analyst"]} for r in rows]}

@app.get("/api/dashboard/oos-today")
async def oos_today(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rows = conn.execute("SELECT record_id, event_id, connector_id, received_at_utc FROM raw_records WHERE peaks_json LIKE '%is_passing\": false%' AND received_at_utc >= ?", (today,)).fetchall()
    conn.close()
    return {"oos_count": len(rows), "records": [dict(r) for r in rows]}

# ---------- Audit Routes ----------

@app.get("/api/audit")
async def get_audit(page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
                    action: Optional[str] = None, outcome: Optional[str] = None,
                    current_user: dict = Depends(get_current_user)):
    conn = get_db()
    where = []
    params = []
    if action:
        where.append("action=?")
        params.append(action)
    if outcome:
        where.append("outcome=?")
        params.append(outcome)
    w = " WHERE " + " AND ".join(where) if where else ""
    total = conn.execute(f"SELECT COUNT(*) as c FROM audit_log{w}", params).fetchone()["c"]
    offset = (page - 1) * page_size
    rows = conn.execute(f"SELECT * FROM audit_log{w} ORDER BY id DESC LIMIT ? OFFSET ?", params + [page_size, offset]).fetchall()
    conn.close()
    return {"total": total, "page": page, "page_size": page_size, "items": [dict(r) for r in rows]}

@app.get("/api/audit/chain-verify")
async def verify_chain(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    state = conn.execute("SELECT chain_value FROM hash_chain_state WHERE chain_name='audit_log'").fetchone()
    entries = conn.execute("SELECT * FROM hash_chain_log WHERE chain_name='audit_log' ORDER BY id").fetchall()
    chain_valid = True
    issues = []
    for i, entry in enumerate(entries):
        expected_prev = entries[i-1]["new_hash"] if i > 0 else "GENESIS"
        if entry["previous_hash"] != expected_prev:
            chain_valid = False
            issues.append(f"Chain break at {entry['id']}")
    conn.close()
    return {"chain_valid": chain_valid, "chain_tip": state["chain_value"] if state else "GENESIS",
            "total_entries": len(entries), "issues": issues}

# ---------- Signature Routes ----------

@app.get("/api/v1/signatures/pending")
async def pending_signatures(current_user: dict = Depends(get_current_user)):
    items = [
        {"id": "DEV-2026-0519-02", "type": "OOS Retest Authorization", "submitted_by": "Arjun Iyer", "date": "2026-05-19", "status": "urgent", "record_id": "REC-0243"},
        {"id": "CAPA-2026-0038", "type": "CAPA Closure", "submitted_by": "Vikram Rao", "date": "2026-05-17", "status": "overdue", "record_id": "CAPA-0038"},
        {"id": "REC-0239", "type": "Batch Record Review", "submitted_by": "Priya Menon", "date": "2026-05-19", "status": "pending", "record_id": "REC-0239"},
        {"id": "REC-0240", "type": "Batch Record Review", "submitted_by": "Arjun Iyer", "date": "2026-05-19", "status": "pending", "record_id": "REC-0240"},
    ]
    return items

@app.post("/api/v1/signatures", status_code=201)
async def create_signature(sig: SignReq, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id=?", (current_user["sub"],)).fetchone()
    if not verify_password(sig.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=403, detail="Password re-entry failed")
    sig_id = str(uuid.uuid4())
    sig_hash_input = f"{current_user['sub']}|{sig.record_id}|{sig.meaning}|{datetime.now(timezone.utc).isoformat()}"
    sig_hash = hashlib.sha256(sig_hash_input.encode()).hexdigest()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("INSERT INTO signatures_ (id, record_id, user_id, user_email, full_name, meaning, signature_hash, signed_at_utc) VALUES (?,?,?,?,?,?,?,?)",
                 (sig_id, sig.record_id, current_user["sub"], current_user["email"], current_user["full_name"], sig.meaning, sig_hash, now))
    conn.execute("INSERT INTO audit_log (action, module, detail, outcome, user_id, user_email, record_id, lab_id) VALUES (?,?,?,?,?,?,?,?)",
                 ("ESIG_SUBMITTED", "Signatures", f"Signature for {sig.record_id}: {sig.meaning}", "SUCCESS",
                  current_user["sub"], current_user["email"], sig.record_id, current_user["lab_id"]))
    conn.commit()
    conn.close()
    return SignResp(id=sig_id, record_id=sig.record_id, user_id=current_user["sub"],
                    user_email=current_user["email"], full_name=current_user["full_name"],
                    meaning=sig.meaning, signed_at_utc=now, signature_hash=sig_hash)

@app.get("/api/v1/signatures/{record_id}")
async def get_signatures(record_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM signatures_ WHERE record_id=? ORDER BY signed_at_utc DESC", (record_id,)).fetchall()
    conn.close()
    return {"record_id": record_id, "signatures": [dict(r) for r in rows]}

# ---------- Report Routes ----------

@app.get("/api/v1/reports/{record_id}")
async def get_report(record_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    record = conn.execute("SELECT * FROM raw_records WHERE record_id=?", (record_id,)).fetchone()
    conn.close()
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"record_id": record_id, "report": json.dumps(dict(record), indent=2), "generated_at_utc": datetime.now(timezone.utc).isoformat()}

# ---------- Chromatogram Routes ----------

import math as _math
import random as _random

@app.get("/api/chromatograms")
async def list_chromatograms(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT record_id, event_id, connector_id, source_system, metadata_json, peaks_json, record_hash, batch_number, product_license_no, manufacture_date, expiry_date, manufacturing_site, received_at_utc FROM raw_records ORDER BY received_at_utc DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        meta = json.loads(r["metadata_json"]) if r["metadata_json"] else {}
        peaks = json.loads(r["peaks_json"]) if r["peaks_json"] else []
        result.append({
            "record_id": r["record_id"],
            "event_id": r["event_id"],
            "connector_id": r["connector_id"],
            "source_system": r["source_system"],
            "instrument": meta.get("instrument", ""),
            "method": meta.get("method", ""),
            "sample": meta.get("sample", ""),
            "batch_number": r["batch_number"],
            "product_license_no": r["product_license_no"],
            "manufacturing_site": r["manufacturing_site"],
            "received_at_utc": r["received_at_utc"],
            "peak_count": len(peaks),
            "record_hash": r["record_hash"][:16] + "...",
        })
    return result

@app.get("/api/chromatograms/{record_id}")
async def get_chromatogram(record_id: str, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM raw_records WHERE record_id=?", (record_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Record not found")
    meta = json.loads(row["metadata_json"]) if row["metadata_json"] else {}
    peaks = json.loads(row["peaks_json"]) if row["peaks_json"] else []
    sigma = 0.04
    noise_level = 2000
    _random.seed(hash(record_id) % (2**31))
    max_rt = max((p["rt"] for p in peaks), default=10) + 1.5
    points_count = 300
    signal = []
    for i in range(points_count):
        x = round((i / (points_count - 1)) * max_rt, 3)
        y = _random.gauss(0, noise_level / 3)
        for p in peaks:
            amp = p["area"] / (_math.sqrt(2 * _math.pi * sigma**2))
            y += amp * _math.exp(-((x - p["rt"]) ** 2) / (2 * sigma**2))
        signal.append({"time": x, "intensity": round(y, 1)})
    annotations = [{"rt": p["rt"], "label": p["peak"], "area": p["area"], "is_passing": p["is_passing"]} for p in peaks]
    return {
        "record_id": row["record_id"],
        "event_id": row["event_id"],
        "connector_id": row["connector_id"],
        "source_system": row["source_system"],
        "metadata": meta,
        "batch_number": row["batch_number"],
        "product_license_no": row["product_license_no"],
        "manufacture_date": row["manufacture_date"],
        "expiry_date": row["expiry_date"],
        "manufacturing_site": row["manufacturing_site"],
        "received_at_utc": row["received_at_utc"],
        "record_hash": row["record_hash"],
        "previous_hash": row["previous_hash"],
        "signal": signal,
        "annotations": annotations,
    }

# ---------- Misc Routes ----------

@app.get("/api/v1/health")
async def health():
    conn = get_db()
    rc = conn.execute("SELECT COUNT(*) as c FROM raw_records").fetchone()["c"]
    ac = conn.execute("SELECT COUNT(*) as c FROM audit_log").fetchone()["c"]
    chain = conn.execute("SELECT chain_value FROM hash_chain_state WHERE chain_name='audit_log'").fetchone()
    conn.close()
    return {"status": "healthy", "version": "2.0.0", "record_count": rc, "audit_count": ac,
            "chain_tip": chain["chain_value"][:16] + "..." if chain else "GENESIS"}

@app.get("/api/v1/sequences")
async def get_sequences(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM sequences_ ORDER BY created_at").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/v1/agents")
async def list_agents(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT DISTINCT connector_id, source_system FROM raw_records").fetchall()
    conn.close()
    return [{"connector_id": r["connector_id"], "source_system": r["source_system"], "status": "online", "approved": True} for r in rows]

@app.get("/api/v1/users")
async def list_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "qa_manager"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    conn = get_db()
    rows = conn.execute("SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at").fetchall()
    conn.close()
    return [dict(r) for r in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
