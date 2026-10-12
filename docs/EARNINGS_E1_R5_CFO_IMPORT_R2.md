# E1-R5 CFO local import R2

Status: **SHADOW INPUT RECOVERY ONLY**

Purpose: recover the approved CFO Survey PIT import when browser-saved Richmond Fed HTML exposes the published table as rendered/flattened visible text rather than native `<tr>/<td>` rows.

## Scope

- Keep the existing native HTML-table parser as the first parser path.
- Use a fail-closed flattened-visible-text fallback only when the native parser returns `REVENUE_ROW_NOT_FOUND`.
- Require the requested response quarter, the exact current/next target-year header, the Revenue block, and published mean/median percentage pairs.
- Use the published means from the first two current-quarter year pairs.
- Preserve the original downloaded source bytes and SHA-256 as evidence.
- Preserve the existing `E1-R5-CFO-LOCAL-IMPORT-R1` PIT document contract and append-only behavior.

## Safety

- Network calls: 0
- DB writes: 0
- Production activation: false
- Formula change: false
- Weight change: false
- Scheduler/deployment/DNS changes: none
- E1-R4 remains Production baseline.
