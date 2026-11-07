// Research-only supplemental inputs. Separate from the existing public 19 and R2 four scores.
// Original inflation candidate numbers are stable identifiers, not score weights.
export const INFLATION_CANDIDATES_7=Object.freeze([
  {id:'2',series:'EMM_EPMR_PTE_NUS_DPG',name:'미국 일반 휘발유 가격',provider:'EIA',unit:'USD/갤런',cadence:'주간'},
  {id:'16',series:'MTS_TABLE_4_CUSTOMS_DUTIES_405',name:'미국 관세 순수납액',provider:'US_TREASURY_MTS',unit:'USD',cadence:'월간'},
  {id:'22',series:'CUSR0000SEHA',name:'소비자물가 임대료',provider:'BLS',unit:'지수',cadence:'월간'},
  {id:'23',series:'CUSR0000SEHC01',name:'소비자물가 자가주거비(OER)',provider:'BLS',unit:'지수',cadence:'월간'},
  {id:'24',series:'WPSFD4',name:'최종수요 생산자물가',provider:'BLS',unit:'지수',cadence:'월간'},
  {id:'28',series:'MTM/TI',name:'미국 제조업 총재고',provider:'US_CENSUS_M3',unit:'백만 USD',cadence:'월간'},
  {id:'29',series:'GMF',name:'미국 제조업 산업생산지수',provider:'FEDERAL_RESERVE_G17',unit:'지수',cadence:'월간'},
].map(item=>Object.freeze(item)));
export const INFLATION_CANDIDATES_7_IDS=Object.freeze(INFLATION_CANDIDATES_7.map(item=>item.id));
