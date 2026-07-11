import random
import numpy as np
from datetime import datetime, timedelta
from .geolocation import get_city_coords, get_country_coords

PERSONAS = {
    "alice.c":   {"name": "Alice Chen",      "dept": "Engineering",   "country": "US",  "tz_offset": -5, "device": "Windows 11", "browser": "Chrome 125",  "work_start": 8,  "work_end": 17, "login_rate": 5, "mfa": True},
    "b.smith":   {"name": "Bob Smith",       "dept": "DevOps",        "country": "US",  "tz_offset": -6, "device": "Linux",       "browser": "Firefox 124",  "work_start": 20, "work_end": 4, "login_rate": 8, "mfa": True},
    "charlie.d": {"name": "Charlie Davis",   "dept": "Management",    "country": "US",  "tz_offset": -8, "device": "macOS 14",     "browser": "Safari 17",    "work_start": 7,  "work_end": 19, "login_rate": 12, "mfa": True},
    "diana.m":   {"name": "Diana Martinez",  "dept": "Engineering",   "country": "IN",  "tz_offset": 5.5, "device": "Windows 11", "browser": "Chrome 125",  "work_start": 9,  "work_end": 18, "login_rate": 6, "mfa": True},
    "eve.c":     {"name": "Eve Contractor",  "dept": "External",      "country": "GB",  "tz_offset": 0,   "device": "macOS 14",    "browser": "Safari 17",   "work_start": 9,  "work_end": 17, "login_rate": 3, "mfa": False},
    "svc_build": {"name": "Build Service",   "dept": "Infra",         "country": "US",  "tz_offset": -5,  "device": "Linux",       "browser": "curl/8.4",    "work_start": 6,  "work_end": 22, "login_rate": 20, "mfa": False},
    "jsmith":    {"name": "James Smith",     "dept": "Engineering",   "country": "US",  "tz_offset": -5,  "device": "macOS 14",    "browser": "Chrome 125",  "work_start": 9,  "work_end": 18, "login_rate": 4, "mfa": True},
    "admin_sa":  {"name": "Admin Service",   "dept": "IT",            "country": "US",  "tz_offset": -5,  "device": "Server 2022",  "browser": "PowerShell",  "work_start": 0,  "work_end": 24, "login_rate": 30, "mfa": False},
}

ATTACK_SCENARIOS = [
    {"type": "Impossible Travel",     "mitre": "T1078",   "desc": "Login from {country} — {min}s after {prev_country}"},
    {"type": "TOR Exit Node",         "mitre": "T1090.003", "desc": "Authentication via known TOR exit node"},
    {"type": "Password Spraying",     "mitre": "T1110.003", "desc": "{failed} failed logins across {targets} accounts"},
    {"type": "Service Account Abuse", "mitre": "T1484",   "desc": "Service account login at unusual hour"},
    {"type": "Brute Force",           "mitre": "T1110",   "desc": "{failed} consecutive failed logins for {user}"},
    {"type": "MFA Fatigue",           "mitre": "T1621",   "desc": "Multiple MFA push requests in {min}s"},
]

COUNTRIES = ["US", "GB", "DE", "FR", "IN", "SG", "RU", "BR", "JP", "AU", "CA", "NL"]
CITIES = {
    "US": ["New York", "San Francisco", "Chicago", "Austin", "Seattle"],
    "GB": ["London", "Manchester"],
    "DE": ["Berlin", "Munich"],
    "FR": ["Paris"],
    "IN": ["Bangalore", "Mumbai", "Delhi"],
    "SG": ["Singapore"],
    "RU": ["Moscow", "Saint Petersburg"],
    "BR": ["São Paulo"],
    "JP": ["Tokyo"],
    "AU": ["Sydney"],
    "CA": ["Toronto"],
    "NL": ["Amsterdam"],
}

DEVICES = ["Windows 11", "macOS 14", "Linux", "Windows 10", "iOS 17", "Android 14"]
BROWSERS = ["Chrome 125", "Firefox 124", "Safari 17", "Edge 124", "Opera 108"]

ASN_MAP = {
    "US": "AS15169 (Google LLC)",
    "RU": "AS9009 (M247 Ltd)",
    "DE": "AS3320 (Deutsche Telekom)",
    "GB": "AS2856 (BTnet)",
    "FR": "AS3215 (Orange)",
    "IN": "AS24309 (Tata Communications)",
    "SG": "AS3758 (SingNet)",
    "BR": "AS7738 (Vivo)",
    "JP": "AS2510 (Fujitsu)",
    "AU": "AS4804 (Telstra)",
    "CA": "AS812 (Rogers)",
    "NL": "AS1136 (KPN)",
}

BASE_IPS = {
    "US": "72.14.", "RU": "185.220.", "DE": "89.0.", "GB": "81.0.",
    "FR": "90.0.", "IN": "103.0.", "SG": "203.0.", "BR": "177.0.",
    "JP": "126.0.", "AU": "101.0.", "CA": "70.0.", "NL": "85.0.",
}

class AuthLogGenerator:
    def __init__(self, seed=42):
        self.rng = random.Random(seed)
        self.np_rng = np.random.default_rng(seed)
        self.event_id = 0
        self.user_states = {}
        self._init_states()

    def _init_states(self):
        for uid, p in PERSONAS.items():
            self.user_states[uid] = {
                "last_country": p["country"],
                "last_city": self._random_city(p["country"]),
                "last_login": None,
                "daily_count": 0,
                "current_day": None,
                "failed_streak": 0,
                "known_devices": [p["device"]],
                "known_countries": [p["country"]],
            }

    def _random_city(self, country):
        cities = CITIES.get(country, ["Unknown"])
        return self.rng.choice(cities)

    def _random_ip(self, country):
        prefix = BASE_IPS.get(country, "10.0.")
        return f"{prefix}{self.rng.randint(1, 255)}.{self.rng.randint(1, 255)}"

    def _random_device(self):
        return self.rng.choice(DEVICES)

    def _random_browser(self):
        return self.rng.choice(BROWSERS)

    def _is_business_hours(self, hour, persona):
        start = persona["work_start"]
        end = persona["work_end"]
        if start <= end:
            return start <= hour <= end
        return hour >= start or hour <= end

    def generate_normal_event(self, uid, persona, base_time):
        st = self.user_states[uid]

        st["last_country"] = persona["country"]
        st["last_city"] = self._random_city(persona["country"])

        coords = get_city_coords(st["last_city"])
        if coords == [0, 0]:
            coords = get_country_coords(persona["country"])

        return {
            "user": uid,
            "display_name": persona["name"],
            "timestamp": base_time.isoformat(),
            "ip": self._random_ip(persona["country"]),
            "country": persona["country"],
            "city": st["last_city"],
            "coords": coords,
            "device": persona["device"],
            "browser": persona["browser"],
            "os": persona["device"],
            "is_success": True,
            "is_anomaly": False,
            "risk_score": round(self.rng.uniform(0, 15), 1),
            "mfa_used": persona["mfa"],
            "mfa_failed": False,
            "is_vpn": False,
            "is_tor": False,
            "asn": ASN_MAP.get(persona["country"], "Unknown"),
        }

    def generate_attack_event(self, attack_type, uid, persona, base_time):
        st = self.user_states[uid]
        victim = self.rng.choice([u for u in PERSONAS if u != uid]) if self.rng.random() > 0.5 else uid
        vp = PERSONAS[victim]
        attack_country = self.rng.choice([c for c in COUNTRIES if c != persona["country"]])
        attack_city = self._random_city(attack_country)

        if attack_type == "impossible_travel":
            attack_coords = get_city_coords(attack_city)
            if attack_coords == [0, 0]:
                attack_coords = get_country_coords(attack_country)
            prev_coords = get_city_coords(st["last_city"])
            if prev_coords == [0, 0]:
                prev_coords = get_country_coords(persona["country"])

            return {
                "user": uid, "display_name": persona["name"],
                "timestamp": base_time.isoformat(),
                "ip": self._random_ip(attack_country), "country": attack_country, "city": attack_city,
                "coords": attack_coords,
                "device": "Unknown Browser", "browser": "Spoofed", "os": "Windows 11 (unmanaged)",
                "is_success": True, "is_anomaly": True, "risk_score": round(self.rng.uniform(85, 98), 1),
                "mfa_used": False, "mfa_failed": False, "is_vpn": False, "is_tor": False,
                "asn": ASN_MAP.get(attack_country, "Unknown"),
                "attack_type": "Impossible Travel",
                "attack_desc": f"Login from {attack_country} after {persona['country']}",
                "mitre_id": "T1078", "mitre_name": "Valid Accounts",
                "previous_country": persona["country"], "previous_city": st["last_city"],
                "previous_coords": prev_coords,
                "travel_distance_km": self.rng.randint(3000, 12000),
                "travel_time_min": self.rng.randint(5, 180),
            }

        elif attack_type == "tor":
            return {
                "user": uid, "display_name": persona["name"],
                "timestamp": base_time.isoformat(),
                "ip": f"185.220.{self.rng.randint(100, 105)}.{self.rng.randint(1, 255)}",
                "country": "DE", "city": "Frankfurt",
                "coords": [8.6821, 50.1109],
                "device": "Unknown Browser", "browser": "Spoofed", "os": "Linux (TOR)",
                "is_success": True, "is_anomaly": True, "risk_score": round(self.rng.uniform(82, 95), 1),
                "mfa_used": False, "mfa_failed": False, "is_vpn": False, "is_tor": True,
                "asn": "AS9009 (M247 Ltd)",
                "attack_type": "TOR Exit Node", "mitre_id": "T1090.003", "mitre_name": "Proxy: Multi-hop Proxy",
                "attack_desc": "Authentication via known TOR exit node",
                "previous_country": persona["country"], "previous_city": st["last_city"],
                "travel_distance_km": 0, "travel_time_min": 0,
            }

        elif attack_type == "password_spray":
            targets = self.rng.sample(list(PERSONAS.keys()), min(5, len(PERSONAS)))
            failed = self.rng.randint(5, 15)
            spray_coords = get_city_coords(attack_city)
            if spray_coords == [0, 0]:
                spray_coords = get_country_coords(attack_country)
            return {
                "user": uid, "display_name": persona["name"],
                "timestamp": base_time.isoformat(),
                "ip": self._random_ip(attack_country), "country": attack_country, "city": attack_city,
                "coords": spray_coords,
                "device": self._random_device(), "browser": self._random_browser(), "os": self._random_device(),
                "is_success": True, "is_anomaly": True, "risk_score": round(self.rng.uniform(70, 88), 1),
                "mfa_used": False, "mfa_failed": False, "is_vpn": False, "is_tor": False,
                "asn": ASN_MAP.get(attack_country, "Unknown"),
                "attack_type": "Password Spraying", "mitre_id": "T1110.003", "mitre_name": "Password Spraying",
                "attack_desc": f"{failed} failed logins across {len(targets)} accounts",
                "failed_attempts": failed, "target_accounts": targets,
                "previous_country": persona["country"], "previous_city": st["last_city"],
                "travel_distance_km": 0, "travel_time_min": 0,
            }

        elif attack_type == "service_abuse":
            abuse_city = self._random_city(persona["country"])
            abuse_coords = get_city_coords(abuse_city)
            if abuse_coords == [0, 0]:
                abuse_coords = get_country_coords(persona["country"])
            return {
                "user": uid, "display_name": persona["name"],
                "timestamp": base_time.isoformat(),
                "ip": self._random_ip(persona["country"]),
                "country": persona["country"], "city": abuse_city,
                "coords": abuse_coords,
                "device": persona["device"], "browser": persona["browser"], "os": persona["device"],
                "is_success": True, "is_anomaly": True, "risk_score": round(self.rng.uniform(70, 85), 1),
                "mfa_used": False, "mfa_failed": False, "is_vpn": False, "is_tor": False,
                "asn": ASN_MAP.get(persona["country"], "Unknown"),
                "attack_type": "Service Account Abuse", "mitre_id": "T1484", "mitre_name": "Domain Policy Modification",
                "attack_desc": f"Service account login at {base_time.hour}:{base_time.minute:02d} (unusual hour)",
                "previous_country": persona["country"], "previous_city": st["last_city"],
                "travel_distance_km": 0, "travel_time_min": 0,
            }

        else:
            return self.generate_normal_event(uid, persona, base_time)

    def generate_batch(self, count=300):
        events = []
        base_time = datetime(2026, 7, 10, 0, 0, 0) - timedelta(days=7)
        user_ids = list(PERSONAS.keys())

        for i in range(count):
            uid = self.rng.choice(user_ids)
            persona = PERSONAS[uid]
            st = self.user_states[uid]

            offset_min = i * self.rng.randint(1, 60)
            ts = base_time + timedelta(minutes=offset_min)

            hour = ts.hour
            is_biz = self._is_business_hours(hour, persona)

            if self.rng.random() < 0.06 and is_biz:
                attack_type = self.rng.choices(
                    ["impossible_travel", "tor", "password_spray", "service_abuse"],
                    weights=[3, 1, 1, 1],
                )[0]
                event = self.generate_attack_event(attack_type, uid, persona, ts)
                events.append(event)
            elif not is_biz and self.rng.random() < 0.08:
                event = self.generate_attack_event("service_abuse", uid, persona, ts)
                event["attack_type"] = "Off-Hours Access"
                event["mitre_id"] = "T1078"
                event["mitre_name"] = "Valid Accounts"
                event["attack_desc"] = f"Login at {hour:02d}:{ts.minute:02d} — outside working hours"
                events.append(event)
            else:
                event = self.generate_normal_event(uid, persona, ts)
                events.append(event)

            st["last_login"] = ts

        events.sort(key=lambda e: e["timestamp"])
        for i, e in enumerate(events):
            e["id"] = i + 1

        return events

generator = AuthLogGenerator()
