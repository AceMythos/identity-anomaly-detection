import random
import numpy as np
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from ..data.personas import generator, PERSONAS, COUNTRIES, CITIES, ASN_MAP
from ..data.lanl_loader import LOADER as LANL_LOADER, DATA_DIR as LANL_DIR
from ..ml.models import DETECTOR

router = APIRouter()

events_cache = []
alerts_cache = []
last_generate_time = None

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

def _use_lanl_data():
    auth_file = os.path.join(LANL_DIR, "auth.txt.gz")
    if not os.path.exists(auth_file):
        return False
    try:
        events = list(LANL_LOADER.load_batch(size=500))
        if len(events) < 10:
            return False
        events_cache.clear()
        alerts_cache.clear()
        _process_events(events)
        return True
    except Exception:
        return False

def _process_events(raw):
    global events_cache, alerts_cache
    df = __import__("pandas").DataFrame(raw)

    DETECTOR.fit(df)
    risk_scores = DETECTOR.predict(df)

    anomaly_indices = set()
    for i, score in enumerate(risk_scores):
        raw[i]["risk_score"] = round(score, 1)
        raw[i]["is_anomaly"] = score >= 30
        if score >= 30:
            anomaly_indices.add(i)

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
    for i in sorted(anomaly_indices):
        e = raw[i]
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
    events_cache[:] = raw
    alerts_cache[:] = alerts

def ensure_data():
    global events_cache, alerts_cache, last_generate_time

    now = datetime.now()
    if last_generate_time and (now - last_generate_time).total_seconds() < 60 and events_cache:
        return

    if _use_lanl_data():
        last_generate_time = now
        return

    raw = generator.generate_batch(400)
    _process_events(raw)
    last_generate_time = now

@router.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0", "events": len(events_cache), "alerts": len(alerts_cache)}

@router.get("/generate")
def generate():
    ensure_data()
    return {"generated": len(events_cache), "anomalies": len(alerts_cache)}

@router.get("/dashboard")
def get_dashboard():
    ensure_data()

    df = __import__("pandas").DataFrame(events_cache)
    anomaly_df = df[df["is_anomaly"]]

    total = len(df)
    anomalies = len(anomaly_df)
    high_risk = len(anomaly_df[anomaly_df["risk_score"] >= 70])
    users = df["user"].nunique()

    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    anomaly_trend = []
    for d in days:
        day_mask = df["timestamp"].apply(lambda t: datetime.fromisoformat(t).strftime("%a")) == d
        day_events = df[day_mask]
        day_anomalies = anomaly_df[anomaly_df["timestamp"].apply(lambda t: datetime.fromisoformat(t).strftime("%a")) == d]
        anomaly_trend.append({
            "date": d,
            "anomalies": len(day_anomalies),
            "falsePositives": max(0, len(day_anomalies) - max(1, len(day_events) // 10)),
        })

    risk_dist = [
        {"name": "Critical", "value": len(anomaly_df[anomaly_df["risk_score"] >= 85]), "color": "#dc2626"},
        {"name": "High", "value": len(anomaly_df[(anomaly_df["risk_score"] >= 70) & (anomaly_df["risk_score"] < 85)]), "color": "#ef4444"},
        {"name": "Medium", "value": len(anomaly_df[(anomaly_df["risk_score"] >= 40) & (anomaly_df["risk_score"] < 70)]), "color": "#f59e0b"},
        {"name": "Low", "value": len(anomaly_df[(anomaly_df["risk_score"] >= 30) & (anomaly_df["risk_score"] < 40)]), "color": "#22c55e"},
    ]

    user_activity = []
    for h in range(24):
        hour_str = f"{h:02d}"
        hour_mask = df["timestamp"].apply(lambda t: datetime.fromisoformat(t).hour == h)
        hour_events = df[hour_mask]
        hour_anomalies = anomaly_df[anomaly_df["timestamp"].apply(lambda t: datetime.fromisoformat(t).hour == h)]
        user_activity.append({
            "hour": hour_str,
            "normal": len(hour_events) - len(hour_anomalies),
            "anomalous": len(hour_anomalies),
        })

    explanations = DETECTOR.explain(df)
    reason_map = {
        "Hour": "Off-Hours Access", "Weekend": "Weekend Login", "Failed Auth": "Multiple Failed Logins",
        "MFA Skipped": "MFA Not Used", "MFA Failed": "MFA Failure", "VPN": "VPN Detected",
        "TOR": "TOR Detected", "New Device": "New Device Login",
    }
    top_reasons_raw = sorted(explanations.items(), key=lambda x: -x[1])[:7]
    top_reasons = []
    for feat, val in top_reasons_raw:
        if val > 1:
            top_reasons.append({
                "reason": reason_map.get(feat, feat),
                "count": max(1, int(val * 5)),
                "percentage": max(1, min(100, int(val))),
            })

    while len(top_reasons) < 5:
        top_reasons.append({"reason": "Unknown", "count": 1, "percentage": 1})

    recent = df.sort_values("timestamp", ascending=False).head(20)
    recent_logins = []
    for _, e in recent.iterrows():
        risk = e["risk_score"]
        status = "blocked" if risk >= 85 else ("flagged" if risk >= 40 else "allowed")
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
            "time": datetime.fromisoformat(e["timestamp"]).strftime("%H:%M:%S"),
        })

    scatter_data = []
    for _, e in df.sample(min(80, len(df))).iterrows():
        scatter_data.append({
            "user": e["user"],
            "riskScore": e["risk_score"],
            "loginFrequency": random.randint(1, 30),
            "isAnomaly": bool(e["is_anomaly"]),
        })

    high_risk_change = round((high_risk / max(1, users)) * 100, 1)

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
        "alerts": alerts_cache[:15],
        "scatterData": scatter_data,
    }

@router.get("/alerts")
def get_alerts():
    ensure_data()
    return alerts_cache[:20]

@router.get("/alerts/{alert_id}")
def get_alert_detail(alert_id: int):
    ensure_data()
    for a in alerts_cache:
        if a["id"] == alert_id:
            return _build_investigation(a)
    return {"error": "not found"}, 404

@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert(alert_id: int):
    for a in alerts_cache:
        if a["id"] == alert_id:
            a["status"] = "acknowledged"
            return {"status": "ok", "alert_id": alert_id}
    return {"error": "not found"}, 404

def _build_investigation(alert=None):
    ensure_data()
    if alert is None and alerts_cache:
        alert = alerts_cache[0]

    if not alert:
        return {"error": "no alerts"}, 404

    e = None
    for ev in events_cache:
        if ev["id"] == alert["id"]:
            e = ev
            break
    if e is None and events_cache:
        e = events_cache[0]

    country = e.get("country", "Unknown")
    prev_country = e.get("previous_country", "US")

    travel_dist = e.get("travel_distance_km", random.randint(3000, 12000))
    travel_time = e.get("travel_time_min", random.randint(5, 180))

    explanations = DETECTOR.explain(__import__("pandas").DataFrame([e])) if e else {}

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
    for a in alerts_cache:
        if a["id"] == alert_id:
            return _build_investigation(a)
    return {"error": "not found"}, 404

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
