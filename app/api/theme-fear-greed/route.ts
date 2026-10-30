import {env} from 'cloudflare:workers';
import {readThemeEtfOnly} from '../../../worker/theme-etf-only-public.mjs';

// Stored D1 GET only: no provider, calculation, mutation, or publication.
// The candidate production Worker explicitly binds the approved DB_CORE D1.
// Keep the old DB alias as compatibility fallback for other deployments.
export async function GET(request:Request){
 const runtime=env as typeof env & {DB_CORE?:D1Database};
 // The PC publisher compares against the stored pre-overlay calendar, never
 // its own R32 output. Normal visitor requests always retain the R32 overlay.
 const includeNineR37=new URL(request.url).searchParams.get('publication-base')!=='1';
 return readThemeEtfOnly(runtime.DB_CORE??runtime.DB,{includeNineR37});
}
