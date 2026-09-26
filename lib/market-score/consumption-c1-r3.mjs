export const C1_R3_REVISION="R3.45P";
export const C1_R3_AXIS_MEMBERSHIP=Object.freeze({
  "Current Consumption": [
    "C1R2_001",
    "C1R2_002",
    "C1R2_003",
    "C1R2_004",
    "C1R2_005",
    "C1R2_006",
    "C1R2_007",
    "C1R2_008",
    "C1R2_009",
    "C1R2_010",
    "C1R2_011",
    "C1R2_012",
    "C1R2_013",
    "C1R2_015",
    "C1R2_017",
    "C1R2_018",
    "C1R2_019",
    "C1R2_020",
    "C1R2_021",
    "C1R2_022",
    "C1R2_023",
    "C1R2_024",
    "C1R2_025",
    "C1R2_026",
    "C1R2_027",
    "C1R2_028",
    "C1R2_029",
    "C1R2_030",
    "C1R2_031",
    "C1R2_032",
    "C1R2_033",
    "C1R2_034",
    "C1R2_035",
    "C1R2_036",
    "C1R2_037",
    "C1R2_143"
  ],
  "Income & Labor Capacity": [
    "C1R2_038",
    "C1R2_040",
    "C1R2_042",
    "C1R2_043",
    "C1R2_044",
    "C1R2_045",
    "C1R2_046",
    "C1R2_047",
    "C1R2_048",
    "C1R2_049",
    "C1R2_053",
    "C1R2_054",
    "C1R2_057"
  ],
  "Household Buffer": [
    "C1R2_060",
    "C1R2_061",
    "C1R2_062",
    "C1R2_063",
    "C1R2_064",
    "C1R2_065",
    "C1R2_066",
    "C1R2_067",
    "C1R2_068",
    "C1R2_069"
  ],
  "Credit Use & Capacity": [
    "C1R2_072",
    "C1R2_073",
    "C1R2_075",
    "C1R2_076",
    "C1R2_077",
    "C1R2_078",
    "C1R2_079",
    "C1R2_080",
    "C1R2_083",
    "C1R2_084",
    "C1R2_085",
    "C1R2_086",
    "C1R2_087",
    "C1R2_088",
    "C1R2_089",
    "C1R2_090",
    "C1R2_091"
  ],
  "Financial Stress": [
    "C1R2_093",
    "C1R2_094",
    "C1R2_096",
    "C1R2_097",
    "C1R2_099",
    "C1R2_100",
    "C1R2_101",
    "C1R2_106"
  ],
  "Credit Leading": [
    "C1R2_108",
    "C1R2_109",
    "C1R2_110",
    "C1R2_111",
    "C1R2_112",
    "C1R2_113"
  ],
  "Large Purchases": [
    "C1R2_149",
    "C1R2_150",
    "C1R2_151",
    "C1R2_152",
    "C1R2_153"
  ]
});
export const C1_R3_CORE95=Object.freeze(Object.values(C1_R3_AXIS_MEMBERSHIP).flat());
export const C1_R3_UI4=Object.freeze([
  Object.freeze({id:"C1R2_015",name:"실질 소매판매",role:"CURRENT_CONSUMPTION",source:"U.S. Census Bureau"}),
  Object.freeze({id:"C1R2_040",name:"실질 가처분소득",role:"INCOME_CAPACITY",source:"U.S. Bureau of Economic Analysis"}),
  Object.freeze({id:"C1R2_060",name:"개인저축률",role:"HOUSEHOLD_BUFFER",source:"U.S. Bureau of Economic Analysis"}),
  Object.freeze({id:"C1R2_096",name:"카드 연체율",role:"FINANCIAL_STRESS",source:"Federal Reserve"}),
]);

const finiteScore=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;

export function buildConsumptionC1R3({scoreRows=[],scoreDate=null,computedAt=null}={}){
  const byId=new Map();
  for(const row of scoreRows??[]){
    if(typeof row?.candidateId!=="string"||!finiteScore(row?.score))continue;
    if(!byId.has(row.candidateId))byId.set(row.candidateId,row);
  }
  const missing=C1_R3_CORE95.filter(id=>!byId.has(id));
  const axisScores={};
  for(const [axis,ids] of Object.entries(C1_R3_AXIS_MEMBERSHIP)){
    const values=ids.map(id=>byId.get(id)?.score);
    axisScores[axis]=values.every(finiteScore)?avg(values):null;
  }
  const axesReady=Object.values(axisScores).every(finiteScore);
  const indicators=C1_R3_UI4.map(spec=>{
    const row=byId.get(spec.id);
    return {
      id:spec.id,name:spec.name,role:spec.role,
      score:finiteScore(row?.score)?row.score:null,
      status:finiteScore(row?.score)?"READY":"UNAVAILABLE",
      observationDate:validDate(row?.observationDate)?row.observationDate:null,
      asOfDate:validDate(row?.observationDate)?row.observationDate:null,
      source:spec.source,
    };
  });
  if(missing.length||!axesReady){
    return {
      status:"PARTIAL",score:null,missingFactors:missing.length?missing:["C1_R3_AXIS_INCOMPLETE"],
      indicators,axisScores,trend:[],freshness:"STORED_CALCULATION_HISTORY_ONLY",
      updatedAt:validDate(scoreDate)?scoreDate:null,
      methodologyVersion:C1_R3_REVISION,
      interpretation:"C1-R3.45P: CORE95 -> 7축 -> Flat-7 Equal; 결측 재가중 없음",
    };
  }
  return {
    status:"READY",
    score:avg(Object.values(axisScores)),
    missingFactors:[],
    indicators,axisScores,trend:[],
    freshness:"STORED_CALCULATION_HISTORY_ONLY",
    updatedAt:validDate(scoreDate)?scoreDate:null,
    methodologyVersion:C1_R3_REVISION,
    interpretation:"C1-R3.45P: CORE95 -> 7축 -> Flat-7 Equal; 대표 4개는 설명용",
    calculationComputedAt:computedAt??null,
  };
}

export function buildConsumptionC1R3Unavailable(reason="C1_R3_STORED_SCORE_UNAVAILABLE"){
  return {
    status:"PARTIAL",score:null,missingFactors:[reason],
    indicators:C1_R3_UI4.map(x=>({...x,score:null,status:"UNAVAILABLE",observationDate:null})),
    axisScores:Object.fromEntries(Object.keys(C1_R3_AXIS_MEMBERSHIP).map(x=>[x,null])),
    trend:[],freshness:"STORED_CALCULATION_HISTORY_ONLY",updatedAt:null,
    methodologyVersion:C1_R3_REVISION,
    interpretation:"C1-R3.45P: 저장된 계산 이력이 없으면 PARTIAL/null; live fallback 없음",
  };
}
