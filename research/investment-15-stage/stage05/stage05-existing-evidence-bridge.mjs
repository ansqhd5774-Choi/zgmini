/**
 * R79: join Stage03's approved 9 IDs to the archived R17 observed F +
 * industry source coverage. No historical F, forecast or proxy becomes live M4.
 */
import {STAGE03_THEME_IDS} from '../stage04-r67/live-f-adapter-r67.mjs';
import {parseR17History} from '../stage04-r69/stage04-r69-reconcile-history.mjs';
import {SCHEMA_VERSION,calculateFusionStage05} from './stage05-fusion-core.mjs';

const asSet = names => [...new Set(names)].sort((a,b)=>a.localeCompare(b,'ko'));

export function buildExistingEvidenceAudit({r17Markdown,asOfDate,liveF=null,liveModel=null}={}) {
  if(typeof r17Markdown!=='string')throw new Error('R17_ARCHIVE_REQUIRED');
  const historical=parseR17History(r17Markdown);
  const archiveById=new Map(historical.records.map(record=>[record.topic_id,record]));
  const names=Object.entries(STAGE03_THEME_IDS);
  if(names.length!==9||archiveById.size!==9)throw new Error('APPROVED_NINE_ARCHIVE_COUNT_MISMATCH');

  const liveRecords=liveF?.records||[];
  const currentById=new Map();
  for(const record of liveRecords){
    if(!Number.isInteger(record?.topic_id)||currentById.has(record.topic_id))
      throw new Error('LIVE_F_DUPLICATE_OR_INVALID_TOPIC_ID');
    if(names.some(([,id])=>id===record.topic_id)){
      const observedDate=record.observed_at;
      if(typeof record.score!=='number'||!Number.isFinite(record.score)
        || record.score<0||record.score>100
        ||typeof observedDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(observedDate)
        ||Number.isNaN(Date.parse(`${observedDate}T00:00:00Z`))
        ||new Date(`${observedDate}T00:00:00Z`).toISOString().slice(0,10)!==observedDate
        ||observedDate>asOfDate
        ||!['CONFIRMED','PROVISIONAL'].includes(record.status)
        ||record.source!=='https://zgmini.kr/api/theme-fear-greed')
        throw new Error('LIVE_F_EVIDENCE_INVALID_OR_FUTURE');
      currentById.set(record.topic_id,record);
    }
  }
  const liveNameList=liveModel?.feeds?.theme?.status==='READY'
    ?liveModel.feeds.theme.items.map(item=>item.name):[];
  const knownNames=new Set(names.map(([name])=>name));
  const archiveLines=[];
  const candidateRows=[];
  for(const [name,topicId] of names){
    const old=archiveById.get(topicId);
    if(old?.theme!==name)throw new Error(`APPROVED_ROSTER_ARCHIVE_MISMATCH_${topicId}`);
    const current=currentById.get(topicId);
    const industry=old.industry;
    archiveLines.push({topicId,theme:name,
      historicalF:{score:old.score,observedAt:old.observed_at,phase:old.status,
        source:old.source,notCurrent:true},
      currentF:current?{score:current.score,observedAt:current.observed_at,
        phase:current.status,source:current.source,sourceVersion:current.source_version}:null,
      industryHistory:{sourceObserved:industry.source_observed,
        evidenceKind:industry.evidence_kind,direction:industry.direction,
        description:industry.description,notQuantifiedM4:true},
      stage02PriceRS:null,stage03PriceTrend:null,stage04ActualM4:null});
    candidateRows.push({id:`approved-${topicId}`,sectorId:null,
      approved:true,trend:null});
  }
  const snapshot={schemaVersion:SCHEMA_VERSION,snapshotDate:asOfDate,
    stage01:{status:'UNAVAILABLE',date:null,risk:'UNKNOWN'},
    stage02:{status:'UNAVAILABLE',sectors:[]},
    stage03:{status:'READY',themes:candidateRows},
    stage04:{status:'UNAVAILABLE',themes:[]}};
  const computed=calculateFusionStage05(snapshot);
  const liveSourceCount=archiveLines.filter(row=>row.currentF!==null).length;
  const industryObserved=archiveLines.filter(row=>row.industryHistory.sourceObserved).length;
  const directionKnown=archiveLines.filter(row=>['증가','감소'].includes(row.industryHistory.direction)).length;
  const matchedLiveThemeNames=asSet(liveNameList.filter(name=>knownNames.has(name)));
  return {version:'R79_EXISTING_STAGE01_04_EVIDENCE_BRIDGE',
    mode:'READ_ONLY_RESEARCH',asOfDate,
    status:'S5_BLOCKED_MISSING_COMPLETED_STAGE_SCORES',
    approvedRosterSource:'STAGE03_THEME_IDS_FROM_R67_R2_R17',
    historicalSource:{type:'R17_ARCHIVED_NOT_LIVE',fObservedAt:historical.observation_date,
      fetchedAt:historical.fetched_at,sourceVersion:historical.api_source_version},
    coverage:{approvedThemes:names.length,historicalF:archiveLines.length,
      historicalIndustrySourceObserved:industryObserved,
      historicalIndustryDirectionKnown:directionKnown,
      currentFMatched:liveSourceCount,
      sectorPriceRelativeStrengthVerified:0,themePriceTrendVerified:0,realizedM4Verified:0},
    liveFeedCoverage:liveModel?{
      market:liveModel.feeds?.market?.status||'UNAVAILABLE',
      sector:liveModel.feeds?.sector?.status||'UNAVAILABLE',
      theme:liveModel.feeds?.theme?.status||'UNAVAILABLE',
      themeNamesMatched:matchedLiveThemeNames.length,
      approvedNamesAbsent:asSet(names.map(([name])=>name).filter(name=>!liveNameList.includes(name))),
      unapprovedNamesIgnored:asSet(liveNameList.filter(name=>!knownNames.has(name))),
    }:null,
    currentFSourceStatus:liveF?.diagnostics?.source_status||'NOT_FETCHED',
    themes:archiveLines,selection:computed.summary,
    rows:computed.rows,ranking:computed.ranking,
    cautions:['R17 archived F is observed 2026-10-23, not new F.',
      'R17 source directions are proxies/partial, not G1/G2/M4.',
      'R25 M2 thematic research anchors cannot silently replace the R67 approved nine roster.',
      'Stage05 requires completed 01-04 final scores; RS/trend and G1/G2/F are not recalculated.',
      'No S5 rank or trading advice until completed 01-04 output is connected.']};
}
