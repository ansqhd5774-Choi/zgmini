// These are descriptive raw indicators, not four normalized B1 factors.
// Long-history definitions and approved index pairs must be supplied separately.
export function breadthTop4(breadth) {
  const ratio = breadth?.components?.advanceRatio;
  const ready = breadth?.status === "READY" && typeof ratio === "number"
    && Number.isFinite(ratio) && ratio >= 0 && ratio <= 1;
  return [
    {id:"breadth-37",name:"200DMA 상회",status:"PARTIAL",score:null,value:null,unit:"%",missing:["COMPLETE_PIT_SPLIT_CONSISTENT_200_OBSERVATIONS_REQUIRED"]},
    {id:"breadth-38",name:"상승 종목 비율",status:ready?"READY":"PARTIAL",score:null,value:ready?100*ratio:null,unit:"%",definition:"(UP + 0.5 × FLAT) / ValidReturnCount",missing:ready?[]:["VERIFIED_B1_OBSERVATION_REQUIRED"]},
    {id:"breadth-39",name:"52주 신고가−신저가",status:"PARTIAL",score:null,value:null,unit:"종목",missing:["APPROVED_52_WEEK_DEFINITION_AND_PIT_HISTORY_REQUIRED"]},
    {id:"breadth-40",name:"동일가중 상대강도",status:"PARTIAL",score:null,value:null,unit:"배",missing:["APPROVED_COMPARABLE_INDEX_PAIR_REQUIRED"]},
  ];
}
