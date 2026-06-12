# 数据文件说明 (DATA.md)

本文档记录 `data/` 目录下所有数据文件的来源、提取方法与数据结构。

---

## 目录结构

```
data/
├── countries.json          # 原始 Scopus 快照：各国希腊裔科学家数
├── summary.json            # 本土 vs 海外整体统计（均值、中位数等）
├── firstyr_trends.json     # 1960-2019 逐年首次发表论文趋势
├── subfields.json          # 174 个 Science Metrix 子领域数据
├── scatter_sample.json     # 论文数 vs 引用数散点采样数据
├── distributions.json      # 四个指标的分布数据（小提琴图用）
├── percentiles.json        # 百分位层级汇总（三指标：c_ns/cpp_ns/h19_ns）
├── percentile_by_field.json
├── top15.json              # 各子领域 Top 15 科学家案例
├── cohort.json
├── cpp_by_country.json     # 各国篇均引用
├── world-110m.json         # TopoJSON 世界地图
│
└── new/                    # ★ 从「对接得到的数据」提取的衍生数据
    ├── country_profiles.json      # ★ 国家维度综合画像（xlsx + OpenAlex 统一版）
    ├── departure_timeline.json    # 逐年流出时间线
    ├── sankey_data.json           # 流向桑基图数据
    ├── institution_ranking.json   # 机构流失排名
    ├── role_data.json             # 作者角色分布
    └── chord_data.json            # 合作网络弦图数据
```

---

## 原始数据来源

### 1. Table-S1-Greek-20201001_1960_1996_2019-63951.xlsx

- **来源**: Ioannidis et al. (2021), Mendeley Data (doi:10.17632/zbyctscmbn.1)
- **内容**: 63,951 名希腊裔科学家的 Scopus 记录，含姓名、归属国、论文数、引用量、h 指数、综合引用得分（c, ns）、学科分类等
- **用途**: `countries.json`、`summary.json`、`subfields.json` 等均从此提取

### 2. 对接得到的数据/ (OpenAlex 匹配数据)

- **来源**: 将原始 Excel 中的 `authfull`（作者姓名）去 OpenAlex 系统做名称解析，获得 `author_id`，再拉取作者机构经历和论文合作信息
- **匹配率**: 约 58,000 / 63,951 位（91%）匹配成功

#### 文件清单

| 文件 | 行数 | 大小 | 说明 |
|------|------|------|------|
| `author_to_authfull.tsv` | 58,125 | 2 MB | author_id ↔ authfull 映射 |
| `author_to_institutions.tsv` | 861,449 | 24 MB | 作者-机构-年份 时间线 |
| `source_info.tsv` | 114,884 | 60 MB | 机构信息（id、名称、国家等） |
| `paper_to_authors.tsv` | 40,232,478 | 2 GB | 论文-作者对应表（含全部合作者） |

---

## 衍生数据提取方案

### A. `country_profiles.json`（统一版 v2）

**提取脚本**: `scripts/extract_country_profiles.py`

**运行方式**:
```bash
python scripts/extract_country_profiles.py
```

**数据处理步骤**:

Part A — xlsx 数据（无重复计数）:
1. 加载 `Table-S1-Greek-20201001_1960_1996_2019-63951.xlsx` Career 表
2. 按 `cntry` 列分组统计：科学家总数、海外占比
3. 按 `inst_name` 列统计：机构数（每位科学家唯一归属）、前 5 机构
4. 按国家计算中位数：`firstyr`、`nc9619 (ns)`、`h19 (ns)`、`c (ns)`

Part B — OpenAlex 匹配数据:
1. 加载 `source_info.tsv` 和 `author_to_institutions.tsv`
2. 计算 `flow_count`：首份海外机构所在国
3. 计算 `active_authors`、`year_range`

Part C — 合并：只输出 xlsx 中存在的国家（108 个）

**输出结构**:
```json
[
  {
    "code": "usa",
    "name": "United States",
    "scopus_total": 9339,
    "scopus_pct_total": 14.8,
    "scopus_pct_overseas": 33.3,
    "is_greece": false,
    "institution_count": 2724,
    "top_institutions": [
      {"name": "Harvard Medical School", "count": 150}, ...
    ],
    "median_firstyr": 1999.0,
    "median_nc9619_ns": 8234.0,
    "median_h19_ns": 28.0,
    "median_c_ns": 1.77,
    "flow_count": 7430,
    "active_authors": 21660,
    "median_first_flow_year": 2006.0,
    "year_range": [1904, 2025]
  }
]
```

**字段说明**:

| 字段 | 含义 | 来源 |
|------|------|------|
| `scopus_total` | 该国希腊裔科学家数 | xlsx `cntry` |
| `scopus_pct_total` | 占全体科学家 % | xlsx 计算 |
| `scopus_pct_overseas` | 占海外科学家 %（希腊此项为 null） | xlsx 计算 |
| `institution_count` | 机构数（去重，每人唯一归属） | xlsx `inst_name` |
| `top_institutions` | 前 5 机构及人数 | xlsx `inst_name` |
| `median_firstyr` | 中位首篇论文年份 | xlsx `firstyr` |
| `median_nc9619_ns` | 中位 1996-2019 总被引（排除自引） | xlsx `nc9619 (ns)` |
| `median_h19_ns` | 中位 2019 年底 h 指数（排除自引） | xlsx `h19 (ns)` |
| `median_c_ns` | 中位综合评分（排除自引） | xlsx `c (ns)` |
| `flow_count` | 从希腊直接流入人数 | OpenAlex |
| `active_authors` | 在该国有论文产出的作者数 | OpenAlex |
| `median_first_flow_year` | 流入作者首篇海外论文年份中位数 | OpenAlex |
| `year_range` | 作者活跃年份区间 | OpenAlex |

**注意**: 此文件已整合了原 `country_institutions.json` 的内容，后者不再使用。

### B. `percentiles.json`（多指标百分位层级）

**提取脚本**: `scripts/compute_percentiles.py`

**运行方式**:
```bash
D:/miniconda3/python.exe scripts/compute_percentiles.py
```

**数据处理步骤**:
1. 读取 `Table-S1-Greek-20201001_1960_1996_2019-63951.xlsx` Career 表
2. 根据 `cntry == 'grc'` 标记希腊本土 vs 海外
3. 派生 `cpp_ns = nc9619 (ns) / np`（篇均被引）
4. 对每个指标分别按全球排名降序排列，取各百分位阈值的人数

**三种指标**:

| 指标 key | 中文名 | Excel 列 | 说明 |
|----------|--------|----------|------|
| `c_ns` | 综合引用得分 | `c (ns)` | 排除自引的综合引用得分 |
| `cpp_ns` | 篇均被引 | `nc9619 (ns) / np` | 总被引次数 ÷ 论文数 |
| `h19_ns` | H 指数 | `h19 (ns)` | 2019年底 h 指数（排除自引） |

**输出结构**:
```json
{
  "c_ns": [
    {"tier": "前 50%", "tier_value": 50, "greece": 16217, "abroad": 15759, "total": 31976},
    ...
    {"tier": "前 0.1%", "tier_value": 0.1, "greece": 5, "abroad": 59, "total": 64}
  ],
  "cpp_ns": [ ... ],
  "h19_ns": [ ... ]
}
```

### C. `sankey_multi.json`（多阶段桑基图）

**提取脚本**: `scripts/compute_multistage_sankey.py`

**运行方式**:
```bash
D:/miniconda3/python.exe scripts/compute_multistage_sankey.py
```

**数据处理步骤**:
1. 加载 `对接得到的数据/source_info.tsv`，构建 institution_id → country_code 映射
2. 加载 `对接得到的数据/author_to_institutions.tsv`，按 author_id 分组，按年份排序
3. 对每位科学家，提取去重后的机构序列（连续相同国家合并），映射为国家序列
4. 筛选第一个机构在希腊（GR）的作者
5. 统计第1→2机构、第2→3机构、第3→4机构的跨国流动人数（≥5 人阈值）

**输出结构**:
```json
{
  "nodes": [
    {"name": "Greece", "column": 0},
    {"name": "USA",    "column": 1},
    ...
  ],
  "links": [
    {"source": 0, "target": 1, "value": 4224},
    ...
  ]
}
```

**列（column）含义**:
| column | 含义 |
|--------|------|
| 0 | 第1个机构（希腊） |
| 1 | 第2个机构 |
| 2 | 第3个机构 |
| 3 | 第4个机构 |

**渲染**: `js/sankeyMulti.js`，渲染到 `#sankey-svg-copy`

### D. 其他 `data/new/` 文件

| 文件 | 说明 | 来源 |
|------|------|------|
| `departure_timeline.json` | 1960-2019 逐年本土/海外/新流出人数 | 原始 Excel + OpenAlex |
| `sankey_data.json` | 21,208 名科学家的首次流入国分布 | OpenAlex 匹配数据 |
| `institution_ranking.json` | 希腊机构流失率排名 | OpenAlex 匹配数据 |
| `role_data.json` | 本土 vs 海外作者角色分布（第一/通讯等） | OpenAlex 匹配数据 |
| `chord_data.json` | 国家间合作网络数据 | OpenAlex 匹配数据 |

---

## 数据更新记录

| 日期 | 变更内容 |
|------|----------|
| 2026-06-12 | 新增 `scripts/compute_percentiles.py`，将 `percentiles.json` 扩展为三指标（c_ns/cpp_ns/h19_ns），条形图支持指标切换 |
| 2026-06-12 | 整合 `country_institutions.json` 入 `country_profiles.json`（v2 统一版），新增中位统计量 |
| 2026-06-01 | 初始版本，整理原始 Excel → `data/` |
