import {
  createBreadthR2CandidateService,
} from "./breadth-r2-service.mjs";

import {
  BREADTH_R2_METHOD_R1,
  finalizeBreadthR2Runtime,
  assertBreadthR2FinalMethod,
} from "./breadth-r2-method-r1.mjs";

export const BREADTH_R2_SERVICE_R1 = "BREADTH-R2-SERVICE-R1";

export function createBreadthR2R1Service(options = {}) {
  const candidateService = createBreadthR2CandidateService(options);

  return {
    version: BREADTH_R2_SERVICE_R1,
    methodologyVersion: BREADTH_R2_METHOD_R1,

    async run(args = {}) {
      const candidateResult = await candidateService.run(args);
      const result = finalizeBreadthR2Runtime(candidateResult);
      assertBreadthR2FinalMethod(result);
      return result;
    },
  };
}
