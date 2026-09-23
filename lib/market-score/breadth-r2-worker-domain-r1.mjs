import {
  createBreadthR2R2Service,
} from "./breadth-r2-service-r2.mjs";

import {
  projectBreadthR2FinalPublicDomain,
  buildBreadthR2UnavailablePublicDomain,
  assertBreadthR2PublicContract,
} from "./breadth-r2-public-domain-r1.mjs";

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

export async function collectBreadthR2PublicDomainR1({
  env={},
  asOf,
  breadthServiceFactory=createBreadthR2R2Service,
  runtimeOptions={},
}={}){
  if(!validDate(asOf))return buildBreadthR2UnavailablePublicDomain("BREADTH_R2_ASOF_INVALID");
  if(!env?.DB)return buildBreadthR2UnavailablePublicDomain("BREADTH_R2_STORAGE_CONFIGURATION_MISSING");
  if(typeof env?.BEA_USER_ID!=="string"||!env.BEA_USER_ID.trim()){
    return buildBreadthR2UnavailablePublicDomain("BREADTH_R2_PROVIDER_CONFIGURATION_MISSING");
  }

  try{
    const service=breadthServiceFactory({
      env,
      db:env.DB,
      runtimeOptions,
    });
    const result=await service.run({
      asOfDate:asOf,
      beaUserId:env.BEA_USER_ID,
      includeBenchmark:false,
    });
    const domain=projectBreadthR2FinalPublicDomain(result);
    assertBreadthR2PublicContract(domain);
    return domain;
  }catch{
    return buildBreadthR2UnavailablePublicDomain("BREADTH_R2_RUNTIME_UNAVAILABLE");
  }
}
