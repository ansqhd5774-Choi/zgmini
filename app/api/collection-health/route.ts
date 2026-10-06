import {env} from 'cloudflare:workers';
import {readCollectionHealth} from '../../../worker/collection-health.mjs';
export async function GET(){return readCollectionHealth(env.DB);}
