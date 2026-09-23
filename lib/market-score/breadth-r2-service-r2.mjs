import {
  createBreadthR2R1Service,
} from "./breadth-r2-service-r1.mjs";

import {
  selectBreadthR2SecFramePair,
} from "./breadth-r2-sec-period-r1.mjs";

import {
  createBreadthR2LeaseR1,
} from "./breadth-r2-lease-r1.mjs";

export const BREADTH_R2_SERVICE_R2 = "BREADTH-R2-SERVICE-R2";

export function createBreadthR2R2Service({
  env = {},
  db = env?.DB,
  provider = undefined,
  runtimeOptions = {},
  leaseOptions = {},
} = {}) {
  const base = createBreadthR2R1Service({
    env,
    db,
    provider,
    runtimeOptions,
  });

  const lease = createBreadthR2LeaseR1(db, leaseOptions);

  return {
    version: BREADTH_R2_SERVICE_R2,
    methodologyVersion: base.methodologyVersion,

    async run({
      asOfDate,
      beaUserId,
      includeBenchmark = false,
      ...rest
    } = {}) {
      const secPair = selectBreadthR2SecFramePair(asOfDate);
      const lockKey = `breadth-r2:${secPair.current.frame}:${asOfDate}`;

      return lease.withLease(lockKey, async () => {
        const result = await base.run({
          ...rest,
          asOfDate,
          beaUserId,
          includeBenchmark,
          secPrevious: {
            year: secPair.previous.year,
            quarter: secPair.previous.quarter,
          },
          secCurrent: {
            year: secPair.current.year,
            quarter: secPair.current.quarter,
          },
        });

        return {
          ...result,
          serviceVersion: BREADTH_R2_SERVICE_R2,
          secPeriodPolicy: secPair,
          collectionLease: {
            key: lockKey,
            crossRequestD1Lease: true,
          },
        };
      });
    },
  };
}
