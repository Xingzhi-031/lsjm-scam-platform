import path from 'path';

export function resolvePath(relativePath: string): string {
  return path.resolve(__dirname, '..', relativePath);
}

// Text analysis rule files
export const RISK_LEXICON_PATH = resolvePath('rules/risk_lexicon.json');
export const SAFE_LEXICON_PATH = resolvePath('rules/safe_lexicon.json');
export const STOPWORDS_PATH = resolvePath('rules/stopwords_custom.json');
export const BLACKLIST_PATH = resolvePath('rules/blacklist_words.json');
export const SCORING_CONFIG_PATH = resolvePath('rules/scoring_config.json');