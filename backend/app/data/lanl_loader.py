import gzip
import os
import random
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict

DATA_DIR = os.path.join(os.path.dirname(__file__), "lanl")
AUTH_FILE = os.path.join(DATA_DIR, "auth.txt.gz")
REDTEAM_FILE = os.path.join(DATA_DIR, "redteam.txt.gz")

AUTH_TYPE_MAP = {
    "Kerberos": "kerberos",
    "NTLM": "ntlm",
    "Negotiate": "negotiate",
    "?": "unknown",
}
LOGON_TYPE_MAP = {
    "Network": "network",
    "Service": "service",
    "Batch": "batch",
    "Interactive": "interactive",
    "Unlock": "unlock",
    "RemoteInteractive": "remote_interactive",
    "CachedInteractive": "cached_interactive",
    "?": "unknown",
}

KNOWN_DOMAINS = ["DOM1"]
SVC_PREFIXES = ["C", "S-1-", "SYSTEM", "ANONYMOUS LOGON"]

CITY_POOL = [
    "Los Alamos", "Santa Fe", "Albuquerque", "Denver", "Phoenix",
    "Dallas", "Houston", "Austin", "Oklahoma City", "Salt Lake City",
]
COUNTRY = "US"
ASN = "AS1234 (LANL Internal)"
DEVICE_POOL = [f"Windows Server 2022", "Windows 11 Enterprise", "Windows 10 Enterprise", "Linux CentOS 7"]
BROWSER_POOL = ["Chrome 125", "Edge 124", "Firefox 124", "Safari 17"]

def _parse_auth_line(line):
    parts = line.strip().split(",")
    if len(parts) < 9:
        return None
    return {
        "time": int(parts[0]),
        "source_user": parts[1],
        "dest_user": parts[2],
        "source_computer": parts[3],
        "dest_computer": parts[4],
        "auth_type": parts[5],
        "logon_type": parts[6],
        "orientation": parts[7],
        "success": parts[8] == "Success",
    }

def _parse_redteam_line(line):
    parts = line.strip().split(",")
    if len(parts) < 4:
        return None
    return {
        "time": int(parts[0]),
        "user": parts[1],
        "source_computer": parts[2],
        "dest_computer": parts[3],
    }

def _is_service_account(user):
    for p in SVC_PREFIXES:
        if user.startswith(p):
            return True
    return False

def _extract_user_name(user_str):
    if "@" in user_str:
        return user_str.split("@")[0]
    return user_str

def _epoch_to_datetime(epoch_sec, base_time=None):
    if base_time is None:
        base_time = datetime(2026, 7, 10, 0, 0, 0)
    return base_time + timedelta(seconds=int(epoch_sec))

class LanlDataLoader:
    def __init__(self, max_events=None, seed=42):
        self.rng = random.Random(seed)
        self.max_events = max_events
        self.user_profiles = {}
        self.redteam_events = set()
        self._load_redteam()

    def _load_redteam(self):
        if not os.path.exists(REDTEAM_FILE):
            return
        try:
            with gzip.open(REDTEAM_FILE, "rt", errors="replace") as f:
                for line in f:
                    ev = _parse_redteam_line(line)
                    if ev:
                        key = (ev["time"], ev["user"], ev["source_computer"], ev["dest_computer"])
                        self.redteam_events.add(key)
        except Exception:
            pass

    def _get_or_create_profile(self, user_str):
        if user_str not in self.user_profiles:
            clean = _extract_user_name(user_str)
            is_svc = _is_service_account(clean)
            self.user_profiles[user_str] = {
                "computers_seen": set(),
                "first_seen": None,
                "last_seen": None,
                "event_count": 0,
                "success_count": 0,
                "fail_count": 0,
                "is_service": is_svc,
                "user_name": clean,
            }
        return self.user_profiles[user_str]

    def stream_events(self):
        if not os.path.exists(AUTH_FILE):
            return

        count = 0
        try:
            with gzip.open(AUTH_FILE, "rt", errors="replace") as f:
                for line in f:
                    ev = _parse_auth_line(line)
                    if ev is None:
                        continue

                    prof = self._get_or_create_profile(ev["source_user"])
                    prof["computers_seen"].add(ev["source_computer"])
                    prof["event_count"] += 1
                    if ev["success"]:
                        prof["success_count"] += 1
                    else:
                        prof["fail_count"] += 1

                    ts = _epoch_to_datetime(ev["time"])
                    if prof["first_seen"] is None or ev["time"] < prof["first_seen"]:
                        prof["first_seen"] = ev["time"]
                    prof["last_seen"] = ev["time"]

                    redteam_key = (ev["time"], ev["source_user"], ev["source_computer"], ev["dest_computer"])
                    is_redteam = redteam_key in self.redteam_events

                    is_success = ev["success"]
                    hour = ts.hour
                    is_off_hours = hour < 6 or hour > 20

                    clean_user = prof["user_name"]
                    is_named_user = not _is_service_account(clean_user) and clean_user not in ("SYSTEM", "ANONYMOUS LOGON")

                    if is_named_user:
                        device = self.rng.choice(DEVICE_POOL[:-1])
                    else:
                        device = DEVICE_POOL[-1]

                    event = {
                        "id": count + 1,
                        "user": clean_user,
                        "display_name": f"User {clean_user}" if is_named_user else clean_user,
                        "timestamp": ts.isoformat(),
                        "ip": f"192.168.{self.rng.randint(1, 254)}.{self.rng.randint(1, 254)}",
                        "country": COUNTRY,
                        "city": self.rng.choice(CITY_POOL),
                        "device": device,
                        "browser": self.rng.choice(BROWSER_POOL),
                        "os": device,
                        "is_success": is_success,
                        "is_anomaly": is_redteam or (not is_success and is_off_hours),
                        "risk_score": 95.0 if is_redteam else (0.0 if is_success else self.rng.uniform(20, 50)),
                        "mfa_used": is_named_user and self.rng.random() > 0.3,
                        "mfa_failed": False,
                        "is_vpn": False,
                        "is_tor": False,
                        "asn": ASN,
                        "source_computer": ev["source_computer"],
                        "dest_computer": ev["dest_computer"],
                        "auth_type": AUTH_TYPE_MAP.get(ev["auth_type"], ev["auth_type"]),
                        "logon_type": LOGON_TYPE_MAP.get(ev["logon_type"], ev["logon_type"]),
                    }

                    if is_redteam:
                        event["attack_type"] = "Credential Theft"
                        event["mitre_id"] = "T1078"
                        event["mitre_name"] = "Valid Accounts"
                        event["attack_desc"] = f"Known red team compromise — user {clean_user} from {ev['source_computer']}"

                    yield event
                    count += 1
                    if self.max_events and count >= self.max_events:
                        return

        except Exception:
            return

    def load_batch(self, size=500):
        events = []
        for ev in self.stream_events():
            events.append(ev)
            if len(events) >= size:
                break
        return events

    def get_stats(self):
        return {
            "users": len(self.user_profiles),
            "redteam_events": len(self.redteam_events),
            "file_size_gb": round(os.path.getsize(AUTH_FILE) / (1024**3), 2) if os.path.exists(AUTH_FILE) else 0,
        }

LOADER = LanlDataLoader()
