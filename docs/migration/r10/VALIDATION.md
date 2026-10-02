R10_STATUS
FAIL. PR #6 not merged. The npm build command exits0, but clean artifacts violate the mandatory9 static-shell contract.

BASE_SHA
e130b9232dc2810174a699ed376f85174d89ea3f. Remote base matches request. Local checkout initially28cb1b1 was clean and fast-forwarded to this authoritative base before validation. No remote base drift.

PR_STATUS
#6 OPEN/DRAFT, merged=false. Head377629fe4baa4b34cd709073eff2336d3b5180b3. Only package.json and CLOUDFLARE_BUILDS_CONFIG.md changed.

CLEAN_INSTALL
PASS. Isolated clean clone, npm ci exit0,673 locked packages. Node24.19.0 >=22.13. Lockfile unchanged. No Sites/Cloudflare credential prompts, no deployment or provider/DB calls. npm registry downloads are expected installation reads.

BUILD_CI_STATUS
FAIL contract. npm run candidate:build:ci exits0 and runs branch gate,7 guard tests,Vite candidate build,R5 deployment checks. It directly invokes Vite and omits scripts/build-candidate-r7.mjs, which renders and copies9 HTML/RSC shell pairs. In the clean build dist/client/__candidate_shells does not exist: HTML0/RSC0. The existing R5 check does not enforce the new artifact requirement and reports a false success for this R10 completion gate.

DETACHED_HEAD_STATUS
PASS. Separate probe clone checked out detached377629fe; local branch empty, WORKERS_CI_BRANCH=migration/cloudflare-workers-r1 -> gate exit0.

WRONG_BRANCH_GUARD
PASS. Detached probe with main and analysis/wrong-branch: both candidate:build:ci and candidate:deploy:ci stop at Candidate CI branch rejected.4 negative probes, all nonzero; no dist artifact created in probe copy.

DEPLOY_COMMAND_STATUS
PASS dry validation only. npm run candidate:deploy:ci -- --dry-run exits0 and reports --dry-run: exiting now. Branch gate first, generated dist/server/wrangler.json, Worker zgmini-migration-candidate-r5, ASSETS only. No actual upload/deploy, custom domain, DNS, D1 create/import or secrets action. Passing dry-run is not proof of usable page artifacts.

LINUX_COMPATIBILITY
WARN. Candidate scripts use portable node/npm with no bash/PowerShell/local absolute/HOME paths. .sites-runtime is npm cache location, automatically created, not a Sites credential requirement. Installed Ubuntu24.04 lacks native Node; PATH finds a Windows npm wrapper, so native Linux execution was not completed. No runtime/distro installation or system configuration changes made.

PRODUCTION_ISOLATION
PASS. Production scripts unchanged. PR delta0 for app/lib/db/worker/index.ts/middleware.ts/Production operational store/vite.config.ts/.openai/hosting.json/all wrangler configs. main7369d8d203f084bed8f9d766fc0952d42b972c7b unchanged. Production/DNS/D1/candidate deploy/Git integration changes0.

MERGE_STATUS
NOT_MERGED as required for FAIL.

RESULT_SHA
migration HEAD remains e130b9232dc2810174a699ed376f85174d89ea3f. No validation commit/push; evidence saved locally.

HOSTED_BUILD_READINESS
NOT_READY.

BLOCKERS
Missing R7 shell generation in candidate:build:ci and absent artifact verification. Current candidate dispatch intentionally returns503 when a shell is missing; therefore publishing these artifacts would break the9 allowlisted pages.

NON_BLOCKING
Native Linux execution unavailable; prior dependency warnings. SELECT-only adapter, write guard, number-only approved UI and generated candidate deployment identity remain intact. These do not resolve the missing shell blocker.

CHANGED_FILES
PR unchanged/unmerged. Local evidence only: docs/migration/r10/VALIDATION.md and VALIDATION.json. Isolated build/probe copies and logs remain under ignored work/.

TEST_RESULTS
Clean install0; build command0; CI guard7/7; full guard/shell/store tests14/14; detached gate PASS;4 wrong-branch probes PASS; Wrangler dry-run0; R8 generated-bundle checker FAIL ENOENT on __candidate_shells. Syntax/config/Production script comparisons and diff check pass. Source/mock tests cannot replace actual artifact existence.

EVIDENCE
VALIDATION.json; work/r10-npm-ci.log; work/r10-build-ci.log; work/r10-deploy-dry-run.log; work/r10-tests.log; work/r10-artifact-check.log; clean-copy dist/server/index.js and wrangler.json. Generated adapter region is present; approved gauge absent; workers_dev=true/routes=[]/crons=[]/D1=[]/services=[]/vars={}.

NEXT_ACTION
Stop. Correct PR build entrypoint to use the existing R7 shell-generation script and make generated shell/SELECT-only artifact verification mandatory (scripts/check-candidate-bundle-r8.mjs). Then repeat clean validation before merge. No integration/binding/import/deploy authorization is inferred.
