import * as whoiser from 'whoiser';
import type { AnalysisResult, RiskSignal } from '@/types/analysisTypes';
import { buildAnalysisResult } from '@/utils/resultBuilder';

const SOURCE = "url" as const;
const DOMAIN_AGE_MONTHS_THRESHOLD = 6; // age < 6 months → suspicious (phishing)

const FEATURE_WEIGHTS = {
  length: 0.15,
  doubleSlash: 0.15,
  ipAddress: 0.15,
  atSymbol: 0.15,
  hyphen: 0.15,
  hashttps: 0.15,
  domainAge: 0.1
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

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Extract root domain for WHOIS (e.g. sub.example.com -> example.com) */
function getRootDomain(hostname: string): string {
  const parts = hostname.split('.').filter(Boolean);
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

/**
 * Check if domain age is suspicious (< 6 months).
 * Uses WHOIS: age = expiration - creation.
 * Returns true if suspicious (phishing), false if legitimate.
 * Returns true on any error (treat as suspicious per reference).
 */
async function isDomainAgeSuspicious(hostname: string): Promise<boolean> {
  if (hasIPAddress('http://' + hostname)) return false; // skip IPs
  const domain = getRootDomain(hostname);
  try {
    const result = await whoiser.domain(domain, { follow: 1, timeout: 5000 });
    let creationStr: string | undefined;
    let expiryStr: string | undefined;
    for (const serverData of Object.values(result)) {
      if (serverData && typeof serverData === 'object' && !Array.isArray(serverData)) {
        const d = serverData as Record<string, unknown>;
        creationStr ??= (d['Created Date'] ?? d['Creation Date'] ?? d['creation date']) as string | undefined;
        expiryStr ??= (d['Expiry Date'] ?? d['Expiration Date'] ?? d['expiry date']) as string | undefined;
        if (typeof creationStr === 'string' && typeof expiryStr === 'string') break;
      }
    }
    if (!creationStr || !expiryStr) return true;
    const creation = creationStr.includes('T') ? new Date(creationStr) : new Date(creationStr + 'T00:00:00Z');
    const expiry = expiryStr.includes('T') ? new Date(expiryStr) : new Date(expiryStr + 'T00:00:00Z');
    if (isNaN(creation.getTime()) || isNaN(expiry.getTime())) return true;
    const ageDays = Math.abs((expiry.getTime() - creation.getTime()) / (1000 * 60 * 60 * 24));
    return ageDays / 30 < DOMAIN_AGE_MONTHS_THRESHOLD;
  } catch {
    return true;
  }
}

export async function analyzeUrl(url: string): Promise<AnalysisResult> {
  const signals: RiskSignal[] = [];
  const reasons: string[] = [];
  const advice: string[] = [];

  // 1. Length: >75 score 100, >62 score 75, >54 score 50
  if (url.length > 75) {
    signals.push({ id: 'very_long_url', description: 'The URL is very long', score: 100, source: SOURCE });
  } else if (url.length > 62) {
    signals.push({ id: 'long_url', description: 'The URL is unusually long', score: 75, source: SOURCE });
  } else if (url.length > 54) {
    signals.push({ id: 'long_url', description: 'The URL is unusually long', score: 50, source: SOURCE });
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

  // 7. Hostname contains "https" (e.g. https-phishing.com)
  if (hasHttpsInHostname(url)) {
    signals.push({
      id: 'https_in_domain',
      description: 'The domain contains "https" which may be used to mislead users',
      score: 100,
      source: SOURCE,
    });
  }

  // 8. Domain age: age < 6 months (expiration - creation) → suspicious
  const hostname = getHostname(url);
  if (hostname && (await isDomainAgeSuspicious(hostname))) {
    signals.push({
      id: 'domain_age',
      description: 'The domain is very new (less than 6 months), common in phishing',
      score: 100,
      source: SOURCE,
    });
  }

  const URL_REASONS: Record<string, string> = {
    very_long_url: 'The URL is very long, which is common in phishing links.',
    long_url: 'The URL is unusually long.',
    too_many_double_slashes: 'The URL contains unusually many double slashes.',
    ip_address_in_url: 'The URL uses an IP address instead of a domain name.',
    at_symbol_in_url: 'The URL contains @ which can hide the real destination.',
    hyphen_in_hostname: 'The domain contains hyphens, common in phishing domains.',
    https_in_domain: 'The domain contains "https" to mimic a secure connection.',
    domain_age: 'The domain is very new; phishing sites often use recently registered domains.',
  };
  const URL_ADVICE: Record<string, string> = {
    very_long_url: 'Avoid clicking long or complex URLs. Type the site address directly.',
    long_url: 'Be cautious with unusually long URLs.',
    too_many_double_slashes: 'Suspicious URL structure. Do not click.',
    ip_address_in_url: 'Legitimate sites use domain names. Verify before clicking.',
    at_symbol_in_url: 'Check what comes after @ - that may be the real host.',
    hyphen_in_hostname: 'Phishing sites often use hyphens. Verify the domain.',
    https_in_domain: 'Real secure sites use https in the protocol, not in the domain name.',
    domain_age: 'Verify the site through official channels; new domains need extra caution.',
  };
  signals.forEach((s) => {
    if (URL_REASONS[s.id]) reasons.push(URL_REASONS[s.id]);
    if (URL_ADVICE[s.id]) advice.push(URL_ADVICE[s.id]);
  });

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