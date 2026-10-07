import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildDollarFxR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {evaluateSeries} from "./backtest-market-shadow-r1.mjs";
import {pointInTimeDollarRows} from "./collect-dollar-r21-pit-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-dollar-external-feature-diagnostic.json";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function snapshot(rows,signalDate){
  const baseline=buildDollarFxR54(rows,{asOfDate:signalDate,minValid:252});
  if(baseline.status!=="READY"||!Array.isArray(baseline.rows))return null;
  const valid=baseline.rows.filter(row=>row.observationDate<=signalDate&&finite(row?.shortMomentum));
  const latest=valid.at(-1)??null;
  if(!latest)return null;
  const prior20=valid.length>=21?valid.at(-21):null;
  const acceleration20=prior20&&finite(prior20.shortMomentum)?latest.shortMomentum-prior20.shortMomentum:null;
  return {
    level:finite(latest.broadDollarIndex)?latest.broadDollarIndex:null,
    levelScore:finite(latest.levelScore)?latest.levelScore:null,
    shortMomentum:finite(latest.shortMomentum)?latest.shortMomentum:null,
    mediumMomentum:finite(latest.mediumMomentum)?latest.mediumMomentum:null,
    acceleration20:finite(acceleration20)?acceleration20:null,
    volatility20:finite(latest.volatility20)?latest.volatility20:null,
    absShortMomentum:finite(latest.shortMomentum)?Math.abs(latest.shortMomentum):null,
    absMediumMomentum:finite(latest.mediumMomentum)?Math.abs(latest.mediumMomentum):null,
    absAcceleration20:finite(acceleration20)?Math.abs(acceleration20):null,
  };
}

export function buildExternalFeatureSeries({revisions=[],signalVintagePairs=[]}={}){
  const names=["level","levelScore","shortMomentum","mediumMomentum","acceleration20","volatility20","absShortMomentum","absMediumMomentum","absAcceleration20"];
  const series=Object.fromEntries(names.map(name=>[name,[]]));
  const diagnostics=[];
  for(const item of Array.isArray(signalVintagePairs)?signalVintagePairs:[]){
    const signalDate=String(item?.signalDate??""),vintageDate=String(item?.vintageDate??"");
    if(!validDate(signalDate)||!validDate(vintageDate)||vintageDate>=signalDate)continue;
    const rows=pointInTimeDollarRows(revisions,vintageDate);
    const value=snapshot(rows,signalDate);
    diagnostics.push({signalDate,vintageDate,ready:Boolean(value)});
    if(!value)continue;
    for(const name of names)if(finite(value[name]))series[name].push({label:signalDate,value:value[name]});
  }
  return {series,diagnostics};
}

function sign(value){
  if(!finite(value)||value===0)return "UNRESOLVED";
  return value>0?"POSITIVE":"INVERSE";
}

export async function analyzeExternalDollarFeatures(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [externalBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowDollarFxR23ExternalPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const revisions=externalBatch?.body?.series?.DTWEXBGS_PIT_REVISIONS??[];
    const pairs=externalBatch?.body?.signalVintagePairs??[];
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(!externalBatch?.body?.lookAheadSafe||!externalBatch?.body?.independentOfDesignSample)throw new Error("DOLLAR_EXTERNAL_FEATURE_BATCH_NOT_SAFE");
    if(revisions.length<252||pairs.length<400||benchmark.length<1000)throw new Error("DOLLAR_EXTERNAL_FEATURE_INPUT_SHORT");

    const built=buildExternalFeatureSeries({revisions,signalVintagePairs:pairs});
    const features={};
    for(const [name,rows] of Object.entries(built.series)){
      const out=evaluateSeries(rows,benchmark);
      features[name]={
        n:out.observations,
        c1:out.correlation1m,
        c3:out.correlation3m,
        sign1m:sign(out.correlation1m),
        sign3m:sign(out.correlation3m),
      };
    }
    const stablePositive=[],stableInverse=[],mixed=[];
    for(const [name,item] of Object.entries(features)){
      if(item.sign1m==="POSITIVE"&&item.sign3m==="POSITIVE")stablePositive.push(name);
      else if(item.sign1m==="INVERSE"&&item.sign3m==="INVERSE")stableInverse.push(name);
      else mixed.push(name);
    }

    const designFile=path.join(base,"local-dollar-r23-feature-diagnostic.json");
    let designStable=null;
    if(fs.existsSync(designFile)){
      try{
        const prior=JSON.parse(fs.readFileSync(designFile,"utf8"));
        designStable=prior?.stable??null;
      }catch{}
    }

    const report={
      version:1,
      status:"PASS",
      mode:"DOLLAR_EXTERNAL_FEATURE_DIAGNOSTIC_ONLY",
      lookAheadSafe:true,
      independentOfDesignSample:true,
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      formulaSelected:false,
      weightSelected:false,
      sample:{
        signals:pairs.length,
        first:pairs[0]?.signalDate??null,
        last:pairs.at(-1)?.signalDate??null,
        readyDates:built.diagnostics.filter(item=>item.ready).length,
      },
      features,
      stable:{positive:stablePositive,inverse:stableInverse,mixed},
      designStable,
      overlapWithDesignPositive:Array.isArray(designStable?.positive)
        ?designStable.positive.filter(name=>stablePositive.includes(name))
        :[],
      conclusion:"External PIT feature attribution only. Do not select R2.4 formula or weights from this report alone.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  analyzeExternalDollarFeatures().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_EXTERNAL_FEATURE_DIAGNOSTIC_FAILED")}));
    process.exitCode=1;
  });
}
