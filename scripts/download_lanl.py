#!/usr/bin/env python3
"""Download LANL CMSCSE dataset for the Identity Anomaly Detection project.

Usage:
    python scripts/download_lanl.py                 # auth only (7.2G)
    python scripts/download_lanl.py --all            # all 5 data sources
    python scripts/download_lanl.py --sample 100000  # first 100K events only
"""

import argparse
import gzip
import os
import sys
from urllib.request import urlopen, Request

BASE_URL = "https://csr.lanl.gov"
TOKEN_URL = BASE_URL + "/data-fence/token"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "app", "data", "lanl")

FILES = {
    "auth.txt.gz":      "/cyber1/auth.txt.gz",
    "proc.txt.gz":      "/cyber1/proc.txt.gz",
    "flows.txt.gz":     "/cyber1/flows.txt.gz",
    "dns.txt.gz":       "/cyber1/dns.txt.gz",
    "redteam.txt.gz":   "/cyber1/redteam.txt.gz",
}

def get_token(email="research@acme.edu", usage="academic+research+identity+anomaly+detection"):
    url = f"{TOKEN_URL}?email={email}&usage={usage}"
    with urlopen(url) as resp:
        return resp.read().decode().strip()

def download_file(filename, path_suffix, token, max_bytes=None):
    url = f"{BASE_URL}/data-fence/{token}{path_suffix}"
    dest = os.path.join(DATA_DIR, filename)
    tmp = dest + ".tmp"

    print(f"Downloading {filename}...")
    req = Request(url)
    with urlopen(req) as resp:
        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        with open(tmp, "wb") as f:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if max_bytes and downloaded >= max_bytes:
                    print(f"  Reached sample limit ({max_bytes} bytes)")
                    break
                if total:
                    pct = downloaded * 100 / total
                    print(f"  {downloaded / 1024**2:.1f}M / {total / 1024**2:.1f}M ({pct:.1f}%)", end="\r")
    os.replace(tmp, dest)
    actual = os.path.getsize(dest)
    print(f"  Done: {filename} ({actual / 1024**2:.1f}M)" if actual > 1024**2 else f"  Done: {filename}")

def sample_gzip(src, n_lines):
    """Extract first n_lines from a gzip file into a new gzip file."""
    out_path = src + ".tmp"
    count = 0
    with gzip.open(src, "rt", errors="replace") as fin, gzip.open(out_path, "wt") as fout:
        for line in fin:
            fout.write(line)
            count += 1
            if count >= n_lines:
                break
    os.replace(out_path, src)
    return count

def main():
    parser = argparse.ArgumentParser(description="Download LANL CMSCSE dataset")
    parser.add_argument("--all", action="store_true", help="Download all 5 data sources")
    parser.add_argument("--sample", type=int, help="Only keep first N lines (sampling)")
    parser.add_argument("--email", default="research@acme.edu", help="Email for download tracking")
    args = parser.parse_args()

    os.makedirs(DATA_DIR, exist_ok=True)

    print("Requesting download token from LANL...")
    token = get_token(email=args.email)
    print(f"Token acquired")

    targets = FILES if args.all else {"auth.txt.gz": FILES["auth.txt.gz"], "redteam.txt.gz": FILES["redteam.txt.gz"]}

    for filename, path_suffix in targets.items():
        dest = os.path.join(DATA_DIR, filename)
        if os.path.exists(dest) and os.path.getsize(dest) > 1024:
            print(f"Skipping {filename} (already exists, {os.path.getsize(dest) / 1024**2:.1f}M)")
            continue
        download_file(filename, path_suffix, token)

    if args.sample:
        for filename in targets:
            path = os.path.join(DATA_DIR, filename)
            if os.path.exists(path):
                print(f"Sampling {filename} to {args.sample} lines...")
                count = sample_gzip(path, args.sample)
                print(f"  Kept {count} lines")

    print("\nDone! Files in:", DATA_DIR)
    for f in sorted(os.listdir(DATA_DIR)):
        size = os.path.getsize(os.path.join(DATA_DIR, f))
        print(f"  {f}: {size / 1024**2:.1f}M" if size > 1024**2 else f"  {f}: {size / 1024:.1f}K")

if __name__ == "__main__":
    main()
