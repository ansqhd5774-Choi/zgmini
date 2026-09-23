// Presentation only: this module never supplies or changes a score.
export function breadthNotice(domain) {
  if (!domain || domain.id !== 'breadth') return null;
  if (domain.status === 'READY' && typeof domain.score === 'number' &&
      Number.isFinite(domain.score) && domain.score >= 0 && domain.score <= 100) return null;
  const missing = Array.isArray(domain.missingFactors) ? domain.missingFactors : [];
  const hasAnyReady = Array.isArray(domain.indicators) &&
    domain.indicators.some(item => item?.status === 'READY' && typeof item?.score === 'number' && Number.isFinite(item.score));
  return {
    badge: hasAnyReady ? '부분 데이터' : '자료 확인 중',
    message: hasAnyReady
      ? '일부 필수 수급 자료가 아직 준비되지 않아 영역 점수를 계산하지 않습니다.'
      : '필수 수급 자료가 준비되지 않아 영역 점수를 제공하지 않습니다.',
    detail: '네 세부 항목을 모두 확인한 경우에만 수급·폭 영역 점수를 계산하며, 결측 항목은 재가중하지 않습니다.',
    missingCount: missing.length,
  };
}
