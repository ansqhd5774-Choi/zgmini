// Ensure the existing W05 earnings desktop/mobile integration tests are
// executed by the repository's canonical CI: node --test tests/*.test.mjs.
// Only imports in-repository, deterministic, read-only tests.
import '../app/earnings-recession/earnings-integrated-indicators.test.mjs';
