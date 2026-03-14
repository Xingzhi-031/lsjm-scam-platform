import type { AnalysisResult, RiskLevel, RiskSignal } from '@/types/analysisTypes';
import { buildAnalysisResult } from '@/utils/resultBuilder';
import fs from 'fs';
import {
  RISK_LEXICON_PATH,
  SAFE_LEXICON_PATH,
  STOPWORDS_PATH,
  BLACKLIST_PATH,
  SCORING_CONFIG_PATH
} from '@/utils/paths';

const SOURCE = 'message' as const;

interface LexiconEntry {
  weight: number;
  phishing_ratio?: number;
  normal_ratio?: number;
  support: number;
}

interface ScoringConfig {
  score_mode: string;
  weight_clip_min: number;
  weight_clip_max: number;
  min_token_length: number;
  bad_word_threshold: number;
  min_support: number;
  probability: {
    method: string;
    a: number;
    b: number;
  };
}

type LexiconMap = Record<string, LexiconEntry>;

function loadJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

const riskLexicon = loadJsonFile<LexiconMap>(RISK_LEXICON_PATH);
const safeLexicon = loadJsonFile<LexiconMap>(SAFE_LEXICON_PATH);
const stopwords = new Set(loadJsonFile<string[]>(STOPWORDS_PATH));
const blacklist = new Set(loadJsonFile<string[]>(BLACKLIST_PATH));
const scoringConfig = loadJsonFile<ScoringConfig>(SCORING_CONFIG_PATH);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function getRiskLevel(probability: number): RiskLevel {
  if (probability >= 0.8) {
    return 'high';
  }
  if (probability >= 0.3) {
    return 'medium';
  }
  return 'low';
}

export function analyzeText(text: string): AnalysisResult {
  const signals: RiskSignal[] = [];
  const reasons: string[] = [];
  const advice: string[] = [];

  // Tokenization
  const tokens = tokenize(text);

  const filteredTokens = tokens.filter(
    (token) =>
      token.length >= scoringConfig.min_token_length &&
      !stopwords.has(token) &&
      !blacklist.has(token)
  );

  // Lexicon lookup
  let rawScore = 0;
  const matchedRiskWords: string[] = [];
  const matchedSafeWords: string[] = [];

  for (const token of filteredTokens) {
    const riskEntry = riskLexicon[token];
    if (riskEntry) {
      rawScore += riskEntry.weight;
      matchedRiskWords.push(token);
    }

    const safeEntry = safeLexicon[token];
    if (safeEntry) {
      rawScore += safeEntry.weight;
      matchedSafeWords.push(token);
    }
  }

  // Score calculation
  const a = scoringConfig.probability.a;
  const b = scoringConfig.probability.b;
  const probability = sigmoid(a * rawScore + b);
  const riskScore = Math.round(probability * 100);
  const riskLevel = getRiskLevel(probability);

  // Signal detection
  const uniqueMatchedRiskWords = [...new Set(matchedRiskWords)];
  const strongestRiskWord = uniqueMatchedRiskWords.sort((wordA, wordB) => {
    const weightA = riskLexicon[wordA]?.weight ?? 0;
    const weightB = riskLexicon[wordB]?.weight ?? 0;
    return weightB - weightA;
  })[0];

  if (uniqueMatchedRiskWords.length > 0) {
    signals.push({
      id: 'risk_lexicon_match',
      description: `Matched phishing-related risk words: ${uniqueMatchedRiskWords.slice(0, 5).join(', ')}`,
      score: 100,
      source: SOURCE,
    });
  }

  if (strongestRiskWord) {
    signals.push({
      id: 'strong_risk_word',
      description: `Strongest risk word detected: "${strongestRiskWord}"`,
      score: 100,
      source: SOURCE,
    });
  }

  if (matchedSafeWords.length > 0) {
    signals.push({
      id: 'safe_lexicon_match',
      description: 'The message also contains words more common in legitimate text.',
      score: 100,
      source: SOURCE,
    });
  }

  return buildAnalysisResult({
    riskScore,
    signals,
    reasons,
    advice,
  });
}