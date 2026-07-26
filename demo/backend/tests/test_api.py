from fastapi.testclient import TestClient
from main import app, init_db, seed_data

# Initialize database before any tests
init_db()
seed_data()

client = TestClient(app)


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert data["version"] == "2.0.0"
    assert data["record_count"] >= 0
    assert data["audit_count"] >= 0


def test_health_chain_tip():
    r = client.get("/api/v1/health")
    data = r.json()
    assert data["chain_tip"] is not None
    assert len(data["chain_tip"]) > 0


def test_login_success():
    r = client.post("/api/auth/login", json={
        "email": "admin@squetika.com",
        "password": "Admin@123"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "admin"
    assert data["full_name"] == "Dr. Reena Shah"
    assert len(data["access_token"]) > 0


def test_login_wrong_password():
    r = client.post("/api/auth/login", json={
        "email": "admin@squetika.com",
        "password": "wrong"
    })
    assert r.status_code == 401


def login_and_get_token():
    r = client.post("/api/auth/login", json={
        "email": "admin@squetika.com",
        "password": "Admin@123"
    })
    return r.json()["access_token"]


def test_dashboard():
    token = login_and_get_token()
    r = client.get("/api/dashboard", headers={
        "Authorization": f"Bearer {token}"
    })
    assert r.status_code == 200
    data = r.json()
    assert "total_records" in data
    assert "instruments" in data
    assert "recent_activity" in data


def test_chromatograms():
    token = login_and_get_token()
    r = client.get("/api/chromatograms", headers={
        "Authorization": f"Bearer {token}"
    })
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_audit():
    token = login_and_get_token()
    r = client.get("/api/audit?page_size=5", headers={
        "Authorization": f"Bearer {token}"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["total"] > 0
    assert len(data["items"]) <= 5


def test_chain_verify():
    token = login_and_get_token()
    r = client.get("/api/audit/chain-verify", headers={
        "Authorization": f"Bearer {token}"
    })
    assert r.status_code == 200
    data = r.json()
    assert "chain_valid" in data
    assert "total_entries" in data


def test_sequences():
    token = login_and_get_token()
    r = client.get("/api/v1/sequences", headers={
        "Authorization": f"Bearer {token}"
    })
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_pending_signatures():
    token = login_and_get_token()
    r = client.get("/api/v1/signatures/pending", headers={
        "Authorization": f"Bearer {token}"
    })
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
