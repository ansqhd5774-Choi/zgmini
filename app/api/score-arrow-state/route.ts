import {env} from 'cloudflare:workers';
import {storedScoreArrowResponse} from '../../../worker/score-arrow-public.mjs';
export async function GET(request:Request){return storedScoreArrowResponse(request,{db:env.DB});}
