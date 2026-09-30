import crypto from "node:crypto";

export const EMPLOYMENT_R6_FORMULA_REVISION = "EMP-R6-FORMULA-R1";
export const EMPLOYMENT_R6_FORMULA_HASH = "sha256:18e18d1025d8c5b1ea9e4aa1bdd33596cfb8b5d5df7e59a6c2629f230be5480d";

export const EMPLOYMENT_R6_FAMILY_WEIGHTS = Object.freeze({
  Slack:20, Payroll:20, Claims:20, Demand:15, Wage:5, Breadth:15, BED:5,
});

export const EMPLOYMENT_R6_FEATURES = Object.freeze([
  {n:1,id:"U3_UNEMPLOYMENT",logical:["U3_UNEMPLOYMENT_RATE"],family:"Slack",w:7,freq:"MONTHLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:2,id:"U6_UNEMPLOYMENT",logical:["U6_UNEMPLOYMENT_RATE"],family:"Slack",w:5,freq:"MONTHLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:3,id:"LFPR",logical:["LABOR_FORCE_PARTICIPATION_RATE"],family:"Slack",w:4,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:4,id:"EPOP",logical:["EMPLOYMENT_POPULATION_RATIO"],family:"Slack",w:4,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:5,id:"PAYEMS_MOM",logical:["PAYEMS_LEVEL"],family:"Payroll",w:4,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"DELTA_1M"},
  {n:6,id:"PAYEMS_3M_AVG",logical:["PAYEMS_LEVEL"],family:"Payroll",w:6,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"MEAN_3_DELTA"},
  {n:7,id:"PAYEMS_ACCEL",logical:["PAYEMS_LEVEL"],family:"Payroll",w:4,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"PAYROLL_3M_ACCEL"},
  {n:8,id:"AVG_WEEKLY_HOURS",logical:["AVG_WEEKLY_HOURS_TOTAL_PRIVATE"],family:"Payroll",w:3,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:9,id:"TEMP_HELP",logical:["TEMP_HELP_EMPLOYMENT"],family:"Payroll",w:3,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:10,id:"INITIAL_CLAIMS",logical:["INITIAL_CLAIMS"],family:"Claims",w:3,freq:"WEEKLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:11,id:"INITIAL_CLAIMS_4W",logical:["INITIAL_CLAIMS_4W"],family:"Claims",w:5,freq:"WEEKLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:12,id:"CONTINUED_CLAIMS",logical:["CONTINUED_CLAIMS"],family:"Claims",w:4,freq:"WEEKLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:13,id:"IUR",logical:["INSURED_UNEMPLOYMENT_RATE"],family:"Claims",w:4,freq:"WEEKLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:14,id:"STATE_CLAIMS_BREADTH",logical:["STATE_INITIAL_CLAIMS"],family:"Claims",w:4,freq:"WEEKLY",direction:"LOWER_POSITIVE",transform:"STATE_CLAIMS_BREADTH"},
  {n:15,id:"JOLTS_OPENINGS_RATE",logical:["JOLTS_JOB_OPENINGS_RATE"],family:"Demand",w:4.5,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:16,id:"JOLTS_HIRES_RATE",logical:["JOLTS_HIRES_RATE"],family:"Demand",w:4.5,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:17,id:"JOLTS_QUITS_RATE",logical:["JOLTS_QUITS_RATE"],family:"Demand",w:3,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:18,id:"JOLTS_LAYOFFS_RATE",logical:["JOLTS_LAYOFFS_DISCHARGES_RATE"],family:"Demand",w:3,freq:"MONTHLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:19,id:"AHE_YOY",logical:["AHE_TOTAL_PRIVATE"],family:"Wage",w:2.5,freq:"MONTHLY",direction:"NON_MONOTONIC",transform:"YOY_12M"},
  {n:20,id:"ECI_12M",logical:["ECI_TOTAL_COMPENSATION_12M"],family:"Wage",w:2.5,freq:"QUARTERLY",direction:"NON_MONOTONIC",transform:"RAW"},
  {n:21,id:"INDUSTRY_DIFFUSION_3M",logical:["INDUSTRY_EMP_DIFFUSION_3M"],family:"Breadth",w:4.5,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:22,id:"STATE_EMP_DIFFUSION_3M",logical:["STATE_EMP_DIFFUSION_3M"],family:"Breadth",w:6,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:23,id:"MSA_EMP_DIFFUSION_3M",logical:["MSA_EMP_DIFFUSION_3M"],family:"Breadth",w:4.5,freq:"MONTHLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:24,id:"BED_GROSS_GAINS_RATE",logical:["BED_GROSS_GAINS_RATE"],family:"BED",w:1,freq:"QUARTERLY",direction:"HIGHER_POSITIVE",transform:"RAW"},
  {n:25,id:"BED_GROSS_LOSSES_RATE",logical:["BED_GROSS_LOSSES_RATE"],family:"BED",w:1,freq:"QUARTERLY",direction:"LOWER_POSITIVE",transform:"RAW"},
  {n:26,id:"BED_NET_GROSS_RATE",logical:["BED_GROSS_GAINS_RATE","BED_GROSS_LOSSES_RATE"],family:"BED",w:1,freq:"QUARTERLY",direction:"HIGHER_POSITIVE",transform:"PAIR_DIFF"},
  {n:27,id:"BED_SMALL_FIRM_NET",logical:["BED_SMALL_FIRM_GAINS_LEVEL","BED_SMALL_FIRM_LOSSES_LEVEL"],family:"BED",w:0.75,freq:"QUARTERLY",direction:"HIGHER_POSITIVE",transform:"SMALL_FIRM_NET"},
  {n:28,id:"BED_STATE_BREADTH",logical:["BED_STATE_GAINS_LEVEL","BED_STATE_LOSSES_LEVEL"],family:"BED",w:0.75,freq:"QUARTERLY",direction:"HIGHER_POSITIVE",transform:"BED_STATE_BREADTH"},
  {n:29,id:"BED_BIRTH_DEATH_NET",logical:["BED_ESTABLISHMENT_BIRTH_RATE","BED_ESTABLISHMENT_DEATH_RATE"],family:"BED",w:0.5,freq:"QUARTERLY",direction:"HIGHER_POSITIVE",transform:"PAIR_DIFF"},
]);

export const EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES = Object.freeze(
  [...new Set(EMPLOYMENT_R6_FEATURES.flatMap(x => x.logical))].sort()
);

export function stableJson(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(v=>stableJson(v)).join(",")}]`;
  return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stableJson(value[k])}`).join(",")}}`;
}
export function sha256HexSync(value) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}
export function canonicalNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toPrecision(12)) : null;
}
export function percentileMeanStrictWeak(reference, current) {
  const x=canonicalNumber(current);
  const a=reference.map(canonicalNumber).filter(Number.isFinite);
  if(!Number.isFinite(x)||!a.length) return null;
  let lower=0,equal=0;
  for(const v of a){if(v<x)lower++;else if(v===x)equal++;}
  return 100*(lower+0.5*equal)/a.length;
}
export function directionScore(percentile, direction) {
  if(!Number.isFinite(percentile)) return null;
  const s = direction==="HIGHER_POSITIVE" ? percentile
    : direction==="LOWER_POSITIVE" ? 100-percentile
    : 100-2*Math.abs(percentile-50);
  return Math.max(0,Math.min(100,s));
}
export const EMPLOYMENT_R6_FORMULA_CONTRACT = Object.freeze({
  revision:EMPLOYMENT_R6_FORMULA_REVISION,
  formulaHash:EMPLOYMENT_R6_FORMULA_HASH,
  percentileWindowYears:10,
  fullExpectedWindow:true,
  tieRule:"MEAN_STRICT_WEAK",
  futureReleaseForbidden:true,
  survivorReweight:false,
  all29Required:true,
  providerCalls:0,
});
