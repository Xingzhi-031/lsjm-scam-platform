# Risk Words Lexicon — 用途、逻辑与权重说明

## 1. 各输出文件的用途

| 文件 | 用途 |
|------|------|
| **cleaned_word_stats.csv** | 离线分析、人工审核、调参。含所有词的完整统计。 |
| **risk_lexicon.json** | 文本评分时用。命中风险词 → 加分（weight 为正）。 |
| **safe_lexicon.json** | 文本评分时用。命中安全词 → 减分（weight 为负）。 |
| **stopwords_custom.json** | 分词后过滤停用词（the, is, and...），不参与打分。 |
| **blacklist_words.json** | 强制排除（sf, ok, tab），即使出现在原始数据中也不使用。 |
| **scoring_config.json** | 运行时参数：权重范围、阈值、sigmoid 参数等。 |
| **evaluation_report.json** | 离线评估：phishing/normal 平均分、推荐阈值。 |

---

## 2. 整体逻辑流程

```
riskWords.xlsx (原始词频)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  过滤: len≥3, total_count≥5, isalpha, not stopwords, not blacklist  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  计算: phishing_ratio, normal_ratio, log_odds_score, final_weight   │
└──────────────────────────────────────────────────────────────┘
       │
       ├──► cleaned_word_stats.csv (全量)
       │
       ├──► risk_lexicon: log_odds>0 且 phishing_ratio≥0.7 且 support≥5
       │
       ├──► safe_lexicon: log_odds<0 且 normal_ratio≥0.7 且 support≥5
       │
       └──► evaluation_report (离线评估)
```

---

## 3. 权重如何算

### 3.1 基础量

| 量 | 公式 |
|----|------|
| `total_count` | `phishing_count + normal_count` |
| `phishing_ratio` | `phishing_count / total_count` |
| `normal_ratio` | `normal_count / total_count` |
| `support` | = `total_count`（出现次数，衡量可信度） |

### 3.2 log_odds_score

```
log_odds_score = log( (phishing_count + 0.5) / (normal_count + 0.5) )
```

- **> 0**：更常出现在 phishing 文本 → 风险词  
- **< 0**：更常出现在 normal 文本 → 安全词  
- **= 0**：两者差不多 → 中性  
- +0.5 为拉普拉斯平滑，避免分母为 0。

### 3.3 final_weight（实际使用权重）

```
final_weight = clip( log_odds_score, -5, 5 )
```

- 范围：**[-5, 5]**  
- 直接使用 log_odds 作为权重（稳定版）  
- 可选方案：`clip( log_odds × log(1+support), -8, 8 )` 若希望 support 大时权重大。

---

## 4. 权重如何解读

### 4.1 risk_lexicon（风险词）

| weight | 含义 | 例子 |
|--------|------|------|
| 3–5 | 极强风险信号 | google(3.93), email(3.20), continue(3.11) |
| 2–3 | 强风险信号 | file(2.56), cookies(2.45), open(2.26) |
| 1–2 | 中等风险信号 | website(1.98), service(1.78), use(1.52) |
| 0.7–1 | 弱风险信号 | services(1.14) |

### 4.2 safe_lexicon（安全词）

| weight | 含义 |
|--------|------|
| -5 ~ -1 | 明显安全信号，会拉低总分 |
| 0 附近 | 中性 |

### 4.3 phishing_ratio / support

- **phishing_ratio**：该词在 phishing 中出现的占比，越高越偏风险。
- **support**：总出现次数，越高越可信，越适合作为特征。

---

## 5. 运行时评分逻辑（textAnalyzer 计划）

```
输入文本
    │
    ▼
分词 → 过滤 stopwords、blacklist、len<3
    │
    ▼
对每个 token：
  - 在 risk_lexicon → +weight
  - 在 safe_lexicon → +weight（负值，相当于减分）
    │
    ▼
raw_score = Σ(命中词的 weight)
    │
    ▼
probability = sigmoid(a × raw_score + b)
    │
    ▼
riskScore = probability × 100
riskLevel = 根据 riskScore 分段（low/medium/high/critical）
```

### 5.1 scoring_config 参数

| 参数 | 作用 |
|------|------|
| `weight_clip_min/max` | 词权重的上下界（-5, 5） |
| `min_token_length` | 最短词长，小于则丢弃 |
| `bad_word_threshold` | 选词时的 phishing_ratio 阈值 |
| `min_support` | 最小 support |
| `probability.a`, `probability.b` | sigmoid 形状与偏移 |

---

## 6. 数据流总结

| 阶段 | 输入 | 输出 |
|------|------|------|
| **离线（Python/TS 脚本）** | riskWords.xlsx | lexicons、config、evaluation |
| **运行时（textAnalyzer）** | 用户文本 + lexicons + config | riskScore、riskLevel、signals |

---

## 7. 运行命令

```bash
pnpm data:process
```

输出目录：`backend/src/data/output/`，同时复制到 `backend/src/rules/` 供 API 使用。

---

## 8. Git Commit 指令

```bash
# 1. 添加脚本与配置（不含 output，output 可 gitignore 或单独提交）
git add backend/package.json package.json pnpm-lock.yaml
git add backend/src/data/processRiskWords.ts backend/src/data/PLAN.md

# 2. 添加生成到 rules 的 lexicon 与 config（供 textAnalyzer 使用）
git add backend/src/rules/risk_lexicon.json backend/src/rules/safe_lexicon.json
git add backend/src/rules/stopwords_custom.json backend/src/rules/blacklist_words.json
git add backend/src/rules/scoring_config.json

# 3. 可选：添加 output（若需版本化管理离线结果）
git add backend/src/data/output/

# 4. 提交
git commit -m "feat(data): risk words pipeline - processRiskWords, lexicons, scoring config"
```

---

## 9. 拿到 Clean 数据之后如何计算权重（详解）

### 9.1 输入：每行一条 Clean 记录

每行应包含：`word`, `phishing_count`, `normal_count`。  
（来源：Excel 原始数据，经过滤后得到 clean 数据。）

### 9.2 计算步骤（按顺序）

| 步骤 | 公式 | 说明 |
|------|------|------|
| 1 | `total_count = phishing_count + normal_count` | 该词在 phishing + normal 中的总出现次数 |
| 2 | `phishing_ratio = phishing_count / total_count` | 该词在 phishing 中的占比，范围 [0, 1] |
| 3 | `normal_ratio = normal_count / total_count` | 该词在 normal 中的占比，= 1 - phishing_ratio |
| 4 | `support = total_count` | 用作 support，与 total_count 相同 |
| 5 | `log_odds_score = log((phishing_count + 0.5) / (normal_count + 0.5))` | 对数几率，正=偏 phishing，负=偏 normal |
| 6 | `final_weight = clip(log_odds_score, -5, 5)` | 裁剪到 [-5, 5]，作为最终权重 |

其中 `clip(x, min, max) = max(min, min(max, x))`。

### 9.3 数值示例

| word | phishing | normal | total | phishing_ratio | log_odds | final_weight |
|------|----------|--------|-------|----------------|----------|--------------|
| email | 602 | 24 | 626 | 0.96 | 3.20 | 3.20 |
| file | 458 | 35 | 493 | 0.93 | 2.56 | 2.56 |
| services | 300 | 96 | 396 | 0.76 | 1.14 | 1.14 |
| recipe | 2 | 40 | 42 | 0.05 | -2.43 | -2.43 |

- **email**：phishing 占比高 → log_odds 正 → weight 正 → 风险词  
- **recipe**：normal 占比高 → log_odds 负 → weight 负 → 安全词  

### 9.4 筛选进 risk_lexicon

满足以下**全部**条件时写入 `risk_lexicon.json`：

- `log_odds_score > 0`
- `phishing_ratio >= 0.7`
- `support >= 5`

### 9.5 筛选进 safe_lexicon

满足以下**全部**条件时写入 `safe_lexicon.json`：

- `log_odds_score < 0`
- `normal_ratio >= 0.7`
- `support >= 5`

### 9.6 可选：support 加权版本

若希望 support 大的词权重大，可用：

```
final_weight = clip( log_odds_score × log(1 + support), -8, 8 )
```

当前实现使用稳定版 `clip(log_odds_score, -5, 5)`。
