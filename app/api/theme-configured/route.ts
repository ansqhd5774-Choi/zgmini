import {env} from 'cloudflare:workers';
import {readConfiguredThemes} from '../../../worker/theme-configured-public.mjs';

// Independent, opt-in derived-score endpoint. The existing ten-theme feed is
// intentionally untouched; no D1 writes or provider calls occur on GET.
export function GET(){
 const runtime=env as typeof env & {DB_CORE?:D1Database};
 return readConfiguredThemes(runtime.DB_CORE??runtime.DB);
}
