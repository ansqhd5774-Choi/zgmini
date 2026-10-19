/** SEC N-CSRS 2026-08-06 filer-level co-registration identity research only.
 * No holding rows, daily membership, trading series, scoring or publication.
 */
export const R63_GLOBALX_NCSRS = Object.freeze({
  filerCik:'0001432353',form:'N-CSRS',accession:'0000930413-26-002360',
  reportDate:'2026-05-31',filedDate:'2026-08-06',
  officialIndex:'https://www.sec.gov/Archives/edgar/data/1432353/000093041326002360/0000930413-26-002360-index.htm',
});
export const R63_GLOBALX_THEME_SERIES=Object.freeze({
 BOTZ:Object.freeze({series:'S000054693',classId:'C000171853'}),
 DRIV:Object.freeze({series:'S000061415',classId:'C000198888'}),
 FINX:Object.freeze({series:'S000054691',classId:'C000171851'}),
 GNOM:Object.freeze({series:'S000062676',classId:'C000203266'}),
 CLOU:Object.freeze({series:'S000065121',classId:'C000210838'}),
 HERO:Object.freeze({series:'S000066518',classId:'C000214539'}),
 BUG:Object.freeze({series:'S000066713',classId:'C000214985'}),
 SHLD:Object.freeze({series:'S000081193',classId:'C000243865'}),
});
export function auditR63GlobalXRegistration({asOf='2026-10-16'}={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||Number.isNaN(Date.parse(asOf+'T00:00:00Z')))throw Error('R63_INVALID_ASOF');
 const entries=Object.entries(R63_GLOBALX_THEME_SERIES);
 if(entries.length!==8||new Set(entries.map(([,v])=>v.series)).size!==8||new Set(entries.map(([,v])=>v.classId)).size!==8)throw Error('R63_IDENTITY_DRIFT');
 return Object.freeze({status:'REGISTRATION_IDENTITY_ONLY',asOf,issuer:'Global X Funds',
   visibleSince:R63_GLOBALX_NCSRS.filedDate,filingPublicByDate:asOf>=R63_GLOBALX_NCSRS.filedDate,
   namedThemeEtfs:Object.freeze(entries.map(([ticker])=>ticker)),count:entries.length,
   filingIsSingleMultiFundRegistrant:true,
   allEightHaveParsedHistoricalHoldings:false,dailyPITVerified:false,missingStockPriceSeriesResolved:0,
   fiveAxisScoreReady:false,publicationReady:false});
}
