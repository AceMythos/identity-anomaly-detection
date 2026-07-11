import os
import subprocess
import duckdb
import pandas as pd
import joblib
from datetime import datetime

CACHE_DIR = os.path.join(os.path.dirname(__file__), "rba")
CACHE_PATH = os.path.join(CACHE_DIR, "rba.duckdb")
CSV_NAME = "rba-dataset.csv"

SCHEMA_SQL = """
CREATE TABLE events (
    id INTEGER,
    user VARCHAR,
    display_name VARCHAR,
    timestamp TIMESTAMP,
    ip VARCHAR,
    country VARCHAR,
    city VARCHAR,
    lng DOUBLE,
    lat DOUBLE,
    device VARCHAR,
    browser VARCHAR,
    os VARCHAR,
    is_success BOOLEAN,
    is_anomaly BOOLEAN,
    risk_score DOUBLE,
    mfa_used BOOLEAN,
    mfa_failed BOOLEAN,
    is_vpn BOOLEAN,
    is_tor BOOLEAN,
    asn VARCHAR,
    source VARCHAR,
    attack_type VARCHAR,
    mitre_id VARCHAR,
    mitre_name VARCHAR,
    attack_desc VARCHAR,
    previous_country VARCHAR,
    previous_city VARCHAR,
    prev_lng DOUBLE,
    prev_lat DOUBLE,
    travel_distance_km INTEGER,
    travel_time_min INTEGER
)
"""


def build_cache(max_events=5000000):
    from .rba_loader import DATA_DIR, ZIP_PATH

    os.makedirs(CACHE_DIR, exist_ok=True)

    print(f"[cache] Extracting {max_events} rows from ZIP...")
    tmp_csv = os.path.join(CACHE_DIR, "_tmp_build.csv")
    with open(tmp_csv, "w") as f:
        proc = subprocess.Popen(
            ["unzip", "-p", ZIP_PATH, CSV_NAME],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
        )
        header = proc.stdout.readline()
        f.write(header.decode("utf-8", errors="replace"))
        count = 0
        for line in proc.stdout:
            f.write(line.decode("utf-8", errors="replace"))
            count += 1
            if count % 500000 == 0:
                print(f"[cache] Extracted {count}/{max_events} rows...")
            if count >= max_events:
                proc.kill()
                break
        proc.wait()

    print(f"[cache] Loading {count} rows into DuckDB...")
    if os.path.exists(CACHE_PATH):
        os.remove(CACHE_PATH)

    con = duckdb.connect(CACHE_PATH)
    con.execute("DROP TABLE IF EXISTS events")
    con.execute(SCHEMA_SQL)

    con.execute(f"""
        INSERT INTO events
        SELECT
            row_number() OVER () AS id,
            'rba_' || left("User ID"::VARCHAR, 12) AS user,
            'User ' || left("User ID"::VARCHAR, 8) AS display_name,
            "Login Timestamp"::TIMESTAMP AS timestamp,
            "IP Address" AS ip,
            CASE WHEN "Country" = '' THEN 'NO' ELSE "Country" END AS country,
            CASE WHEN "City" = '' OR "City" = '-' THEN 'Unknown' ELSE "City" END AS city,
            0.0 AS lng,
            0.0 AS lat,
            CASE WHEN "Device Type" = '' THEN 'desktop' ELSE "Device Type" END AS device,
            CASE WHEN "Browser Name and Version" = '' THEN 'Unknown' ELSE "Browser Name and Version" END AS browser,
            CASE WHEN "OS Name and Version" = '' THEN 'Unknown' ELSE "OS Name and Version" END AS os,
            "Login Successful" = 'True' AS is_success,
            ("Is Attack IP" = 'True' OR "Is Account Takeover" = 'True') AS is_anomaly,
            CASE
                WHEN "Is Account Takeover" = 'True' THEN 95.0
                WHEN "Is Attack IP" = 'True' THEN 85.0
                WHEN "Login Successful" != 'True' THEN 40.0
                ELSE 5.0
            END AS risk_score,
            false AS mfa_used,
            false AS mfa_failed,
            false AS is_vpn,
            "Is Attack IP" = 'True' AS is_tor,
            CASE WHEN "ASN"::VARCHAR = '' THEN 'Unknown' ELSE 'AS' || "ASN"::VARCHAR END AS asn,
            'rba_dataset' AS source,
            CASE
                WHEN "Is Account Takeover" = 'True' THEN 'Account Takeover'
                WHEN "Is Attack IP" = 'True' THEN 'Attack IP'
                ELSE NULL
            END AS attack_type,
            CASE
                WHEN "Is Account Takeover" = 'True' THEN 'T1078'
                WHEN "Is Attack IP" = 'True' THEN 'T1090.003'
                ELSE NULL
            END AS mitre_id,
            CASE
                WHEN "Is Account Takeover" = 'True' THEN 'Valid Accounts'
                WHEN "Is Attack IP" = 'True' THEN 'Proxy: Multi-hop Proxy'
                ELSE NULL
            END AS mitre_name,
            NULL AS attack_desc,
            NULL AS previous_country,
            NULL AS previous_city,
            0.0 AS prev_lng,
            0.0 AS prev_lat,
            0 AS travel_distance_km,
            0 AS travel_time_min
        FROM read_csv('{tmp_csv}', header=true, delim=',', auto_detect=true, ignore_errors=true)
    """)

    print(f"[cache] Enriching geolocation data...")
    from .geolocation import COUNTRY_COORDS, CITY_COORDS
    for city, coords in CITY_COORDS.items():
        con.execute("UPDATE events SET lng = ?, lat = ? WHERE city = ? AND lng = 0 AND lat = 0",
                    [coords[0], coords[1], city])
    for cc, coords in COUNTRY_COORDS.items():
        con.execute("UPDATE events SET lng = ?, lat = ? WHERE country = ? AND lng = 0 AND lat = 0",
                    [coords[0], coords[1], cc])

    print(f"[cache] Creating indexes...")
    con.execute("CREATE INDEX idx_events_anomaly ON events(is_anomaly)")
    con.execute("CREATE INDEX idx_events_risk ON events(risk_score)")
    con.execute("CREATE INDEX idx_events_country ON events(country)")

    print(f"[cache] Fitting ML on 50000 sample...")
    sample_df = con.execute("SELECT * FROM events USING SAMPLE 50000").fetchdf()
    from ..ml.models import DETECTOR
    DETECTOR.fit(sample_df)
    scores = DETECTOR.predict(sample_df)

    for i, row in sample_df.iterrows():
        con.execute(
            "UPDATE events SET risk_score = ?, is_anomaly = ? WHERE id = ?",
            [round(scores[i], 1), scores[i] >= 30, int(row["id"])]
        )

    mdl_path = os.path.join(CACHE_DIR, "detector.joblib")
    joblib.dump(DETECTOR, mdl_path)

    print(f"[cache] Building summary table...")
    con.execute("""
        CREATE OR REPLACE TABLE dashboard_summary AS
        SELECT
            EXTRACT(dow FROM timestamp) as day_of_week,
            EXTRACT(hour FROM timestamp) as hour,
            country,
            CASE
                WHEN risk_score >= 85 THEN 'critical'
                WHEN risk_score >= 70 THEN 'high'
                WHEN risk_score >= 40 THEN 'medium'
                WHEN risk_score >= 30 THEN 'low'
                ELSE 'normal'
            END as severity,
            is_anomaly,
            COUNT(*) as cnt
        FROM events
        GROUP BY day_of_week, hour, country, severity, is_anomaly
    """)
    summary_rows = con.execute("SELECT COUNT(*) FROM dashboard_summary").fetchone()[0]
    print(f"[cache] Summary: {summary_rows} rows")

    print(f"[cache] Building location summary...")
    con.execute("""
        CREATE OR REPLACE TABLE location_summary AS
        SELECT city, country, lng, lat,
               MAX(risk_score) as risk_score,
               COUNT(*) as event_count,
               SUM(CASE WHEN is_anomaly THEN 1 ELSE 0 END) as anomaly_count
        FROM events
        WHERE lng != 0 AND lat != 0
        GROUP BY city, country, lng, lat
    """)
    con.execute("CREATE INDEX idx_loc_cnt ON location_summary(event_count DESC)")
    loc_rows = con.execute("SELECT COUNT(*) FROM location_summary").fetchone()[0]
    print(f"[cache] Location summary: {loc_rows} rows")

    con.close()
    os.remove(tmp_csv)
    print(f"[cache] Done: {count} events, model saved")
    return count


def cache_exists():
    return os.path.exists(CACHE_PATH) and os.path.getsize(CACHE_PATH) > 4096


def get_connection():
    return duckdb.connect(CACHE_PATH)


def _val(v):
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return v

def query(sql, params=None):
    con = get_connection()
    if params:
        result = con.execute(sql, params)
    else:
        result = con.execute(sql)
    rows = result.fetchall()
    columns = [desc[0] for desc in result.description] if result.description else []
    con.close()
    return [dict(zip(columns, [_val(v) for v in row])) for row in rows]


def row_to_event(r):
    e = dict(r)
    e["coords"] = [e.pop("lng"), e.pop("lat")]
    e["previous_coords"] = [e.pop("prev_lng"), e.pop("prev_lat")]
    e["timestamp"] = e["timestamp"].isoformat() if hasattr(e["timestamp"], "isoformat") else str(e["timestamp"])
    for f in ("attack_type", "mitre_id", "mitre_name", "attack_desc", "previous_country", "previous_city"):
        if e.get(f) is None:
            e[f] = ""
    if e.get("travel_distance_km") is None:
        e["travel_distance_km"] = 0
    if e.get("travel_time_min") is None:
        e["travel_time_min"] = 0
    return e


def get_sample(n=50000):
    rows = query(f"SELECT * FROM events USING SAMPLE {n}")
    return [row_to_event(r) for r in rows]

def summary():
    rows = query("SELECT * FROM dashboard_summary")
    return rows
