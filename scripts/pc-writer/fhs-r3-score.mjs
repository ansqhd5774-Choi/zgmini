// ZGMINI-FHS-R3: approved 4-factor scoring rubric. PURE / no I/O.
// Candidate scores are not credit ratings and cannot replace market-importance stars.
export const FHS_R3_VERSION='ZGMINI-FHS-R3';
const DAY=/^20\d\d-\d\d-\d\d$/;
export const validDay=s=>typeof s==='string'&&DAY.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const num=n=>typeof n==='number'&&Number.isFinite(n);
const base=(status,reason)=>({version:FHS_R3_VERSION,status,reason,score:null,stars:null,publishReady:false,publicStarsChanged:false});
const absoluteDayGap=(later,earlier)=>Math.floor((Date.parse(later)-Date.parse(earlier))/86400000);
export function scoreFhsR3(fin,{asOf,sectorClassification='UNVERIFIED',cashUnrestrictedVerified=false,filingContextVerified=false}={}){
 if(new Set(['BANK_VERIFIED','INSURANCE_VERIFIED','REIT_VERIFIED','BDC_VERIFIED','SPAC_VERIFIED','FINANCIAL_OTHER_VERIFIED']).has(sectorClassification))
   return base('UNRATED','SECTOR_MODEL_EXCLUDED');
 if(!fin||!validDay(asOf)||!validDay(fin.fiscalEnd)||!validDay(fin.previousFiscalEnd)||
    !validDay(fin.filedAt)||fin.fiscalEnd>asOf||fin.filedAt>asOf||
    absoluteDayGap(asOf,fin.fiscalEnd)>550||absoluteDayGap(asOf,fin.fiscalEnd)<0||
    absoluteDayGap(fin.fiscalEnd,fin.previousFiscalEnd)<300||absoluteDayGap(fin.fiscalEnd,fin.previousFiscalEnd)>430)
   return base('UNRATED','INVALID_OR_STALE_ANNUAL_PERIOD');
 const required=['assets','previousAssets','currentAssets','currentLiabilities','cash','totalLiabilities','operatingCashFlow','previousOperatingCashFlow'];
 for(const k of required)if(!num(fin[k]))return base('UNRATED','MISSING_OR_INVALID_'+k.toUpperCase());
 const {assets,previousAssets,currentAssets,currentLiabilities,cash,totalLiabilities,operatingCashFlow,previousOperatingCashFlow}=fin;
 if(assets<=0||previousAssets<=0||currentLiabilities<=0||currentAssets<0||cash<0||totalLiabilities<0||
  currentAssets>assets||cash>currentAssets||currentLiabilities>totalLiabilities)
   return base('UNRATED','INVALID_OR_ZERO_DENOMINATOR_OR_BALANCE_SHEET');
 const currentRatio=currentAssets/currentLiabilities;
 const cashRatio=cash/currentLiabilities;
 const liabilitiesToAssets=totalLiabilities/assets;
 const ocfToAverageAssets=operatingCashFlow/((assets+previousAssets)/2);
 const p1=currentRatio>=1.5?20:currentRatio>=1?15:currentRatio>=.75?8:0;
 const p2=cashRatio>=.5?15:cashRatio>=.25?10:cashRatio>=.1?5:0;
 const p3=liabilitiesToAssets<=.5?25:liabilitiesToAssets<=.75?17:liabilitiesToAssets<=.9?8:0;
 const p4=ocfToAverageAssets>=.08?40:ocfToAverageAssets>=.03?25:ocfToAverageAssets>=0?12:0;
 const score=p1+p2+p3+p4;
 const twoYearNegative=operatingCashFlow<0&&previousOperatingCashFlow<0;
 const runwayMonths=operatingCashFlow<0?(cash/Math.abs(operatingCashFlow))*12:null;
 const runwayBelow12=runwayMonths!==null&&runwayMonths<12;
 const insolventAndBurning=totalLiabilities>assets&&operatingCashFlow<0;
 const uncappedStars=score>=80?3:score>=50?2:1;
 const maxStars=runwayBelow12||insolventAndBurning?1:twoYearNegative?2:3;
 const stars=Math.min(uncappedStars,maxStars);
 const breakdown={currentRatio:p1,cashRatio:p2,liabilitiesToAssets:p3,ocfToAverageAssets:p4};
 const risk={twoYearNegative,runwayBelow12,insolventAndBurning};
 const metrics={currentRatio,cashRatio,liabilitiesToAssets,ocfToAverageAssets,runwayMonths};
 // A candidate is never publication-ready, including when all external flags are true.
 const eligible=sectorClassification==='NON_FINANCIAL_VERIFIED'&&cashUnrestrictedVerified===true&&filingContextVerified===true;
 const reason=!eligible?(sectorClassification!=='NON_FINANCIAL_VERIFIED'?'SECTOR_UNVERIFIED_OR_EXCLUDED':!cashUnrestrictedVerified?'UNRESTRICTED_CASH_UNVERIFIED':'FILING_CONTEXT_UNVERIFIED'):null;
 return {version:FHS_R3_VERSION,status:eligible?'VERIFIED_SHADOW_ONLY':'PROVISIONAL_UNVERIFIED',reason,
  score,stars,uncappedStars,breakdown,risk,metrics,annualEnd:fin.fiscalEnd,
  publishReady:false,publicStarsChanged:false};
}
