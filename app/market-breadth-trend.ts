/**
 * One trading week's trailing SMA of observed daily net breadth in percentage points.
 * Never extrapolate, backfill, or bridge a long interruption in the source history.
 */
export function trailingFiveSessionBreadthMean(points: ReadonlyArray<{date: string; value: number}>): Map<string, number> {
  const trend = new Map<string, number>();
  const observations = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let recent: number[] = [];
  let priorTime: number | null = null;
  const maxObservationGapMs = 4 * 86_400_000; // normal weekends and one-day market holidays

  for (const observation of observations) {
    const time = Date.parse(`${observation.date}T00:00:00Z`);
    if (!Number.isFinite(time) || !Number.isFinite(observation.value)) {
      recent = [];
      priorTime = null;
      continue;
    }
    if (priorTime !== null && time === priorTime) {
      trend.delete(observation.date);
      recent = [];
      continue;
    }
    if (priorTime !== null && (time <= priorTime || time - priorTime > maxObservationGapMs)) recent = [];
    recent.push(observation.value);
    if (recent.length > 5) recent.shift();
    if (recent.length === 5) trend.set(observation.date, recent.reduce((sum, value) => sum + value, 0) / 5);
    priorTime = time;
  }
  return trend;
}
