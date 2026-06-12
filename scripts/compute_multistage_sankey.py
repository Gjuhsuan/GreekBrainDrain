"""
compute_multistage_sankey.py
Greek Brain Drain · Data Visualization Project

Reads OpenAlex-matched data and builds a multi-stage Sankey diagram:
  Stage 1: 1st institution → 2nd institution (by country)
  Stage 2: 2nd institution → 3rd institution
  Stage 3: 3rd institution → 4th institution

Only includes authors whose FIRST institution is in Greece.

Input:
  - 对接得到的数据/author_to_institutions.tsv
  - 对接得到的数据/source_info.tsv

Output:
  - data/new/sankey_multi.json
"""

import pandas as pd
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MATCHED_DIR = os.path.join(BASE, "对接得到的数据")
AUTH_INST = os.path.join(MATCHED_DIR, "author_to_institutions.tsv")
SOURCE_INFO = os.path.join(MATCHED_DIR, "source_info.tsv")
OUT_PATH = os.path.join(BASE, "data", "new", "sankey_multi.json")

# ── Country code → Chinese name ──
COUNTRY_CN = {
    "GR": "希腊", "US": "美国", "GB": "英国", "DE": "德国",
    "CY": "塞浦路斯", "AU": "澳大利亚", "FR": "法国", "CA": "加拿大",
    "CH": "瑞士", "NL": "荷兰", "SE": "瑞典", "IT": "意大利",
    "BE": "比利时", "ES": "西班牙", "AT": "奥地利", "DK": "丹麦",
    "NO": "挪威", "IE": "爱尔兰", "FI": "芬兰", "PT": "葡萄牙",
    "PL": "波兰", "JP": "日本", "CN": "中国", "IL": "以色列",
    "NZ": "新西兰", "BR": "巴西", "LU": "卢森堡",
    "SA": "沙特阿拉伯", "KW": "科威特", "QA": "卡塔尔", "AE": "阿联酋",
    "SG": "新加坡", "KR": "韩国", "IN": "印度",
    "TR": "土耳其", "ZA": "南非", "RU": "俄罗斯",
    "MX": "墨西哥", "AR": "阿根廷", "CL": "智利", "CO": "哥伦比亚",
    "EG": "埃及", "LB": "黎巴嫩", "JO": "约旦",
    "RO": "罗马尼亚", "BG": "保加利亚", "HR": "克罗地亚", "SI": "斯洛文尼亚",
    "HU": "匈牙利", "CZ": "捷克", "SK": "斯洛伐克",
    "RS": "塞尔维亚", "UA": "乌克兰", "EE": "爱沙尼亚", "LV": "拉脱维亚",
    "LT": "立陶宛", "IS": "冰岛", "MT": "马耳他",
    "HK": "中国香港", "TW": "中国台湾",
}
OTHER = "OTHER"  # internal key; display as "其他"
OTHER_CN = "其他"
TERMINAL = "TERMINAL"  # internal key for scientists with no further movement
TERMINAL_CN = "不再流动"


def country_cn(code):
    if code == OTHER:
        return OTHER_CN
    if code == TERMINAL:
        return TERMINAL_CN
    return COUNTRY_CN.get(code, code)


def country_name(code):
    return COUNTRY_NAMES.get(code, code)


def main():
    print("Loading source_info.tsv ...")
    sources = pd.read_csv(SOURCE_INFO, sep="\t", usecols=["institution_id", "country_code"])
    sources = sources.dropna(subset=["country_code"])
    sources = sources[sources["country_code"] != ""]
    inst_to_country = dict(zip(sources["institution_id"], sources["country_code"]))
    del sources
    print(f"  {len(inst_to_country):,} institutions loaded (with valid country)")

    print("Loading author_to_institutions.tsv ...")
    auth_inst = pd.read_csv(AUTH_INST, sep="\t")
    print(f"  {len(auth_inst):,} rows loaded")

    print("Grouping by author_id and sorting by year ...")
    auth_inst_sorted = auth_inst.sort_values(["author_id", "year"])
    auth_inst_unique = auth_inst_sorted.drop_duplicates(
        subset=["author_id", "institution_id"]
    )
    author_insts = auth_inst_unique.groupby("author_id")["institution_id"].apply(list)

    print("Mapping institutions to countries and computing transitions ...")
    stages = [
        {},  # Stage 1: inst 1→2
        {},  # Stage 2: inst 2→3
        {},  # Stage 3: inst 3→4
    ]
    eligible = 0

    for author_id, insts in author_insts.items():
        countries = []
        for iid in insts:
            cc = inst_to_country.get(iid)
            if cc is None or (isinstance(cc, float) and pd.isna(cc)):
                continue
            if not countries or countries[-1] != cc:
                countries.append(cc)

        if len(countries) < 2:
            continue

        if countries[0] != "GR":
            continue

        eligible += 1

        # Pad to exactly 4 countries: fill missing slots with TERMINAL
        while (len(countries) < 4):
            countries.append(TERMINAL)

        for stage_idx in range(3):
            src = countries[stage_idx]
            tgt = countries[stage_idx + 1]
            key = (src, tgt)
            stages[stage_idx][key] = stages[stage_idx].get(key, 0) + 1

    print(f"  Eligible authors (start in Greece, ≥2 institutions): {eligible}")

    # ── Compute per-stage top-10 countries ──
    N_TOP = 10
    top_countries_per_stage = []  # list of sets, one per stage (column)
    for col in range(4):  # 4 columns (0=1st inst, 1=2nd, 2=3rd, 3=4th)
        vol = {}  # country → total flow volume in this column
        for stage_idx, flows in enumerate(stages):
            for (src, tgt), cnt in flows.items():
                if stage_idx == col:       # src in this column
                    vol[src] = vol.get(src, 0) + cnt
                if stage_idx + 1 == col:   # tgt in this column
                    vol[tgt] = vol.get(tgt, 0) + cnt
        top10 = sorted(vol.items(), key=lambda x: -x[1])[:N_TOP]
        top_set = {c for c, _ in top10}
        top_set.add("GR")       # always keep Greece
        top_countries_per_stage.append(top_set)
        top_names = [country_cn(c) for c in top_set if c != "GR"]
        print(f"  Column {col} top: {country_cn('GR')} + {top_names}")

    # ── Merge small countries into "其他" per stage ──
    merged_stages = [{}, {}, {}]
    for stage_idx, flows in enumerate(stages):
        for (src, tgt), cnt in flows.items():
            s = src if src in top_countries_per_stage[stage_idx] else "OTHER"
            t = tgt if tgt in top_countries_per_stage[stage_idx + 1] else "OTHER"
            if s == "OTHER" and t == "OTHER":
                continue  # skip other→other
            key = (s, t)
            merged_stages[stage_idx][key] = merged_stages[stage_idx].get(key, 0) + cnt
    stages = merged_stages

    for i, s in enumerate(stages):
        top = sorted(s.items(), key=lambda x: -x[1])[:8]
        print(f"  Stage {i+1} (merged): {len(s)} flows, top: {top}")

    # ── Build nodes and links ──
    node_col = {}
    nodes = []
    links = []

    for stage_idx, flows in enumerate(stages):
        for (src_code, tgt_code), count in flows.items():
            src_name = country_cn(src_code)
            tgt_name = country_cn(tgt_code)

            src_key = (src_name, stage_idx)
            tgt_key = (tgt_name, stage_idx + 1)

            if src_key not in node_col:
                node_col[src_key] = len(nodes)
                nodes.append({"name": src_name, "column": stage_idx})
            if tgt_key not in node_col:
                node_col[tgt_key] = len(nodes)
                nodes.append({"name": tgt_name, "column": stage_idx + 1})

            links.append({
                "source": node_col[src_key],
                "target": node_col[tgt_key],
                "value": count,
            })

    # ── Filter: keep only flows with ≥ threshold ──
    min_flow = 5
    links = [l for l in links if l["value"] >= min_flow]

    used_nodes = set()
    for l in links:
        used_nodes.add(l["source"])
        used_nodes.add(l["target"])

    old_to_new = {}
    new_nodes = []
    for i, n in enumerate(nodes):
        if i in used_nodes:
            old_to_new[i] = len(new_nodes)
            new_nodes.append(n)

    for l in links:
        l["source"] = old_to_new[l["source"]]
        l["target"] = old_to_new[l["target"]]

    total_flows = sum(l["value"] for l in links)
    print(f"\nNodes: {len(new_nodes)}, Links: {len(links)}, "
          f"Total flows: {total_flows:,}, Threshold: ≥{min_flow}")

    output = {
        "nodes": new_nodes,
        "links": links,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nWritten: {OUT_PATH}")


if __name__ == "__main__":
    main()
