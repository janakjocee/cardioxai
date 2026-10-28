#!/usr/bin/env python3
"""
CardioXAI: Automated Real-World Dataset Acquisition Script.

Downloads authentic public datasets specified in Chapter 3 of Sarjan's ARP Report:
1. Primary Dataset: Kaggle 70,000 Cardiovascular Disease Dataset (Sulianova, 2019)
2. Secondary Dataset: CDC BRFSS Diabetes Health Indicators (70,692 records)
3. Cross-Check Dataset: UCI Heart Disease Cleveland Subset (303 records)
"""

import os
import sys
import urllib.request

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

DATASETS = {
    'cardio_train.csv': 'https://raw.githubusercontent.com/caravanuden/cardio/master/cardio_train.csv',
    'heart_uci.csv': 'https://raw.githubusercontent.com/sharmaroshan/Heart-UCI-Dataset/master/heart.csv',
    'diabetes_brfss.csv': 'https://raw.githubusercontent.com/RomenJ/CorrDiabetesKaggle70k/main/diabetes_binary_5050split_health_indicators_BRFSS2015.csv'
}

def download_file(filename: str, url: str):
    dest_path = os.path.join(DATA_DIR, filename)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        print(f"[OK] {filename} already exists ({os.path.getsize(dest_path):,} bytes). Skipping download.")
        return
    print(f"[*] Downloading {filename} from {url}...")
    try:
        urllib.request.urlretrieve(url, dest_path)
        print(f"[SUCCESS] Downloaded {filename} ({os.path.getsize(dest_path):,} bytes).")
    except Exception as e:
        print(f"[ERROR] Failed to download {filename}: {e}", file=sys.stderr)

def main():
    print("=" * 70)
    print("CardioXAI: Downloading Authentic Real-World Datasets")
    print("=" * 70)
    for filename, url in DATASETS.items():
        download_file(filename, url)
    print("\nDataset acquisition completed. Files stored in:", DATA_DIR)
    print("=" * 70)

if __name__ == '__main__':
    main()
