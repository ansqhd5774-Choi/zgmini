import {savedJson} from "../public-feed-store.mjs";
export async function collect(store: any, now: number) {
  try {
    const response = await fetch("https://kospi.feargreedchart.com/api/?action=kospi-history", { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("upstream unavailable");
    const data = await savedJson(response, store, "kospi-history", now) as { rows?: { date: string; score: number | null }[] };
    if (!Array.isArray(data.rows)) throw new Error("invalid history");
    const rows = data.rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && typeof row.score === "number" && Number.isFinite(row.score) && row.score >= 0 && row.score <= 100).sort((a,b) => a.date.localeCompare(b.date));
    return Response.json({ rows }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ rows: [], message: "기간별 데이터 없음" }, { status: 503 });
  }
}
