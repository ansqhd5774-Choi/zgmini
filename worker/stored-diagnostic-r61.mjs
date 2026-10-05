import {buildFullDiagnosticOrchestrator} from '../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs';
import {buildBondVolatilityR6 as originalBond} from '../lib/diagnostic-layer/bond-vol-r6-components.mjs';
import {buildBankEmergencyR7 as originalBank,buildFundingStressR7 as originalFunding} from '../lib/diagnostic-layer/liquidity-funding-r7-components.mjs';
import {buildBondVolatilityR6,buildBankEmergencyR7,buildFundingStressR7} from './projection-builders/liquidity-optimized-components.mjs';
const replacements=new Map([[originalBond,buildBondVolatilityR6],[originalBank,buildBankEmergencyR7],[originalFunding,buildFundingStressR7]]);
export function buildStoredDiagnostic(args){
 const compute=args.compute??((fn,...values)=>fn(...values));
 return buildFullDiagnosticOrchestrator({...args,compute:(fn,...values)=>compute(replacements.get(fn)??fn,...values)});
}
