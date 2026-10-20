import {env} from 'cloudflare:workers';
import {readThemeEtfOnly} from '../../../worker/theme-etf-only-public.mjs';

// Stored D1 GET only: no provider, calculation, mutation, or publication.
export async function GET(){return readThemeEtfOnly(env.DB)}
