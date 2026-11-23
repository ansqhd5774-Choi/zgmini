// Include the source-owned QFR writer contract suite in the standard
// `node --test tests/*.test.mjs` CI path. This imports tests only;
// it never opens Provider, PC SQLite, live D1, or changes a schedule.
import '../worker/earnings-companion-c-qfr-r1.test.mjs';
