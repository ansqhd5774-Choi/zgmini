# ZGMINI Cloudflare R9 — DNS and Rollback Procedure

## Scope
Preparation only. Do not change Cafe24, Gabia, Cloudflare zone, or Production from this document.

## Current state
- Registrar: Gabia
- Authoritative DNS: Cafe24
- apex zgmini.kr currently points to Sites via CNAME
- www points to apex
- Cloudflare target account already exists
- final Worker Custom Domain requires an active Cloudflare zone

## Pre-cutover capture
Before any nameserver change, record:
- all Cafe24 DNS records
- record type
- name/host
- value/target
- TTL
- MX priority
- TXT verification records
- any subdomains

Save a timestamped before-state.

## Cloudflare zone staging
1. Add zgmini.kr to Cloudflare.
2. Recreate all required current DNS records in Cloudflare.
3. Do not attach the Production Worker Custom Domain yet if the apex CNAME still represents Sites.
4. Confirm the zone-provided Cloudflare nameservers.

## Nameserver cutover
At Gabia, replace the current Cafe24 authoritative nameservers with the Cloudflare-assigned nameservers.

Do not transfer the domain registrar.

## Active-zone verification
Before Worker custom-domain attachment:
- Cloudflare zone status active
- NS resolution returns Cloudflare nameservers
- essential non-web DNS records resolve as expected

## Worker hostname transition
For zgmini.kr:
- remove/replace conflicting apex CNAME as required by the Worker Custom Domain operation
- attach the approved Production Worker Custom Domain
- verify Cloudflare-created DNS target
- verify TLS certificate

For www:
- choose one approved canonical behavior:
  - www -> apex redirect, or
  - www as a second Custom Domain
Do not create both behaviors simultaneously.

## Smoke test
Check from public DNS/HTTPS:
- https://zgmini.kr/
- detail pages
- API
- sitemap
- robots
- certificate
- redirects
- static assets

## Rollback
If cutover fails before the Worker Custom Domain is stable:
1. restore the previous Cafe24 nameservers at Gabia, or restore the previous known-good web DNS target according to the actual failure boundary
2. keep the candidate/target D1 isolated
3. do not point Production writers at an uncertain target
4. verify zgmini.kr returns to the last known working Sites deployment

## Important
DNS rollback speed depends on resolver caching and prior TTL. Nameserver changes are not guaranteed to revert instantly, so the best rollback is to prevent cutover until D1, Worker, TLS, and record inventory are already verified.
