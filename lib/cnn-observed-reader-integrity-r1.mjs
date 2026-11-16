// Reject conflicting stored observations; corrections belong in the archive writer.
export function addStoredCnnObservation(byTime, observedAt, score) {
  const previous = byTime.get(observedAt);
  if (previous && previous.score !== score) return false;
  if (!previous) byTime.set(observedAt, {observedAt, score});
  return true;
}


// PC check instants are *not* CNN observation instants. Repeated checkedAt
// must not silently overwrite the originally verified source timestamp/score.
export function addStoredCnnVerifiedCheck(byTime, checkedAt, sourceObservedAt, score) {
  const previous = byTime.get(checkedAt);
  if (previous && (previous.sourceObservedAt !== sourceObservedAt || previous.score !== score))
    return false;
  if (!previous) byTime.set(checkedAt, {checkedAt, sourceObservedAt, score});
  return true;
}
