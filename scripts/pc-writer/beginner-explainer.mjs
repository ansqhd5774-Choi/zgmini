export const BEGINNER_EXPLAINER_PROMPT_VERSION='BEGINNER_EXPLAINER_R1';
const TOPICS=new Set(['inflation','recession','liquidity-crisis','credit-risk','debt-risk','asset-bubble','supply-shock','earnings-recession']);
const SYSTEM_PROMPT=`You are a Korean financial-education copy editor. The input is already validated structured ZGmini output. Never calculate, rescore, reclassify, add causes, add indicators, infer missing facts, or invent numbers. Never expose model weights or formulas. Rewrite only the provided base sentences into concise Korean for a beginner investor. Do not promise returns or predict price direction. Return JSON only with exactly {"summary":string,"whyItMatters":string,"marketMeaning":string}.`;

function assertText(value,name,max=700){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`BEGINNER_INPUT_${name}_INVALID`);return value.trim();}
function assertFactors(value,name){if(!Array.isArray(value)||value.length>3||value.some(x=>typeof x!=='string'||!x.trim()||x.length>80))throw Error(`BEGINNER_INPUT_${name}_INVALID`);return value.map(x=>x.trim());}
function numericTokens(text){return String(text).match(/-?\d+(?:\.\d+)?%?/g)??[];}
function validateInput(input){
 if(!input||typeof input!=='object'||!TOPICS.has(input.topic))throw Error('BEGINNER_INPUT_TOPIC_INVALID');
 if(!(input.score===null||(typeof input.score==='number'&&Number.isFinite(input.score)&&input.score>=0&&input.score<=100)))throw Error('BEGINNER_INPUT_SCORE_INVALID');
 const normalized={
  topic:input.topic,
  score:input.score,
  stage:assertText(input.stage,'STAGE',80),
  asOfDate:input.asOfDate===null?null:assertText(input.asOfDate,'DATE',40),
  positiveFactors:assertFactors(input.positiveFactors,'POSITIVE_FACTORS'),
  negativeFactors:assertFactors(input.negativeFactors,'NEGATIVE_FACTORS'),
  base:{
   summary:assertText(input.base?.summary,'SUMMARY'),
   whyItMatters:assertText(input.base?.whyItMatters,'WHY'),
   marketMeaning:assertText(input.base?.marketMeaning,'MARKET'),
  }
 };
 return normalized;
}
function validateOutput(result,input){
 if(!result||typeof result!=='object'||Array.isArray(result))throw Error('BEGINNER_OUTPUT_SCHEMA_INVALID');
 const keys=Object.keys(result).sort(),expected=['marketMeaning','summary','whyItMatters'];
 if(keys.length!==expected.length||keys.some((k,i)=>k!==expected[i]))throw Error('BEGINNER_OUTPUT_SCHEMA_INVALID');
 const out={
  summary:assertText(result.summary,'OUTPUT_SUMMARY',450),
  whyItMatters:assertText(result.whyItMatters,'OUTPUT_WHY',450),
  marketMeaning:assertText(result.marketMeaning,'OUTPUT_MARKET',450),
 };
 const sourceNumbers=new Set(numericTokens(JSON.stringify(input)));
 for(const token of numericTokens(JSON.stringify(out)))if(!sourceNumbers.has(token))throw Error('BEGINNER_OUTPUT_NEW_NUMBER');
 const forbidden=['수익 보장','반드시 오른','반드시 상승','확실히 오른','매수해야','매도해야','무조건'];
 const joined=Object.values(out).join(' ');
 if(forbidden.some(x=>joined.includes(x)))throw Error('BEGINNER_OUTPUT_INVESTMENT_CERTAINTY');
 return out;
}

export async function generateBeginnerExplanation(input,{fetcher=fetch,model='gemma3:4b',modelDigest,now=Date.now()}={}){
 if(typeof modelDigest!=='string'||!modelDigest.trim())throw Error('BEGINNER_MODEL_DIGEST_REQUIRED');
 const normalized=validateInput(input);
 const response=await fetcher('http://127.0.0.1:11434/api/generate',{
  method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({model,system:SYSTEM_PROMPT,prompt:JSON.stringify(normalized),format:'json',stream:false,options:{temperature:0,num_predict:500}}),
  signal:AbortSignal.timeout(60000)
 });
 if(!response.ok)throw Error('BEGINNER_OLLAMA_REQUEST_FAILED');
 const raw=await response.json();
 let parsed;try{parsed=JSON.parse(raw.response);}catch{throw Error('BEGINNER_OUTPUT_JSON_INVALID');}
 const copy=validateOutput(parsed,normalized);
 return {status:'COPY_ONLY',copy,topic:normalized.topic,score:normalized.score,asOfDate:normalized.asOfDate,model,modelDigest,promptVersion:BEGINNER_EXPLAINER_PROMPT_VERSION,generatedAt:now};
}
