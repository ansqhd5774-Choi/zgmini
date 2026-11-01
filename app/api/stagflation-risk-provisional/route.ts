import {env} from 'cloudflare:workers';
import {readLatestStagflation} from '../../../worker/stagflation-latest-public.mjs';
export async function GET(){return readLatestStagflation(env.DB)}
