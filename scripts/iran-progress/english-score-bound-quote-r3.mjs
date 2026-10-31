// R3 English scoring pilot: select verbatim event-bearing sentence options.
// The local model can choose a sentence but cannot invent its text or change R5.
import {classifyR3Article} from '../../lib/iran-progress/reference-flow-r3.mjs';
import {generateEnglishScoreEvidence} from './news-r41-english-score-evidence-r1.mjs';

const articleInput=article=>({sourceUrl:article.sourceUrl,
 title:article.originalTitle,summary:'',date:article.publishedAt.slice(0,10)});

export function matchingEnglishEventQuotes(article){
 if(!article||typeof article.articleBody!=='string'||
  typeof article.originalTitle!=='string'||typeof article.sourceUrl!=='string'||
  typeof article.publishedAt!=='string')return [];
 const baseline=classifyR3Article(articleInput(article));
 if(!baseline.accepted)return [];
 const candidates=[];
 for(const raw of article.articleBody.split(/(?<=[.!?])\s+(?=(?:["'“‘])?[A-Z0-9])/)){
  const quote=raw.trim();
  if(quote.length<16||quote.length>500||!article.articleBody.includes(quote))continue;
  const match=classifyR3Article({...articleInput(article),title:quote,
   summary:article.originalTitle});
  if(!match.accepted||match.rule!==baseline.rule||
   (baseline.actor!=='UNKNOWN'&&match.actor!=='UNKNOWN'&&
    baseline.actor!==match.actor)||
   (baseline.location!=='unknown'&&match.location!=='unknown'&&
    baseline.location!==match.location))continue;
  if(!candidates.includes(quote))candidates.push(quote);
  if(candidates.length===12)break;
 }
 return candidates;
}

export function generateBoundEnglishScoreEvidence(article,options={}){
 const choices=matchingEnglishEventQuotes(article);
 return generateEnglishScoreEvidence(article,{...options,
  quoteCandidates:choices.length?choices:null});
}
