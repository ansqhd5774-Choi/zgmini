import {collectEquiblesEarningsE1R1} from "./equibles-e1-r1-provider.mjs";

function partial(reason){
  return {
    id:"earnings",status:"PARTIAL",score:null,methodologyVersion:"E1-R1",
    source:"Equibles",missing:[reason],providerRequests:0,
  };
}

export async function collectEarningsE1R1Runtime({
  env={},
  fetchImpl=globalThis.fetch,
  collect=collectEquiblesEarningsE1R1,
}={}){
  const sharedPlan=String(env?.EQUIBLES_B1_PLAN??"").trim().toUpperCase();
  if(sharedPlan!=="PRO")return partial("EQUIBLES_PRO_ENTITLEMENT_NOT_PROVEN");
  const apiKey=String(env?.EQUIBLES_API_KEY??"").trim();
  if(!apiKey)return partial("EQUIBLES_API_KEY_MISSING");
  return collect({apiKey,fetchImpl});
}
