import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {createGrowthR2ForwardRuntimeProbeHandler} from '../../../../worker/growth-r2-forward-runtime-probe.mjs';

export async function GET(){
 const handler=createGrowthR2ForwardRuntimeProbeHandler({authenticate:getChatGPTUser,env});
 return handler();
}
export const POST=GET;
