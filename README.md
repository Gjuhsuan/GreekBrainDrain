# 希腊人才流失：63,951 名科学家的迁移图谱

> Greek Brain Drain — A Visual Exploration of 63,951 Scientists

数据可视化期末作业 · 北京大学信息管理系 · 2026 年春季学期

基于 Ioannidis et al. (2021) 构建的希腊裔科学家数据库，通过交互式可视化呈现人才流失的规模、学科差异、顶尖人才分布及职业流动轨迹。

---

## 快速开始

在浏览器中直接打开 `index.html`，或使用本地服务器：

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

## 项目结构

```
GreekBrainDrain/
│
├── index.html                     # 主页面（单页滚动叙事可视化）
├── README.md                      # 本文件
├── DATA.md                        # 数据文件详细说明
│
├── css/
│   └── style.css                  # 全局样式（~1500 行）
│
├── js/                            # JavaScript 可视化模块
│   ├── utils.js                   # 共享工具：颜色、格式化、数据加载、ISO 编码
│   ├── main.js                    # 导航栏、滚动监听
│   ├── hero.js                    # 开篇：63,951 总览数字
│   ├── globe.js                   # 一、全球分布地图 + Top 10 目的国
│   ├── mapBars.js                 # 地图旁 Top 10 横向条形图
│   ├── marey.js                   # 一、1960–2019 逐年流出 Marey 图
│   ├── butterfly.js               # 二、学科哑铃图（学科大类/子领域对比）
│   ├── marimekko.js               # 二、学科规模 × 流失率 马赛克图
│   ├── heatmap.js                 # 三、百分位层级堆积条形图（三指标可切换）
│   ├── profiles.js                # 三、顶级科学家表格 + 国家条形图
│   ├── toggle.js                  # 三、金字塔/个案 切换标签
│   ├── violins.js                 # 四指标小提琴分布图
│   ├── scatter.js                 # 生产力 vs 影响力 散点图
│   ├── sankey.js                  # 四、首次海外流向桑基图
│   ├── sankeyMulti.js             # 四、多阶段机构流动桑基图
│   ├── departure.js               # 四、逐年流出时间线
│   ├── role.js                    # 四、作者角色对比
│   ├── bubbles.js                 # 四、国家数量 vs 篇均引用气泡图
│   ├── institutions.js            # 四、机构流失率排名
│   └── chord.js                   # （备用）合作网络弦图
│
├── data/                          # 处理后的数据文件（JSON）
│   ├── countries.json             # 各国科学家统计
│   ├── summary.json               # 本土 vs 海外 整体指标
│   ├── subfields.json             # 174 个子领域本土/海外人数
│   ├── percentiles.json           # 多指标百分位层级（c_ns / cpp_ns / h19_ns）
│   ├── percentile_by_field.json   # 分学科百分位层级
│   ├── top15.json                 # 各子领域 Top 15 科学家
│   ├── distributions.json         # 四指标分布数据（小提琴图）
│   ├── scatter_sample.json        # 散点图采样数据
│   ├── firstyr_trends.json        # 逐年首次发表趋势
│   ├── cohort.json                # 世代对比数据
│   ├── cpp_by_country.json        # 各国篇均引用
│   ├── world-110m.json            # TopoJSON 世界地图
│   │
│   └── new/                       # 从 OpenAlex 匹配数据派生的文件
│       ├── country_profiles.json  # 国家综合画像（xlsx + OpenAlex）
│       ├── sankey_data.json       # 首次海外流向（单阶段桑基图）
│       ├── sankey_multi.json      # 多阶段机构流动（四列桑基图）
│       ├── departure_timeline.json
│       ├── institution_ranking.json
│       ├── role_data.json
│       └── chord_data.json
│
├── scripts/                       # Python 数据处理脚本
│   ├── extract_country_profiles.py        # xlsx + OpenAlex → 国家画像
│   ├── compute_percentiles.py             # xlsx → 多指标百分位层级
│   └── compute_multistage_sankey.py       # TSV → 多阶段桑基图数据
│
├── 对接得到的数据/                 # OpenAlex 匹配原始数据（TSV，未入库）
│   ├── author_to_authfull.tsv     # 作者姓名 ↔ OpenAlex ID
│   ├── author_to_institutions.tsv # 作者-机构-年份 时间线
│   ├── source_info.tsv            # 机构信息（含国家代码）
│   ├── paper_to_authors.tsv       # 论文合作网络
│   └── 数据介绍.md                # 四张表的详细说明
│
└── Table-S1-Greek-20201001_1960_1996_2019-63951.xlsx
                                   # 原始数据：Ioannidis et al. (2021)
```

## 数据来源

| 数据 | 来源 | 说明 |
|------|------|------|
| `Table-S1-Greek-…63951.xlsx` | Ioannidis et al. (2021), Mendeley Data (doi:10.17632/zbyctscmbn.1) | 63,951 名希腊裔科学家 Scopus 快照 |
| `对接得到的数据/` | OpenAlex API 名称匹配 | 作者机构经历、论文合作网络 |

## 可视化总览

| 章节 | 图表 | 关键发现 |
|------|------|----------|
| 一、人才流失规模 | 全球面量图 + 逐年 Marey 图 | 45% 在海外，2009 年后流失率升至 53% |
| 二、学科不对称 | 哑铃图 + 马赛克图 | 经济学、心理学流失最严重；临床医学本土保有最多 |
| 三、顶尖人才 | 百分位条形图 + 科学家个案表 | 前 0.1% 中 86% 在海外；32 位顶级人才中 30 人离开希腊 |
| 四、流动网络 | 单/多阶段桑基图 + 逐年流出 | 首次流出 48% 去美英；39% 在第二阶段回流希腊 |

## 运行脚本

需 Python 环境（conda base，含 pandas + openpyxl）：

```bash
# 生成多指标百分位数据
D:/miniconda3/python.exe scripts/compute_percentiles.py

# 生成多阶段桑基图数据（需先有 对接得到的数据/）
D:/miniconda3/python.exe scripts/compute_multistage_sankey.py
```

## 技术栈

- **D3.js v7** — 所有可视化
- **d3-sankey 0.12** — 桑基图布局
- **topojson-client v3** — 地图数据处理
- **Intersection Observer** — 懒加载（滚动到视图才渲染）
- **Pandas / openpyxl** — 数据预处理

## 参考文献

1. Ioannidis, J. P. A., Baas, J., Klavans, R., & Boyack, K. W. (2021). Comprehensive mapping of local and diaspora scientists: A database and analysis of 63,951 Greek scientists. *Quantitative Science Studies*, 2(2), 733–752.
2. Yuret, T. (2017). An analysis of the foreign-educated elite academics in the United States. *Journal of Informetrics*, 11(2), 358–370.
