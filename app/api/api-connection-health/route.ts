import {env} from 'cloudflare:workers';
import {readPublicApiConnectionHealth} from '../../../worker/api-connection-health.mjs';

// Public display consumes only a sanitized aggregate. Detailed collector telemetry
// remains in the private PC/D1 storage and is never serialized to visitors.
export async function GET(){return readPublicApiConnectionHealth(env.DB);}
