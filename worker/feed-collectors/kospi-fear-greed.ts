import {savedJson} from "../public-feed-store.mjs";
export async function collect(store: any, now: number) {
  const sourceUrl = "https://kospi.feargreedchart.com/api-docs";
  try {
    const response = await fetch("https://kospi.feargreedchart.com/api/?action=kospi", {
      headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const data = await savedJson(response, store, "kospi-fear-greed", now) as { score?: number; label?: string; updated?: string; kospi?: { level?: number; change_pct?: number }; components?: unknown[] };
    if (typeof data.score !== "number" || data.score < 0 || data.score > 100 || typeof data.updated !== "string") throw new Error("invalid response");
    return Response.json({ status: "verified", source: "KOSPI Fear & Greed Index", sourceUrl, score: data.score, rating: data.label ?? "", updatedAt: data.updated, kospi: data.kospi ?? null, components: data.components ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable", score: null, sourceUrl, message: "한국 시장 지수를 확인할 수 없습니다." }, { status: 503 });
  }
}
