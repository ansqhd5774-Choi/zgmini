import {env} from 'cloudflare:workers';
import {readStagflation} from '../../../worker/stagflation-public.mjs';
// GET reads the separate approved projection only; never calculates or collects.
export async function GET(){return readStagflation(env.DB)}
