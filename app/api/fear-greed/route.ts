import { cachePublicFeed } from "../../../lib/public-feed-cache.mjs";
import { parseCnnIndex } from "../../../lib/cnn-index.mjs";

const CNN_GRAPH_URL = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";
const CNN_SOURCE_URL = "https://www.cnn.com/markets/fear-and-greed";

const CNN_REQUEST_HEADERS = {
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: CNN_SOURCE_URL,
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
} as const;

async function loadCnn() {
  try {
    const response = await fetch(CNN_GRAPH_URL, {
      headers: CNN_REQUEST_HEADERS,
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`upstream ${response.status}`);

    const index = parseCnnIndex(await response.json());

    return Response.json(
      {
        status: "verified",
        source: "CNN Fear & Greed Index",
        sourceUrl: CNN_SOURCE_URL,
        ...index,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    // U11 Data Honesty:
    // Do not synthesize rating/observedAt/history from a score-only fallback.
    // If the authoritative CNN observation cannot be verified, expose unavailable.
    return Response.json(
      {
        status: "unavailable",
        score: null,
        sourceUrl: CNN_SOURCE_URL,
        message: "CNN 원본 값을 확인할 수 없습니다. 임의 점수·등급·날짜·이력으로 대체하지 않습니다.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export const GET = cachePublicFeed(loadCnn);
