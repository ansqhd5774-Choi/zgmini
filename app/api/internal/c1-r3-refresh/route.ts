import {env} from 'cloudflare:workers';
import {createConsumptionR3ExternalSchedulerHandler} from '../../../../worker/consumption-r3-external-scheduler.mjs';

const handler=createConsumptionR3ExternalSchedulerHandler({env:env as any});

export function POST(request:Request){
  return handler(request);
}

export function GET(){
  return Response.json(
    {operationalRevision:'C1-OP-R3',status:'FAILED',reason:'METHOD_NOT_ALLOWED'},
    {status:405,headers:{'cache-control':'no-store','x-robots-tag':'noindex'}}
  );
}
