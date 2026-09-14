import {inspectRuntime} from './p0-runtime-signals.mjs';
import {fredTransportCheck} from './p0-fred-transport.mjs';
// Reuse the production-verified detector. Context is supplied only by Worker entry.
export function createProductionProbe(transport=fredTransportCheck) {
  return async function productionFredProbe(request,context={}) {
    const {runtimeClassification}=inspectRuntime(request,context);
    const enabled=runtimeClassification==='PRODUCTION_CONFIRMED';
    const response=await transport(request,enabled);
    const data=await response.json();
    return Response.json({...data,runtimeClassification,upstreamFetchEnabled:enabled&&response.ok,
      ...(!enabled?{classification:'RUNTIME_DETECTION_REGRESSION'}:{})},
      {status:response.status,headers:response.headers});
  };
}
export const productionFredProbe=createProductionProbe();
