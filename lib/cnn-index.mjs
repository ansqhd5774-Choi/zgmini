// Only the publisher's composite score is accepted; economic series are not substitutes.
export function parseCnnIndex(payload, now = Date.now()) {
  const item = payload?.fear_and_greed;
  const score = item?.score;
  const date = typeof item?.timestamp === "string" ? Date.parse(item.timestamp) : NaN;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100 ||
      !Number.isFinite(date) || date > now + 300000 || now - date > 7 * 86400000) {
    throw new Error("Invalid or outdated CNN observation");
  }
  const rating = String(item.rating).toLowerCase();
  const labels = { "extreme fear": "극심한 공포", fear: "공포", neutral: "중립", greed: "탐욕", "extreme greed": "극심한 탐욕" };
  if (!Object.hasOwn(labels, rating)) throw new Error("Invalid CNN rating");
  const historySource = payload?.fear_and_greed_historical?.data ?? payload?.fear_and_greed_historical;
  const history = Array.isArray(historySource) ? historySource.flatMap((point) => {
    const timestamp = typeof point?.timestamp === "string" ? point.timestamp : typeof point?.date === "string" ? point.date : null;
    const value = typeof point?.score === "number" ? point.score : typeof point?.value === "number" ? point.value : null;
    if (!timestamp || typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) return [];
    const pointDate = Date.parse(timestamp);
    return Number.isFinite(pointDate) && pointDate <= now + 300000 ? [{ timestamp, score: value }] : [];
  }) : [];
  return { score, rating: labels[rating], observedAt: new Date(date).toISOString(), history };
}
