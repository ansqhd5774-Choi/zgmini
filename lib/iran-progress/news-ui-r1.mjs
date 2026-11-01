// Presentation-only helpers. The count always comes from rights-gated public news.
export const newsPageSize=wide=>wide?4:3;

export function visibleNewsLimit(pages,{wide=false}={}){
 if(!Number.isSafeInteger(pages)||pages<1)throw Error('NEWS_PAGES_INVALID');
 return newsPageSize(wide)*pages;
}

export function isPlaceholderNewsSummary(value){
 if(typeof value!=='string')return false;
 return /^(?:영국 정부 공식 발표에서|.{1,80}(?:관련 내용|내용을 언급했습니다)).*상세 내용은 원문에서 확인할 수 있습니다\.?$/.test(value.trim());
}
