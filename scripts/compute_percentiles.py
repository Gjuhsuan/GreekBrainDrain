"""
compute_percentiles.py
Greek Brain Drain · Data Visualization Project

Reads the raw Excel file (Ioannidis et al. 2021) and computes percentile-tier
counts of Greece vs abroad scientists for three metrics:

  1. c_ns    — composite citation score (excl. self-citations)  [c (ns)]
  2. cpp_ns  — citations per paper (excl. self-citations)       [nc9619 (ns) / np]
  3. h19_ns  — h-index (excl. self-citations)                   [h19 (ns)]

For each metric, scientists are ranked globally (descending), then the top T%
are counted by location (Greece vs abroad). Tiers: 50%, 20%, 10%, 5%, 2%, 1%,
0.5%, 0.1%.

Output: data/percentiles.json
"""

import pandas as pd
import json
import os

# ── Paths ──
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_PATH = os.path.join(BASE, "Table-S1-Greek-20201001_1960_1996_2019-63951.xlsx")
OUT_PATH = os.path.join(BASE, "data", "percentiles.json")

# ── Tiers ──
TIERS = [
    (50,   "前 50%"),
    (20,   "前 20%"),
    (10,   "前 10%"),
    (5,    "前 5%"),
    (2,    "前 2%"),
    (1,    "前 1%"),
    (0.5,  "前 0.5%"),
    (0.1,  "前 0.1%"),
]

# ── Metrics ──
# Each entry: (key, label, column_or_expression)
# For cpp_ns we compute nc9619 (ns) / np below after loading.


def compute(df, metric_col):
    """Return list of tier dicts for a given metric column."""
    # Drop rows where metric is NaN
    valid = df.dropna(subset=[metric_col]).copy()
    valid = valid.sort_values(metric_col, ascending=False)
    total = len(valid)
    results = []
    for pct, label in TIERS:
        n = max(1, int(round(total * pct / 100.0)))
        top = valid.head(n)
        greece = int((top["is_greece"]).sum())
        abroad = n - greece
        results.append({
            "tier": label,
            "tier_value": pct,
            "greece": greece,
            "abroad": abroad,
            "total": n,
        })
    return results


def main():
    print(f"Reading: {XLSX_PATH}")
    df = pd.read_excel(XLSX_PATH, sheet_name="Career")

    # ── Greece flag ──
    df["is_greece"] = df["cntry"].str.lower().str.strip() == "grc"
    n_grc = df["is_greece"].sum()
    n_abr = len(df) - n_grc
    print(f"Total scientists: {len(df)}  |  Greece: {n_grc}  |  Abroad: {n_abr}")

    # ── Compute derived metric: citations per paper ──
    df["cpp_ns"] = df["nc9619 (ns)"] / df["np"]
    print(f"cpp_ns computed: median={df['cpp_ns'].median():.2f}, "
          f"min={df['cpp_ns'].min():.2f}, max={df['cpp_ns'].max():.2f}")

    # ── Compute percentiles for each metric ──
    result = {}
    for key, col in [("c_ns", "c (ns)"),
                     ("cpp_ns", "cpp_ns"),
                     ("h19_ns", "h19 (ns)")]:
        print(f"Computing {key} ({col}) ...")
        result[key] = compute(df, col)
        top50 = result[key][0]
        print(f"  Top 50%: total={top50['total']}, greece={top50['greece']}, "
              f"abroad={top50['abroad']}")

    # ── Output ──
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nWritten: {OUT_PATH}")


if __name__ == "__main__":
    main()
