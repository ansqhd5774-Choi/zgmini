export const RISK_CARDS=[
 {id:'inflationStability',name:'인플레이션',href:'/inflation/',description:'물가와 기대인플레이션이 시장에 주는 부담',tags:['CPI·PCE','기대물가']},
 {id:'recessionDefense',name:'경기 침체',href:'/recession/',description:'고용·생산·소비에서 나타나는 경기 둔화 신호',tags:['실물경기','고용']},
 {id:'stagflationSafety',name:'스태그플레이션 위험',href:'/stagflation-risk/',description:'고물가와 성장·고용 둔화가 동시에 나타나는 위험',tags:['물가 고착','성장 둔화']},
 {id:'creditRiskDefense',name:'신용 위험',href:'/credit-risk/',description:'회사채 시장에서 드러나는 신용 스트레스',tags:['회사채','신용 여건']},
 {id:'earningsRecessionDefense',name:'실적 침체',href:'/earnings-recession/',description:'기업의 이익·매출·수익성 변화',tags:['기업 이익','수익성']},
 {id:'assetBubbleSafety',name:'자산 버블',href:'/asset-bubble/',description:'밸류에이션과 가격 과열의 부담',tags:['밸류에이션','과열']},
 {id:'debtRiskSafety',name:'부채 위험',href:'/debt-risk/',description:'부채 규모와 원리금 상환 부담',tags:['부채','상환 능력']},
 {id:'supplyShockSafety',name:'공급 충격',href:'/supply-shock/',description:'공급망·에너지·생산의 차질',tags:['공급망','에너지']},
] as const;
export const ECONOMIC_CARDS=[
 {id:'inflation',href:'/economic-indicators/inflation/',name:'물가',description:'물가 목표 안정성·기조·기대·공급 압력'},
 {id:'employment',href:'/economic-indicators/employment/',name:'고용',description:'실업·일자리·신규 실업수당과 고용 개선'},
 {id:'rates',href:'/economic-indicators/rates/',name:'금리',description:'정책금리·국채금리·실질금리·장단기 차이'},
 {id:'credit',href:'/economic-indicators/credit/',name:'채권·신용',description:'회사채 신용 여건과 채권시장 변동성'},
 {id:'growth',href:'/economic-indicators/growth/',name:'경기',description:'생산·주문·사업 활동 등 실물경기 흐름'},
 {id:'consumption',href:'/economic-indicators/consumption/',name:'소비',description:'소비·소득·고용과 가계 금융 여력'},
 {id:'earnings',href:'/economic-indicators/earnings/',name:'기업실적',description:'주당이익·매출 성장과 기업 수익성'},
 {id:'liquidity',href:'/economic-indicators/liquidity/',name:'유동성',description:'은행 준비금·통화량·재무부와 연준 자금'},
 {id:'fundFlows',href:'/economic-indicators/fund-flows/',name:'자금흐름',description:'등록펀드 순유입 추세와 환매 압력'},
 {id:'breadth',href:'/economic-indicators/breadth/',name:'수급·폭',description:'상승 종목·거래비중과 시장 참여의 폭'},
 {id:'dollarFx',href:'/economic-indicators/dollar-fx/',name:'달러·환율',description:'달러 수준·추세·변동성이 주는 부담'},
 {id:'commodities',href:'/economic-indicators/commodities/',name:'유가·원자재',description:'미국·국제 원유, 구리와 휘발유'},
] as const;
export const THEME_GROUPS=[
 {name:'AI·디지털',items:['AI 반도체','데이터센터 전력','양자컴퓨팅','사이버보안','블록체인·디지털자산','AR·VR','데이터센터 액체냉각','실리콘 포토닉스','핀테크','클라우드·SaaS']},
 {name:'산업·모빌리티',items:['로봇·자동화','우주·위성','자율주행','드론·UAM','휴머노이드','방산']},
 {name:'에너지·자원',items:['원전·SMR','전고체 배터리','수소','태양광','핵융합','탄소포집','희토류·핵심광물','자원 재활용']},
 {name:'헬스케어·소비',items:['바이오테크','의료기기','디지털헬스','AI 신약개발','K-콘텐츠·드라마','게임·e스포츠']},
] as const;
