#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
extract_country_profiles.py  (v2 — unified)
============================================
从 xlsx 和 OpenAlex 匹配数据中提取国家维度综合画像，输出单一 JSON。

xlsx 来源（无重复计数）：
  - scopus_total, scopus_pct    : 各国希腊裔科学家数
  - institution_count           : 各国机构数（inst_name，每人唯一归属）
  - top_institutions             : 各国前 5 机构
  - median_firstyr               : 中位首篇论文年份
  - median_nc9619_ns             : 中位 1996-2019 总被引（排除自引）
  - median_h19_ns                : 中位 2019 年底 h 指数（排除自引）
  - median_c_ns                  : 中位综合评分（排除自引）

OpenAlex 来源：
  - flow_count                  : 首份海外机构在该国的作者数
  - active_authors              : 在该国有论文产出的希腊裔作者数
  - median_first_flow_year      : 流入作者首篇海外论文年份中位数
  - year_range                  : 作者活跃年份区间

运行方式：
  python scripts/extract_country_profiles.py
"""

import json
import os
import sys
import pandas as pd
import numpy as np

# ── 路径配置 ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "对接得到的数据")
DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_DIR = os.path.join(DATA_DIR, "new")
XLSX_PATH = os.path.join(BASE_DIR, "Table-S1-Greek-20201001_1960_1996_2019-63951.xlsx")

os.makedirs(OUT_DIR, exist_ok=True)

# ── ISO2 → ISO3 ─────────────────────────────────────────────────────────
ISO2_TO_ISO3 = {
    "GR": "grc", "US": "usa", "GB": "gbr", "DE": "deu", "CY": "cyp",
    "AU": "aus", "FR": "fra", "CA": "can", "CH": "che", "NL": "nld",
    "SE": "swe", "IT": "ita", "BE": "bel", "ES": "esp", "AT": "aut",
    "DK": "dnk", "NO": "nor", "IE": "irl", "ZA": "zaf", "FI": "fin",
    "AE": "are", "BR": "bra", "CN": "chn", "CZ": "cze", "SA": "sau",
    "SG": "sgp", "IL": "isr", "LU": "lux", "RU": "rus", "JP": "jpn",
    "PT": "prt", "QA": "qat", "TR": "tur", "PL": "pol", "NZ": "nzl",
    "HU": "hun", "KW": "kwt", "HK": "hkg", "KR": "kor", "CL": "chl",
    "KZ": "kaz", "IN": "ind", "MX": "mex", "RO": "rou", "SI": "svn",
    "HR": "hrv", "BG": "bgr", "EE": "est", "LT": "ltu", "LV": "lva",
    "UA": "ukr", "EG": "egy", "MA": "mar", "TN": "tun", "TH": "tha",
    "MY": "mys", "ID": "idn", "VN": "vnm", "AR": "arg", "CO": "col",
    "PE": "per", "UY": "ury", "VE": "ven", "TW": "twn", "PH": "phl",
    "BD": "bgd", "LK": "lka", "NP": "npl", "PK": "pak", "IR": "irn",
    "IQ": "irq", "SY": "syr", "YE": "yem", "JO": "jor", "LB": "lbn",
    "OM": "omn", "BH": "bhr", "AM": "arm", "GE": "geo", "AZ": "aze",
    "IS": "isl", "SK": "svk", "AL": "alb", "ME": "mne", "MT": "mlt",
    "LI": "lie", "MC": "mco", "RS": "srb", "MK": "mkd", "BA": "bih",
    "MD": "mda", "BY": "blr", "MN": "mng", "UZ": "uzb", "KG": "kgz",
    "TJ": "tjk", "TM": "tkm", "AF": "afg", "MM": "mmr", "LA": "lao",
    "KH": "khm", "BN": "brn", "PG": "png", "TL": "tls", "FJ": "fji",
    "SB": "slb", "VU": "vut", "NC": "ncl", "GL": "grl", "SR": "sur",
    "GY": "guy", "GF": "guf", "GT": "gtm", "HN": "hnd", "SV": "slv",
    "NI": "nic", "BZ": "blz", "BS": "bhs", "DO": "dom", "HT": "hti",
    "JM": "jam", "TT": "tto", "CU": "cub", "BB": "brb", "LC": "lca",
    "VC": "vct", "GD": "grd", "AG": "atg", "DM": "dma", "KN": "kna",
    "CR": "cri", "PA": "pan", "EC": "ecu", "BO": "bol", "PY": "pry",
    "AD": "and", "SM": "smr", "VA": "vat", "KP": "prk", "PS": "pse",
    "NG": "nga", "KE": "ken", "ET": "eth", "TZ": "tza", "UG": "uga",
    "GH": "gha", "CM": "cmr", "CI": "civ", "SN": "sen", "ML": "mli",
    "BF": "bfa", "BJ": "ben", "TG": "tgo", "NE": "ner", "TD": "tcd",
    "MR": "mrt", "DZ": "dza", "LY": "lby", "SD": "sdn", "SS": "ssd",
    "CD": "cod", "CG": "cog", "GA": "gab", "GQ": "gnq", "CF": "caf",
    "SO": "som", "DJ": "dji", "ER": "eri", "BI": "bdi", "RW": "rwa",
    "AO": "ago", "GN": "gin", "SL": "sle", "LR": "lbr", "BW": "bwa",
    "NA": "nam", "ZW": "zwe", "ZM": "zmb", "MW": "mwi", "MZ": "moz",
    "MG": "mdg", "MU": "mus", "SC": "syc", "LS": "lso", "SZ": "swz",
    "WS": "wsm", "MO": "mac",
}

# ── 国家名 → ISO3（用于 countries.json 中没名字的国家） ─────────────────
COUNTRY_NAME_LOOKUP = {
    "grc": "Greece", "usa": "United States", "gbr": "United Kingdom",
    "deu": "Germany", "cyp": "Cyprus", "aus": "Australia", "fra": "France",
    "can": "Canada", "che": "Switzerland", "nld": "Netherlands",
    "swe": "Sweden", "ita": "Italy", "bel": "Belgium", "esp": "Spain",
    "aut": "Austria", "dnk": "Denmark", "nor": "Norway", "irl": "Ireland",
    "zaf": "South Africa", "fin": "Finland", "are": "United Arab Emirates",
    "bra": "Brazil", "chn": "China", "cze": "Czech Republic",
    "sau": "Saudi Arabia", "sgp": "Singapore", "isr": "Israel",
    "lux": "Luxembourg", "rus": "Russia", "jpn": "Japan",
    "prt": "Portugal", "qat": "Qatar", "tur": "Turkey", "pol": "Poland",
    "nzl": "New Zealand", "hun": "Hungary", "kwt": "Kuwait",
    "hkg": "Hong Kong", "kor": "South Korea", "chl": "Chile",
    "kaz": "Kazakhstan", "ind": "India", "mex": "Mexico", "rou": "Romania",
    "svn": "Slovenia", "hrv": "Croatia", "bgr": "Bulgaria",
    "est": "Estonia", "ltu": "Lithuania", "lva": "Latvia",
    "ukr": "Ukraine", "egy": "Egypt", "mar": "Morocco", "tun": "Tunisia",
    "tha": "Thailand", "mys": "Malaysia", "idn": "Indonesia",
    "vnm": "Vietnam", "arg": "Argentina", "col": "Colombia",
    "per": "Peru", "ury": "Uruguay", "ven": "Venezuela",
    "twn": "Taiwan", "phl": "Philippines", "bgd": "Bangladesh",
    "lka": "Sri Lanka", "npl": "Nepal", "pak": "Pakistan",
    "irn": "Iran", "irq": "Iraq", "syr": "Syria", "yem": "Yemen",
    "jor": "Jordan", "lbn": "Lebanon", "omn": "Oman", "bhr": "Bahrain",
    "arm": "Armenia", "geo": "Georgia", "aze": "Azerbaijan",
    "isl": "Iceland", "svk": "Slovakia", "alb": "Albania",
    "mne": "Montenegro", "mlt": "Malta", "lie": "Liechtenstein",
    "mco": "Monaco", "srb": "Serbia", "mkd": "North Macedonia",
    "bih": "Bosnia and Herzegovina", "mda": "Moldova", "blr": "Belarus",
    "mng": "Mongolia", "mmr": "Myanmar", "khm": "Cambodia",
    "ken": "Kenya", "eth": "Ethiopia", "tza": "Tanzania",
    "uga": "Uganda", "gha": "Ghana", "cmr": "Cameroon",
    "civ": "Côte d'Ivoire", "sen": "Senegal", "mli": "Mali",
    "bfa": "Burkina Faso", "ben": "Benin", "tgo": "Togo",
    "nga": "Nigeria", "dza": "Algeria", "lby": "Libya", "sdn": "Sudan",
    "cod": "DR Congo", "cog": "Congo", "gab": "Gabon",
    "caf": "Central African Republic", "som": "Somalia", "eri": "Eritrea",
    "bdi": "Burundi", "rwa": "Rwanda", "ago": "Angola", "gin": "Guinea",
    "sle": "Sierra Leone", "lbr": "Liberia", "bwa": "Botswana",
    "nam": "Namibia", "zwe": "Zimbabwe", "zmb": "Zambia",
    "mwi": "Malawi", "moz": "Mozambique", "mdg": "Madagascar",
    "mus": "Mauritius", "syc": "Seychelles", "lso": "Lesotho",
    "swz": "Eswatini", "ecu": "Ecuador", "bol": "Bolivia",
    "pry": "Paraguay", "cri": "Costa Rica", "pan": "Panama",
    "cub": "Cuba", "jam": "Jamaica", "tto": "Trinidad and Tobago",
    "dom": "Dominican Republic", "hti": "Haiti", "bhs": "Bahamas",
    "blz": "Belize", "gtm": "Guatemala", "hnd": "Honduras",
    "slv": "El Salvador", "nic": "Nicaragua", "sur": "Suriname",
    "guy": "Guyana", "png": "Papua New Guinea", "tls": "Timor-Leste",
    "fji": "Fiji", "slb": "Solomon Islands", "vut": "Vanuatu",
    "ncl": "New Caledonia", "brn": "Brunei", "kgz": "Kyrgyzstan",
    "tjk": "Tajikistan", "uzb": "Uzbekistan", "tkm": "Turkmenistan",
    "afg": "Afghanistan", "lao": "Laos", "and": "Andorra",
    "smr": "San Marino", "vat": "Vatican", "prk": "North Korea",
    "pse": "Palestine", "wsm": "Samoa", "grd": "Grenada",
    "mac": "Macau", "kna": "Saint Kitts and Nevis",
    "brb": "Barbados", "rom": "Romania", "yug": "Yugoslavia", "vir": "U.S. Virgin Islands",
}


# ══════════════════════════════════════════════════════════════════════════
#  Part A: xlsx data — scientist counts, institutions, and medians
# ══════════════════════════════════════════════════════════════════════════

def extract_xlsx_stats():
    print("[A] Extracting xlsx stats ...")
    df = pd.read_excel(XLSX_PATH, sheet_name="Career")
    print(f"     {len(df):,} rows")

    # Normalize country codes
    df["cntry"] = df["cntry"].str.strip().str.lower()

    # ── Per-country scientist count ──
    country_counts = df.groupby("cntry").size()
    overseas_total = int(country_counts.drop("grc", errors="ignore").sum())

    # ── Per-country institution stats (from inst_name) ──
    country_insts = {}
    for cntry, grp in df.groupby("cntry"):
        inst_counts = grp["inst_name"].dropna().value_counts()
        country_insts[cntry] = {
            "institution_count": len(inst_counts),
            "top_institutions": [
                {"name": name, "count": int(cnt)}
                for name, cnt in inst_counts.head(5).items()
            ]
        }

    # ── Per-country medians ──
    median_cols = {
        "firstyr": "firstyr",
        "nc9619_ns": "nc9619 (ns)",
        "h19_ns": "h19 (ns)",
        "c_ns": "c (ns)",
    }
    country_medians = {}
    for cntry, grp in df.groupby("cntry"):
        meds = {}
        for out_key, col in median_cols.items():
            vals = grp[col].dropna()
            meds[out_key] = float(round(vals.median(), 2)) if len(vals) > 0 else None
        country_medians[cntry] = meds

    print(f"     {len(country_counts)} countries, overseas total={overseas_total:,}")

    return country_counts, overseas_total, country_insts, country_medians


# ══════════════════════════════════════════════════════════════════════════
#  Part B: OpenAlex data — flow_count, active_authors, year_range
# ══════════════════════════════════════════════════════════════════════════

def load_source_info():
    print("[B1] Loading source_info.tsv ...")
    df = pd.read_csv(
        os.path.join(RAW_DIR, "source_info.tsv"),
        sep="\t",
        usecols=["institution_id", "country_code", "display_name", "type"],
        dtype={"institution_id": str, "country_code": str, "display_name": str, "type": str},
        low_memory=False,
    )
    inst_info = {}
    for _, row in df.iterrows():
        cc = str(row["country_code"]).strip().upper() if pd.notna(row["country_code"]) else ""
        iso3 = ISO2_TO_ISO3.get(cc, cc.lower() if cc else "")
        inst_info[row["institution_id"]] = {
            "country_code": iso3,
            "display_name": str(row["display_name"]) if pd.notna(row["display_name"]) else "",
            "type": str(row["type"]) if pd.notna(row["type"]) else "",
        }
    print(f"     {len(inst_info):,} institutions")
    return inst_info


def load_author_institutions():
    print("[B2] Loading author_to_institutions.tsv ...")
    df = pd.read_csv(
        os.path.join(RAW_DIR, "author_to_institutions.tsv"),
        sep="\t",
        dtype={"author_id": str, "institution_id": str, "year": int},
        low_memory=False,
    )
    df = df[df["year"].between(1900, 2025)]
    print(f"     {len(df):,} rows")
    return df


def compute_openalex_stats(author_inst_df, inst_info):
    print("[B3] Computing OpenAlex stats ...")

    author_inst_df["country_code"] = author_inst_df["institution_id"].map(
        lambda x: inst_info.get(x, {}).get("country_code", "")
    )
    author_inst_df = author_inst_df[author_inst_df["country_code"] != ""]

    # active_authors
    country_active = author_inst_df.groupby("country_code")["author_id"].nunique()
    country_year_min = author_inst_df.groupby("country_code")["year"].min()
    country_year_max = author_inst_df.groupby("country_code")["year"].max()

    # flow_count
    gr = author_inst_df[author_inst_df["country_code"] == "grc"]
    non_gr = author_inst_df[author_inst_df["country_code"] != "grc"]

    gr_first = gr.groupby("author_id")["year"].min().rename("first_gr_year")
    non_gr_sorted = non_gr.sort_values(["author_id", "year"])
    non_gr_first = non_gr_sorted.groupby("author_id").first()[["year", "country_code"]]
    non_gr_first.columns = ["first_non_gr_year", "first_non_gr_country"]

    author_traj = gr_first.to_frame().join(non_gr_first, how="inner")
    author_traj = author_traj.dropna(subset=["first_non_gr_country"])

    flow_counts = author_traj.groupby("first_non_gr_country").size()
    flow_median_year = author_traj.groupby("first_non_gr_country")["first_non_gr_year"].median()

    return country_active, country_year_min, country_year_max, flow_counts, flow_median_year


# ══════════════════════════════════════════════════════════════════════════
#  Part C: Merge & output
# ══════════════════════════════════════════════════════════════════════════

def merge_and_output(country_counts, overseas_total, country_insts, country_medians,
                     country_active, country_year_min, country_year_max,
                     flow_counts, flow_median_year):
    print("[C] Merging and writing ...")

    # Only include countries from xlsx
    all_codes = sorted(set(country_counts.index))

    profiles = []
    for code in all_codes:
        count = int(country_counts.get(code, 0))
        pct_of_total = round(count / max(country_counts.sum(), 1) * 100, 1)
        pct_of_overseas = round(count / max(overseas_total, 1) * 100, 1) if code != "grc" else None

        inst_info = country_insts.get(code, {"institution_count": 0, "top_institutions": []})
        meds = country_medians.get(code, {})

        fa = flow_median_year.get(code, np.nan)

        entry = {
            "code": code,
            "name": COUNTRY_NAME_LOOKUP.get(code, code.upper()),
            # ── xlsx: scientist counts ──
            "scopus_total": count,
            "scopus_pct_total": pct_of_total,
            "scopus_pct_overseas": pct_of_overseas if code != "grc" else None,
            "is_greece": code == "grc",
            # ── xlsx: institution stats (unique per scientist) ──
            "institution_count": inst_info["institution_count"],
            "top_institutions": inst_info["top_institutions"],
            # ── xlsx: median stats ──
            "median_firstyr": meds.get("firstyr"),
            "median_nc9619_ns": meds.get("nc9619_ns"),
            "median_h19_ns": meds.get("h19_ns"),
            "median_c_ns": meds.get("c_ns"),
            # ── OpenAlex: flow & activity ──
            "flow_count": int(flow_counts.get(code, 0)),
            "active_authors": int(country_active.get(code, 0)),
            "median_first_flow_year": float(round(fa, 1)) if not np.isnan(fa) else None,
            "year_range": [
                int(country_year_min.get(code, np.nan)) if code in country_year_min else None,
                int(country_year_max.get(code, np.nan)) if code in country_year_max else None,
            ],
        }
        profiles.append(entry)

    # Sort by scopus_total desc
    profiles.sort(key=lambda x: x["scopus_total"], reverse=True)

    out_path = os.path.join(OUT_DIR, "country_profiles.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)

    print(f"     Written: {len(profiles)} countries → {out_path}")

    # Summary
    top5 = [p for p in profiles if not p["is_greece"]][:5]
    print(f"\n{'Code':<8} {'Scientists':>10} {'Flow':>8} {'Insts':>6} {'med_firstyr':>12} {'med_c_ns':>10}")
    for p in top5:
        print(f"{p['code']:<8} {p['scopus_total']:>10,} {p['flow_count']:>8,} {p['institution_count']:>6} "
              f"{str(p['median_firstyr']):>12} {str(p['median_c_ns']):>10}")

    print("\n[DONE]")


# ══════════════════════════════════════════════════════════════════════════
def main():
    print("=" * 60)
    print("extract_country_profiles.py  v2 (unified)")
    print("=" * 60)

    # Part A
    country_counts, overseas_total, country_insts, country_medians = extract_xlsx_stats()

    # Part B
    inst_info = load_source_info()
    author_inst_df = load_author_institutions()
    country_active, country_ymin, country_ymax, flow_counts, flow_median_year = \
        compute_openalex_stats(author_inst_df, inst_info)

    # Part C
    merge_and_output(
        country_counts, overseas_total, country_insts, country_medians,
        country_active, country_ymin, country_ymax, flow_counts, flow_median_year
    )


if __name__ == "__main__":
    main()
