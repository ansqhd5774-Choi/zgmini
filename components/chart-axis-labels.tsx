export default function ChartAxisLabels({ticks=[0,50,100],top=14.7,bottom=79.4,left=11.8,dates=false,startLabel='0',endLabel='14'}:{ticks?:number[];top?:number;bottom?:number;left?:number;dates?:boolean;startLabel?:string;endLabel?:string}){
 return <div className="zg-chart-fixed-axis" aria-hidden="true">{ticks.map(value=><span key={value} style={{left:`${left}%`,top:`${bottom-(bottom-top)*value/100}%`}}>{value}</span>)}{dates&&<><b style={{left:'15.3%',transform:'translateX(-30%)'}}>{startLabel}</b><b style={{right:'7.1%',transform:'translateX(22%)'}}>{endLabel}</b></>}</div>;
}
