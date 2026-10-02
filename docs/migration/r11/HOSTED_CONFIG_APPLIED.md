# R11 hosted configuration

- Repository: ansqhd5774-Choi/zgmini
- Deployment branch: migration/cloudflare-workers-r1 only
- Worker: zgmini-migration-candidate-r5
- Root: /
- Install: npm ci
- Dashboard build command: npm ci && npm run candidate:build:ci
- Deploy command: npm run candidate:deploy:ci
- Build variable: SKIP_DEPENDENCY_INSTALL=1 (build-only, not runtime)
- Preview builds: disabled
- Build cache: disabled
- Runtime variables/secrets, D1/service bindings and cron triggers: absent

The dashboard does not expose a separate install command. The documented
SKIP_DEPENDENCY_INSTALL switch disables automatic installation; npm ci is
explicitly composed before the validated candidate build command.
Reference: https://developers.cloudflare.com/workers/ci-cd/builds/build-image/

This documentation-only commit triggers the first hosted build. No application,
Production configuration, database, domain, main, collector or scheduler changes.
Subsequent execution evidence stays local to avoid triggering a second build.
