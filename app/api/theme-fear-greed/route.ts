import {env} from 'cloudflare:workers';
import {readThemeEtfOnly} from '../../../worker/theme-etf-only-public.mjs';

// Stored D1 GET only: no provider, calculation, mutation, or publication.
// The candidate production Worker explicitly binds the approved DB_CORE D1.
// Keep the old DB alias as compatibility fallback for other deployments.
export async function GET(){
 const runtime=env as typeof env & {DB_CORE?:D1Database};
 return readThemeEtfOnly(runtime.DB_CORE??runtime.DB);
}
