// Compatibility entrypoint: the canonical W05 read-only audit logic lives
// in the already authorized Writer B lib/ path. No executable side effects.
export * from '../../lib/w05-audit/compare-five-public-readbacks-r1.mjs';
