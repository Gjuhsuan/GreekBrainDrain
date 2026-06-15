#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Compute Greek institution brain-drain ranking from OpenAlex-matched data.

Definition:
  - origin institution: an author's first observed Greek institution
  - left author: an author who has any non-Greek institution record at or after
    that first Greek institution year
  - drain rate: left_authors / total_authors
"""

import csv
import json
import os
from collections import defaultdict


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "对接得到的数据")
SOURCE_INFO = os.path.join(RAW_DIR, "source_info.tsv")
AUTHOR_INSTITUTIONS = os.path.join(RAW_DIR, "author_to_institutions.tsv")
OUT_PATH = os.path.join(BASE_DIR, "data", "new", "institution_ranking.json")

MIN_AUTHORS = 20


def load_institutions():
    institutions = {}
    with open(SOURCE_INFO, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            institution_id = row.get("institution_id", "")
            if not institution_id:
                continue
            institutions[institution_id] = {
                "display_name": row.get("display_name", ""),
                "country_code": row.get("country_code", ""),
                "city": row.get("city", ""),
                "type": row.get("type", "")
            }
    return institutions


def load_author_institutions(institutions):
    author_records = defaultdict(list)
    with open(AUTHOR_INSTITUTIONS, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            author_id = row.get("author_id", "")
            institution_id = row.get("institution_id", "")
            inst = institutions.get(institution_id)
            if not author_id or not inst or not inst["country_code"]:
                continue
            try:
                year = int(row.get("year", ""))
            except ValueError:
                continue
            author_records[author_id].append({
                "institution_id": institution_id,
                "institution": inst["display_name"],
                "country_code": inst["country_code"],
                "year": year
            })
    return author_records


def compute_ranking(author_records):
    stats = defaultdict(lambda: {
        "institution": "",
        "total_authors": 0,
        "left_authors": 0,
        "stayed_authors": 0
    })

    for records in author_records.values():
        records = sorted(records, key=lambda r: (r["year"], r["institution_id"]))
        greek_records = [r for r in records if r["country_code"] == "GR"]
        if not greek_records:
            continue

        origin = min(greek_records, key=lambda r: (r["year"], r["institution_id"]))
        left = any(
            r["country_code"] != "GR" and r["year"] >= origin["year"]
            for r in records
        )

        bucket = stats[origin["institution_id"]]
        bucket["institution"] = origin["institution"]
        bucket["institution_id"] = origin["institution_id"]
        bucket["total_authors"] += 1
        if left:
            bucket["left_authors"] += 1
        else:
            bucket["stayed_authors"] += 1

    ranking = []
    for item in stats.values():
        if item["total_authors"] < MIN_AUTHORS:
            continue
        item = dict(item)
        item["drain_rate"] = round(item["left_authors"] / item["total_authors"] * 100, 1)
        ranking.append(item)

    ranking.sort(key=lambda d: (-d["drain_rate"], -d["total_authors"], d["institution"]))
    return ranking


def main():
    institutions = load_institutions()
    author_records = load_author_institutions(institutions)
    ranking = compute_ranking(author_records)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(ranking, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote {len(ranking)} institutions to {OUT_PATH}")


if __name__ == "__main__":
    main()
