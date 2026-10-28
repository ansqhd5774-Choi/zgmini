/**
 * R78: archived R63 *official report URL addresses only* for Stage04 discovery.
 * Never store historical CAGR, model verdict, mean, forecast period, or scores here.
 * Every address is an unverified hint; fresh official GET + unchanged Ollama
 * market-identity, period, conflict and DIRECT validations are mandatory.
 * R63 source: recovered-cagr-r63-r66/CAGR_R63_21_SOURCE_MATRIX_20261027.md
 */
export const R63_ADDRESS_HINTS = Object.freeze({
  "information technology": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report", SkyQuest: "https://www.skyquestt.com/report/it-services-market", Precedence: null }),
  "telecommunications services": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/telecom-global-market-report", SkyQuest: "https://www.skyquestt.com/report/telecommunication-market", Precedence: "https://www.precedenceresearch.com/telecommunication-market" }),
  "consumer discretionary": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/passenger-car-global-market-report", SkyQuest: "https://www.skyquestt.com/report/passenger-cars-market", Precedence: "https://www.precedenceresearch.com/passenger-cars-market" }),
  "industrial machinery": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/industrial-machinery-global-market-report", SkyQuest: "https://www.skyquestt.com/report/industrial-machinery-market", Precedence: "https://www.precedenceresearch.com/machine-tools-market" }),
  "financial services": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/financial-services-global-market-report", SkyQuest: "https://www.skyquestt.com/report/retail-banking-market", Precedence: "https://www.precedenceresearch.com/retail-banking-market" }),
  "utilities": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/utilities-global-market-report", SkyQuest: "https://www.skyquestt.com/report/electricity-transmission-and-distribution-market", Precedence: "https://www.precedenceresearch.com/power-transmission-and-distribution-market" }),
  "healthcare services": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/healthcare-service-global-market-report", SkyQuest: "https://www.skyquestt.com/report/healthcare-services-market", Precedence: "https://www.precedenceresearch.com/hospital-services-market" }),
  "advanced materials": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/advanced-materials-global-market-report", SkyQuest: "https://www.skyquestt.com/report/advanced-materials-market", Precedence: "https://www.precedenceresearch.com/advanced-materials-market" }),
  "energy": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/oil-and-gas-global-market-report", SkyQuest: "https://www.skyquestt.com/report/oil-and-gas-market", Precedence: null }),
  "consumer staples": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/staple-food-global-market-report", SkyQuest: "https://www.skyquestt.com/report/fmcg-market", Precedence: null }),
  "real estate": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/real-estate-global-market-report", SkyQuest: "https://www.skyquestt.com/report/real-estate-market", Precedence: "https://www.precedenceresearch.com/real-estate-market" }),
  "robotics and automation": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/robotics-and-automation-market-global-report", SkyQuest: "https://www.skyquestt.com/report/robotics-market", Precedence: "https://www.precedenceresearch.com/robotics-technology-market" }),
  "cloud computing": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/cloud-computing-global-market-report", SkyQuest: "https://www.skyquestt.com/report/cloud-computing-market", Precedence: "https://www.precedenceresearch.com/cloud-computing-market" }),
  "autonomous vehicle": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/autonomous-vehicle-global-market-report", SkyQuest: "https://www.skyquestt.com/report/autonomous-vehicles-market", Precedence: "https://www.precedenceresearch.com/autonomous-vehicle-market" }),
  "nuclear reactor": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/nuclear-reactor-global-market-report", SkyQuest: "https://www.skyquestt.com/report/nuclear-reactor-construction-market", Precedence: "https://www.precedenceresearch.com/nuclear-power-market" }),
  "defense": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/defense-global-market-report", SkyQuest: "https://www.skyquestt.com/report/defense-electronics-market", Precedence: "https://www.precedenceresearch.com/defense-electronics-market" }),
  "fintech": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/fintech-blockchain-global-market-report", SkyQuest: "https://www.skyquestt.com/report/fintech-blockchain-market", Precedence: "https://www.precedenceresearch.com/fintech-blockchain-market" }),
  "cyber security": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/cybersecurity-global-market-report", SkyQuest: "https://www.skyquestt.com/report/cyber-security-market", Precedence: "https://www.precedenceresearch.com/cyber-security-market" }),
  "biotechnology services": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/biotechnology-services-global-market-report", SkyQuest: "https://www.skyquestt.com/report/biotechnology-market", Precedence: "https://www.precedenceresearch.com/biotechnology-market" }),
  "data center": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/data-center-global-market-report", SkyQuest: "https://www.skyquestt.com/report/data-center-market", Precedence: "https://www.precedenceresearch.com/data-center-market" }),
  "satellite": Object.freeze({ TBRC: "https://www.thebusinessresearchcompany.com/report/satellites-global-market-report", SkyQuest: "https://www.skyquestt.com/report/satellite-market", Precedence: "https://www.precedenceresearch.com/satellite-market" }),
});

const TRUSTED_REPORT_HOSTS = Object.freeze({
  TBRC: 'www.thebusinessresearchcompany.com',
  SkyQuest: 'www.skyquestt.com',
  Precedence: 'www.precedenceresearch.com'
});

/** No wildcard sectors, no BRI, no fallback cross-publisher addresses. */
export function officialAddressHint(keyword, publisherId) {
  const normalized = String(keyword ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const url = R63_ADDRESS_HINTS[normalized]?.[publisherId];
  if (!url || !Object.hasOwn(TRUSTED_REPORT_HOSTS, publisherId)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== TRUSTED_REPORT_HOSTS[publisherId] ||
        parsed.username || parsed.password || parsed.port ||
        !parsed.pathname.startsWith(publisherId === 'Precedence' ? '/' : '/report/')) return null;
    return url;
  } catch { return null; }
}


/**
 * R79: R63 *report market* is not always the broad 21-topic label.
 * Recover the publisher-specific keyword from the original approved URL,
 * never from a guessed modern slug or an archived numerical result.
 */
export function officialResearchMarketKeyword(topicKeyword, publisherId) {
  const url = officialAddressHint(topicKeyword, publisherId);
  if (!url) return null;
  const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1)?.toLowerCase() || '';
  const name = slug.replace(/(?:-global-market-report|-market-global-report|-market-report|-global-report|-market)$/, '')
    .replace(/-/g, ' ').trim();
  return name || null;
}
