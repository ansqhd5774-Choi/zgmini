import {randomUUID} from 'node:crypto';

// Correlation key only: it is NOT proof that Task Scheduler launched a cycle.
const UUID_V4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function newCoreCycleId(){return randomUUID();}
export function coreCycleIdFromEnv(env=process.env){
 const value=env?.ZGMINI_CORE_CYCLE_ID;
 return typeof value==='string'&&UUID_V4.test(value)?value.toLowerCase():null;
}
