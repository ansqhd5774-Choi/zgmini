/**
 * R31 research-only catalogue bridge. Category membership is read afresh from
 * the two public ZGMINI APIs; never manufacture missing sectors or themes.
 * Market-search phrases are explicit PROXY candidates, not claims that an
 * external forecast measures an entire GICS sector or ETF theme.
 */
export const SECTOR_FEED = 'https://zgmini.kr/api/sector-fear-greed';
export const THEME_FEED = 'https://zgmini.kr/api/theme-fear-greed';

export const SECTOR_TOPICS = Object.freeze({
  technology: ['정보기술', 'information technology'],
  communication: ['커뮤니케이션', 'telecommunications services'],
  discretionary: ['임의소비재', 'consumer discretionary'],
  industrials: ['산업재', 'industrial machinery'],
  financials: ['금융', 'financial services'],
  utilities: ['유틸리티', 'utilities'],
  healthcare: ['헬스케어', 'healthcare services'],
  materials: ['소재', 'advanced materials'],
  energy: ['에너지', 'energy'],
  staples: ['필수소비재', 'consumer staples'],
  realEstate: ['부동산', 'real estate'],
});

export const THEME_TOPICS = Object.freeze({
  '로봇·자동화': 'robotics and automation',
  '클라우드·SaaS': 'cloud computing',
  '자율주행': 'autonomous vehicle',
  '원전·SMR': 'nuclear reactor',
  '방산': 'defense',
  '핀테크': 'fintech',
  '사이버보안': 'cyber security',
  '바이오·신약': 'biotechnology services',
  '데이터센터·전력': 'data center',
  '우주·위성': 'satellite',
  '우주·위성통신': 'satellite communications',
});

function unique(items) { return new Set(items).size === items.length; }

export function researchRowsFromFeeds(sector, theme) {
  const rows = [];
  const errors = [];
  if (sector) {
    if (sector.status !== 'READY' || !Array.isArray(sector.sectors) ||
        !unique(sector.sectors.map(x => x?.id))) {
      errors.push('SECTOR_FEED_INVALID');
    } else {
      for (const row of sector.sectors) {
        const [name, keyword] = SECTOR_TOPICS[row.id] || [row.id, null];
        rows.push({ type: 'SECTOR', id: row.id, name, keyword,
          scope: 'RESEARCH_PROXY_NOT_GICS_SECTOR_GROWTH' });
      }
    }
  } else errors.push('SECTOR_FEED_UNAVAILABLE');

  if (theme) {
    if (theme.status !== 'READY' || !Array.isArray(theme.themes) ||
        !unique(theme.themes.map(x => x?.theme))) {
      errors.push('THEME_FEED_INVALID');
    } else {
      for (const row of theme.themes) {
        const name = row.theme;
        rows.push({ type: 'THEME', id: name, name,
          keyword: THEME_TOPICS[name] || null,
          scope: 'RESEARCH_PROXY_NOT_ENTIRE_ETF_THEME_GROWTH' });
      }
    }
  } else errors.push('THEME_FEED_UNAVAILABLE');
  return { rows, errors };
}

export async function fetchResearchUniverse({ fetchFn = fetch } = {}) {
  const read = async (url) => {
    const response = await fetchFn(url, {
      signal: AbortSignal.timeout(12_000), headers: { accept: 'application/json' }
    });
    if (!response.ok || new URL(response.url || url).origin !== 'https://zgmini.kr')
      throw new Error('ZGMINI_FEED_UNAVAILABLE');
    return response.json();
  };
  const responses = await Promise.allSettled([read(SECTOR_FEED), read(THEME_FEED)]);
  const output = researchRowsFromFeeds(
    responses[0].status === 'fulfilled' ? responses[0].value : null,
    responses[1].status === 'fulfilled' ? responses[1].value : null
  );
  return output;
}
