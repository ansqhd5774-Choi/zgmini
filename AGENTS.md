# ZGMINI Codex Working Rules

## 1. Source of truth
- GitHub latest `main` is the authoritative source.
- Record the latest remote `main` SHA before work begins.
- Record the work-base SHA.
- Re-check remote `main` before writing or merging changes.
- If `main` changed, evaluate source drift first.
- Never overwrite newer remote work with a stale local/workspace copy.
- Keep changed files limited to the minimum scope required by the user request.
- Completed source changes must be reflected in GitHub `main` and the final commit SHA must be recorded as Evidence.

## 2. Production platform and deployment
- ZGMINI Production uses Cloudflare Workers / D1 / Cron as the runtime architecture.
- This repository's checked-in deployment contract is OpenAI Sites based:
  `GitHub main -> Sites remote builder -> Saved Version -> exact Version deploy -> Production verification`.
- `.openai/hosting.json` is the hosting contract and currently declares the Sites project plus D1 binding `DB`.
- The repository README explicitly states that the remote Sites builder runs `npm run build` against the pushed commit and that this starter does not use `wrangler.jsonc`.
- Do not assume a GitHub Actions workflow, Cloudflare GitHub App check-run, or direct Cloudflare Git integration exists merely because the runtime is Cloudflare.
- GitHub `main` and the Sites source repository may use different commit namespaces. Do not require raw SHA equality across the two repositories unless same-repository identity has been proven for that run.
- Before Save/Deploy, prove source parity from the latest GitHub `main` into the Sites source using the strongest available evidence: exact synchronized source, scoped file/blob hashes, tree/archive manifest, or another explicit cross-repository parity check.
- Production identity must record the GitHub `main` SHA, the Sites Saved Version source identity, the deployed version, and the deployment ID when Sites access is available.
- Save Version and Deploy are separate gates. Never deploy a version until its source has been proven to represent the intended GitHub `main` content for the requested scope.
- Poll only the exact deployment ID returned by the deploy call; do not start a second deployment because the first is still building.
- Do not bypass GitHub `main` or the approved Sites Save/Deploy path with a direct Cloudflare deployment unless the user explicitly approves it.
- Build success is not Production success.
- After a source change that affects Production, verify deployment identity/status, required Production HTTP/API behavior, and the actual Production UI when applicable.

## 3. Data and formula contract
- Cloudflare D1 is the default database.
- Do not replace D1 with Supabase or duplicate ZGMINI data into Supabase without explicit user approval.
- Collection/API lanes are for storing provider data.
- Approved formulas must use stored data, not provider responses as direct formula inputs.
- Preserve existing history-storage rules.
- Do not change an approved formula, weighting, normalization, indicator contract, or data structure without explicit user approval.
- When a task is only UI, observability, deployment, or infrastructure work, formula behavior must remain unchanged.

## 4. Runtime diagnosis
- For Production runtime failures, use this priority:
  1. Sites worker/runtime logs and Sites deployment status when the Sites tools are available
  2. Cloudflare runtime evidence when a direct Cloudflare read path is available
  3. PostHog production behavior/error evidence
  4. GitHub source investigation
- Use Sites D1 read tools (`sites.read_database_overview`, `sites.read_database_table_rows`, or current equivalents) for read-only D1 verification when available; do not infer D1 health from public HTTP alone.
- Do not treat a successful build as proof that Runtime is healthy.
- Keep test events separate from real Production events.
- Do not put secrets or sensitive user data into logs, analytics, commits, or Evidence.

## 5. UI and design
- When an authoritative Figma source exists, prefer exact Figma values over screenshot estimation.
- Verify implemented UI against the actual Production screen.
- Do not call Figma repeatedly when valid prior Evidence already establishes the needed value.
- For small CSS or functional changes with no design-source dependency, do not introduce unnecessary Figma work.

## 6. Libraries and documentation
- For version-dependent libraries, SDKs, APIs, Cloudflare, Wrangler, D1, React, Next/Vinext, Drizzle, and similar tools, use current documentation (Context7 when appropriate) instead of guessing from memory.
- Do not introduce deprecated or speculative API usage.

## 7. Browser and external tools
- Use free/static/API methods when they are sufficient.
- TinyFish Agent/Browser is DEFAULT_DENY because it is metered and quota-limited.
- Do not use TinyFish Agent/Browser for ordinary public-page checks, HTTP/API verification, static DOM inspection, or any task that GitHub, Sites read tools, normal web search, Context7, official docs, or another free connector can complete.
- TinyFish Agent/Browser may be used only when login, clicking/input, JavaScript-only state, or a real-browser-only failure is essential and free alternatives have been exhausted.
- Unless the user explicitly requested TinyFish for that task, obtain user approval immediately before starting a metered Agent/Browser run.
- Default to one run. If a run times out or errors after submission, inspect the same run state; do not automatically start a replacement run.
- Reuse an existing valid profile instead of creating duplicate profiles.
- A TinyFish quota/wallet limit is not a project BLOCKER when the same goal can proceed through a free path.
- Do not use Remote Desktop Commander for work GitHub/Codex can perform directly.
- RDC is reserved for user-PC-only files, local CMD-only state, locally installed GUI software, or other machine-local dependencies.
- Do not create paid resources, start subscriptions, buy credits, or create ongoing billable infrastructure without user approval.

## 8. Windows local execution
- Windows local instructions are CMD-only unless the user explicitly approves otherwise.
- Do not substitute PowerShell or WSL.
- Follow the active ZGMINI CMD work standard when a task requires local execution.

## 9. Cost controls
- Prefer GitHub, Sites read-only capabilities, Cloudflare free capabilities, PostHog free capabilities, Context7, ordinary web search, official docs, and static/API verification when sufficient.
- Avoid metered TinyFish Agent/Browser, Firecrawl credits, DigitalOcean, paid APIs, or other billable paths when an equivalent free method is available.
- If a paid/quota-limited tool is already exhausted, switch to an approved free fallback instead of repeatedly probing the exhausted service.
- Ask for approval immediately before a new paid/billable resource, wallet/credit top-up, subscription change, or irreversible external change.

## 10. Work execution and reporting
- Continue independent work lanes without stopping for unnecessary status reports.
- Stop only for a real blocker, required user approval, authentication/MFA/CAPTCHA, paid-resource creation, destructive/irreversible action, or a decision that would change an approved contract.
- Reuse valid existing Evidence instead of repeating the same investigation.
- Never report an action as executed unless it was actually executed.
- Distinguish clearly:
  - source modified
  - GitHub main reflected
  - Sites version saved
  - Sites deployment succeeded
  - Cloudflare/runtime healthy
  - Runtime verified
  - Production UI verified

## 11. Failure handling
For an execution failure, record:
1. last PASS stage
2. first FAIL stage
3. exact error code/message
4. root cause
5. minimum fix applied
6. retest result

Do not stack temporary workarounds indefinitely. Fix the root cause when it is within the available tools and approved scope.

## 12. Production completion gate
A Production-affecting task is complete only when every applicable item below passes:
- latest GitHub `main` reflected
- source drift = none
- requested source change = PASS
- GitHub main reflection = PASS
- Sites source parity with the intended GitHub `main` scope = PASS
- Sites Saved Version = PASS
- Sites deployment = PASS
- required Production HTTP/API = PASS
- required data store/read = PASS when applicable
- approved formula/data contract = unchanged
- actual Production UI = PASS when applicable
- runtime errors = none, or only errors proven unrelated to the requested task
- requested user-facing feature/behavior = PASS

Do not mark the task complete when any required gate remains FAIL, BLOCKED, or NOT_RUN.
