# ZGMINI Iran R1.3 — blocked-source recovery research (2026-10-09)

Status: **RESEARCH ONLY / NOT IN ACTIVE COLLECTION**. This change has no new provider calls, scoring modification, schema migration, schedule registration, Cloudflare deployment, D1 publication or access-control bypass.

## Observed blockers
- PC local sources: UKMTO /recent-incidents HTTP 403; GDELT lastupdate metadata HTTP 200; DOC discovery previously HTTP 429 with cooldown; hormuz.now AIS 8 sampled days, commercial provenance rights and daily quality still unverified.
- Existing PC run yielded PENDING/null (D/C/M/H/N missing), publication NOT_SUBMITTED. A successful metadata request does **not** create event coverage or READY.

## Alternatives supported by official public documentation
1. **UKMTO 403**: keep UKMTO on SOURCE_FAILED, do not retry through VPN/rotating proxies or hidden endpoints. UKMTO publicly documents Warnings, Advisories and Weekly Reports, but automated retrieval of the complete incident list has not passed. Do not transform an empty browser or failed page into 'zero attacks'.
   - Official UKMTO products: https://www.ukmto.org/ukmto-products
   - Official terms: https://www.ukmto.org/terms-and-conditions
2. **U.S. MARAD independent primary source**: https://www.maritime.dot.gov/msci-alerts contains incident/security alert listings; https://www.maritime.dot.gov/msci-advisories contains risk and navigation advisories. The MARAD portal distinguishes the two. At observation time, the Alerts page showed **no active alerts**; this is **not** evidence that no attacks occurred and cannot replace UKMTO 28-day observation coverage by itself.
   - Portal documentation: https://www.maritime.dot.gov/msci
   - Alerts: https://www.maritime.dot.gov/msci-alerts
   - Advisories: https://www.maritime.dot.gov/msci-advisories
3. **GDELT DOC 429**: preserve existing Retry-After / six-hour minimum cooldown and discovery cursor. The original GDELT Project publishes separate 15-minute Events/Mentions/GKG ZIP exports linked in https://data.gdeltproject.org/gdeltv2/lastupdate.txt. `parseGdeltArchiveManifest` validates the official manifest shape, 3 matching timestamp/host/file types, and refuses to promote metadata to verified incidents. Full archive download, bounded decompression, article/incident deduplication and independent fact checks are still required before candidate adoption.
   - Data: https://gdeltproject.org/data.html
   - Original GDELT Project commercial-use terms: https://www.gdeltproject.org/about.html (attribution and link required).
   - **Do not substitute GDELT Cloud**: its own separate service/plan/redistribution terms apply; the original open datasets and GDELT Cloud products are different.
4. **hormuz.now AIS**: retain existing allowlisted self-generated live daily observations only. IMF fields and indirect derivatives remain excluded. Its CC BY 4.0 notice does not by itself identify/prove independent upstream AIS redistribution rights. Until upstream terms and completeness tests pass, H remains PENDING.
   - Source licensing: https://hormuz.now/data

## Recovery decision matrix
- UKMTO 403: official MARAD Alerts discovery + corroboration **candidate only**; UKMTO warnings/weekly reports only if a permitted public access route actually works. No incident totals inferred.
- GDELT DOC 429: wait per cooldown, optionally assess original GDELT Events archive **separately**; do not rapidly retry DOC or use a different IP to evade 429.
- Any commercial licence conflict: exclude that data and retain PENDING.
- Source returns 200 but empty/partial, or a page has no active alerts: preserve unknown coverage, not zero.
- New candidate source activation requires review of automatic access, commercial terms, observation period, event semantics and checkpoint behavior; do not automatically call it from existing scheduled collectors until approved.
- Keep existing D/C/M/H/N weights and frozen source-stored calculation contract.

## Implemented research artifacts
- `scripts/iran-progress/source-recovery.mjs`: pure advisory functions for blocked-source plans, MARAD index triage and original GDELT Events archive manifest parsing.
- `tests/iran-progress-source-recovery.test.mjs`: malformed host, mixed vintage, calendar validity, no-alerts-not-zero, 403/429 and no auto-activation scenarios.
- Neither module is imported by the active collector. **There is no alternative-provider runtime PASS and no full source replacement.**


## Candidate parsers — implemented, not activated

- `scripts/iran-progress/gdelt-events-archive.mjs` decodes an official **single-entry 15-minute Events ZIP** using bounded memory and compressed/uncompressed size checks, ZIP structural validation, CRC-32 and official manifest MD5. Original GDELT CSV tab records must have 61 columns; event day and 15-minute discovery timestamp stay separate. A missing leading MD5 zero can be normalized only after computing the actual archive checksum. Results are `CANDIDATES_ONLY` with `eventAt:null`, `attackCount:null` and `coverageVerified:false`. GDELT event IDs deduplicate rows but do not prove independently verified real-world attacks.
- `scripts/iran-progress/marad-alert-candidates.mjs` parses linked public **Active/Cancelled Alerts** only when the government listing shape matches. Extracted entries are still official *notices*, not a complete attack count, and are never auto-promoted into military or maritime observations. An empty active listing explicitly returns `NO_ACTIVE_ALERTS_LISTED`, not `NO_ATTACKS`.
- Bounded archive retrieval, 28-day archive checkpoint/backfill, automatic secondary fact-source corroboration and commercial-rights verification remain **not implemented or not validated**. Neither parser is imported into the active PC runner. New provider calls and 6-hour installation have **not** been enabled.
- The official GDELT 2.0 Events codebook defines event-day, DATEADDED and SOURCEURL separately: https://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf . Its official terms allow commercial use of original open datasets with GDELT citation: https://gdeltproject.org/about.html .
- MARAD public Alerts listing: https://www.maritime.dot.gov/msci-alerts . The observed public listing has no active Alerts while historical Cancelled Alerts remain visible; this cannot establish event completeness.

## Activation prerequisites
1. Independently verify MARAD Alerts' structure, event-level coverage and normal read path. Treat advisories as risk context, not incident list.
2. Build bounded GDELT ZIP reads and deterministic event-candidate parsing, validate error/backlog/checkpoints and actual coverage, then use official corroboration to verify events; enforce provider rate limits.
3. Check legal/attribution provenance for actual stored fields, including AIS upstream.
4. Replay a real 28-day window without turning unavailable/missing into zero; keep null/PENDING until the original R1.3 contract is satisfied.
5. Only after explicit source activation approval: integrate into the PC collector and test PC local storage/readback. D1 publish, scheduler and Git deployment remain separately gated.
