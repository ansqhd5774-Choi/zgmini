// Only transient transport/service failures qualify. Mutations are never replayed here.
import {safeDiagnostic} from './d1-diagnostics.mjs';
export function transientD1Failure(error){return error?.message==='D1_OUTCOME_UNKNOWN'||/^D1_HTTP_(429|500|502|503|504)$/.test(error?.message??'');}
export function safePublicationFailures(value){return Array.isArray(value)?value.slice(0,40).map(x=>({id:typeof x?.id==='string'&&/^[a-zA-Z0-9:.-]{1,100}$/.test(x.id)?x.id:'unknown',reason:/^[A-Z][A-Z0-9_]{1,100}$/.test(x?.reason??'')?x.reason:'OUTPUT_STAGE_FAILED'})):[];}
export function safeTransportFailures(value){return Array.isArray(value)?value.slice(-20).map(safeDiagnostic):[];}
