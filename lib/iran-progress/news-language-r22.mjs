// UI copy selector only. It never fabricates translated news or modifies score data.
const korean=text=>typeof text==='string'&&/[가-힣]/.test(text);
const content=text=>typeof text==='string'&&text.trim().length>0;
const genericSummary=text=>typeof text==='string'&&text.includes('상세 내용은 원문에서 확인할 수 있습니다.');

/**
 * @param {{title:string,summary:string,titleEn?:string,summaryEn?:string,titleKo?:string,summaryKo?:string}} item
 * @param {{titleKo:string,summaryKo:string}|null} [automaticTranslation]
 */
export function iranNewsLanguages(item,automaticTranslation=null){
 const titleEn=content(item.titleEn)?item.titleEn:!korean(item.title)?item.title:null;
 const summaryEn=content(item.summaryEn)?item.summaryEn:!korean(item.summary)?item.summary:null;
 const titleKo=content(automaticTranslation?.titleKo)?automaticTranslation.titleKo:
  content(item.titleKo)?item.titleKo:korean(item.title)?item.title:null;
 const summaryKo=content(automaticTranslation?.summaryKo)?automaticTranslation.summaryKo:
  content(item.summaryKo)?item.summaryKo:korean(item.summary)&&!genericSummary(item.summary)?item.summary:null;
 const canToggle=Boolean(content(titleEn)&&content(summaryEn)&&content(titleKo)&&content(summaryKo));
 return {titleEn,summaryEn,titleKo,summaryKo,canToggle,
  defaultTitle:content(titleKo)&&content(summaryKo)?titleKo:item.title,
  defaultSummary:content(titleKo)&&content(summaryKo)?summaryKo:item.summary,
  canMachineTranslate:!canToggle&&content(titleEn)&&content(summaryEn)};
}
