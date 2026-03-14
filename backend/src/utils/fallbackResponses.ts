/** Mock and fallback responses for stable API behavior during errors or demos. */
import type { AnalysisResult } from '@/types/analysisTypes';

/** Fallback when analysis fails (e.g. service error, missing data) */
export const FALLBACK_ANALYSIS: AnalysisResult = {
  riskScore: 50,
  riskLevel: 'medium',
  signals: [
    {
      id: 'analysis_unavailable',
      description: 'Analysis could not be completed. Results may be incomplete.',
      score: 50,
      source: 'url',
    },
  ],
  reasons: [
    'The analysis service encountered an error or incomplete data.',
    'Please try again later or verify the input manually.',
  ],
  advice: [
    'Do not take action based on incomplete results.',
    'Verify through official channels before proceeding.',
  ],
};

/** Mock response for text analysis (e.g. demo mode) */
export const MOCK_TEXT_ANALYSIS: AnalysisResult = {
  riskScore: 0,
  riskLevel: 'low',
  signals: [],
  reasons: ['Mock analysis: No suspicious content detected.'],
  advice: ['Continue reviewing the message carefully for any suspicious content.'],
};

/** Mock response for URL analysis (e.g. demo mode) */
export const MOCK_URL_ANALYSIS: AnalysisResult = {
  riskScore: 0,
  riskLevel: 'low',
  signals: [],
  reasons: ['Mock analysis: No suspicious URL patterns detected.'],
  advice: ['Verify the URL through official channels before clicking.'],
};

/** Default fallback for text when analysis fails */
export function getTextFallback(error?: unknown): AnalysisResult {
  return {
    ...FALLBACK_ANALYSIS,
    signals: [
      {
        id: 'text_analysis_failed',
        description: 'Text analysis could not be completed.',
        score: 50,
        source: 'message',
      },
    ],
    reasons: [
      'The text analysis service encountered an error.',
      error instanceof Error ? error.message : 'Unknown error occurred.',
    ],
    advice: [
      'Please try again later.',
      'Do not rely on incomplete results for security decisions.',
    ],
  };
}

/** Default fallback for URL when analysis fails */
export function getUrlFallback(error?: unknown): AnalysisResult {
  return {
    ...FALLBACK_ANALYSIS,
    signals: [
      {
        id: 'url_analysis_failed',
        description: 'URL analysis could not be completed.',
        score: 50,
        source: 'url',
      },
    ],
    reasons: [
      'The URL analysis service encountered an error.',
      error instanceof Error ? error.message : 'Unknown error occurred.',
    ],
    advice: [
      'Please verify the URL manually before clicking.',
      'Do not proceed if the source is unknown.',
    ],
  };
}
