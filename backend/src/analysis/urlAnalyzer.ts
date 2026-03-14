import type { AnalysisResult, RiskSignal } from '@/types/analysisTypes';
import { buildAnalysisResult } from '@/utils/resultBuilder';

const SOURCE = "url" as const;

const FEATURE_WEIGHTS = {
  length: 0.15,
  doubleSlash: 0.15,
  ipAddress: 0.15,
  atSymbol: 0.15,
  hyphen: 0.15,
  hashttps: 0.15,
  domainAge: 0.2
};

// Helper Function
function hasIPAddress(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

function hasAtSymbol(url: string): boolean {
  return url.includes("@");
}

function hasHyphenInHostname(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname.includes("-");
  } catch {
    return false;
  }
}

function hasHttpsInHostname(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes("https");
  } catch {
    return false;
  }
}

export function analyzeUrl(url: string): AnalysisResult {
  const signals: RiskSignal[] = [];
  const reasons: string[] = [];
  const advice: string[] = [];

  // Length
  if (url.length > 75) {
    signals.push({
      id: 'very_long_url',
      description: 'The URL is very long',
      score: 100,
      source: SOURCE,
    });

  } else if (url.length > 62) {
    signals.push({
      id: 'long_url',
      description: 'The URL is unusually long',
      score: 75,
      source: SOURCE,
    });

  } else if (url.length > 54) {
    signals.push({
      id: 'long_url',
      description: 'The URL is unusually long',
      score: 50,
      source: SOURCE,
    });
  } else {
    signals.push({
      id: 'long_url',
      description: 'The URL is unusually long',
      score: 0,
      source: SOURCE,
    });
  }

  // DoubleSlash Count
  const doubleSlashCount = (url.match(/\/\//g) || []).length;

  if (doubleSlashCount > 7) {
    signals.push ({
      id: "too_many_double_slashes",
      description: "URL contains unusually many double slashes",
      score: 100,
      source: SOURCE
    });
  }

  // Ip Address
  if (hasIPAddress(url)) {
    signals.push({
      id: "ip_address_in_url",
      description: "The URL uses an IP address instead of a domain name",
      score: 100,
      source: SOURCE,
    });
  }

  // Including @
  if (hasAtSymbol(url)) {
    signals.push({
      id: "at_symbol_in_url",
      description: "The URL contains an @ symbol, which can be used to mislead users",
      score: 100,
      source: SOURCE,
    });
  }

  // Hostname has hyphen
  if (hasHyphenInHostname(url)) {
    signals.push({
      id: "hyphen_in_hostname",
      description: "The domain name contains hyphens, which are common in phishing domains",
      score: 100,
      source: SOURCE,
    });
  }

  // Hostname has https
  if (hasHttpsInHostname(url)) {
    signals.push({
      id: "https_in_domain",
      description: '',
      score: 100,
      source: SOURCE,
    });
  }

  // Age of Domain

  // Weight Sum
  const riskScore = signals.reduce((sum, signal) => {
    const weight =
      signal.id === "very_long_url" || signal.id === "long_url"
        ? FEATURE_WEIGHTS.length
        : signal.id === "too_many_double_slashes"
        ? FEATURE_WEIGHTS.doubleSlash
        : signal.id === "ip_address_in_url"
        ? FEATURE_WEIGHTS.ipAddress
        : signal.id === "at_symbol_in_url"
        ? FEATURE_WEIGHTS.atSymbol
        : signal.id === "hyphen_in_hostname"
        ? FEATURE_WEIGHTS.hyphen
        : signal.id === "https_in_domain"
        ? FEATURE_WEIGHTS.hashttps
        : signal.id === "domain_age"
        ? FEATURE_WEIGHTS.domainAge
        : 0;
    return sum + signal.score * weight;
  }, 0);

  return buildAnalysisResult({
    riskScore,
    signals,
    reasons,
    advice,
  });
}