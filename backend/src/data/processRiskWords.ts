/**
 * Process riskWords.xlsx -> cleaned stats, lexicons, configs, evaluation report.
 * Run: pnpm data:process (from backend) or pnpm --filter lsjm-backend data:process
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname);
const RULES_DIR = path.join(__dirname, '../rules');
const INPUT_FILE = path.join(DATA_DIR, 'riskWords.xlsx');
const OUTPUT_DIR = path.join(DATA_DIR, 'output');

const MIN_WORD_LEN = 3;
const MIN_SUPPORT = 5;
const BLACKLIST = new Set(['sf', 'ok', 'tab']);
const RISK_THRESHOLD_PHISHING_RATIO = 0.7;
const SAFE_THRESHOLD_NORMAL_RATIO = 0.7;
const WEIGHT_CLIP_MIN = -5;
const WEIGHT_CLIP_MAX = 5;

// Basic English stopwords (extend as needed)
const STOPWORDS = new Set([
  'the', 'is', 'and', 'for', 'with', 'to', 'of', 'a', 'in', 'on', 'at', 'by',
  'as', 'or', 'be', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'an'
]);

interface WordRow {
  word: string;
  phishing_count: number;
  normal_count: number;
  total_count: number;
  phishing_ratio: number;
  normal_ratio: number;
  log_odds_score: number;
  final_weight: number;
  support: number;
}

interface LexiconEntry {
  weight: number;
  phishing_ratio?: number;
  normal_ratio?: number;
  support: number;
}

function loadExcel(filePath: string): { word: string; phishing: number; normal: number }[] {
  const wb = XLSX.readFile(filePath);
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
  const result: { word: string; phishing: number; normal: number }[] = [];

  const normalizeKey = (k: string) => k.toLowerCase().replace(/\s/g, '_');
  const findCol = (row: Record<string, unknown>, patterns: string[]): unknown => {
    for (const p of patterns) {
      for (const k of Object.keys(row)) {
        if (normalizeKey(k).includes(p)) return row[k];
      }
    }
    return undefined;
  };

  for (const row of rows) {
    const word = String(findCol(row, ['word', 'term', 'keyword']) ?? '').trim().toLowerCase();
    const ph = Number(findCol(row, ['phishing', 'phish', 'malicious']) ?? 0);
    const norm = Number(findCol(row, ['normal', 'benign', 'safe', 'legit']) ?? 0);
    if (!word) continue;
    result.push({ word, phishing: ph || 0, normal: norm || 0 });
  }
  return result;
}

function logOdds(phishing: number, normal: number): number {
  const a = phishing + 0.5;
  const b = normal + 0.5;
  return Math.log(a / b);
}

function clip(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function processWords(raw: { word: string; phishing: number; normal: number }[]): WordRow[] {
  const rows: WordRow[] = [];
  for (const r of raw) {
    const w = r.word.toLowerCase();
    if (w.length < MIN_WORD_LEN) continue;
    if (!/^[a-z]+$/i.test(w)) continue;
    if (STOPWORDS.has(w) || BLACKLIST.has(w)) continue;

    const phishing_count = Math.max(0, r.phishing);
    const normal_count = Math.max(0, r.normal);
    const total_count = phishing_count + normal_count;
    if (total_count < MIN_SUPPORT) continue;

    const phishing_ratio = total_count > 0 ? phishing_count / total_count : 0;
    const normal_ratio = total_count > 0 ? normal_count / total_count : 0;
    const log_odds_score = logOdds(phishing_count, normal_count);
    const final_weight = clip(log_odds_score, WEIGHT_CLIP_MIN, WEIGHT_CLIP_MAX);

    rows.push({
      word: w,
      phishing_count,
      normal_count,
      total_count,
      phishing_ratio,
      normal_ratio,
      log_odds_score,
      final_weight,
      support: total_count,
    });
  }
  return rows.sort((a, b) => b.support - a.support);
}

function writeCsv(rows: WordRow[], outPath: string): void {
  const header = 'word,phishing_count,normal_count,total_count,phishing_ratio,normal_ratio,log_odds_score,final_weight,support';
  const lines = [header, ...rows.map(r =>
    [r.word, r.phishing_count, r.normal_count, r.total_count,
     r.phishing_ratio.toFixed(4), r.normal_ratio.toFixed(4),
     r.log_odds_score.toFixed(4), r.final_weight.toFixed(4), r.support].join(',')
  )];
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
}

function buildLexicons(rows: WordRow[]): { risk: Record<string, LexiconEntry>; safe: Record<string, LexiconEntry> } {
  const risk: Record<string, LexiconEntry> = {};
  const safe: Record<string, LexiconEntry> = {};
  const round2 = (n: number) => Math.round(n * 100) / 100;
  for (const r of rows) {
    if (r.log_odds_score > 0 && r.phishing_ratio >= RISK_THRESHOLD_PHISHING_RATIO && r.support >= MIN_SUPPORT) {
      risk[r.word] = { weight: round2(r.final_weight), phishing_ratio: round2(r.phishing_ratio), support: r.support };
    }
    if (r.log_odds_score < 0 && r.normal_ratio >= SAFE_THRESHOLD_NORMAL_RATIO && r.support >= MIN_SUPPORT) {
      safe[r.word] = { weight: round2(r.final_weight), normal_ratio: round2(r.normal_ratio), support: r.support };
    }
  }
  return { risk, safe };
}

function runOfflineEval(rows: WordRow[], riskLex: Record<string, LexiconEntry>, safeLex: Record<string, LexiconEntry>) {
  // Simulate scoring: each "phishing" word contributes +weight, each "normal" word contributes -weight
  let totalPhishingScore = 0;
  let totalNormalScore = 0;
  let phishingTerms = 0;
  let normalTerms = 0;
  for (const r of rows) {
    const w = riskLex[r.word]?.weight ?? 0;
    const s = safeLex[r.word]?.weight ?? 0;
    if (r.phishing_ratio >= 0.7) {
      totalPhishingScore += w || -s;
      phishingTerms++;
    } else if (r.normal_ratio >= 0.7) {
      totalNormalScore += s || -w;
      normalTerms++;
    }
  }
  const avgPhishing = phishingTerms > 0 ? totalPhishingScore / phishingTerms : 0;
  const avgNormal = normalTerms > 0 ? totalNormalScore / normalTerms : 0;
  return {
    num_phishing_sites: phishingTerms,
    num_normal_sites: normalTerms,
    avg_phishing_score: Math.round(avgPhishing * 100) / 100,
    avg_normal_score: Math.round(avgNormal * 100) / 100,
    recommended_thresholds: { low: 0.3, medium: 0.8 },
  };
}

function main(): void {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('Input file not found:', INPUT_FILE);
    process.exit(1);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const raw = loadExcel(INPUT_FILE);
  console.log('Loaded', raw.length, 'rows from', INPUT_FILE);

  const rows = processWords(raw);
  console.log('After filtering:', rows.length, 'words');

  writeCsv(rows, path.join(OUTPUT_DIR, 'cleaned_word_stats.csv'));
  console.log('Wrote cleaned_word_stats.csv');

  const { risk, safe } = buildLexicons(rows);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'risk_lexicon.json'), JSON.stringify(risk, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'safe_lexicon.json'), JSON.stringify(safe, null, 2));
  console.log('Wrote risk_lexicon.json (%d), safe_lexicon.json (%d)', Object.keys(risk).length, Object.keys(safe).length);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'stopwords_custom.json'), JSON.stringify([...STOPWORDS].sort()));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'blacklist_words.json'), JSON.stringify([...BLACKLIST].sort()));
  console.log('Wrote stopwords_custom.json, blacklist_words.json');

  const scoringConfig = {
    score_mode: 'tf_weighted_sum',
    weight_clip_min: WEIGHT_CLIP_MIN,
    weight_clip_max: WEIGHT_CLIP_MAX,
    min_token_length: MIN_WORD_LEN,
    bad_word_threshold: RISK_THRESHOLD_PHISHING_RATIO,
    min_support: MIN_SUPPORT,
    probability: { method: 'sigmoid', a: 3.0, b: 0.5 },
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'scoring_config.json'), JSON.stringify(scoringConfig, null, 2));
  console.log('Wrote scoring_config.json');

  const evalReport = runOfflineEval(rows, risk, safe);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'evaluation_report.json'), JSON.stringify(evalReport, null, 2));
  console.log('Wrote evaluation_report.json');

  // Copy to rules for runtime use (optional)
  fs.copyFileSync(path.join(OUTPUT_DIR, 'risk_lexicon.json'), path.join(RULES_DIR, 'risk_lexicon.json'));
  fs.copyFileSync(path.join(OUTPUT_DIR, 'safe_lexicon.json'), path.join(RULES_DIR, 'safe_lexicon.json'));
  fs.copyFileSync(path.join(OUTPUT_DIR, 'stopwords_custom.json'), path.join(RULES_DIR, 'stopwords_custom.json'));
  fs.copyFileSync(path.join(OUTPUT_DIR, 'blacklist_words.json'), path.join(RULES_DIR, 'blacklist_words.json'));
  fs.copyFileSync(path.join(OUTPUT_DIR, 'scoring_config.json'), path.join(RULES_DIR, 'scoring_config.json'));
  console.log('Copied lexicons and config to rules/');
}

main();
