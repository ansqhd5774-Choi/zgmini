export const SEC_FUND_FLOW_VINTAGE_CATALOG_R1=Object.freeze([
  Object.freeze({periodEnd:"2023-09-30",availableAt:"2024-04-18",filingsThrough:"2024-04-18",supportingDataUrl:"https://www.sec.gov/files/im-registered-fund-statistics-20240418.xlsx"}),
  Object.freeze({periodEnd:"2023-12-31",availableAt:"2024-05-17",filingsThrough:"2024-05-16",supportingDataUrl:"https://www.sec.gov/files/im-registered-fund-statistics-20240517.xlsx"}),
  Object.freeze({periodEnd:"2024-03-31",availableAt:"2024-08-06",filingsThrough:"2024-08-06",supportingDataUrl:"https://www.sec.gov/files/investment/im-registered-fund-statistics-20240806.xlsx"}),
  Object.freeze({periodEnd:"2024-06-30",availableAt:"2024-11-06",filingsThrough:"2024-11-06",supportingDataUrl:"https://www.sec.gov/files/investment/im-registered-fund-statistics-20241106.xlsx"}),
  Object.freeze({periodEnd:"2024-09-30",availableAt:"2025-02-04",filingsThrough:"2025-02-04",supportingDataUrl:"https://www.sec.gov/files/investment/im-registered-fund-statistics-20250204.xlsx"}),
  Object.freeze({periodEnd:"2024-12-31",availableAt:"2025-05-08",filingsThrough:"2025-05-08",supportingDataUrl:"https://www.sec.gov/files/investment/im-investment-registered-fund-statistics-202412.xlsx"}),
  Object.freeze({periodEnd:"2025-03-31",availableAt:"2025-08-14",filingsThrough:"2025-08-14",supportingDataUrl:"https://www.sec.gov/files/investment/im-investment-registered-fund-statistics-support-data-20250814.xlsx"}),
  Object.freeze({periodEnd:"2025-06-30",availableAt:"2025-11-17",filingsThrough:"2025-11-17",supportingDataUrl:"https://www.sec.gov/files/investment/im-investment-registered-fund-statistics-support-data-20251117.xlsx"}),
  Object.freeze({periodEnd:"2025-09-30",availableAt:"2026-01-29",filingsThrough:"2026-01-29",supportingDataUrl:"https://www.sec.gov/files/investment/im-investment-registered-fund-statistics-support-data-20260129.xlsx"}),
  Object.freeze({periodEnd:"2025-12-31",availableAt:"2026-05-26",filingsThrough:"2026-05-04",supportingDataUrl:"https://www.sec.gov/files/investment/im-investment-registered-fund-statistics-xlsx-202512.xlsx"}),
]);

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

export function validateSecFundFlowVintageCatalogR1(catalog=SEC_FUND_FLOW_VINTAGE_CATALOG_R1){
  if(!Array.isArray(catalog)||catalog.length<2)return {status:"FAILED",reason:"CATALOG_TOO_SHORT"};
  let priorPeriod=null,priorAvailable=null;
  for(const item of catalog){
    if(!validDate(item?.periodEnd)||!validDate(item?.availableAt)||!validDate(item?.filingsThrough))return {status:"FAILED",reason:"INVALID_DATE"};
    if(item.availableAt<item.filingsThrough)return {status:"FAILED",reason:"AVAILABLE_BEFORE_FILINGS_CUTOFF"};
    if(priorPeriod&&item.periodEnd<=priorPeriod)return {status:"FAILED",reason:"PERIOD_NOT_ASCENDING"};
    if(priorAvailable&&item.availableAt<=priorAvailable)return {status:"FAILED",reason:"AVAILABILITY_NOT_ASCENDING"};
    let url;try{url=new URL(item.supportingDataUrl)}catch{return {status:"FAILED",reason:"INVALID_URL"}}
    if(url.protocol!=="https:"||url.hostname!=="www.sec.gov"||!url.pathname.toLowerCase().endsWith(".xlsx"))return {status:"FAILED",reason:"UNAPPROVED_SUPPORTING_DATA_URL"};
    priorPeriod=item.periodEnd;
    priorAvailable=item.availableAt;
  }
  return {status:"PASS",releases:catalog.length,first:catalog[0],last:catalog.at(-1)};
}

export function latestSecFundFlowVintageAt(date,{catalog=SEC_FUND_FLOW_VINTAGE_CATALOG_R1}={}){
  if(!validDate(date))throw new Error("SEC_FUND_FLOW_VINTAGE_DATE_INVALID");
  let latest=null;
  for(const item of catalog){
    if(item.availableAt<=date)latest=item;
    else break;
  }
  return latest;
}

export const SEC_FUND_FLOW_VINTAGE_CONTRACT_R1=Object.freeze({
  role:"PIT_RESEARCH_SOURCE_CATALOG_ONLY",
  authority:"U.S. SEC Division of Investment Management",
  source:"Registered Fund Statistics supporting data",
  providerCalls:0,
  productionFormulaChanged:false,
  publicationAllowed:false,
  historicalRevisionAware:true,
});
