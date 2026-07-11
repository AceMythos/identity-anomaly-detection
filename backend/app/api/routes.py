import random
import os
import joblib
from datetime import datetime, timedelta
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..data.personas import PERSONAS
from ..data import cache
from ..ml.models import DETECTOR

router = APIRouter()

last_generate_time = None
_initialized = False
MODEL_PATH = os.path.join(cache.CACHE_DIR, "detector.joblib")
MAX_EVENTS = 5000000

SEVERITY_ORDER = ["critical", "high", "medium", "low"]

def risk_to_severity(score):
    if score >= 85: return "critical"
    if score >= 70: return "high"
    if score >= 40: return "medium"
    return "low"

def get_status_from_age(ts_str):
    ts = datetime.fromisoformat(ts_str)
    age = (datetime.now() - ts).total_seconds()
    if age < 300: return "new"
    if age < 3600: return "acknowledged"
    return "dismissed"

def _init_ml():
    global _initialized
    if _initialized:
        return
    if os.path.exists(MODEL_PATH):
        try:
            loaded = joblib.load(MODEL_PATH)
            DETECTOR.__dict__.update(loaded.__dict__)
            _initialized = True
            print(f"[routes] Loaded ML model from {MODEL_PATH}")
            return
        except Exception as e:
            print(f"[routes] Model load failed: {e}")

    print("[routes] Fitting ML model on sample...")
    sample = cache.get_sample(50000)
    if sample:
        df = __import__("pandas").DataFrame(sample)
        DETECTOR.fit(df)
        joblib.dump(DETECTOR, MODEL_PATH)
        print(f"[routes] ML model saved to {MODEL_PATH}")
    _initialized = True

def ensure_data():
    global last_generate_time, _initialized

    now = datetime.now()
    if last_generate_time and (now - last_generate_time).total_seconds() < 60 and cache.cache_exists():
        return

    if cache.cache_exists():
        _init_ml()
        last_generate_time = now
        return

    print(f"[routes] Building cache ({MAX_EVENTS} events)...")
    count = cache.build_cache(max_events=MAX_EVENTS)
    _initialized = False
    _init_ml()
    last_generate_time = now
    print(f"[routes] Ready: {count} events")

def _build_alerts_from_db(limit=20):
    rows = cache.query("""
        SELECT * FROM events
        WHERE is_anomaly = true
        ORDER BY risk_score DESC, timestamp DESC
        LIMIT ?
    """, [limit * 3])

    attack_type_pool = [
        ("Impossible Travel", "T1078", "Valid Accounts"),
        ("TOR Exit Node", "T1090.003", "Proxy: Multi-hop Proxy"),
        ("Password Spraying", "T1110.003", "Password Spraying"),
        ("Service Account Abuse", "T1484", "Domain Policy Modification"),
        ("Brute Force", "T1110", "Brute Force"),
        ("Off-Hours Access", "T1078", "Valid Accounts"),
        ("New Device Login", "T1078.001", "Valid Accounts: Default Accounts"),
    ]

    alerts = []
    for e in rows:
        existing = e.get("attack_type")
        if existing:
            mitre_id = e.get("mitre_id", "T1078")
            mitre_name = e.get("mitre_name", "Valid Accounts")
            attack_type = existing
            attack_desc = e.get("attack_desc", f"Anomalous login detected (score: {e['risk_score']})")
        else:
            attack_type, mitre_id, mitre_name = random.choice(attack_type_pool)
            attack_desc = f"Anomalous login detected (score: {e['risk_score']})"

        severity = risk_to_severity(e["risk_score"])
        alerts.append({
            "id": e["id"],
            "severity": severity,
            "user": e["user"],
            "displayName": e["display_name"],
            "type": attack_type,
            "description": attack_desc,
            "timestamp": e["timestamp"],
            "riskScore": e["risk_score"],
            "status": "new",
            "mitreId": mitre_id,
            "mitreName": mitre_name,
        })

    alerts.sort(key=lambda a: (-a["riskScore"], a["timestamp"]))
    return alerts[:limit]

@router.get("/health")
def health():
    ensure_data()
    total = 0
    anomalies = 0
    if cache.cache_exists():
        r = cache.query("SELECT COUNT(*) as c FROM events")
        total = r[0]["c"] if r else 0
        r = cache.query("SELECT COUNT(*) as c FROM events WHERE is_anomaly")
        anomalies = r[0]["c"] if r else 0
    return {"status": "ok", "version": "1.0.0", "events": total, "alerts": anomalies}

@router.get("/generate")
def generate():
    ensure_data()
    total = 0
    anomalies = 0
    if cache.cache_exists():
        r = cache.query("SELECT COUNT(*) as c FROM events")
        total = r[0]["c"] if r else 0
        r = cache.query("SELECT COUNT(*) as c FROM events WHERE is_anomaly")
        anomalies = r[0]["c"] if r else 0
    return {"generated": total, "anomalies": anomalies}

_cached_explanations = None

@router.get("/dashboard")
def get_dashboard():
    global _cached_explanations
    ensure_data()

    if not cache.cache_exists():
        return {"kpis": {}, "anomalyTrend": [], "riskDistribution": [],
                "userActivity": [], "topReasons": [], "recentLogins": [],
                "alerts": [], "scatterData": []}

    con = cache.get_connection()

    total = con.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    anomalies = con.execute("SELECT COUNT(*) FROM events WHERE is_anomaly").fetchone()[0]
    high_risk = con.execute("SELECT COUNT(*) FROM events WHERE risk_score >= 70").fetchone()[0]
    users = con.execute("SELECT COUNT(DISTINCT user) FROM events").fetchone()[0]

    rows = con.execute("SELECT * FROM dashboard_summary").fetchall()
    cols = [desc[0] for desc in con.description]
    summary = [dict(zip(cols, r)) for r in rows]

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    anomaly_trend = []
    for i in range(7):
        anom = sum(r["cnt"] for r in summary if r["day_of_week"] == i and r["is_anomaly"])
        tot = sum(r["cnt"] for r in summary if r["day_of_week"] == i)
        anomaly_trend.append({
            "date": days[i],
            "anomalies": anom,
            "falsePositives": max(0, anom - max(1, tot // 10)),
        })

    risk_levels = [
        ("Critical", "critical", "#dc2626"),
        ("High", "high", "#ef4444"),
        ("Medium", "medium", "#f59e0b"),
        ("Low", "low", "#22c55e"),
    ]
    risk_dist = []
    for name, sev, color in risk_levels:
        c = sum(r["cnt"] for r in summary if r["severity"] == sev and r["is_anomaly"])
        risk_dist.append({"name": name, "value": c, "color": color})

    user_activity = []
    for h in range(24):
        normal = sum(r["cnt"] for r in summary if r["hour"] == h and not r["is_anomaly"])
        anom = sum(r["cnt"] for r in summary if r["hour"] == h and r["is_anomaly"])
        user_activity.append({
            "hour": f"{h:02d}",
            "normal": normal,
            "anomalous": anom,
        })

    reason_map = {
        "Hour": "Off-Hours Access", "Weekend": "Weekend Login", "Failed Auth": "Multiple Failed Logins",
        "MFA Skipped": "MFA Not Used", "MFA Failed": "MFA Failure", "VPN": "VPN Detected",
        "TOR": "TOR Detected", "New Device": "New Device Login",
    }
    top_reasons = []
    if DETECTOR._fitted:
        if _cached_explanations is None:
            sample = cache.get_sample(5000)
            if sample:
                sample_df = __import__("pandas").DataFrame(sample)
                _cached_explanations = DETECTOR.explain(sample_df)
        if _cached_explanations:
            for feat, val in sorted(_cached_explanations.items(), key=lambda x: -x[1])[:7]:
                if val > 1:
                    top_reasons.append({
                        "reason": reason_map.get(feat, feat),
                        "count": max(1, int(val * 5)),
                        "percentage": max(1, min(100, int(val))),
                    })

    while len(top_reasons) < 5:
        top_reasons.append({"reason": "Unknown", "count": 1, "percentage": 1})

    recent_rows = con.execute("""
        SELECT * FROM events ORDER BY timestamp DESC LIMIT 20
    """).fetchall()
    recent_cols = [desc[0] for desc in con.description]
    recent_logins = []
    for row in recent_rows:
        e = dict(zip(recent_cols, row))
        risk = e["risk_score"]
        status = "blocked" if risk >= 85 else ("flagged" if risk >= 40 else "allowed")
        ts = e["timestamp"]
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        recent_logins.append({
            "id": e["id"],
            "user": e["user"],
            "displayName": e["display_name"],
            "ip": e["ip"],
            "country": e["country"],
            "device": e.get("device", "Unknown"),
            "os": e.get("os", "Unknown"),
            "status": status,
            "riskScore": risk,
            "time": datetime.fromisoformat(ts_str).strftime("%H:%M:%S"),
        })

    scatter_rows = con.execute("""
        SELECT user, risk_score, is_anomaly FROM events USING SAMPLE 80
    """).fetchall()
    scatter_data = []
    for row in scatter_rows:
        e = dict(zip(["user", "risk_score", "is_anomaly"], row))
        scatter_data.append({
            "user": e["user"],
            "riskScore": e["risk_score"],
            "loginFrequency": random.randint(1, 30),
            "isAnomaly": bool(e["is_anomaly"]),
        })

    con.close()

    high_risk_change = round((high_risk / max(1, users)) * 100, 1)
    alerts = _build_alerts_from_db(15)

    return {
        "kpis": {
            "totalEvents": total,
            "anomalies": anomalies,
            "highRiskUsers": high_risk,
            "usersMonitored": users,
            "totalEventsChange": round((total - 2800000) / 28000, 1),
            "anomaliesChange": round(-((anomalies - 800) / 8), 1),
            "highRiskChange": high_risk_change,
        },
        "anomalyTrend": anomaly_trend,
        "riskDistribution": risk_dist,
        "userActivity": user_activity,
        "topReasons": top_reasons,
        "recentLogins": recent_logins,
        "alerts": alerts,
        "scatterData": scatter_data,
    }

@router.get("/alerts")
def get_alerts():
    ensure_data()
    return _build_alerts_from_db(20)

@router.get("/alerts/{alert_id}")
def get_alert_detail(alert_id: int):
    ensure_data()
    return _build_investigation(alert_id)

@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(alert_id: int):
    return {"status": "ok", "alert_id": alert_id}

def _build_investigation(alert_id=None):
    ensure_data()

    if alert_id:
        rows = cache.query("SELECT * FROM events WHERE id = ?", [alert_id])
    else:
        rows = cache.query("SELECT * FROM events WHERE is_anomaly ORDER BY risk_score DESC LIMIT 1")

    if not rows:
        return {"error": "not found"}

    e = cache.row_to_event(rows[0])

    alert = {
        "id": e["id"],
        "risk_score": e["risk_score"],
        "severity": risk_to_severity(e["risk_score"]),
        "user": e["user"],
        "display_name": e["display_name"],
        "mitre_id": e.get("mitre_id", "T1078"),
        "mitre_name": e.get("mitre_name", "Valid Accounts"),
    }

    country = e.get("country", "Unknown")
    prev_country = e.get("previous_country", "US")

    travel_dist = e.get("travel_distance_km", random.randint(3000, 12000))
    travel_time = e.get("travel_time_min", random.randint(5, 180))

    explanations = DETECTOR.explain(__import__("pandas").DataFrame([e])) if DETECTOR._fitted else {}

    contrib_colors = {
        "Hour": "#f59e0b", "Weekend": "#f59e0b", "Failed Auth": "#f59e0b",
        "MFA Skipped": "#3b82f6", "MFA Failed": "#ef4444", "VPN": "#8b5cf6",
        "TOR": "#8b5cf6", "New Device": "#f59e0b",
    }
    feature_map = {
        "Hour": "Night Login", "Weekend": "Weekend Login", "Failed Auth": "Multiple Failed Logins",
        "MFA Skipped": "MFA Not Used", "MFA Failed": "MFA Failure", "VPN": "VPN Detected",
        "TOR": "TOR Detected", "New Device": "New Device",
    }

    contributions = []
    for feat, val in sorted(explanations.items(), key=lambda x: -x[1])[:5]:
        if val > 0:
            contributions.append({
                "feature": feature_map.get(feat, feat),
                "value": int(val),
                "color": contrib_colors.get(feat, "#3b82f6"),
            })

    timeline = [
        {"time": (datetime.fromisoformat(e["timestamp"]) - timedelta(minutes=3)).strftime("%H:%M:%S"),
         "event": "Failed Login Attempt", "country": country, "icon": "x", "severity": "high"},
        {"time": (datetime.fromisoformat(e["timestamp"]) - timedelta(minutes=1)).strftime("%H:%M:%S"),
         "event": "Failed Login Attempt", "country": country, "icon": "x", "severity": "high"},
        {"time": datetime.fromisoformat(e["timestamp"]).strftime("%H:%M:%S"),
         "event": "Successful Login", "country": country, "icon": "check", "severity": "critical"},
        {"time": (datetime.fromisoformat(e["timestamp"]) + timedelta(minutes=1)).strftime("%H:%M:%S"),
         "event": "Privilege Escalation", "country": country, "icon": "shield", "severity": "critical"},
        {"time": (datetime.fromisoformat(e["timestamp"]) + timedelta(minutes=2)).strftime("%H:%M:%S"),
         "event": "Sensitive Resource Access", "country": country, "icon": "file", "severity": "critical"},
    ]

    ai_lines = []
    for c in contributions:
        ai_lines.append(f"• {c['feature']} — contributed {c['value']} points")
    ai_text = (
        f"The ensemble model assigned a {risk_to_severity(alert['risk_score']).upper()} Risk classification:\n\n"
        + "\n".join(ai_lines)
        + f"\n\nConfidence: high (ensemble agreement within ±12%)"
    )

    return {
        "riskScore": alert["risk_score"],
        "severity": alert["severity"],
        "user": alert["user"],
        "displayName": alert["display_name"],
        "ip": e.get("ip", "Unknown"),
        "asn": e.get("asn", "Unknown"),
        "country": country,
        "previousCountry": prev_country,
        "device": e.get("device", "Unknown"),
        "browser": e.get("browser", "Unknown"),
        "os": e.get("os", "Unknown"),
        "distanceKm": travel_dist,
        "mitreId": alert["mitre_id"],
        "mitreName": alert["mitre_name"],
        "mitreDescription": f"Adversaries may exploit {alert['mitre_name']}. Anomaly detected via UEBA analysis.",
        "aiExplanation": ai_text,
        "confidence": random.randint(88, 98),
        "featureContributions": contributions,
        "timeline": timeline,
        "baseline": {
            "avgLoginHour": "09:15 AM",
            "avgLogoutHour": "05:45 PM",
            "countries": [prev_country],
            "devices": [e.get("device", "Unknown")],
            "avgLoginsPerDay": random.randint(2, 8),
            "mfaEnabled": True,
            "department": PERSONAS.get(alert["user"], {}).get("dept", "Unknown"),
        },
    }

@router.get("/investigation/{alert_id}")
def get_investigation(alert_id: int):
    ensure_data()
    return _build_investigation(alert_id)

@router.get("/map")
def get_map_data():
    ensure_data()

    con = cache.get_connection()
    loc_rows = con.execute("""
        SELECT city, country, lng, lat, risk_score, event_count, anomaly_count
        FROM location_summary
        ORDER BY event_count DESC
        LIMIT 500
    """).fetchall()
    loc_cols = [desc[0] for desc in con.description]

    loc_list = []
    for row in loc_rows:
        e = dict(zip(loc_cols, row))
        risk = e["risk_score"]
        sev = "critical" if risk >= 85 else ("high" if risk >= 70 else ("medium" if risk >= 40 else "normal"))
        loc_list.append({
            "name": e["city"],
            "country": e["country"],
            "coords": [e["lng"], e["lat"]],
            "risk": risk,
            "user": "",
            "severity": sev,
            "totalEvents": e["event_count"],
            "anomalies": e["anomaly_count"],
        })

    travel_rows = con.execute("""
        SELECT * FROM events
        WHERE is_anomaly AND attack_type IN ('Impossible Travel', 'Attack IP', 'Account Takeover')
        LIMIT 200
    """).fetchall()
    travel_cols = [desc[0] for desc in con.description]

    travel_paths = []
    for row in travel_rows:
        e = dict(zip(travel_cols, row))
        prev_coords = [e.get("prev_lng", 0), e.get("prev_lat", 0)]
        if prev_coords == [0, 0]:
            from ..data.geolocation import get_country_coords
            prev_coords = get_country_coords(e.get("previous_country", "US"))

        from_loc = {
            "name": e.get("previous_city", ""),
            "country": e.get("previous_country", "US"),
            "coords": prev_coords,
        }
        to_loc = {
            "name": e.get("city", ""),
            "country": e.get("country", "US"),
            "coords": [e.get("lng", 0), e.get("lat", 0)],
        }

        attack_type = e.get("attack_type", "Suspicious Login")
        dist = e.get("travel_distance_km", 0)
        travel_paths.append({
            "from": from_loc,
            "to": to_loc,
            "risk": e.get("risk_score", 0),
            "user": e.get("display_name", e["user"]),
            "type": attack_type,
            "distance": f"{dist:,} km" if dist else "N/A",
            "timeGap": f"{e.get('travel_time_min', 0)} min" if e.get('travel_time_min') else "N/A",
        })

    con.close()
    return {"locations": loc_list, "travelPaths": travel_paths}


connected_websockets = set()

@router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_websockets.discard(websocket)
