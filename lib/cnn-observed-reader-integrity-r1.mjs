// Reject conflicting stored observations; corrections belong in the archive writer.
export function addStoredCnnObservation(byTime, observedAt, score) {
  const previous = byTime.get(observedAt);
  if (previous && previous.score !== score) return false;
  if (!previous) byTime.set(observedAt, {observedAt, score});
  return true;
}
