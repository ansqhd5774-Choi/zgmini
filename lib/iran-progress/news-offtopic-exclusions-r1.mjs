// Narrow headline-level exclusions for demonstrably unrelated Iran-war news.
// Never exclude a country, proxy group, court case or business article by name alone.
const LIVE_CONFLICT=/\b(?:airstrikes?|strikes?|missiles?|drones?|bombings?|attacks?|retaliat(?:ion|e|ed|es)|cease[ -]?fires?|truces?|peace talks?|war talks?|negotiations?|nuclear|sanctions?|escalat(?:ion|e|ed|es)|hostilities|military offensives?)\b|공습|미사일|드론|공격|보복|휴전|협상|핵시설|제재|군사작전|확전/i;
const LIVE_WAR=/\b(?:iran(?:ian)?|israel(?:i)?|saudi(?: arabia)?|yemen(?:i)?|houthi)\b.{0,70}\b(?:war|conflict)\b|\b(?:war|conflict)\b.{0,70}\b(?:iran(?:ian)?|israel(?:i)?|saudi(?: arabia)?|yemen(?:i)?|houthi)\b|이란.{0,35}전쟁|전쟁.{0,35}이란/i;
const ENTERTAINMENT=/\b(?:netflix|streaming|tv series|television series|horror show|actor|actress|film|movie|entertainment|drama|cast)\b|넷플릭스|배우|드라마|영화|연예/i;
const SCREEN=/\b(?:netflix|streaming|tv series|television series|horror show|show|film|movie|drama)\b|넷플릭스|드라마|영화/i;
const SYRIA=/\bsyri(?:a|an)\b|시리아/i;
const TRIAL=/\b(?:court|trial|sentenc(?:e|es|ed|ing)|convict(?:ed|ion)?|prison|imprisonment)\b|재판|법원|선고|유죄|징역/i;
const HISTORICAL_MILITIA=/\b(?:militia|militias|militiamen|fighter|fighters|war crimes?|civil war)\b|민병대|내전|전쟁범죄/i;
const POLITICAL_DONOR=/\b(?:political donor|party donor|donor|reform uk|reform donor|farage)\b|정치 후원자|정치자금|기부자/i;
const PAST_BUSINESS=/\b(?:business ties|business dealings|business relations?|in business with|business links?|foundation linked|business relationship)\b|과거 사업|사업 관계|사업 연관|재단 연관/i;
const IRAN=/\biran(?:ian)?\b|이란/i;

// Publisher section and headline subject together are required: never block by "Iran" or "Saudi" alone.
const ART_SECTION=/^https:\/\/[^/]+\/(?:artanddesign|arts|culture)\//i;
const SPORT_SECTION=/^https:\/\/[^/]+\/(?:amp\/)?sports?\//i;
const ART_SUBJECT=/\b(?:artists?|artworks?|photograph(?:y|ers?)|exhibitions?|galler(?:y|ies)|portraits?|museums?)\b|예술가|사진전|전시회|미술관/i;
const SPORT_SUBJECT=/\b(?:football|soccer|coaches?|captains?|squads?|players?|friendly|friendlies|rift[\s-]+rumou?rs?|world cup)\b|축구|감독|대표팀|선수|불화설/i;
// Some sport stories describe material consequences of the war without saying "war" in the title.
const DIRECT_WAR_HEADLINE=/\b(?:airstrikes?|missiles?|drones?|bombings?|cease[ -]?fires?|truces?|peace talks?|war talks?|military offensives?|armed conflict)\b|공습|미사일|드론|폭격|휴전|종전|군사작전|무력충돌/i;
const SPORT_WAR_IMPACT=/\b(?:iran(?:ian)?|israel(?:i)?)\b.{0,90}\b(?:visas?|travel bans?|cancel(?:led|ed|lations?)|postpon(?:e|ed|ements?)|suspend(?:ed|sion)|boycotts?|withdraw(?:al)?|security)\b|\b(?:visas?|travel bans?|cancel(?:led|ed|lations?)|postpon(?:e|ed|ements?)|suspend(?:ed|sion)|boycotts?|withdraw(?:al)?|security)\b.{0,90}\b(?:iran(?:ian)?|israel(?:i)?)\b|이란.{0,45}(?:비자|취소|연기|철수|안보)|(?:비자|취소|연기|철수|안보).{0,45}이란/i;

/** A reason means exclude; null means leave the existing inclusion gate unchanged. */
export function iranNewsOffTopicReasonR1(title,sourceUrl=''){
 if(typeof title!=='string'||!title.trim())return null;
 // Do not mistake a historical "war crimes" trial for a live war report.
 const headline=title.replace(/\bwar crimes?\b/gi,'').replace(/전쟁범죄/g,'');
 // Section-specific exclusions need a stronger current-war exception than bare "attack",
 // "nuclear" or "sanctions", which also occur in unrelated cultural/sport headlines.
 const directWar=DIRECT_WAR_HEADLINE.test(headline)||LIVE_WAR.test(headline);
 if(typeof sourceUrl==='string'&&ART_SECTION.test(sourceUrl)&&ART_SUBJECT.test(title)&&!directWar)
  return 'OFF_TOPIC_ARTS_SECTION';
 if(typeof sourceUrl==='string'&&SPORT_SECTION.test(sourceUrl)&&SPORT_SUBJECT.test(title)&&
  !directWar&&!SPORT_WAR_IMPACT.test(title))return 'OFF_TOPIC_SPORTS_SECTION';
 if(LIVE_CONFLICT.test(headline)||LIVE_WAR.test(headline))return null;
 if(ENTERTAINMENT.test(title)&&SCREEN.test(title))return 'OFF_TOPIC_ENTERTAINMENT';
 if(SYRIA.test(title)&&TRIAL.test(title)&&HISTORICAL_MILITIA.test(title))
  return 'OFF_TOPIC_HISTORICAL_SYRIA_TRIAL';
 if(IRAN.test(title)&&POLITICAL_DONOR.test(title)&&PAST_BUSINESS.test(title))
  return 'OFF_TOPIC_PAST_POLITICAL_BUSINESS';
 return null;
}
