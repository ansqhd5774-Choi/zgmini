// Research-only causal inflation inputs. Not an approved replacement for Inflation R2.
// Original 31 candidate numbering is retained; #20 excluded, #26/#27 merged.
export const INFLATION_CAUSAL_19=Object.freeze([
 {id:'1',series:'MCOILWTICO',name:'WTI 원유',source:'FRED/EIA',unit:'USD/배럴',cadence:'월간',description:'WTI 원유 현물가격'},
 {id:'3',series:'DHHNGSP',name:'천연가스',source:'FRED/EIA',unit:'USD/MMBtu',cadence:'일간',description:'미국 헨리허브 천연가스 현물가격.'},
 {id:'4',series:'EIA_INDUSTRIAL_US',name:'산업용 전력가격',source:'EIA',unit:'센트/kWh',cadence:'월간',description:'미국 전체 US 산업용 IND 전력 소매가격.'},
 {id:'5',series:'WPU1017',name:'철강 생산자물가',source:'BLS',unit:'지수',cadence:'월간',description:'철강 관련 생산자물가지수.'},
 {id:'6',series:'WPU102502',name:'구리·황동 생산자물가',source:'BLS',unit:'지수',cadence:'월간',description:'구리·황동 관련 생산자물가지수.'},
 {id:'7',series:'WPU081',name:'목재 생산자물가',source:'BLS',unit:'지수',cadence:'월간',description:'목재 관련 생산자물가지수.'},
 {id:'8',series:'WPU061',name:'산업화학 생산자물가',source:'BLS',unit:'지수',cadence:'월간',description:'산업화학 관련 생산자물가지수.'},
 {id:'9',series:'WPU012',name:'곡물 생산자물가',source:'BLS',unit:'지수',cadence:'월간',description:'곡물 관련 생산자물가지수.'},
 {id:'10',series:'WPU0221',name:'육류 생산자물가',source:'BLS',unit:'지수',cadence:'월간',description:'육류 관련 생산자물가지수.'},
 {id:'11',series:'WPU029',name:'사료 생산자물가',source:'BLS',unit:'지수',cadence:'월간',description:'동물 사료 관련 생산자물가지수.'},
 {id:'12',series:'CES0500000003',name:'민간 평균시급',source:'BLS/FRED',unit:'USD/시간',cadence:'월간',description:'민간 비농업 시간당 평균 임금의 원계열.'},
 {id:'13',series:'ECIALLCIV',name:'고용비용지수(ECI)',source:'BLS/FRED',unit:'지수',cadence:'분기',description:'고용비용지수 원계열. 분기 발표 시차에 유의합니다.'},
 {id:'14',series:'PRS85006111',name:'단위노동비용(ULC)',source:'BLS/FRED',unit:'지수',cadence:'분기',description:'단위노동비용 원계열. 분기 발표 시차에 유의합니다.'},
 {id:'18',series:'DTWEXBGS',name:'광의 달러지수',source:'연방준비제도/FRED',unit:'지수',cadence:'일간',description:'광의 무역가중 달러지수. 물가와 방향 관계는 별도 검증 대상입니다.'},
 {id:'19',series:'IREXFUELS',name:'비연료 수입물가',source:'BLS/FRED',unit:'지수',cadence:'월간',description:'연료 제외 수입가격지수.'},
 {id:'21',series:'NY_FED_GSCPI',name:'글로벌 공급망압력(GSCPI)',source:'뉴욕 연은',unit:'지수',cadence:'월간',description:'뉴욕 연은 글로벌 공급망압력지수.'},
 {id:'25',series:'WPUID61',name:'가공 중간수요 PPI',source:'BLS',unit:'지수',cadence:'월간',description:'생산 단계의 가공 중간수요 가격지수.'},
 {id:'26',series:'DPCERA3M086SBEA',name:'실질 개인소비지출(PCE)',source:'BEA/FRED',unit:'지수',cadence:'월간',description:'실질 PCE 원계열. 증가율은 이 원계열에서 추후 계산하며 중복 가중하지 않습니다.'},
 {id:'31',series:'NY_FED_SCE_ONE_YEAR_MEDIAN',name:'1년 기대인플레이션(SCE)',source:'뉴욕 연은',unit:'%',cadence:'월간',description:'뉴욕 연은 소비자기대조사의 1년 후 중위 기대물가.'},
]);
export const INFLATION_CAUSAL_19_IDS=Object.freeze(INFLATION_CAUSAL_19.map(item=>item.id));
