import {env} from 'cloudflare:workers';
import {readApiConnectionHealth} from '../../../worker/api-connection-health.mjs';
export async function GET(){return readApiConnectionHealth(env.DB);}
