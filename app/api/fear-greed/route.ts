import { parseCnnIndex } from "../../../lib/cnn-index.mjs";

export async function GET() {
  const sourceUrl = "https://www.cnn.com/markets/fear-and-greed";
  try {
    const response = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const index = parseCnnIndex(await response.json());
    return Response.json({ status: "verified", source: "CNN Fear & Greed Index", sourceUrl, ...index }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "unavailable", score: null, sourceUrl,
      message: "CNN 원본 값을 확인할 수 없습니다. 임의 점수로 대체하지 않습니다." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
