// Compatibility entrypoint: the canonical W05 read-only audit logic lives
// in the already authorized Writer B lib/ path. No executable side effects.
export * from '../../lib/w05-audit/five-key-inplace-readback-prework-r12.mjs';
