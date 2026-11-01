import {hash} from './d1.mjs';
import {generateBeginnerExplanation} from './beginner-explainer.mjs';

const TOPIC_BY_ID=Object.freeze({
 inflation:'inflation',
 recession:'recession',
 liquidityCrisis:'liquidity-crisis',
 creditRisk:'credit-risk',
 debtRisk:'debt-risk',
 assetBubble:'asset-bubble',
 supplyShock:'supply-shock',
 earningsRecession:'earnings-recession',
});

const safetyStage=(score,watch,risk)=>score>=75?'매우 양호':score>=60?'양호':score>=45?'중립':score>=25?watch:risk;
const CONFIG=Object.freeze({
 inflation:{title:'물가 안정성',importance:'물가가 높으면 연준이 금리를 오래 높게 유지할 가능성이 커집니다. 반대로 물가가 안정되면 금리 부담이 완화될 여지가 생깁니다.',marketImpact:'물가 안정은 성장주·장기채 등 금리에 민감한 자산에 우호적일 수 있습니다. 반대로 물가 재상승은 금리 인하 기대를 약화시킬 수 있습니다.',highMeaning:'높을수록 물가가 안정 방향에 가깝다는 뜻입니다.',stage:score=>score>=75?'매우 안정':score>=60?'안정':score>=45?'중립':score>=25?'물가 압력':'강한 물가 압력',factorNames:{CORE_PCE:'Core PCE',CORE_CPI:'Core CPI',CORE_CPI_3M:'Core CPI 3M',MEDIAN_CPI:'Median CPI',TRIM16_CPI:'16% Trimmed Mean CPI',HEADLINE_PCE:'Headline PCE',INF_EXPECT:'5Y 기대 인플레이션',PPI_FINAL:'PPI Final Demand',PPI_CORE_FD:'Core PPI Final Demand',IMPORT_EX_FUEL:'수입물가 ex Fuel',WTI:'WTI',GASOLINE:'미국 휘발유',WAGE_YOY:'평균 시간당 임금',ECI_COST:'Employment Cost Index',UNIT_LABOR_COST:'Unit Labor Cost',INDPRO:'산업생산'}},
 recession:{title:'경기 방어',importance:'경기침체는 기업 매출과 이익, 고용, 소비를 동시에 약화시킬 수 있습니다. 한 지표보다 여러 경제활동 지표가 함께 약해지는지를 보는 것이 중요합니다.',marketImpact:'경기 방어가 약해지면 경기민감주와 신용자산에 부담이 될 수 있습니다. 반대로 방어력이 유지되면 실적과 소비가 버틸 가능성이 커집니다.',highMeaning:'높을수록 경기 방어력이 양호한 방향입니다.',stage:score=>safetyStage(score,'침체 주의','침체 위험'),factorNames:{nfp:'비농업고용',realGdp:'실질 GDP',industrialProduction:'산업생산',realPce:'실질 PCE',sahmGap:'Sahm Gap',retailSales:'실질 소매판매',disposableIncome:'실질 가처분소득',initialClaims:'신규 실업수당 4W',yieldCurve:'장단기 금리차',hyCreditStress:'HY 신용 스트레스',creditConditions:'신용여건'}},
 'liquidity-crisis':{title:'유동성 방어',importance:'금융시장은 현금과 담보가 원활하게 돌 때 정상적으로 작동합니다. 단기자금시장이나 은행 준비금이 급격히 경색되면 자산가격 변동성이 커질 수 있습니다.',marketImpact:'유동성 경색은 주식·회사채 등 위험자산 전반에 빠르게 부담을 줄 수 있습니다. 자금시장이 안정되면 급격한 금융 스트레스 가능성이 낮아집니다.',highMeaning:'높을수록 자금시장과 유동성 환경이 안정적인 방향입니다.',stage:score=>safetyStage(score,'유동성 주의','위기 위험'),factorNames:{sofrIorb:'SOFR−IORB 스프레드',obfrIorb:'OBFR−IORB 스프레드',repoGap:'DVP−Tri-Party Repo 격차',sofrIorbRv20:'SOFR−IORB 20일 변동성',bankEmergency:'은행 비상대출 비율',bankReserves:'은행 준비금',tga:'TGA 4주 변화',onRrp:'ON RRP 20영업일 변화',m2:'M2 YoY',bond2y:'미국 2년물 변동성',bond5y:'미국 5년물 변동성',bond10y:'미국 10년물 변동성',bond30y:'미국 30년물 변동성'}},
 'credit-risk':{title:'신용시장 방어',importance:'신용위험은 기업이 돈을 빌리는 비용과 직결됩니다. 회사채 스트레스와 채권 변동성이 커지면 기업의 자금조달이 어려워질 수 있습니다.',marketImpact:'신용 스트레스 확대는 특히 재무구조가 약한 기업과 경기민감주에 부담이 될 수 있습니다. 신용시장이 안정되면 위험자산의 자금조달 환경이 개선됩니다.',highMeaning:'높을수록 회사채와 신용시장이 안정적인 방향입니다.',stage:score=>safetyStage(score,'신용 주의','신용 위험'),factorNames:{hyCmdi:'HY CMDI',igCmdi:'IG CMDI',totalCmdi:'Total CMDI',bondVolatility:'채권 변동성',nfciCredit:'NFCI Credit',bond2y:'미국 2년물 변동성',bond5y:'미국 5년물 변동성',bond10y:'미국 10년물 변동성',bond30y:'미국 30년물 변동성'}},
 'debt-risk':{title:'부채 안전성',importance:'부채가 많아도 소득과 이익이 충분하면 버틸 수 있지만, 금리와 원리금 부담이 동시에 커지면 경기 충격에 취약해집니다.',marketImpact:'부채 부담 확대는 소비와 기업투자를 줄이고 신용손실 위험을 높일 수 있습니다. 상환여력이 개선되면 금융시장 충격에 대한 완충력이 커집니다.',highMeaning:'높을수록 가계·기업의 부채 부담을 감당하기 쉬운 방향입니다.',stage:score=>safetyStage(score,'부채 주의','부채 위험'),factorNames:{dsr:'Debt Service Ratio',debtGdp:'민간부채/GDP',rateBurden:'금리부담',creditStress:'신용스트레스',debtServiceCapacity:'부채상환능력'}},
 'asset-bubble':{title:'버블 방어',importance:'가격이 오르는 것 자체가 버블은 아닙니다. 밸류에이션, 가격가속, 투기성 자금, 시장 참여 폭과 유동성이 함께 과열되는지 봐야 합니다.',marketImpact:'버블 위험이 커지면 작은 충격에도 가격 조정 폭이 커질 수 있습니다. 과열이 완화되면 시장의 상승 기반이 더 건강해질 수 있습니다.',highMeaning:'높을수록 과열과 버블 위험이 낮은 방향입니다.',stage:score=>safetyStage(score,'버블 주의','버블 위험'),factorNames:{valuationPressure:'밸류에이션 압력',priceAcceleration:'가격가속',riskAssetShare:'위험자산 비중',speculativeFlows:'투기성 자금흐름',breadthDivergence:'시장폭 괴리',excessLiquidity:'과잉유동성'}},
 'supply-shock':{title:'공급 충격 방어',importance:'공급망이나 에너지 공급이 흔들리면 생산비와 물가가 동시에 올라 경기와 기업이익에 부담을 줄 수 있습니다.',marketImpact:'공급 충격 확대는 원가 부담과 인플레이션을 동시에 높여 주식시장에 불리할 수 있습니다. 공급 여건 안정은 비용 압력을 완화하는 데 도움이 됩니다.',highMeaning:'높을수록 공급망·에너지 충격 위험이 낮은 방향입니다.',stage:score=>safetyStage(score,'공급 주의','공급 충격 위험'),factorIds:['G','E','O','P','I'],factorNames:{G:'글로벌 공급망 압력',E:'미국 석유 공급 제약',O:'에너지 가격 충격',P:'공급 주도 물가 압력',I:'산업생산 충격'}},
 'earnings-recession':{title:'기업 실적 방어',importance:'주가는 장기적으로 기업이 벌어들이는 이익과 현금흐름의 영향을 크게 받습니다. 매출·마진·이익 개선이 시장 전반으로 퍼지는지 함께 봐야 합니다.',marketImpact:'실적 방어가 약해지면 주가 밸류에이션을 지지하기 어려워질 수 있습니다. 반대로 이익과 매출 개선이 넓게 확산되면 주식시장의 펀더멘털 기반이 강해집니다.',highMeaning:'높을수록 미국 기업 실적이 양호한 방향입니다.',stage:score=>safetyStage(score,'실적 주의','실적 침체 위험'),factorNames:{epsGrowth:'EPS 성장률',margin:'영업이익률',revenueGrowth:'매출 성장률',earningsGrowthBreadth:'이익 성장 종목 비율',S1:'EPS 성장 강도',S2:'매출 성장률',S3:'영업이익률 수준',S4:'영업이익률 변화',S5:'FCF 마진',S6:'BEA 기업이익',S7:'EPS 개선 기업 비율',S8:'흑자 기업 비율',S9:'이익 개선 업종 비율',S10:'생산자 원가 압력',S11:'단위노동비용 압력',S12:'미래 전망 수정',S13:'기업 가이던스 방향'}},
});

const finiteScore=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
function factorRows(topic,payload){
 if(topic==='inflation')return Object.entries(payload?.features??{}).map(([id,row])=>({id,...(row??{})}));
 if(topic==='recession')return [...(payload?.components??[]),...(payload?.supplementals??[])];
 if(topic==='credit-risk')return [...(payload?.core??[]),...(payload?.supplementals??[])];
 if(topic==='earnings-recession')return payload?.storedE1?.indicators??[];
 return payload?.indicators??[];
}

export function buildBeginnerInput(id,payload){
 const topic=TOPIC_BY_ID[id];if(!topic)return null;
 const config=CONFIG[topic],score=finiteScore(payload?.score);if(score===null)return null;
 const allowed=config.factorIds?new Set(config.factorIds):null;
 const factors=factorRows(topic,payload).flatMap(row=>{
  const factorId=String(row?.id??''),factorScore=finiteScore(row?.score);
  if(!factorId||factorScore===null||!config.factorNames[factorId]||(allowed&&!allowed.has(factorId)))return [];
  if(row?.status&&row.status!=='READY')return [];
  return [{id:factorId,score:factorScore,name:config.factorNames[factorId]}];
 });
 const positiveFactors=factors.filter(x=>x.score>=60).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.name);
 const negativeFactors=factors.filter(x=>x.score<45).sort((a,b)=>a.score-b.score).slice(0,3).map(x=>x.name);
 const stage=config.stage(score);
 return {topic,score,stage,asOfDate:typeof payload?.asOfDate==='string'&&payload.asOfDate?payload.asOfDate:null,positiveFactors,negativeFactors,base:{summary:`현재 ${config.title} 점수는 ${score.toFixed(1)}점이며 ${stage} 구간입니다. ${config.highMeaning}`,whyItMatters:config.importance,marketMeaning:config.marketImpact}};
}

export function validPublicBeginnerCopy(copy){
 return !!copy&&copy.status==='COPY_ONLY'&&['summary','whyItMatters','marketMeaning','sourceHash','sourceVersion'].every(key=>typeof copy[key]==='string'&&copy[key].trim())&&/^[a-f0-9]{64}$/.test(copy.sourceHash)&&Number.isFinite(copy.sourceStoredAt)&&Number.isFinite(copy.generatedAt);
}

export async function resolveLocalOllamaDigest(fetcher,model='gemma3:4b'){
 const response=await fetcher('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('BEGINNER_OLLAMA_TAGS_FAILED');
 const body=await response.json();
 const found=Array.isArray(body?.models)?body.models.find(item=>item?.name===model||item?.model===model):null;
 if(typeof found?.digest!=='string'||!found.digest.trim())throw Error('BEGINNER_MODEL_DIGEST_NOT_FOUND');
 return found.digest.trim();
}

export async function enrichBeginnerPayload(id,payload,{checkpoint,existingCopy,fetcher,model='gemma3:4b',modelDigest,now=Date.now()}={}){
 if(!checkpoint||typeof checkpoint.sourceVersion!=='string'||!Number.isFinite(checkpoint.sourceStoredAt))throw Error('BEGINNER_SOURCE_CHECKPOINT_INVALID');
 const input=buildBeginnerInput(id,payload);if(!input)return {payload,status:'SKIPPED',sourceHash:null};
 const sourceHash=hash(input);
 if(validPublicBeginnerCopy(existingCopy)&&existingCopy.sourceHash===sourceHash){
  return {payload:{...payload,beginnerCopy:{...existingCopy,sourceVersion:checkpoint.sourceVersion,sourceStoredAt:checkpoint.sourceStoredAt}},status:'REUSED',sourceHash};
 }
 const digest=modelDigest??await resolveLocalOllamaDigest(fetcher,model);
 const result=await generateBeginnerExplanation(input,{fetcher,model,modelDigest:digest,now});
 const beginnerCopy={status:'COPY_ONLY',summary:result.copy.summary,whyItMatters:result.copy.whyItMatters,marketMeaning:result.copy.marketMeaning,sourceHash,sourceVersion:checkpoint.sourceVersion,sourceStoredAt:checkpoint.sourceStoredAt,generatedAt:result.generatedAt};
 return {payload:{...payload,beginnerCopy},status:'GENERATED',sourceHash,modelDigest:digest};
}
