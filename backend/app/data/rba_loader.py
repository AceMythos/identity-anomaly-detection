import zipfile
import csv
import io
import os
from datetime import datetime
from .geolocation import resolve_coords, get_default_city, get_country_coords

DATA_DIR = os.path.join(os.path.dirname(__file__), "rba")
ZIP_PATH = os.path.join(DATA_DIR, "rba-dataset.zip")
CSV_NAME = "rba-dataset.csv"

SEVERITY_ORDER = ["critical", "high", "medium", "low"]

KNOWN_ASN_MAP = {
    "29695": "AS29695 (Telenor Norge)",
    "2119": "AS2119 (Telenor Norge)",
    "9009": "AS9009 (M247 Ltd)",
    "15169": "AS15169 (Google LLC)",
    "3320": "AS3320 (Deutsche Telekom)",
    "2856": "AS2856 (BTnet)",
    "1234": "AS1234 (Unknown)",
}


def risk_to_severity(score):
    if score >= 85: return "critical"
    if score >= 70: return "high"
    if score >= 40: return "medium"
    return "low"


def _parse_timestamp(ts_str):
    try:
        return datetime.strptime(ts_str.strip(), "%Y-%m-%d %H:%M:%S.%f")
    except ValueError:
        try:
            return datetime.strptime(ts_str.strip(), "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return datetime.now()


class RbaLoader:
    def __init__(self, max_events=None):
        self.max_events = max_events
        self.zip_path = ZIP_PATH
        self.event_count = 0
        self.user_profiles = {}

    def is_available(self):
        return os.path.exists(self.zip_path) and os.path.getsize(self.zip_path) > 1024

    def _get_or_create_profile(self, user_id):
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = {
                "known_countries": set(),
                "known_ips": set(),
                "event_count": 0,
                "success_count": 0,
                "fail_count": 0,
                "attack_count": 0,
            }
        return self.user_profiles[user_id]

    def stream_events(self):
        if not self.is_available():
            return

        try:
            with zipfile.ZipFile(self.zip_path, "r") as zf:
                with zf.open(CSV_NAME) as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                    for row in reader:
                        event = self._convert_row(row)
                        if event:
                            yield event
                            self.event_count += 1
                            if self.max_events and self.event_count >= self.max_events:
                                return
        except Exception as e:
            print(f"[rba_loader] Error: {e}")

    def _convert_row(self, row):
        user_id = row.get("User ID", "").strip()
        ts_str = row.get("Login Timestamp", "").strip()
        ip = row.get("IP Address", "").strip()
        country = row.get("Country", "").strip() or "NO"
        city = row.get("City", "").strip()
        asn_raw = row.get("ASN", "").strip()
        user_agent = row.get("User Agent String", "").strip()
        browser = row.get("Browser Name and Version", "").strip() or "Unknown"
        os_name = row.get("OS Name and Version", "").strip() or "Unknown"
        device_type = row.get("Device Type", "").strip() or "desktop"
        login_success = row.get("Login Successful", "").strip() == "True"
        is_attack_ip = row.get("Is Attack IP", "").strip() == "True"
        is_account_takeover = row.get("Is Account Takeover", "").strip() == "True"

        if not user_id or not ts_str:
            return None

        timestamp = _parse_timestamp(ts_str)

        if not city or city == "-":
            city = get_default_city(country)

        coords = resolve_coords(city, country)

        asn = KNOWN_ASN_MAP.get(asn_raw, f"AS{asn_raw}" if asn_raw else "Unknown")

        is_anomaly = is_attack_ip or is_account_takeover

        prof = self._get_or_create_profile(user_id)
        prof["known_countries"].add(country)
        prof["known_ips"].add(ip)
        prof["event_count"] += 1
        if login_success:
            prof["success_count"] += 1
        else:
            prof["fail_count"] += 1
        if is_anomaly:
            prof["attack_count"] += 1

        risk_score = 0.0
        if is_account_takeover:
            risk_score = 95.0
        elif is_attack_ip:
            risk_score = 85.0
        elif not login_success:
            risk_score = 40.0
        else:
            risk_score = 5.0

        event = {
            "id": self.event_count + 1,
            "user": f"rba_{user_id[:12]}",
            "display_name": f"User {user_id[:8]}",
            "timestamp": timestamp.isoformat(),
            "ip": ip,
            "country": country,
            "city": city,
            "coords": coords,
            "device": device_type,
            "browser": browser,
            "os": os_name,
            "is_success": login_success,
            "is_anomaly": is_anomaly,
            "risk_score": risk_score,
            "mfa_used": False,
            "mfa_failed": False,
            "is_vpn": False,
            "is_tor": is_attack_ip,
            "asn": asn,
            "source": "rba_dataset",
        }

        if is_account_takeover:
            prev_country = list(prof["known_countries"] - {country})
            prev_country = prev_country[0] if prev_country else "US"
            event.update({
                "attack_type": "Account Takeover",
                "mitre_id": "T1078",
                "mitre_name": "Valid Accounts",
                "attack_desc": f"Account takeover detected from {country}",
                "previous_country": prev_country,
                "previous_city": get_default_city(prev_country),
                "previous_coords": get_country_coords(prev_country),
                "travel_distance_km": 0,
                "travel_time_min": 0,
            })
        elif is_attack_ip:
            prev_country = list(prof["known_countries"] - {country})
            prev_country = prev_country[0] if prev_country else "US"
            event.update({
                "attack_type": "Attack IP",
                "mitre_id": "T1090.003",
                "mitre_name": "Proxy: Multi-hop Proxy",
                "attack_desc": f"Login from known attack IP in {country}",
                "previous_country": prev_country,
                "previous_city": get_default_city(prev_country),
                "previous_coords": get_country_coords(prev_country),
                "travel_distance_km": 0,
                "travel_time_min": 0,
            })

        return event

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
            "events": self.event_count,
            "available": self.is_available(),
            "file_size_gb": round(os.path.getsize(self.zip_path) / (1024**3), 2) if self.is_available() else 0,
        }


LOADER = RbaLoader()
