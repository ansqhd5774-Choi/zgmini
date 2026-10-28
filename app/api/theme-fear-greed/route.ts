import {env} from 'cloudflare:workers';
import {readThemeEtfOnly} from '../../../worker/theme-etf-only-public.mjs';

// The production candidate binds the approved core database as DB_CORE.
// Prefer that explicit binding over the older DB compatibility alias so a
// PC-published R37 output row and the public reader use the same D1 database.
// Stored D1 GET only: no provider, calculation, mutation, or publication.
export async function GET(){
 const runtime=env as typeof env & {DB_CORE?:D1Database};
 return readThemeEtfOnly(runtime.DB_CORE??runtime.DB);
}
