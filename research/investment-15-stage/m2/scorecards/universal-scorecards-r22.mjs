// R22: independent company-scorecard computation from declared, dated evidence.
// This module neither performs web collection nor modifies R20/R21 reporting,
// SEC auto cursors, ZGMINI, databases, scheduled tasks or trading settings.
// Each method has an immutable version and weight structure transcribed from
// the user's original fifteen PDF standards. An unimplemented method NEVER
// falls back to a simple sum, equal-weight composite, or invented score.

const WEIGHTS={
 INNOVATION:[['need',15],['novelty',15],['discontinuity',15],['replacement',15],['diffusion',10],['commercialProof',15],['externalValidation',15]],
 TPVS:[['technicalKpiVelocity',30],['milestoneVelocity',25],['roadmapVelocity',15],['deploymentVelocity',15],['externalValidationVelocity',15]],
 TAS:[['performanceKpi',20],['efficiencyCost',10],['tradeOff',5],['independentValidation',10],['customerValidation',10],['validationRepeatability',5],['replicationDifficulty',8],['intellectualProperty',6],['qualificationBarrier',6],['manufacturingScale',8],['reliability',7],['operationalRepeatability',5]],
 RRS:[['migrationCost',10],['requalification',10],['operatingRisk',10],['functionalLoss',12],['uniqueAssets',8],['qualifiedAlternatives',10],['multisourcing',5],['timeToReplace',5],['contractsRetention',7],['installedBase',8],['observedRetention',8],['observedReplacement',7]],
 PS:[['pipelineDepth',20],['pipelineMaturity',20],['milestoneProximity',20],['proofAndDerisking',25],['diversification',15]],
 PAS:[['commitmentAndEconomics',25],['executionDepth',20],['strategicLeverage',20],['partnerCapability',15],['diversification',10],['observedRelationshipEvidence',10]],
 SS:[['structuralComplementarity',15],['commercialSynergy',20],['costAssetLeverage',15],['technologyDataPlatformSynergy',20],['executionNetRealization',20],['durabilityScalability',10]],
 FVS:[['n1StructuralNeed',10],['n2NeedDurability',10],['v1ValuePool',10],['v2CompanyMateriality',10],['c1MarketCapture',10],['c2EconomicCapture',10],['d1MoatStrength',10],['d2MoatDurability',10],['e1Execution',10],['e2ConstraintSolving',10]],
 EAS:[['epsAttendance',50],['revenueAttendance',50]],
 BMS:[['growth',25],['profitability',25],['balanceSheet',20],['cashValuation',20],['qualityGate',10]],
 TEE:[['modularityReuse',25],['releasePerformanceEvolution',25],['adjacencyExpansion',25],['ecosystemAdoptionFlywheel',25]],
 RAS:[['regulatoryScope',7],['regulatoryClarity',8],['marketAccessAuthorization',15],['scopeSufficiency',10],['complianceSystem',10],['enforcementViolations',15],['operatingContinuity',10],['adaptationRemediation',10],['renewalStrength',7],['expansionRegulatoryMoat',8]],
 IPLS:[['coreRightsStrength',12],['portfolioBreadth',8],['ownershipControl',12],['durationTermination',8],['businessDependence',12],['replicationBarrier',8],['currentEconomicCapture',10],['futureEconomicExpansion',10],['synergyPlatformExtension',10],['rightsValidationContinuity',10]],
 LCSS:[['liquidResources',10],['operatingCoverage',10],['cashGenerationRunway',18],['cashFlowTrend',7],['debtCapitalBurden',10],['nearTermFundingGap',10],['survivalFinancingDependence',8],['netDilution',7],['capitalReturnConservation',10],['lossEarningsBurden',10]],
 TBAS:[['ema20',15],['sma50',10],['sma200',10],['rsi14',15],['macd',15],['stochRsi',10],['adx14',8],['williamsR',6],['cci14',6],['atrPct',5]],
};

const CATALOG_META=[
 ['INNOVATION','혁신성','v3.0-OPTIMAL','EXACT_CALCULATOR','최근 정기 공시·관련 8-K·기업 기술자료·독립 검증; 핵심 문서 최대 5개'],
 ['TPVS','기술 발전 속도','v3.0-OPTIMAL','EXACT_CALCULATOR','최근 12개월의 기술 KPI 전진과 기준선, 외부 마일스톤'],
 ['TAS','기술 우위','v2.0-OPTIMAL','EXACT_CALCULATOR','현실적인 대안과 동일 KPI 비교, 독립 검증'],
 ['RRS','대체 저항력','v2.0-OPTIMAL','EXACT_CALCULATOR','고객 전환비용·시간·재검증·교체 관측'],
 ['PS','파이프라인','v2.0-OPTIMAL','EXACT_CALCULATOR','12~36개월 실재 성장 프로그램과 독립 마일스톤'],
 ['PAS','파트너십','v2.0-OPTIMAL','EXACT_CALCULATOR','실제 구속력 있는 파트너 관계·경제적 결과'],
 ['SS','시너지','v2.0-OPTIMAL','EXACT_CALCULATOR','복수 사업 블록과 반사실적 추가 가치'],
 ['FVS','미래 가치','v2.0-OPTIMAL','EXACT_CALCULATOR','3~10년 사업 가치풀·획득·지속력; 주가 전망 아님'],
 ['EAS','실적 개근','v2.0-OPTIMAL','EXACT_CALCULATOR','TipRanks Earnings History 단일 출처; 최대 최근 8개 발표 분기'],
 ['BMS','기본 지표','v2.0-OPTIMAL','PARTIAL_FINVIZ_BRANCHES','Finviz 단일 시점·단일 출처; 금융·REIT 별도 분기'],
 ['TEE','기술 확장·진화','v2.0-OPTIMAL','EXACT_CALCULATOR','핵심 기술 재사용·실행된 릴리스·확장·채택'],
 ['RAS','규제·인허가 포지션','v3.0-UNIVERSAL-OPTIMAL','EXACT_CALCULATOR','산업별 현행 규제·사업 허가·공식 집행 기록'],
 ['IPLS','IP·라이선스 자산 파워','v7.0-UNIVERSAL-OPTIMAL','EXACT_CALCULATOR','사업별 실제 통제 권리·기간·복제장벽·경제적 실효'],
 ['LCSS','현금 생존력·자본관리','v4.0-UNIVERSAL-OPTIMAL','PARTIAL_CALCULATOR_GENERAL_BRANCH','SEC 원문 재무제표·후속 사건·업종 분기; 결측 NA'],
 ['TBAS','기술적 매수 매력','v2.0-FAST-OPTIMAL','EXACT_CALCULATOR','일일 정규장 단일 공급원 기술지표·최소 거래일 이력'],
];

export const SCORECARD_CATALOG=Object.freeze(CATALOG_META.map(([id,name,standard,implementation,requiredEvidence],index)=>{
 const dimensions=Object.freeze(WEIGHTS[id].map(([field,weight])=>Object.freeze({field,weight})));
 if(dimensions.reduce((s,x)=>s+x.weight,0)!==100)throw Error(`R22_WEIGHT_SUM_${id}`);
 return Object.freeze({index:index+1,id,name,standard,implementation,requiredEvidence,dimensions});
}));
const byId=new Map(SCORECARD_CATALOG.map(x=>[x.id,x]));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const numeric=n=>finite(n)&&n>=0;
const round1=n=>Math.round((n+Number.EPSILON)*10)/10;
const clamp=n=>Math.max(0,Math.min(100,n));
const dateWithZone=x=>{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/.test(x)||!Number.isFinite(Date.parse(x)))return false;
 const kst=new Date(Date.parse(x)+9*3600_000).toISOString();
 return kst.slice(0,10)===x.slice(0,10)&&kst.slice(11,19)===x.slice(11,19);
};
const issue=(status,reason,extra={})=>({status,score:null,reason,...extra});

function checkSources(sourceList,asOf){
 if(!Array.isArray(sourceList))return {error:'SOURCES_REQUIRED'};
 const map=new Map();
 for(const entry of sourceList){
  if(!entry||typeof entry.id!=='string'||!/^[A-Za-z0-9_-]{1,32}$/.test(entry.id)||map.has(entry.id))return {error:'SOURCE_ID_INVALID_OR_DUPLICATE'};
  let url;try{url=new URL(entry.url)}catch{return {error:'SOURCE_URL_INVALID'}}
  if(url.protocol!=='https:'||!url.hostname||url.username||url.password)return {error:'SOURCE_URL_NOT_HTTPS'};
  // A dated issuer filing has a publication time; an ever-changing quote/history
  // page often has only an observed snapshot time. Never invent one from another.
  const knownAt=entry.publishedAt||entry.observedAt;
  if(!dateWithZone(knownAt)||Date.parse(knownAt)>Date.parse(asOf))return {error:'SOURCE_FUTURE_OR_UNDATED'};
  map.set(entry.id,{...entry,hostname:url.hostname.toLowerCase()});
 }
 return {map};
}

function gradedFields(id,input,asOf,sources,allowed=['0','0.5-P','0.5-U','1']){
 if(!input)return {issue:issue('NOT_EVALUATED','SCORE_INPUT_MISSING')};
 if(!dateWithZone(asOf))return {issue:issue('INPUT_INVALID','ASOF_KST_REQUIRED')};
 const refs=checkSources(sources,asOf);if(refs.error)return {issue:issue('INPUT_INVALID',refs.error)};
 const gradeNums={'0':0,'0.25':0.25,'0.5-P':0.5,'0.5-U':0.5,'0.75':0.75,'1':1};
 const grades={},values={},unknown=[];
 for(const {field,weight} of byId.get(id).dimensions){
  const item=input.fields?.[field];
  if(!item||!allowed.includes(item.grade))return {issue:issue('NOT_EVALUATED',`FIELD_MISSING_OR_GRADE_INVALID_${field}`)};
  const evidenceRefs=item.evidenceRefs||[];
  if(!Array.isArray(evidenceRefs)||evidenceRefs.some(x=>typeof x!=='string'||!refs.map.has(x)))return {issue:issue('INPUT_INVALID',`UNREGISTERED_SOURCE_${field}`)};
  if(item.grade!=='0.5-U'&&!evidenceRefs.length)return {issue:issue('NOT_EVALUATED',`EVIDENCE_MISSING_${field}`)};
  if(item.grade==='0.5-U'){
   if(!input.searchExhausted)return {issue:issue('NOT_EVALUATED','UNKNOWN_REQUIRES_RESEARCH_EXHAUSTION')};
   unknown.push(field);
  }
  grades[field]=item.grade;values[field]=weight*gradeNums[item.grade];
 }
 return {grades,values,unknown,raw:Object.values(values).reduce((s,v)=>s+v,0)};
}

// TPVS PDF pp. 14-23; five discrete weighted axes, 12-month baseline,
// evidence, core progress, talk-only and third-party verification caps.
export function calculateTpvs(input,{asOf,sources}={}){
 const graded=gradedFields('TPVS',input,asOf,sources);
 if(graded.issue)return graded.issue;
 if(!input.coreTechnologyConfirmed||!input.twelveMonthBaselineConfirmed)return issue('INVALID','CORE_TECHNOLOGY_OR_BASELINE_UNCONFIRMED');
 if(input.completedMilestoneReviewed!==true)return issue('NOT_EVALUATED','MILESTONE_EXECUTION_NOT_REVIEWED');
 const {grades,unknown,values,raw}=graded;
 if(unknown.length>=3||grades.technicalKpiVelocity==='0.5-U'&&grades.milestoneVelocity==='0.5-U')return issue('INVALID','CRITICAL_OR_EXCESSIVE_UNKNOWN');
 const evidence=unknown.length===2?75:unknown.length===1?90:100;
 const core=grades.technicalKpiVelocity==='0.5-U'||grades.milestoneVelocity==='0.5-U'?80:100;
 const talkOnly=input.completedMilestoneVerified?100:40;
 const external=grades.externalValidationVelocity==='0.5-U'?80:100;
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(raw,evidence,core,talkOnly,external)),raw:round1(raw),
  gates:{evidence,core,talkOnly,external},fieldGrades:grades,unknownCount:unknown.length,
  warning:'TECHNICAL_MILESTONES_AND_BASELINE_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

const fractionalGrades=['0','0.25','0.5-P','0.5-U','0.75','1'];
const gradeNumber=g=>g==='0.5-P'||g==='0.5-U'?0.5:Number(g);

// The user's PS/PaS/SS standards score sub-fields, NOT their broad axis
// weights. Every positive/negative grade needs a dated, registered source;
// UNKNOWN never silently means zero, and unreviewed gates never default false.
const PROGRAM_FIELDS=[['P1',10],['P2',5],['P3',5],['M1',8],['M2',7],['M3',5],
 ['T1',8],['T2',7],['T3',5],['E1',10],['E2',7],['E3',4],['E4',4],['D1',6],['D2',5],['D3',4]];
const PARTNER_FIELDS=[['C1',10],['C2',10],['C3',5],['E1',10],['E2',10],['S1',10],
 ['S2',10],['Q1',8],['Q2',7],['D1',6],['D2',4],['R1',5],['R2',5]];
const SYNERGY_FIELDS=[['A1',8],['A2',7],['R1',12],['R2',8],['C1',8],['C2',7],
 ['T1',12],['T2',8],['E1',10],['E2',10],['D1',5],['D2',5]];
for(const [label,fields] of [['PS',PROGRAM_FIELDS],['PAS',PARTNER_FIELDS],['SS',SYNERGY_FIELDS]]){
 if(fields.reduce((n,[,w])=>n+w,0)!==100)throw Error(`R22_SUBFIELD_WEIGHT_${label}`);
}
function sixGradeEvidence(input,fields,{asOf,sources}={}){
 if(!input)return {issue:issue('NOT_EVALUATED','SCORE_INPUT_MISSING')};
 if(!dateWithZone(asOf))return {issue:issue('INPUT_INVALID','ASOF_KST_REQUIRED')};
 const verified=checkSources(sources,asOf);
 if(verified.error)return {issue:issue('INPUT_INVALID',verified.error)};
 const grades={},unknown=[],values={};
 for(const [field,weight] of fields){
  const item=input.fields?.[field];
  if(!item||!fractionalGrades.includes(item.grade))return {issue:issue('NOT_EVALUATED',`FIELD_MISSING_${field}`)};
  if(!Array.isArray(item.evidenceRefs)||item.evidenceRefs.some(ref=>!verified.map.has(ref)))return {issue:issue('INPUT_INVALID',`SOURCE_REF_INVALID_${field}`)};
  if(item.grade==='0.5-U'){
   if(input.searchExhausted!==true)return {issue:issue('NOT_EVALUATED','UNKNOWN_REQUIRES_SEARCH_EXHAUSTION')};
   unknown.push(field);
  }else if(!item.evidenceRefs.length)return {issue:issue('NOT_EVALUATED',`EVIDENCE_REQUIRED_${field}`)};
  grades[field]=item.grade;values[field]=gradeNumber(item.grade)*weight;
 }
 return {grades,unknown,raw:Object.values(values).reduce((a,b)=>a+b,0),n:f=>gradeNumber(grades[f])};
}
function reviewedBooleanFlags(input,names){
 return names.every(key=>typeof input[key]==='boolean');
}
function cappedScore(evaluation,caps,warning){
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(evaluation.raw,...Object.values(caps))),
  raw:round1(evaluation.raw),gates:caps,unknownCount:evaluation.unknown.length,fieldGrades:evaluation.grades,
  warning};
}
const noProof='GRADE_AND_GATE_FACTS_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED';

// PS v2.0, source pp. 19-23, 31-32: 16 subfields and ten cap families.
export function calculatePs(input,context={}){
 const g=sixGradeEvidence(input,PROGRAM_FIELDS,context);if(g.issue)return g.issue;
 if(g.unknown.length>=6)return issue('INVALID','SIX_OR_MORE_UNKNOWN_FIELDS');
 const coreUnknown=['P1','M1','T1','E1'].filter(f=>g.grades[f]==='0.5-U').length;
 if(coreUnknown>=3||['P1','M1','T1'].filter(f=>g.grades[f]==='0.5-U').length>=2)return issue('INVALID','CORE_PIPELINE_EVIDENCE_MISSING');
 if(!reviewedBooleanFlags(input,['issuerIdentityConfirmed','corePipelineScopeConfirmed','qualifiedProgramExistenceConfirmed',
   'programRegistryNoDoubleCount','programAndPartnershipSeparated','talkOnlyNoPl2','allEarlyStageWithoutExternalPl2',
   'singleQualifiedProgram','farDated','companyClaimOnly','tier1ExternalEvidence','hasPl4Program',
   'majorScheduleRepeatedFailure']))return issue('NOT_EVALUATED','PIPELINE_GATES_NOT_FULLY_REVIEWED');
 if(!['NONE','REPEATED','EXISTENTIAL'].includes(input.negativeExecution))return issue('NOT_EVALUATED','NEGATIVE_EXECUTION_NOT_REVIEWED');
 if(!input.issuerIdentityConfirmed||!input.corePipelineScopeConfirmed||!input.qualifiedProgramExistenceConfirmed||
  !input.programRegistryNoDoubleCount||!input.programAndPartnershipSeparated)return issue('INVALID','PIPELINE_SCOPE_OR_REGISTRY_INVALID');
 const u=g.unknown.length,n=g.n;
 const elite90=n('P1')>=0.75&&n('M1')>=0.75&&n('T1')>=0.75&&n('E1')>=0.75&&
  n('E2')>=0.5&&n('D1')>=0.5&&u<=3&&input.tier1ExternalEvidence&&!input.talkOnlyNoPl2&&input.negativeExecution==='NONE';
 const elite95=n('P1')===1&&n('M1')>=0.75&&n('M2')>=0.75&&n('T1')===1&&n('T2')>=0.75&&
  n('E1')>=0.75&&n('E2')>=0.75&&n('E3')>=0.75&&n('D1')>=0.75&&u<=2&&
  input.hasPl4Program&&!input.majorScheduleRepeatedFailure;
 const evidenceCaps=[100,97.5,95,90,85,75];
 const caps={evidence:evidenceCaps[u],coreEvidence:coreUnknown>=2?75:100,
  talkOnly:input.talkOnlyNoPl2?55:100,earlyStage:input.allEarlyStageWithoutExternalPl2?55:100,
  singleProgram:input.singleQualifiedProgram&&n('D1')<=0.25?65:100,farDated:input.farDated?60:100,
  companyClaim:input.companyClaimOnly?80:100,negativeExecution:input.negativeExecution==='EXISTENTIAL'?40:input.negativeExecution==='REPEATED'?50:100,
  elite90:elite90?100:89.5,elite95:elite95?100:94.9};
 return cappedScore(g,caps,noProof);
}

// Partnership PaS v2.0, source pp. 29-36: 13 subfields and no fame/MOU bonus.
export function calculatePas(input,context={}){
 const g=sixGradeEvidence(input,PARTNER_FIELDS,context);if(g.issue)return g.issue;
 if(g.unknown.length>=6)return issue('INVALID','SIX_OR_MORE_UNKNOWN_FIELDS');
 const coreUnknown=['C1','E1','S1','R1'].filter(f=>g.grades[f]==='0.5-U').length;
 if(coreUnknown>=3||['C1','E1','S1'].filter(f=>g.grades[f]==='0.5-U').length>=2)
  return issue('INVALID','CORE_PARTNERSHIP_EVIDENCE_MISSING');
 if(!reviewedBooleanFlags(input,['issuerIdentityConfirmed','corePartnershipTrackConfirmed','activeRelationshipsConfirmed',
  'noDuplicateParentRelationships','partnershipDistinctFromOrdinaryCustomer','talkOnly','singleActivePartner',
  'companyClaimOnly','relatedPartyWithoutExternalValidation','governmentCeilingWithoutFunding','externalDirectEvidence']))
  return issue('NOT_EVALUATED','PARTNERSHIP_GATES_NOT_FULLY_REVIEWED');
 if(!['NONE','OVER_50','OVER_80'].includes(input.concentration)||
  !['NONE','REPEATED','MODEL_FAILURE'].includes(input.partnershipFailure)||
  !Number.isInteger(input.activePartnerCount)||input.activePartnerCount<0||
  !Number.isInteger(input.commercialOperationalRelationshipCount)||input.commercialOperationalRelationshipCount<0)
  return issue('NOT_EVALUATED','PARTNER_COUNTS_FAILURE_OR_CONCENTRATION_REQUIRED');
 if(!input.issuerIdentityConfirmed||!input.corePartnershipTrackConfirmed||!input.activeRelationshipsConfirmed||
  !input.noDuplicateParentRelationships||!input.partnershipDistinctFromOrdinaryCustomer)return issue('INVALID','PARTNERSHIP_SCOPE_INVALID');
 const n=g.n,u=g.unknown.length;
 const nonBinding=n('C1')<=0.25;
 const elite90=n('C1')>=0.75&&n('C2')>=0.5&&Math.max(n('E1'),n('E2'))>=0.75&&
  n('S1')>=0.75&&n('S2')>=0.75&&n('Q1')>=0.75&&n('D1')>=0.5&&n('R1')>=0.75&&
  n('R2')>=0.5&&u<=3&&input.externalDirectEvidence&&!input.talkOnly&&!nonBinding;
 const elite95=n('C1')>=0.75&&n('C2')>=0.75&&n('C3')>=0.75&&
  (n('E1')===1||n('E2')===1)&&n('S1')>=0.75&&n('S2')>=0.75&&n('Q1')>=0.75&&
  n('Q2')>=0.75&&n('D1')>=0.75&&n('D2')>=0.5&&n('R1')>=0.75&&n('R2')>=0.75&&
  input.activePartnerCount>=3&&input.commercialOperationalRelationshipCount>=2&&u<=2&&input.partnershipFailure==='NONE';
 const caps={evidence:[100,97.5,95,90,80,70][u],coreEvidence:coreUnknown>=2?75:100,
  talkOnly:input.talkOnly?45:100,nonBinding:nonBinding?55:100,
  noExecution:n('C1')>=0.75&&n('E1')<=0.5&&n('E2')<=0.5?70:100,
  singlePartner:input.singleActivePartner&&n('D1')<=0.25?80:100,
  concentration:input.concentration==='OVER_80'?70:input.concentration==='OVER_50'?85:100,
  companyClaim:input.companyClaimOnly?80:100,
  relatedParty:input.relatedPartyWithoutExternalValidation?70:100,
  governmentCeiling:input.governmentCeilingWithoutFunding?75:100,
  failure:input.partnershipFailure==='MODEL_FAILURE'?40:input.partnershipFailure==='REPEATED'?50:100,
  elite90:elite90?100:89.5,elite95:elite95?100:94.9};
 // Government ceiling specifically limits C2 to grade .25; raw C2 must be
 // recomputed, not converted into an arbitrary whole-company cap.
 if(input.governmentCeilingWithoutFunding&&n('C2')>0.25)
  return issue('NOT_EVALUATED','GOVERNMENT_CEILING_REQUIRES_C2_AT_MOST_0_25');
 if(input.relatedPartyWithoutExternalValidation&&n('R1')>0.25)
  return issue('NOT_EVALUATED','RELATED_PARTY_REQUIRES_R1_AT_MOST_0_25');
 delete caps.governmentCeiling;
 return cappedScore(g,caps,noProof);
}

// SS v2.0, source pp. 20-25, 34-35: only incremental inter-business benefit.
export function calculateSs(input,context={}){
 const g=sixGradeEvidence(input,SYNERGY_FIELDS,context);if(g.issue)return g.issue;
 if(g.unknown.length>=6)return issue('INVALID','SIX_OR_MORE_UNKNOWN_FIELDS');
 if(!reviewedBooleanFlags(input,['issuerIdentityConfirmed','businessBlocksIdentified','businessBlocksNotArtificiallySplit',
  'distinguishedFromPartnershipAndPipeline','oneBusinessNoVerifiedIntegration','unrelatedConglomerate',
  'corporateOverheadOnly','futureSynergyOnly','maAnnouncementOnly','maIntegrationWithoutRealization',
  'independentEvidenceAtLeastThree','hasSe4Edge','hasSe5Edge','commercialAndTechOrCostMechanisms',
  'quantifiedSynergyEvidence']))return issue('NOT_EVALUATED','SYNERGY_GATES_NOT_FULLY_REVIEWED');
 if(!['NONE','MATERIAL_OFFSET','REPEATED_NET_NEGATIVE'].includes(input.disSynergy)||
  !['NONE','SE1','SE2','SE3','SE4','SE5'].includes(input.highestQualifiedEdge))
  return issue('NOT_EVALUATED','EDGE_OR_DIS_SYNERGY_NOT_REVIEWED');
 if(!input.issuerIdentityConfirmed||!input.businessBlocksIdentified||!input.businessBlocksNotArtificiallySplit||
  !input.distinguishedFromPartnershipAndPipeline)return issue('INVALID','SYNERGY_SCOPE_INVALID');
 const n=g.n,u=g.unknown.length;
 const proof=['R2','C2','T2'].every(f=>n(f)<0.75)&&n('E2')<=0.5;
 const elite90=n('A1')>=0.75&&Math.max(n('R1'),n('R2'))>=0.75&&
  ['C1','C2','T1','T2'].filter(f=>n(f)>=0.75).length>=2&&n('E1')>=0.75&&n('E2')>=0.75&&
  Math.max(n('D1'),n('D2'))>=0.75&&input.hasSe4Edge&&input.independentEvidenceAtLeastThree&&
  u<=3&&input.disSynergy==='NONE';
 const elite95=['A1','A2','R1','R2','C1','T1','T2','E2','D1','D2'].every(f=>n(f)>=0.75)&&
  n('E1')===1&&input.hasSe5Edge&&input.commercialAndTechOrCostMechanisms&&
  input.quantifiedSynergyEvidence&&u<=2&&input.disSynergy==='NONE';
 const edgeCaps={NONE:25,SE1:45,SE2:60,SE3:80,SE4:100,SE5:100};
 const caps={evidence:[100,97.5,95,90,80,70][u],existence:edgeCaps[input.highestQualifiedEdge],
  economicProof:proof?85:100,executionProof:g.grades.E1==='0.5-U'&&g.grades.E2==='0.5-U'?60:100,
  oneBusiness:input.oneBusinessNoVerifiedIntegration?25:100,conglomerate:input.unrelatedConglomerate?30:100,
  corporateOverhead:input.corporateOverheadOnly?40:100,futureOnly:input.futureSynergyOnly?55:100,
  maAnnouncement:input.maAnnouncementOnly?55:100,maIntegration:input.maIntegrationWithoutRealization?70:100,
  disSynergy:input.disSynergy==='REPEATED_NET_NEGATIVE'?40:input.disSynergy==='MATERIAL_OFFSET'?60:100,
  elite90:elite90?100:89.5,elite95:elite95?100:94.9};
 return cappedScore(g,caps,noProof);
}

// BMS v2.0, Finviz-only point-in-time snapshot. No mixing SEC company facts
// with Finviz snapshot or silently treating unavailable financial ratios as 0.
const BMS_AXIS={
 growth:[['salesYoYTtm',30],['salesPast3Y',25],['epsYoYTtm',20],['epsNext5Y',25]],
 profitability:[['grossMargin',15],['operatingMargin',30],['profitMargin',25],['roic',30]],
 balance:[['debtEq',50],['currentRatio',25],['quickRatio',25]],
 cashValuation:[['ps',25],['evSales',25],['pFcf',30],['peg',20]],
};
const BMS_FINANCIAL={
 growth:BMS_AXIS.growth,
 profitability:[['roa',40],['roe',30],['profitMargin',20],['roic',10]],
 balance:[['debtEq',50],['ltDebtEq',50]],
 cashValuation:[['pb',35],['ps',25],['pFcf',25],['peg',15]],
};
function tierHigh(value,levels){
 for(const [threshold,score] of levels)if(value>=threshold)return score;
 return 0;
}
function tierLow(value,levels){
 for(const [threshold,score] of levels)if(value<=threshold)return score;
 return 0;
}
const bmsScorers={
 salesYoYTtm:v=>tierHigh(v,[[25,1],[15,0.75],[5,0.5],[0,0.25]]),
 salesPast3Y:v=>tierHigh(v,[[20,1],[10,0.75],[5,0.5],[0,0.25]]),
 epsYoYTtm:v=>tierHigh(v,[[25,1],[15,0.75],[5,0.5],[0,0.25]]),
 epsNext5Y:v=>tierHigh(v,[[25,1],[15,0.75],[8,0.5],[0,0.25]]),
 grossMargin:v=>tierHigh(v,[[60,1],[40,0.75],[20,0.5],[10,0.25]]),
 operatingMargin:v=>tierHigh(v,[[25,1],[15,0.75],[5,0.5],[0,0.25]]),
 profitMargin:v=>tierHigh(v,[[20,1],[10,0.75],[3,0.5],[0,0.25]]),
 roic:v=>tierHigh(v,[[20,1],[12,0.75],[5,0.5],[0,0.25]]),
 debtEq:v=>tierLow(v,[[0.3,1],[0.7,0.75],[1.5,0.5],[3,0.25]]),
 currentRatio:v=>tierHigh(v,[[2.5,1],[1.8,0.75],[1.2,0.5],[1,0.25]]),
 quickRatio:v=>tierHigh(v,[[2,1],[1.2,0.75],[0.8,0.5],[0.5,0.25]]),
 ps:v=>tierLow(v,[[2,1],[4,0.75],[8,0.5],[15,0.25]]),
 evSales:v=>tierLow(v,[[2,1],[4,0.75],[8,0.5],[15,0.25]]),
 pFcf:v=>tierLow(v,[[20,1],[30,0.75],[50,0.5],[80,0.25]]),
 peg:v=>tierLow(v,[[1,1],[1.5,0.75],[2.5,0.5],[4,0.25]]),
 roa:v=>tierHigh(v,[[2,1],[1.2,0.75],[0.7,0.5],[0,0.25]]),
 roe:v=>tierHigh(v,[[20,1],[12,0.75],[6,0.5],[0,0.25]]),
 ltDebtEq:v=>tierLow(v,[[0.5,1],[1,0.75],[2,0.5],[4,0.25]]),
 pb:v=>tierLow(v,[[1,1],[2,0.75],[4,0.5],[8,0.25]]),
};
export function calculateBms(input,{asOf,sources}={}){
 if(!input)return issue('NOT_EVALUATED','SCORE_INPUT_MISSING');
 const sourceList=checkSources(sources,asOf);if(sourceList.error)return issue('INPUT_INVALID',sourceList.error);
 const src=sourceList.map.get(input.sourceId);
 if(!src||!/(^|\.)finviz\.com$/.test(src.hostname))return issue('INPUT_INVALID','FINVIZ_SINGLE_SOURCE_REQUIRED');
 if(input.issuerIdentityConfirmed!==true||input.instrumentType!=='OPERATING_COMPANY')return issue('INVALID','ISSUER_OR_OPERATING_COMPANY_REQUIRED');
 if(typeof input.sector!=='string'||!input.sector.trim())return issue('NOT_EVALUATED','FINVIZ_SECTOR_REQUIRED');
 if(typeof input.isReit!=='boolean'||typeof input.isBdc!=='boolean')
  return issue('NOT_EVALUATED','REIT_BDC_CLASSIFICATION_NOT_REVIEWED');
 if(['REIT','BDC','REAL_ESTATE_INVESTMENT_TRUST','BUSINESS_DEVELOPMENT_COMPANY'].includes(input.sector.trim().toUpperCase())||
  input.isReit===true||input.isBdc===true)return issue('INVALID-SECTOR','REIT_BDC_REQUIRES_DISTINCT_FFO_AFFO_NII_METHOD');
 if(!dateWithZone(input.observedAt)||Date.parse(input.observedAt)>Date.parse(asOf))
  return issue('INPUT_INVALID','POINT_IN_TIME_FINVIZ_SNAPSHOT_REQUIRED');
 if(src.observedAt&&src.observedAt!==input.observedAt)return issue('INPUT_INVALID','FINVIZ_SNAPSHOT_TIME_INCONSISTENT');
 if(!input.fields||typeof input.fields!=='object')return issue('NOT_EVALUATED','FINVIZ_FIELDS_REQUIRED');
 const f=input.fields;
 const validValue=k=>finite(f[k])?f[k]:null;
 if(input.sector.toLowerCase()==='financial'&&!Object.hasOwn(f,'quickRatio'))
  return issue('NOT_EVALUATED','FINANCIAL_QUICK_RATIO_EXPLICIT_NULL_REQUIRED');
 const financial=input.sector.toLowerCase()==='financial'&&validValue('quickRatio')===null;
 const axes=financial?BMS_FINANCIAL:BMS_AXIS;
 const allFields=[...new Set(Object.values(axes).flatMap(a=>a.map(([k])=>k)))];
 if(allFields.some(k=>!Object.hasOwn(f,k)||f[k]!==null&&!finite(f[k])))
  return issue('NOT_EVALUATED','EXPLICIT_FINVIZ_VALUE_OR_NULL_REQUIRED');
 if(!Object.hasOwn(f,'epsTtm')||!Object.hasOwn(f,'bookPerShare')||
  [f.epsTtm,f.bookPerShare].some(x=>x!==null&&!finite(x)))
  return issue('NOT_EVALUATED','EPS_TTM_AND_BOOK_VALUE_REQUIRED');
 const negativeEquity=finite(f.bookPerShare)&&f.bookPerShare<=0;
 const fieldScores={};
 for(const k of allFields){
  const raw=validValue(k);
  if(k==='epsYoYTtm'&&(!finite(f.epsTtm)||f.epsTtm<=0)){fieldScores[k]=null;continue}
  if(k==='debtEq'&&negativeEquity){fieldScores[k]=0;continue}
  if(raw===null||['ps','evSales','pFcf','peg','pb'].includes(k)&&raw<=0){fieldScores[k]=null;continue}
  fieldScores[k]=financial&&['debtEq','ltDebtEq'].includes(k)?
   tierLow(raw,[[0.5,1],[1,0.75],[2,0.5],[4,0.25]]):bmsScorers[k](raw);
 }
 const axisScores={},axisCoverage={};let missing=0;
 for(const [axis,weights] of Object.entries(axes)){
  const included=weights.filter(([field])=>fieldScores[field]!==null);
  axisCoverage[axis]=included.length;
  if(!included.length){missing++;axisScores[axis]=0;continue}
  axisScores[axis]=included.reduce((s,[field,w])=>s+fieldScores[field]*w,0)/
    included.reduce((s,[,w])=>s+w,0);
 }
 const applicable=allFields.length,available=allFields.filter(k=>fieldScores[k]!==null).length;
 const coverage=available/applicable;
 if(coverage<0.2||missing>=2)return issue('INVALID','FINANCIAL_DATA_COVERAGE_INSUFFICIENT',
  {coverage:round1(coverage*100),missingAxes:missing});
 const valid=k=>finite(f[k]);
 const q=financial?[
  valid('roa')&&f.roa>=1,valid('roe')&&f.roe>=10,valid('profitMargin')&&f.profitMargin>=0,
  valid('debtEq')&&f.debtEq<=1.5,valid('pFcf')&&f.pFcf>0
 ]:[
  valid('operatingMargin')&&f.operatingMargin>=0,valid('profitMargin')&&f.profitMargin>=0,
  valid('roic')&&f.roic>0,!negativeEquity&&valid('debtEq')&&f.debtEq<=1.5&&valid('bookPerShare')&&f.bookPerShare>0,
  valid('pFcf')&&f.pFcf>0
 ];
 const quality=q.filter(Boolean).length*2;
 const raw=25*axisScores.growth+25*axisScores.profitability+20*axisScores.balance+
  20*axisScores.cashValuation+quality;
 const caps={negativeEquity:negativeEquity?70:100,
  dataCoverage:coverage>=0.8?100:coverage>=0.6?90:coverage>=0.4?75:60,
  axisCoverage:missing===1?70:100};
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.max(0,Math.min(raw,...Object.values(caps)))),
  raw:round1(raw),gates:caps,coverage:round1(coverage*100),validFields:available,applicableFields:applicable,
  branch:financial?'FINANCIAL':'OPERATING',axisScores:Object.fromEntries(Object.entries(axisScores).map(([k,v])=>[k,round1(v*100)])),
  fieldScores,qualityGatePoints:quality,warning:'FINVIZ_VALUES_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

// TEE v2.0 pp. 7-19: four axes, 16 subfields, NA reweighting and execution caps.
const TEE_AXES={
 modularityReuse:[['coreArchitectureReuse',35],['modularInterface',25],['productLineReuse',25],['deploymentPortability',15]],
 releasePerformanceEvolution:[['releaseCadence',30],['quantifiedPerformance',35],['reliabilityEvolution',20],['roadmapDelivery',15]],
 adjacencyExpansion:[['newProductUseCaseExpansion',30],['newVerticalCustomerExpansion',25],['coreTechnologyContinuity',25],['commercialValidationExpansion',20]],
 ecosystemAdoptionFlywheel:[['developerIntegrationInfrastructure',25],['partnerEcosystemDepth',30],['adoptionExpansion',25],['dataFeedbackFlywheel',20]],
};
const TEE_FIELDS=Object.values(TEE_AXES).flatMap(a=>a);
const FIVE_GRADES=['0','0.25','0.5','0.75','1','NA'];

function fiveGradeFields(input,fields,context){
 if(!input)return {issue:issue('NOT_EVALUATED','SCORE_INPUT_MISSING')};
 const check=checkSources(context.sources,context.asOf);
 if(check.error)return {issue:issue('INPUT_INVALID',check.error)};
 const grades={},items={};let valid=0;
 for(const [key] of fields){
  const item=input.fields?.[key];
  if(!item||!FIVE_GRADES.includes(item.grade))return {issue:issue('NOT_EVALUATED',`FIELD_OR_GRADE_MISSING_${key}`)};
  if(item.grade!=='NA'){
   if(!Array.isArray(item.evidenceRefs)||!item.evidenceRefs.length||item.evidenceRefs.some(r=>!check.map.has(r)))
    return {issue:issue('NOT_EVALUATED',`VERIFIED_SOURCE_REF_REQUIRED_${key}`)};
   valid++;
  }else if(item.evidenceRefs?.some(r=>!check.map.has(r)))return {issue:issue('INPUT_INVALID',`UNREGISTERED_SOURCE_${key}`)};
  grades[key]=item.grade;items[key]=item;
 }
 return {grades,items,valid,n:key=>grades[key]==='NA'?null:Number(grades[key])};
}

export function calculateTee(input,context={}){
 const g=fiveGradeFields(input,TEE_FIELDS,context);if(g.issue)return g.issue;
 if(!reviewedBooleanFlags(input,['issuerIdentityConfirmed','primaryTechPlatformConfirmed','secCoreDocumentReviewed',
  'latestTechnicalEventReviewed','unresolvedCoreEvolutionFailure','evidenceReuseReviewed','recentDelayFailureReviewed',
  'acquisitionTechnologyIntegrationReviewed','patentCountNotScored','partnerFameNotScored']))
  return issue('NOT_EVALUATED','TEE_SOURCE_AND_RECENCY_GATES_UNREVIEWED');
 if(!input.issuerIdentityConfirmed||!input.primaryTechPlatformConfirmed||!input.secCoreDocumentReviewed||
  !input.latestTechnicalEventReviewed||!input.evidenceReuseReviewed||!input.recentDelayFailureReviewed||
  !input.acquisitionTechnologyIntegrationReviewed||!input.patentCountNotScored||!input.partnerFameNotScored)
  return issue('INVALID','TEE_SOURCE_PACK_OR_GRADE_POLICY_UNCONFIRMED');
 // Individual caps are verified before the axis average, preventing a single
 // press release, delayed milestone or MOU from generating several full marks.
 for(const [field] of TEE_FIELDS){
  const entry=g.items[field];
  if(entry.grade==='NA')continue;
  if(!reviewedBooleanFlags(entry,['singleEventCrossAxisReviewed','recentUnresolvedFailureReviewed',
   'solePatentCount','fameOrMouOnly']))return issue('NOT_EVALUATED',`TEE_FIELD_GATES_UNREVIEWED_${field}`);
  const cap=entry.recentUnresolvedFailureReviewed?0.5:
   entry.singleEventCrossAxisReviewed||entry.solePatentCount?0.75:entry.fameOrMouOnly?0.25:1;
  if(Number(entry.grade)>cap)return issue('NOT_EVALUATED',`TEE_FIELD_REQUIRES_CAP_${field}`);
 }
 const axisScores={},axisValid={};let missingAxes=0;
 for(const [axis,fields] of Object.entries(TEE_AXES)){
  const known=fields.filter(([field])=>g.n(field)!==null);
  axisValid[axis]=known.length;
  if(!known.length){missingAxes++;axisScores[axis]=null;continue}
  const weight=known.reduce((s,[,w])=>s+w,0);
  const raw=known.reduce((s,[f,w])=>s+g.n(f)*w,0)/weight;
  axisScores[axis]=Math.min(raw,[null,0.6,0.75,0.9,1][known.length]);
 }
 const coverage=g.valid/16;
 if(coverage<0.25||missingAxes>=2)return issue('INVALID-DATA','TEE_COVERAGE_OR_MISSING_AXIS',
  {coverage:round1(coverage*100),missingAxes});
 const raw=Object.values(axisScores).reduce((s,v)=>s+(v??0)*25,0);
 const roadmapOnly=g.n('releaseCadence')!==null&&g.n('commercialValidationExpansion')!==null&&
  g.n('releaseCadence')<=0.25&&g.n('commercialValidationExpansion')<=0.25;
 const adoptionPoor=g.n('commercialValidationExpansion')!==null&&g.n('adoptionExpansion')!==null&&
  g.n('commercialValidationExpansion')<0.5&&g.n('adoptionExpansion')<0.5;
 const caps={globalCoverage:coverage>=0.75?100:coverage>=0.5?90:coverage>=0.375?80:70,
  axisMissing:missingAxes===1?70:100,roadmapOnly:roadmapOnly?55:100,
  coreEvolutionFailure:g.n('releaseCadence')===0&&input.unresolvedCoreEvolutionFailure?40:100,
  adoption:adoptionPoor?65:100};
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(raw,...Object.values(caps))),
  raw:round1(raw),gates:caps,coverage:round1(coverage*100),validFields:g.valid,
  axisScores:Object.fromEntries(Object.entries(axisScores).map(([key,value])=>[key,value===null?null:round1(value*100)])),
  axisValid,fieldGrades:g.grades,warning:noProof};
}

const RAS_FIELDS=[['A1',7],['A2',8],['B1',15],['B2',10],['C1',10],['C2',15],
 ['D1',10],['D2',10],['E1',7],['E2',8]];
const IPLS_FIELDS=[['A1',12],['A2',8],['B1',12],['B2',8],['C1',12],['C2',8],
 ['D1',10],['D2',10],['E1',10],['E2',10]];
for(const [id,fields] of [['RAS',RAS_FIELDS],['IPLS',IPLS_FIELDS]])
 if(fields.reduce((sum,[,weight])=>sum+weight,0)!==100)throw Error(`R22_TRACK_WEIGHT_${id}`);

function weightedTrack(input,fields,context){
 const grade=fiveGradeFields(input,fields,context);if(grade.issue)return grade;
 if(!reviewedBooleanFlags(input,['trackIdentityConfirmed','officialSourcePackReviewed','latestNegativeEventsReviewed']))
  return {issue:issue('NOT_EVALUATED','TRACK_SOURCE_PACK_UNREVIEWED')};
 if(!input.trackIdentityConfirmed||!input.officialSourcePackReviewed||!input.latestNegativeEventsReviewed)
  return {issue:issue('INVALID','TRACK_IDENTITY_OR_CURRENT_OFFICIAL_EVIDENCE_UNCONFIRMED')};
 if(grade.valid<5)return {issue:issue('INVALID-DATA','FEWER_THAN_FIVE_VALID_TRACK_FIELDS',
  {validFields:grade.valid})};
 const usable=fields.filter(([key])=>grade.n(key)!==null);
 const raw=100*usable.reduce((s,[key,weight])=>s+grade.n(key)*weight,0)/
  usable.reduce((s,[,weight])=>s+weight,0);
 return {...grade,raw,coverage:grade.valid/10};
}
function combineTracks(primary,secondary){
 const parts=[primary,...(secondary?[secondary]:[])];
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(secondary?0.7*primary.score+0.3*secondary.score:primary.score),
  tracks:parts,trackWeights:secondary?[70,30]:[100],warning:noProof};
}
export function calculateRas(input,context={}){
 if(!input)return issue('NOT_EVALUATED','SCORE_INPUT_MISSING');
 if(!reviewedBooleanFlags(input,['issuerIdentityConfirmed','operatingCompanyConfirmed','coreRegulatoryPortfolioConfirmed']))
  return issue('NOT_EVALUATED','RAS_ISSUER_SCOPE_UNREVIEWED');
 if(!input.issuerIdentityConfirmed||!input.operatingCompanyConfirmed||!input.coreRegulatoryPortfolioConfirmed)
  return issue('INVALID','RAS_ISSUER_SCOPE_INVALID');
 if(!input.primary)return issue('NOT_EVALUATED','PRIMARY_REGULATORY_TRACK_REQUIRED');
 const tracks=[];
 for(const [name,track] of [['primary',input.primary],...(input.secondary?[['secondary',input.secondary]]:[])]){
  if(!['A','B'].includes(track.branch)||!reviewedBooleanFlags(track,['activeCoreMarketProhibition','activeSevereEnforcement']))
   return issue('NOT_EVALUATED',`RAS_BRANCH_AND_FAILURE_REVIEW_REQUIRED_${name}`);
  const g=weightedTrack(track,RAS_FIELDS,context);if(g.issue)return g.issue;
  const n=g.n;
  const caps={coverage:{5:60,6:70,7:80,8:90,9:100,10:100}[g.valid],
   authorization:track.branch==='A'?({0:100,0.25:60,0.5:75,0.75:90,1:100}[n('B1')]??100):100,
   coreAccessFailure:n('B1')===0&&track.activeCoreMarketProhibition?35:100,
   severeEnforcement:n('C2')===0&&track.activeSevereEnforcement?45:100,
   commercialContinuity:n('D1')===0?40:100};
  const score=round1(Math.min(g.raw,...Object.values(caps)));
  tracks.push({name,branch:track.branch,score,raw:round1(g.raw),validFields:g.valid,
   gates:caps,fieldGrades:g.grades});
 }
 return combineTracks(tracks[0],tracks[1]);
}
export function calculateIpls(input,context={}){
 if(!input)return issue('NOT_EVALUATED','SCORE_INPUT_MISSING');
 if(!reviewedBooleanFlags(input,['issuerIdentityConfirmed','operatingCompanyConfirmed','coreRightsPortfolioConfirmed']))
  return issue('NOT_EVALUATED','IPLS_ISSUER_SCOPE_UNREVIEWED');
 if(!input.issuerIdentityConfirmed||!input.operatingCompanyConfirmed||!input.coreRightsPortfolioConfirmed)
  return issue('INVALID','IPLS_ISSUER_SCOPE_INVALID');
 if(!input.primary)return issue('NOT_EVALUATED','PRIMARY_RIGHTS_TRACK_REQUIRED');
 const tracks=[];
 for(const [name,track] of [['primary',input.primary],...(input.secondary?[['secondary',input.secondary]]:[])]){
  if(!reviewedBooleanFlags(track,['criticalRightsFailureCurrentlyActive','rightsProblemResolvedByReplacement']))
   return issue('NOT_EVALUATED',`IPLS_RIGHTS_FAILURE_UNREVIEWED_${name}`);
  const g=weightedTrack(track,IPLS_FIELDS,context);if(g.issue)return g.issue;
  const n=g.n;
  const control={0:45,0.25:65,0.5:85,0.75:100,1:100};
  const dependence={0:40,0.25:60,0.5:85,0.75:100,1:100};
  const caps={coverage:{5:70,6:80,7:90,8:95,9:100,10:100}[g.valid],
   control:control[n('B1')]??100,coreBusiness:dependence[n('C1')]??100,
   economicReality:n('D1')===0&&n('D2')!==null&&n('D2')<=0.25?55:100,
   criticalRightsFailure:name==='primary'&&track.criticalRightsFailureCurrentlyActive&&
    !track.rightsProblemResolvedByReplacement?35:100};
  tracks.push({name,score:round1(Math.min(g.raw,...Object.values(caps))),raw:round1(g.raw),
   validFields:g.valid,gates:caps,fieldGrades:g.grades});
 }
 return combineTracks(tracks[0],tracks[1]);
}

// TAS PDF pp. 5-26: comparator-backed current advantage (not progress rate).
export function calculateTas(input,{asOf,sources}={}){
 const g=gradedFields('TAS',input,asOf,sources,fractionalGrades);
 if(g.issue)return g.issue;
 if(!input.coreTechnologyConfirmed||!Number.isInteger(input.comparatorCount)||input.comparatorCount<0)
  return issue('INVALID','CORE_TECHNOLOGY_OR_COMPARATOR_SET_UNCONFIRMED');
 if(input.comparatorCount===0||g.unknown.length>=5||g.grades.performanceKpi==='0.5-U'&&g.grades.efficiencyCost==='0.5-U')
  return issue('INVALID','CRITICAL_COMPARISON_UNAVAILABLE');
 const required=['quantitativeComparisonVerified','externalEvidenceReviewed','claimOnlyEvidence','unresolvedExecutionFailure','verifiedComparatorAdvantage'];
 if(required.some(key=>typeof input[key]!=='boolean'))return issue('NOT_EVALUATED','COMPARATOR_OR_FAILURE_GATES_NOT_REVIEWED');
 const {grades,unknown,values,raw}=g;
 const n=f=>gradeNumber(grades[f]);
 const evidence=[100,95,90,85,75][unknown.length];
 const core=grades.performanceKpi==='0.5-U'?70:100;
 const comparator=input.comparatorCount===1?80:100;
 const quant=input.quantitativeComparisonVerified?100:65;
 const external=grades.independentValidation==='0.5-U'&&grades.customerValidation==='0.5-U'?70:100;
 const talkOnly=input.claimOnlyEvidence?50:100;
 const performance=grades.performanceKpi==='0'?55:100;
 const execution=input.unresolvedExecutionFailure?40:100;
 const elite90=n('performanceKpi')>=0.75&&(n('performanceKpi')===1||n('efficiencyCost')===1)&&
  Math.max(n('independentValidation'),n('customerValidation'))>=0.75&&
  Math.max(n('replicationDifficulty'),n('intellectualProperty'))>=0.75&&
  Math.max(n('manufacturingScale'),n('reliability'))>=0.75&&
  input.comparatorCount>=2&&input.quantitativeComparisonVerified;
 const moat=values.replicationDifficulty+values.intellectualProperty+values.qualificationBarrier;
 const executionPoints=values.manufacturingScale+values.reliability+values.operationalRepeatability;
 const elite95=n('performanceKpi')===1&&Math.max(n('independentValidation'),n('customerValidation'))===1&&
  moat>=15&&executionPoints>=15&&unknown.length===0&&input.verifiedComparatorAdvantage&&!input.unresolvedExecutionFailure;
 const caps={evidence,core,comparator,quantitativeProof:quant,externalProof:external,talkOnly,
  performanceFailure:performance,executionFailure:execution,elite90:elite90?100:89.5,elite95:elite95?100:94.9};
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(raw,...Object.values(caps))),raw:round1(raw),
  gates:caps,unknownCount:unknown.length,fieldGrades:grades,
  warning:'COMPETITOR_MEASUREMENTS_AND_EXTERNAL_PROOF_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

// RRS PDF pp. 5-29: actual customer switching friction, NOT vendor fame.
export function calculateRrs(input,{asOf,sources}={}){
 const g=gradedFields('RRS',input,asOf,sources,fractionalGrades);
 if(g.issue)return g.issue;
 if(!input.primaryOfferingConfirmed||!input.replacementSetConfirmed||!input.customerSubstitutionApplicable)
  return issue('INVALID','OFFERING_OR_REPLACEMENT_SET_UNCONFIRMED');
 const {grades,unknown,raw}=g;
 const n=f=>gradeNumber(grades[f]);
 if(unknown.length>=5||['migrationCost','requalification','qualifiedAlternatives'].every(f=>grades[f]==='0.5-U'))
  return issue('INVALID','CRITICAL_OR_EXCESSIVE_UNKNOWN');
 const required=['companyClaimOnly','preCommercial','officialSoleSourceVerified','talkOnly',
  'externalCustomerEvidence','largeScaleCustomerSwitchingAbsent'];
 if(required.some(key=>typeof input[key]!=='boolean')||!['NONE','REPEATED','STRUCTURAL'].includes(input.replacementFailure))
  return issue('NOT_EVALUATED','REPLACEMENT_OR_EXTERNAL_GATES_NOT_REVIEWED');
 const evidence=[100,95,90,85,75][unknown.length];
 const u=['migrationCost','requalification'].filter(f=>grades[f]==='0.5-U').length;
 const core=u===2?65:u===1?80:100;
 const substitute=grades.qualifiedAlternatives==='0.5-U'&&grades.multisourcing==='0.5-U'?70:100;
 const commodity=n('qualifiedAlternatives')===0&&n('multisourcing')<=0.25&&n('migrationCost')<=0.25?40:100;
 const multisource=n('multisourcing')===0&&n('migrationCost')<=0.5?55:100;
 const contractOnly=n('contractsRetention')>=0.75&&
  ['migrationCost','requalification','functionalLoss','qualifiedAlternatives'].every(f=>n(f)<=0.5)?65:100;
 const claimOnly=input.companyClaimOnly?80:100;
 const preCommercial=input.preCommercial&&!input.officialSoleSourceVerified?75:100;
 const talkOnly=input.talkOnly?50:100;
 const replacement=input.replacementFailure==='STRUCTURAL'?40:input.replacementFailure==='REPEATED'?50:100;
 const elite90=Math.max(n('migrationCost'),n('requalification'))>=0.75&&
  Math.max(n('functionalLoss'),n('uniqueAssets'))>=0.75&&
  Math.max(n('qualifiedAlternatives'),n('multisourcing'))>=0.75&&
  Math.max(n('contractsRetention'),n('installedBase'))>=0.75&&
  Math.max(n('observedRetention'),n('observedReplacement'))>=0.75&&
  unknown.length<=2&&input.externalCustomerEvidence;
 const elite95=Math.max(n('migrationCost'),n('requalification'))===1&&n('qualifiedAlternatives')>=0.75&&
  n('installedBase')>=0.75&&n('observedRetention')>=0.75&&input.externalCustomerEvidence&&
  input.largeScaleCustomerSwitchingAbsent&&commodity===100&&!input.preCommercial&&unknown.length<=1;
 const caps={evidence,coreSwitching:core,substituteProof:substitute,commodity,multisource,contractOnly,companyClaim:claimOnly,
  preCommercial,talkOnly,replacementFailure:replacement,elite90:elite90?100:89.5,elite95:elite95?100:94.9};
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(raw,...Object.values(caps))),raw:round1(raw),
  gates:caps,unknownCount:unknown.length,fieldGrades:grades,
  warning:'CUSTOMER_REPLACEMENT_FACTS_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

// FVS PDF pp. 3-21; exactly 10 subfields, no share-price/valuation forecast.
export function calculateFvs(input,{asOf,sources}={}){
 const graded=gradedFields('FVS',input,asOf,sources);
 if(graded.issue)return graded.issue;
 if(!input.coreBusinessConfirmed||!input.primaryFutureThesisConfirmed||!input.latestOfficialCompanyReportConfirmed)
  return issue('INVALID','CORE_BUSINESS_THESIS_OR_OFFICIAL_REPORT_UNCONFIRMED');
 if(input.criticalExecutionFailureReviewed!==true||typeof input.criticalExecutionFailureConfirmed!=='boolean')
  return issue('NOT_EVALUATED','CRITICAL_EXECUTION_FAILURE_NOT_REVIEWED');
 if(input.criticalExecutionFailureConfirmed&&!Array.isArray(input.criticalExecutionFailureEvidenceRefs))return issue('NOT_EVALUATED','CRITICAL_FAILURE_EVIDENCE_REQUIRED');
 const refs=checkSources(sources,asOf);
 if(input.criticalExecutionFailureConfirmed&&(!input.criticalExecutionFailureEvidenceRefs.length||input.criticalExecutionFailureEvidenceRefs.some(x=>!refs.map.has(x))))
  return issue('NOT_EVALUATED','CRITICAL_FAILURE_EVIDENCE_REQUIRED');
 const {values,grades,unknown,raw}=graded;
 if(unknown.length>=4)return issue('INVALID','FOUR_OR_MORE_UNKNOWN_FIELDS');
 const evidence=[100,95,85,75][unknown.length];
 const need=values.n1StructuralNeed+values.n2NeedDurability;
 const needCap=need===0?40:need<=5?60:100;
 const conversion=values.c1MarketCapture+values.c2EconomicCapture+values.e1Execution+values.e2ConstraintSolving;
 const conversionCap=conversion<=10?50:conversion<=15?65:100;
 const durability=values.d1MoatStrength+values.d2MoatDurability;
 const durabilityCap=durability===0?55:durability<=5?70:100;
 const executionFailure=input.criticalExecutionFailureConfirmed?40:100;
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(raw,evidence,needCap,conversionCap,durabilityCap,executionFailure)),raw:round1(raw),
  gates:{need:needCap,valueConversion:conversionCap,durability:durabilityCap,criticalExecutionFailure:executionFailure,evidence},unknownCount:unknown.length,fieldGrades:grades,
  warning:'FUTURE_THESIS_AND_FACTS_DECLARED_BY_INPUT_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

// LCSS v4 PDF pp. 2-13: 10 weight-fixed fields, NA reweighting, EXACTLY
// five final caps. Financial/insurance/REIT branch calculations are deferred:
// their specialized B1/C1/C2 and liquidity assessments cannot safely inherit
// the general-company cash-runway rule.
export function calculateLcss(input,{asOf,sources}={}){
 if(!input)return issue('NOT_EVALUATED','SCORE_INPUT_MISSING');
 if(!dateWithZone(asOf))return issue('INPUT_INVALID','ASOF_KST_REQUIRED');
 const refs=checkSources(sources,asOf);if(refs.error)return issue('INPUT_INVALID',refs.error);
 if(!['GENERAL','BANK_BROKER','INSURANCE','REIT'].includes(input.branch))return issue('INPUT_INVALID','SECTOR_BRANCH_REQUIRED');
 if(input.branch!=='GENERAL')return issue('NOT_EVALUATED','SECTOR_SPECIFIC_BRANCH_NEEDS_IMPLEMENTATION');
 if(!input.issuerIdentityConfirmed||!input.currencyConfirmed||!input.secStatementAndEventsReviewed)return issue('INVALID','IDENTITY_CURRENCY_OR_SEC_STATEMENTS_UNVERIFIED');
 if(!Number.isInteger(input.sourcePackCount)||input.sourcePackCount<1||input.sourcePackCount>4)return issue('INPUT_INVALID','MAX_FOUR_SOURCE_PACKS');
 const grades=['0','0.25','0.5','0.75','1','NA'];
 const factors={},missing=[],total=[];
 for(const {field,weight} of byId.get('LCSS').dimensions){
  const item=input.fields?.[field];
  if(!item||!grades.includes(item.grade))return issue('NOT_EVALUATED',`FIELD_MISSING_OR_GRADE_INVALID_${field}`);
  if(item.grade==='NA'){missing.push(field);continue}
  if(!Array.isArray(item.evidenceRefs)||!item.evidenceRefs.length||item.evidenceRefs.some(ref=>!refs.map.has(ref)))return issue('NOT_EVALUATED',`FIELD_EVIDENCE_NOT_FOUND_${field}`);
  if(item.grade==='0'&&item.crisisEvidenceConfirmed!==true)return issue('NOT_EVALUATED',`ZERO_GRADE_CRISIS_NOT_CONFIRMED_${field}`);
  factors[field]=Number(item.grade);total.push([weight,Number(item.grade)]);
 }
 const count=total.length;
 if(count<5)return issue('INVALID-DATA','FEWER_THAN_FIVE_VALID_FIELDS');
 const coreMissing=['cashGenerationRunway','debtCapitalBurden','nearTermFundingGap','lossEarningsBurden'].filter(x=>missing.includes(x));
 if(coreMissing.length>=2)return issue('INVALID-DATA','TWO_OR_MORE_CRITICAL_FIELDS_MISSING');
 if(input.capitalDestructionReviewed!==true)return issue('NOT_EVALUATED','CAPITAL_DESTRUCTION_NOT_REVIEWED');
 if(factors.capitalReturnConservation===0&&!input.capitalDestructionConfirmed)return issue('NOT_EVALUATED','E1_ZERO_REQUIRES_CAPITAL_DESTRUCTION_EVIDENCE');
 const boolFields=['fcfNonnegative','goingConcernUnresolved','goingConcernCrisisConfirmed','materialDebtMaturity12m',
  'maturityExceedsLiquidPlusCommittedRevolver','completedRefinancing','survivalFinancingEventCountVerified'];
 if(boolFields.some(key=>typeof input[key]!=='boolean')||input.survivalFinancingEventCountVerified!==true)
  return issue('NOT_EVALUATED','FIVE_GATE_FACTS_NOT_FULLY_REVIEWED');
 if(!Number.isInteger(input.survivalFinancingEvents24m)||input.survivalFinancingEvents24m<0||
  !finite(input.netDilution24mPct))return issue('NOT_EVALUATED','SURVIVAL_FINANCING_OR_DILUTION_DATA_MISSING');
 if(!input.fcfNonnegative&&(!finite(input.runwayMonths)||input.runwayMonths<0))return issue('NOT_EVALUATED','NEGATIVE_FCF_RUNWAY_DATA_MISSING');
 const raw=100*total.reduce((s,[w,v])=>s+w*v,0)/total.reduce((s,[w])=>s+w,0);
 const evidence=Math.min(count>=9?100:count===8?90:count===7?80:count===6?70:60,
  coreMissing.length===1?75:100);
 const runway=input.fcfNonnegative||input.runwayMonths>=24?100:input.runwayMonths>=18?85:input.runwayMonths>=12?75:input.runwayMonths>=6?60:45;
 const goingConcern=input.goingConcernUnresolved?(input.goingConcernCrisisConfirmed?25:35):100;
 const nearTermFundingCrisis=input.materialDebtMaturity12m&&input.maturityExceedsLiquidPlusCommittedRevolver&&
  !input.fcfNonnegative&&!input.completedRefinancing?50:100;
 const survivalFinancing=input.survivalFinancingEventCountVerified&&input.survivalFinancingEvents24m>=3&&
  input.netDilution24mPct>15&&!input.fcfNonnegative&&input.runwayMonths<18?60:100;
 const cap=Math.min(evidence,runway,goingConcern,nearTermFundingCrisis,survivalFinancing);
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(clamp(Math.min(raw,cap))),raw:round1(raw),
  validFields:count,missingFields:missing,gates:{evidence,runway,goingConcern,nearTermFundingCrisis,survivalFinancing},
  warning:'SEC_FACTS_AND_SECTOR_BRANCH_DECLARED_BY_INPUT_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

// Innovation PDF pp. 1-11: 7 fields, 1/0.5-P/0.5-U/0 grading;
// core, proof and unknown caps are part of the original formula.
export function calculateInnovation(input,{asOf,sources}={}){
 if(!input)return issue('NOT_EVALUATED','SCORE_INPUT_MISSING');
 if(!dateWithZone(asOf))return issue('INPUT_INVALID','ASOF_KST_REQUIRED');
 const refs=checkSources(sources,asOf);if(refs.error)return issue('INPUT_INVALID',refs.error);
 if(!input.coreBusinessConfirmed)return issue('NOT_EVALUATED','CORE_BUSINESS_NOT_CONFIRMED');
 const documentCount=input.documentCount;
 if(!Number.isInteger(documentCount)||documentCount<1||documentCount>5)return issue('INPUT_INVALID','DOCUMENT_BUDGET_1_TO_5_REQUIRED');
 const ranks={'0':0,'0.5-P':0.5,'0.5-U':0.5,'1':1};
 const values={},grades={},unknown=[];
 for(const {field,weight} of byId.get('INNOVATION').dimensions){
  const item=input.fields?.[field];
  if(!item||!Object.hasOwn(ranks,item.grade))return issue('NOT_EVALUATED',`FIELD_MISSING_OR_GRADE_INVALID_${field}`);
  const evidenceRefs=item.evidenceRefs||[];
  if(!Array.isArray(evidenceRefs)||evidenceRefs.some(x=>typeof x!=='string'||!refs.map.has(x)))return issue('INPUT_INVALID',`UNREGISTERED_SOURCE_${field}`);
  if(item.grade!=='0.5-U'&&evidenceRefs.length===0)return issue('NOT_EVALUATED',`EVIDENCE_MISSING_${field}`);
  if(item.grade==='0.5-U'&&!input.searchExhausted)return issue('NOT_EVALUATED','UNKNOWN_REQUIRES_RESEARCH_EXHAUSTION');
  if(item.grade==='0.5-U')unknown.push(field);
  values[field]=weight*ranks[item.grade];grades[field]=item.grade;
 }
 if(unknown.length>=3)return issue('INVALID','THREE_OR_MORE_UNKNOWN_FIELDS',{unknownCount:unknown.length});
 const raw=Object.values(values).reduce((s,x)=>s+x,0);
 const core=values.novelty+values.discontinuity+values.replacement;
 const coreCap=core<=7.5?45:core<=15?60:core<=22.5?75:100;
 const proof=(grades.commercialProof==='0.5-U'?0:values.commercialProof)+(grades.externalValidation==='0.5-U'?0:values.externalValidation);
 const proofCap=proof===0?40:proof<=7.5?50:proof<=15?70:proof<=22.5?85:100;
 const unknownCap=unknown.length===2?75:unknown.length===1?90:100;
 const cap=Math.min(coreCap,proofCap,unknownCap);
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(raw,cap)),raw:round1(raw),
  gates:{core:coreCap,proof:proofCap,unknown:unknownCap},unknownCount:unknown.length,fieldGrades:grades,
  warning:'SOURCE_URL_AND_GRADE_DECLARED_BY_INPUT_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

function earningsEventValue(actual,estimate){
 if(!finite(actual)||!finite(estimate))return null;
 return actual>estimate?1:actual===estimate?0.5:0;
}
function maxStreak(values){
 let run=0,max=0;
 for(const value of values){if(value===0){run++;max=Math.max(run,max)}else if(value!==null)run=0}
 return max;
}

// EAS PDF pp. 1-13. No SEC-to-consensus substitution or cross-provider mixing.
export function calculateEas(input,{asOf,sources}={}){
 if(!input)return issue('NOT_EVALUATED','SCORE_INPUT_MISSING');
 if(!dateWithZone(asOf))return issue('INPUT_INVALID','ASOF_KST_REQUIRED');
 const refs=checkSources(sources,asOf);if(refs.error)return issue('INPUT_INVALID',refs.error);
 const evidence=refs.map.get(input.sourceId);
 if(!evidence||!/(^|\.)tipranks\.com$/.test(evidence.hostname))return issue('INPUT_INVALID','TIPRANKS_EARNINGS_HISTORY_ONLY');
 if(!input.issuerIdentityConfirmed||!input.completePublishedHistoryWindow)return issue('NOT_EVALUATED','ISSUER_OR_HISTORY_COMPLETENESS_UNCONFIRMED');
 const quarters=input.quarters;
 if(!Array.isArray(quarters)||quarters.length===0)return issue('INVALID','NO_REPORTED_QUARTERS');
 if(quarters.length>8)return issue('INPUT_INVALID','MAX_EIGHT_PUBLISHED_QUARTERS');
 const seen=new Set(),events=[];
 for(const q of quarters){
  if(!q||typeof q.quarter!=='string'||q.quarter.length>40||seen.has(q.quarter))return issue('INPUT_INVALID','DUPLICATE_OR_INVALID_QUARTER');
  seen.add(q.quarter);
  if(!dateWithZone(q.reportedAt)||Date.parse(q.reportedAt)>Date.parse(asOf))return issue('INVALID','FUTURE_OR_UNDATED_EARNINGS');
  for(const kind of ['eps','revenue'])for(const key of ['forecast','actual'])if(q[kind]?.[key]!==null&&q[kind]?.[key]!==undefined&&!finite(q[kind][key]))return issue('INPUT_INVALID',`INVALID_${kind}_${key}`);
  events.push({at:q.reportedAt,eps:earningsEventValue(q.eps?.actual,q.eps?.forecast),revenue:earningsEventValue(q.revenue?.actual,q.revenue?.forecast)});
 }
 events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const counts={};let totalValid=0;
 for(const kind of ['eps','revenue']){
  const valid=events.map(x=>x[kind]).filter(x=>x!==null);totalValid+=valid.length;
  counts[kind]={valid:valid.length,attendance:valid.length?100*valid.reduce((s,v)=>s+v,0)/valid.length:null,maxMiss:maxStreak(events.map(x=>x[kind]))};
 }
 if(totalValid===0)return issue('INVALID','NO_VALID_EPS_OR_REVENUE');
 const base=counts.eps.valid&&counts.revenue.valid?(counts.eps.attendance+counts.revenue.attendance)/2:(counts.eps.attendance??counts.revenue.attendance);
 const maxConsecMiss=Math.max(counts.eps.maxMiss,counts.revenue.maxMiss);
 const penalty=maxConsecMiss>=4?15:maxConsecMiss===3?10:maxConsecMiss===2?5:0;
 const q=events.length;
 const historyCap=q>=7?100:q>=5?95:q>=3?85:70;
 const balance=Math.min(counts.eps.valid/q,counts.revenue.valid/q);
 const balanceCap=balance>=0.75?100:balance>=0.5?90:balance>=0.25?80:70;
 const score=round1(clamp(Math.min(base-penalty,historyCap,balanceCap)));
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score,raw:round1(base),quarterCount:q,
  coverage:{eps:counts.eps.valid/q,revenue:counts.revenue.valid/q},attendance:{eps:counts.eps.attendance,revenue:counts.revenue.attendance},
  maxConsecutiveMiss:maxConsecMiss,streakPenalty:penalty,gates:{history:historyCap,balancedEvidence:balanceCap},
  warning:'TIPRANKS_VALUES_DECLARED_BY_INPUT_NOT_INDEPENDENTLY_AUTHENTICATED'};
}

const gap=(price,average)=>(price/average-1)*100;
function scoreTbas(input){
 const {price,ema20,sma50,sma200,rsi14,macdSignal,macdValue,stochRsiSignal,stochRsi,adx14,williamsR,cci14,atr14}=input;
 const emaGap=gap(price,ema20),sma50Gap=gap(price,sma50),sma200Gap=gap(price,sma200),atrPct=atr14/price*100;
 const ema=emaGap>=-2&&emaGap<=3?15:emaGap>3&&emaGap<=6?12:emaGap>=-5&&emaGap< -2?10:emaGap>6&&emaGap<=10?8:emaGap>=-10&&emaGap< -5?5:emaGap>10&&emaGap<=15?4:emaGap>15?1:0;
 const sma50Score=sma50Gap>=0&&sma50Gap<=5?10:sma50Gap>=-3&&sma50Gap<0?8:sma50Gap>5&&sma50Gap<=12?7:sma50Gap>=-8&&sma50Gap< -3?4:sma50Gap>12&&sma50Gap<=20?4:sma50Gap>20?2:0;
 const sma200Score=price>sma200?(sma50>sma200?10:6):sma200Gap>=-5?4:sma200Gap>=-10?2:0;
 const rsi=rsi14>=45&&rsi14<=60?15:rsi14>=35&&rsi14<45?12:rsi14>60&&rsi14<=67?11:rsi14>=30&&rsi14<35?9:rsi14>67&&rsi14<=70?7:rsi14<30?5:rsi14>70&&rsi14<=75?3:0;
 const macd=macdSignal==='BUY'?(macdValue<=0?15:12):macdSignal==='NEUTRAL'?7:macdValue>0?5:0;
 const stoch=stochRsiSignal==='BUY'?10:stochRsiSignal==='NEUTRAL'?5:stochRsiSignal==='SELL'?0:stochRsi<=20?7:stochRsi<=50?8:stochRsi<=80?5:1;
 const trend=price>sma50&&macdSignal==='BUY'?'BULL':price<sma50&&macdSignal==='SELL'?'BEAR':'MIXED';
 const adx=trend==='BULL'?(adx14>=20&&adx14<=40?8:adx14>40?7:5):trend==='MIXED'?4:adx14<25?2:0;
 const williams=williamsR>=-80&&williamsR<=-50?6:williamsR> -50&&williamsR<=-20?5:williamsR< -80?4:1;
 const cci=cci14>=-100&&cci14<=0?6:cci14>0&&cci14<=100?5:cci14< -100?4:cci14>100&&cci14<=200?2:0;
 const atr=atrPct<=2?5:atrPct<=4?4:atrPct<=6?3:atrPct<=8?2:atrPct<=10?1:0;
 const parts={ema20:ema,sma50:sma50Score,sma200:sma200Score,rsi14:rsi,macd,stochRsi:stoch,adx14:adx,williamsR:williams,cci14:cci,atrPct:atr};
 const raw=Object.values(parts).reduce((s,n)=>s+n,0);
 const fallingKnife=price<sma50&&price<sma200&&macdSignal==='SELL'&&rsi14<40;
 const structuralBear=ema20<sma50&&sma50<sma200&&price<sma200;
 const stochOverheat=stochRsiSignal==='SELL'||finite(stochRsi)&&stochRsi>80;
 const overheat=[rsi14>75,stochOverheat,emaGap>10,cci14>200].filter(Boolean).length>=3;
 const elite=price>sma50&&price>sma200&&macdSignal==='BUY'&&rsi14>=35&&rsi14<=67&&emaGap<=6&&atrPct<=8;
 const cap=Math.min(fallingKnife?49.9:100,structuralBear?59.9:100,overheat?69.9:100,elite?100:89.9);
 return {status:'CALCULATED_FROM_DECLARED_EVIDENCE',score:round1(Math.min(raw,cap)),raw,gates:{fallingKnife:fallingKnife?49.9:100,structuralBear:structuralBear?59.9:100,overheat:overheat?69.9:100,eliteEntry:elite?100:89.9},fields:parts};
}

// TBAS PDF pp. 3-11. Never fetch Investing/TradingView automatically or mix
// sources. 35-199 day special-case gate interpretation is explicitly held
// rather than claiming a full faithful implementation before branch audit.
export function calculateTbas(input,{asOf,sources}={}){
 if(!input)return issue('NOT_EVALUATED','SCORE_INPUT_MISSING');
 if(!dateWithZone(asOf))return issue('INPUT_INVALID','ASOF_KST_REQUIRED');
 const refs=checkSources(sources,asOf);if(refs.error)return issue('INPUT_INVALID',refs.error);
 const quoteSource=refs.map.get(input.sourceId);
 if(!quoteSource)return issue('INPUT_INVALID','PRICE_SOURCE_UNREGISTERED');
 if(!['INVESTING_DAILY_TECHNICALS','TRADINGVIEW_DAILY_TECHNICALS','YAHOO_FULL_DAILY_OHLCV_CALCULATED'].includes(input.sourceMode))return issue('INPUT_INVALID','SOURCE_MODE_INVALID');
 const host=quoteSource.hostname;
 const expectedHost=input.sourceMode==='INVESTING_DAILY_TECHNICALS'?'investing.com':
  input.sourceMode==='TRADINGVIEW_DAILY_TECHNICALS'?'tradingview.com':'yahoo.com';
 if(!(host===expectedHost||host.endsWith(`.${expectedHost}`)))return issue('INPUT_INVALID','PRICE_SOURCE_VENDOR_MISMATCH');
 if(!input.sameTickerAndSourceConfirmed||!input.regularSessionDailyConfirmed||!input.issuerIdentityConfirmed)return issue('NOT_EVALUATED','SYMBOL_OR_SOURCE_UNVERIFIED');
 if(!Number.isInteger(input.tradingDays)||input.tradingDays<0)return issue('INPUT_INVALID','TRADING_DAYS_REQUIRED');
 if(input.tradingDays<35)return issue('INVALID-DATA','LESS_THAN_35_TRADING_DAYS');
 if(input.tradingDays<200)return issue('NOT_EVALUATED','IPO_SHORT_HISTORY_BRANCH_NEEDS_IMPLEMENTATION');
 if(!dateWithZone(input.indicatorAsOf)||Date.parse(input.indicatorAsOf)>Date.parse(asOf))return issue('INVALID-DATA','INDICATOR_FUTURE_OR_UNDATED');
 const keys=['price','ema20','sma50','sma200','rsi14','macdValue','adx14','williamsR','cci14','atr14'];
 if(keys.some(k=>!finite(input[k])))return issue('NOT_EVALUATED','MANDATORY_INDICATOR_MISSING');
 if([input.price,input.ema20,input.sma50,input.sma200].some(v=>v<=0)||input.atr14<0||input.adx14<0||input.rsi14<0||input.rsi14>100||input.williamsR< -100||input.williamsR>0)return issue('INPUT_INVALID','INDICATOR_OUT_OF_RANGE');
 if(!['BUY','NEUTRAL','SELL'].includes(input.macdSignal))return issue('INPUT_INVALID','MACD_SIGNAL_INVALID');
 if(input.stochRsiSignal!==null&&!['BUY','NEUTRAL','SELL'].includes(input.stochRsiSignal))return issue('INPUT_INVALID','STOCH_SIGNAL_INVALID');
 if(input.stochRsiSignal===null&&(!finite(input.stochRsi)||input.stochRsi<0||input.stochRsi>100))return issue('INPUT_INVALID','STOCH_RSI_REQUIRED');
 const result=scoreTbas(input);
 return {...result,warning:'INDICATORS_DECLARED_BY_INPUT_NOT_INDEPENDENTLY_AUTHENTICATED; NO_MARKET_DATA_RIGHTS_INFERRED'};
}

const calculators={INNOVATION:calculateInnovation,TPVS:calculateTpvs,TAS:calculateTas,RRS:calculateRrs,
 PS:calculatePs,PAS:calculatePas,SS:calculateSs,FVS:calculateFvs,EAS:calculateEas,
 BMS:calculateBms,TEE:calculateTee,RAS:calculateRas,IPLS:calculateIpls,LCSS:calculateLcss,TBAS:calculateTbas};
function extractNewsEvidence(newsEvents,sourceMap,asOf){
 if(!Array.isArray(newsEvents)||newsEvents.length>40)throw Error('R22_NEWS_EVENTS_INVALID');
 const seen=new Set(),positiveEvidence=[],negativeEvidence=[];
 for(const event of newsEvents){
  if(!event||typeof event.id!=='string'||!/^[A-Za-z0-9_-]{1,32}$/.test(event.id)||seen.has(event.id))throw Error('R22_NEWS_ID_INVALID');
  seen.add(event.id);
  if(!['POSITIVE','NEGATIVE'].includes(event.polarity))throw Error('R22_NEWS_POLARITY_INVALID');
  if(!dateWithZone(event.eventAt)||Date.parse(event.eventAt)>Date.parse(asOf))throw Error('R22_NEWS_FUTURE_OR_UNDATED');
  if(!Array.isArray(event.sourceIds)||!event.sourceIds.length||event.sourceIds.some(s=>!sourceMap.has(s)))
   throw Error('R22_NEWS_SOURCE_REQUIRED');
  const safe={id:event.id,eventAt:event.eventAt,sourceIds:[...new Set(event.sourceIds)],
   factCheck:'DECLARED_NOT_INDEPENDENTLY_VERIFIED'};
  (event.polarity==='POSITIVE'?positiveEvidence:negativeEvidence).push(safe);
 }
 return {status:'EVENT_EVIDENCE_RECORDED_BONUS_RULE_NOT_CONFIGURED',mode:'EXTERNAL_INVESTMENT_ADJUSTMENT_NOT_ONE_OF_15',
  adjustment:null,positiveEvidence,negativeEvidence,
  note:'NEWS_SOURCE_LINKS_ARE_NOT_PROOF_OF_ARTICLE_CONTENT_OR_REUSE_LICENSE'};
}

export function evaluateCompanyScorecards({ticker,asOf,sources=[],inputs={},newsEvents=[]}={}){
 if(typeof ticker!=='string'||!/^[A-Z][A-Z0-9.-]{0,14}$/.test(ticker))throw Error('R22_TICKER_REQUIRED');
 if(!dateWithZone(asOf))throw Error('R22_ASOF_KST_REQUIRED');
 if(!inputs||typeof inputs!=='object'||Array.isArray(inputs))throw Error('R22_INPUTS_INVALID');
 const sourceCheck=checkSources(sources,asOf);
 if(sourceCheck.error)throw Error(sourceCheck.error);
 const newsAdjustment=extractNewsEvidence(newsEvents,sourceCheck.map,asOf);
 const scorecards=SCORECARD_CATALOG.map(spec=>{
  const calc=calculators[spec.id];
  const result=calc?calc(inputs[spec.id],{asOf,sources}):issue('NOT_EVALUATED','EXACT_SCORING_GATES_NOT_IMPLEMENTED');
  return {id:spec.id,name:spec.name,standard:spec.standard,implementation:spec.implementation,...result};
 });
 return {version:'TOSS_R22_15_SCORECARDS_READONLY',ticker,asOf,
  status:scorecards.every(s=>s.status==='CALCULATED_FROM_DECLARED_EVIDENCE')?'CALCULATED':'PARTIAL_IMPLEMENTATION_OR_EVIDENCE',
  methodologicalSource:'USER_15_ORIGINAL_SCORE_PDFS',scorecards,
  combinedInvestmentScore:{status:'NOT_CONFIGURED_BY_USER',score:null,weights:null},
  newsAdjustment,
  constraints:{readOnly:true,tradeDecision:'NOT_PERFORMED',secCursor:'UNCHANGED',r21Runtime:'UNCHANGED',
   externalSourceAuthenticity:'NOT_INDEPENDENTLY_VERIFIED',sourceRights:'NOT_INFERRED_FROM_URL',
   missingData:'NOT_ZERO',noHistoricalAumCollection:true}};
}

export function annotateR20ScorecardReadiness(report){
 if(!report||report.version!=='ZGMINI_TOSS_R20_UNIVERSAL_READONLY'||!Array.isArray(report.companies))
  throw Error('R20_SCORECARD_COMPATIBILITY_INVALID');
 const instant=Date.parse(report.createdAt);
 if(!Number.isFinite(instant))throw Error('R20_INVALID_REPORT_TIMESTAMP');
 const kst=new Date(instant+9*3600_000).toISOString();
 const asOf=`${kst.slice(0,19)}+09:00`;
 // Do not derive qualitative scores from financial fact transcription.
 report.companyScorecards=report.companies.map(company=>{
  const result=evaluateCompanyScorecards({ticker:company.symbol,asOf,sources:[],inputs:{},newsEvents:[]});
  return {symbol:company.symbol,cik:company.cik||null,status:'EVIDENCE_RESEARCH_REQUIRED',
   scores:result.scorecards.map(s=>({id:s.id,score:s.score,status:s.status,reason:s.reason})),
   newsBonus:result.newsAdjustment.adjustment,
   reason:'SEC_EXTRACTS_AND_MODEL_TRANSCRIPTION_DO_NOT_GRADE_OR_VERIFY_ORIGINAL_PDF_FACTORS'};
 });
 report.companyScorecardsMethod={version:'USER_15_ORIGINAL_PDF_STANDARDS',
  originalScorecards:SCORECARD_CATALOG.map(s=>({id:s.id,name:s.name,implementation:s.implementation})),
  combinedScore:'NOT_APPROVED',newsBonus:'NOT_APPROVED',autoEvidenceCoverage:'NOT_VERIFIED',
  noAdditionalPersistentInputFiles:true,noTrades:true};
 return report;
}
