import {inspectXlsxArchive} from "./earnings-e1-r5-offline-preflight.mjs";

export const E1_R5_OFFICIAL_SOURCE_MANIFEST=Object.freeze({
  secCompanyFacts:Object.freeze({
    authority:"SEC EDGAR",
    url:"https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip",
    format:"ZIP_JSON",
    localName:"companyfacts.zip",
    extractedDirectory:"companyfacts",
    required:true,
    role:"PRIMARY_CORPORATE_FUNDAMENTALS",
    userAgent:"ZGMINI/1.0 (+https://zgmini.kr)",
  }),
  secSubmissions:Object.freeze({
    authority:"SEC EDGAR",
    url:"https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip",
    format:"ZIP_JSON",
    localName:"submissions.zip",
    extractedDirectory:"submissions",
    required:true,
    role:"PRIMARY_ISSUER_CLASSIFICATION_SIC",
    userAgent:"ZGMINI/1.0 (+https://zgmini.kr)",
  }),
  blsUnitLaborCost:Object.freeze({
    authority:"U.S. Bureau of Labor Statistics",
    url:"https://download.bls.gov/pub/time.series/pr/pr.data.0.Current",
    seriesMetadataUrl:"https://download.bls.gov/pub/time.series/pr/pr.series",
    measureMetadataUrl:"https://download.bls.gov/pub/time.series/pr/pr.measure",
    durationMetadataUrl:"https://download.bls.gov/pub/time.series/pr/pr.duration",
    sectorMetadataUrl:"https://download.bls.gov/pub/time.series/pr/pr.sector",
    format:"TSV",
    localName:"pr.data.0.Current",
    seriesId:"PRS85006111",
    required:true,
    role:"UNIT_LABOR_COST_PRESSURE",
  }),
  blsUnitLaborCostSeries:Object.freeze({
    authority:"U.S. Bureau of Labor Statistics",
    url:"https://download.bls.gov/pub/time.series/pr/pr.series",
    format:"TSV",
    localName:"pr.series",
    required:true,
    role:"UNIT_LABOR_COST_SERIES_METADATA",
  }),
  blsUnitLaborCostMeasure:Object.freeze({
    authority:"U.S. Bureau of Labor Statistics",
    url:"https://download.bls.gov/pub/time.series/pr/pr.measure",
    format:"TSV",
    localName:"pr.measure",
    required:true,
    role:"UNIT_LABOR_COST_MEASURE_METADATA",
  }),
  blsUnitLaborCostDuration:Object.freeze({
    authority:"U.S. Bureau of Labor Statistics",
    url:"https://download.bls.gov/pub/time.series/pr/pr.duration",
    format:"TSV",
    localName:"pr.duration",
    required:true,
    role:"UNIT_LABOR_COST_DURATION_METADATA",
  }),
  blsProducerInput:Object.freeze({
    authority:"U.S. Bureau of Labor Statistics",
    url:"https://www.bls.gov/ppi/input-indexes/bls-satellite-input-to-industry-indexes.xlsx",
    format:"XLSX",
    localName:"bls-satellite-input-to-industry-indexes.xlsx",
    required:true,
    role:"PRODUCER_INPUT_COST_PRESSURE",
    experimental:true,
  }),
  blsProducerOutputSeries:Object.freeze({
    authority:"U.S. Bureau of Labor Statistics",
    url:"https://download.bls.gov/pub/time.series/pc/pc.series",
    format:"TSV",
    localName:"pc.series",
    required:true,
    role:"PRODUCER_NET_OUTPUT_SERIES_METADATA",
  }),
  blsProducerOutputData:Object.freeze({
    authority:"U.S. Bureau of Labor Statistics",
    url:"https://download.bls.gov/pub/time.series/pc/pc.data.0.Current",
    format:"TSV",
    localName:"pc.data.0.Current",
    required:true,
    role:"PRODUCER_NET_OUTPUT_PRICE_PRESSURE",
  }),
  censusSic1987ToNaics2002:Object.freeze({
    authority:"U.S. Census Bureau",
    url:"https://www.census.gov/naics/concordances/1987_SIC_to_2002_NAICS.xls",
    format:"XLS",
    localName:"1987_SIC_to_2002_NAICS.xls",
    required:true,
    role:"OFFICIAL_SIC1987_TO_NAICS2002_CONCORDANCE",
  }),
  censusNaics2002To2007:Object.freeze({
    authority:"U.S. Census Bureau",
    url:"https://www.census.gov/naics/concordances/2002_to_2007_NAICS.xls",
    format:"XLS",
    localName:"2002_to_2007_NAICS.xls",
    required:true,
    role:"OFFICIAL_NAICS2002_TO_2007_CONCORDANCE",
  }),
  censusNaics2007To2012:Object.freeze({
    authority:"U.S. Census Bureau",
    url:"https://www.census.gov/naics/concordances/2007_to_2012_NAICS.xls",
    format:"XLS",
    localName:"2007_to_2012_NAICS.xls",
    required:true,
    role:"OFFICIAL_NAICS2007_TO_2012_CONCORDANCE",
  }),
  censusNaics2012To2017:Object.freeze({
    authority:"U.S. Census Bureau",
    url:"https://www.census.gov/naics/concordances/2012_to_2017_NAICS.xlsx",
    format:"XLSX",
    localName:"2012_to_2017_NAICS.xlsx",
    required:true,
    role:"OFFICIAL_NAICS2012_TO_2017_CONCORDANCE",
  }),
  censusNaics2017To2022Changes:Object.freeze({
    authority:"U.S. Census Bureau",
    url:"https://www.census.gov/naics/concordances/2017_to_2022_NAICS_Changes_Only.xlsx",
    format:"XLSX",
    localName:"2017_to_2022_NAICS_Changes_Only.xlsx",
    required:true,
    role:"OFFICIAL_NAICS2017_TO_2022_CHANGES",
  }),
  censusNaics2022To2017Changes:Object.freeze({
    authority:"U.S. Census Bureau",
    url:"https://www.census.gov/naics/concordances/2022_to_2017_NAICS_Changes_Only.xlsx",
    format:"XLSX",
    localName:"2022_to_2017_NAICS_Changes_Only.xlsx",
    required:true,
    role:"OFFICIAL_NAICS2022_TO_2017_CHANGES_REVERSE_CHECK",
  }),
  beaCorporateProfits:Object.freeze({
    authority:"U.S. Bureau of Economic Analysis",
    url:"https://apps.bea.gov/national/Release/XLS/Survey/Section1All_xls.xlsx",
    format:"XLSX",
    localName:"bea-section1-all.xlsx",
    seriesCode:"A051RC",
    required:true,
    role:"AGGREGATE_CORPORATE_PROFIT_GROWTH",
    quarterlySheetSuffix:"-Q",
  }),
});

const clean=value=>String(value??"").trim();
const labelMatch=value=>{
  const text=clean(value).toLowerCase();
  return text.includes("corporate profits")&&(
    text.includes("iva")||
    text.includes("inventory valuation")
  )&&(
    text.includes("ccadj")||
    text.includes("capital consumption")
  );
};

export function inspectBeaSection1Workbook(buffer,{seriesCode="A051RC"}={}){
  const archive=inspectXlsxArchive(buffer,{maxRows:100,maxCols:60});
  if(archive.status==="FAIL")return {...archive,source:"BEA_NIPA_SECTION1_XLSX",seriesCode};
  const matches=[];
  for(const sample of archive.samples??[]){
    for(const row of sample.sampledRows??[]){
      const cells=(row.cells??[]).filter(value=>value!=null).map(value=>String(value));
      const codeMatch=cells.some(value=>clean(value)===seriesCode);
      const descriptionMatch=cells.some(labelMatch);
      if(!codeMatch&&!descriptionMatch)continue;
      matches.push({
        sheet:sample.name,
        row:row.row,
        quarterly:/-Q$/i.test(sample.name),
        codeMatch,
        labelMatch:descriptionMatch,
      });
    }
  }
  const quarterlyMatches=matches.filter(item=>item.quarterly);
  return {
    status:quarterlyMatches.length?"PASS":"PARTIAL",
    reason:quarterlyMatches.length?null:matches.length?"BEA_MARKER_NOT_ON_QUARTERLY_SHEET":"BEA_SERIES_MARKER_NOT_FOUND",
    source:"BEA_NIPA_SECTION1_XLSX",
    seriesCode,
    entryCount:archive.entryCount,
    sheets:archive.sheets,
    matchCount:matches.length,
    quarterlyMatchCount:quarterlyMatches.length,
    matches,
  };
}