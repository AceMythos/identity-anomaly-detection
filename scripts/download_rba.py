#!/usr/bin/env python3
"""Download and preprocess the RBA (Risk-Based Authentication) dataset.

Downloads the synthesized RBA dataset from Zenodo, samples it, and converts
to the project's event format for use in the ML pipeline and dashboard.

Usage:
    python scripts/download_rba.py                    # download + sample 100K rows
    python scripts/download_rba.py --sample 50000     # custom sample size
    python scripts/download_rba.py --all              # use full dataset
"""

import argparse
import csv
import gzip
import io
import json
import os
import sys
import zipfile
from urllib.request import urlopen

RBA_URL = "https://zenodo.org/records/6782156/files/rba-dataset.zip?download=1"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "app", "data", "rba")


COUNTRY_MAP = {
    "NO": "NO", "SE": "SE", "DK": "DK", "FI": "FI", "DE": "DE",
    "GB": "GB", "FR": "FR", "NL": "NL", "US": "US", "CA": "CA",
    "AU": "AU", "JP": "JP", "SG": "SG", "IN": "IN", "BR": "BR",
    "RU": "RU", "CN": "CN", "KR": "KR", "IT": "IT", "ES": "ES",
}

CITY_MAP = {
    "NO": "Oslo", "SE": "Stockholm", "DK": "Copenhagen", "FI": "Helsinki",
    "DE": "Berlin", "GB": "London", "FR": "Paris", "NL": "Amsterdam",
    "US": "New York", "CA": "Toronto", "AU": "Sydney", "JP": "Tokyo",
    "SG": "Singapore", "IN": "Bangalore", "BR": "São Paulo",
    "RU": "Moscow", "CN": "Beijing", "KR": "Seoul",
    "IT": "Rome", "ES": "Madrid",
}

ASN_MAP = {
    "NO": "AS1234 (Telenor)", "SE": "AS1254 (Telia)", "DK": "AS1264 (TDC)",
    "FI": "AS1274 (Elisa)", "DE": "AS3320 (Deutsche Telekom)",
    "GB": "AS2856 (BTnet)", "FR": "AS3215 (Orange)", "NL": "AS1136 (KPN)",
    "US": "AS15169 (Google LLC)", "CA": "AS812 (Rogers)",
    "AU": "AS4804 (Telstra)", "JP": "AS2510 (Fujitsu)",
    "SG": "AS3758 (SingNet)", "IN": "AS24309 (Tata Communications)",
    "BR": "AS7738 (Vivo)", "RU": "AS9009 (M247 Ltd)",
    "CN": "AS4134 (Chinanet)", "KR": "AS4766 (KT)",
    "IT": "AS3269 (TIM)", "ES": "AS12479 (Orange Espana)",
}


COUNTRY_COORDS = {
    "NO": [10.7522, 59.9139], "SE": [18.0686, 59.3293],
    "DK": [12.5683, 55.6761], "FI": [24.9384, 60.1699],
    "DE": [13.4050, 52.5200], "GB": [-0.1276, 51.5074],
    "FR": [2.3522, 48.8566], "NL": [4.9041, 52.3676],
    "US": [-98.5795, 39.8283], "CA": [-106.3468, 56.1304],
    "AU": [133.7751, -25.2744], "JP": [139.6917, 35.6895],
    "SG": [103.8198, 1.3521], "IN": [78.9629, 20.5937],
    "BR": [-46.6333, -23.5505], "RU": [37.6173, 55.7558],
    "CN": [116.4074, 39.9042], "KR": [126.9780, 37.5665],
    "IT": [12.4964, 41.9028], "ES": [-3.7038, 40.4168],
}


def download_zip(url, dest_path):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1024:
        print(f"  Already exists: {dest_path} ({os.path.getsize(dest_path) / 1024**2:.1f}MB)")
        return True
    print(f"  Downloading {url}...")
    try:
        with urlopen(url, timeout=300) as resp:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            with open(dest_path, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded * 100 / total
                        print(f"    {downloaded/1024**2:.1f}MB / {total/1024**2:.1f}MB ({pct:.1f}%)", end="\r")
        print(f"\n  Downloaded to {dest_path}")
        return True
    except Exception as e:
        print(f"  Error downloading: {e}")
        return False


def sample_csv_from_zip(zip_path, output_path, n_rows):
    import random
    rng = random.Random(42)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        csv_files = [f for f in zf.namelist() if f.endswith(".csv") and not f.startswith("__")]
        if not csv_files:
            print("  No CSV files found in archive")
            return False

        csv_file = csv_files[0]
        print(f"  Reading {csv_file} from archive...")

        with zf.open(csv_file) as f:
            text = f.read().decode("utf-8")
            reader = csv.DictReader(io.StringIO(text))
            fieldnames = reader.fieldnames
            print(f"  Columns: {fieldnames}")
            all_rows = list(reader)

        total = len(all_rows)
        print(f"  Total rows: {total:,}")

        sample_size = min(n_rows, total)
        sampled = rng.sample(all_rows, sample_size) if sample_size < total else all_rows

        converter = RbaConverter(sampled)
        records = converter.convert()

        with open(output_path, "w") as f:
            json.dump(records, f, indent=2)

        print(f"  Wrote {len(records)} records to {output_path}")
        return True


class RbaConverter:
    def __init__(self, rows):
        self.rows = rows

    def convert(self):
        records = []
        for i, row in enumerate(self.rows):
            country = row.get("country", "NO")
            cc = COUNTRY_MAP.get(country, "NO")
            coords = COUNTRY_COORDS.get(cc, [0, 0])

            record = {
                "id": i + 1,
                "user": row.get("user", f"rba_user_{i % 1000}"),
                "display_name": f"RBA User {i % 100}",
                "timestamp": f"2021-01-01T{row.get('time', '12:00:00')}Z",
                "ip": row.get("ip", "0.0.0.0"),
                "country": cc,
                "city": CITY_MAP.get(cc, "Unknown"),
                "coords": coords,
                "device": row.get("user_agent", "Unknown Browser"),
                "browser": row.get("user_agent", "Unknown")[:50],
                "os": "Unknown",
                "is_success": True,
                "is_anomaly": False,
                "risk_score": 5.0,
                "mfa_used": False,
                "mfa_failed": False,
                "is_vpn": False,
                "is_tor": False,
                "asn": ASN_MAP.get(cc, "Unknown"),
                "source": "rba_dataset",
            }
            records.append(record)
        return records


def main():
    parser = argparse.ArgumentParser(description="Download RBA dataset")
    parser.add_argument("--sample", type=int, default=100000, help="Number of rows to sample (default: 100000)")
    parser.add_argument("--all", action="store_true", help="Use full dataset (not recommended)")
    args = parser.parse_args()

    os.makedirs(DATA_DIR, exist_ok=True)
    zip_path = os.path.join(DATA_DIR, "rba-dataset.zip")
    output_path = os.path.join(DATA_DIR, "rba_sample.json")

    print("Step 1: Downloading RBA dataset...")
    if not download_zip(RBA_URL, zip_path):
        sys.exit(1)

    print(f"\nStep 2: Sampling {args.sample:,} rows...")
    if not sample_csv_from_zip(zip_path, output_path, args.sample if not args.all else 10_000_000):
        sys.exit(1)

    size_mb = os.path.getsize(output_path) / 1024**2
    print(f"\nDone! Output: {output_path} ({size_mb:.1f}MB)")
    print(f"\nTo use: add 'rba_dataset_loader' import in your data pipeline")


if __name__ == "__main__":
    main()
