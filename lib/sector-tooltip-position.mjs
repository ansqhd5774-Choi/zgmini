/**
 * Place a held sector/theme tooltip next to the selected pointer, inside the plot.
 * The standard hover tooltip is positioned by Recharts, just like Korea's chart.
 * @param {{pointerX:number,pointerY:number,plotWidth:number,plotHeight:number,tooltipWidth:number,tooltipHeight:number,offset?:number}} input
 */
export function placeSectorHeldTooltip({pointerX,pointerY,plotWidth,plotHeight,tooltipWidth,tooltipHeight,offset=12}){
 if(![pointerX,pointerY,plotWidth,plotHeight,tooltipWidth,tooltipHeight,offset].every(Number.isFinite)
   ||plotWidth<=0||plotHeight<=0)return {x:4,y:4};
 const width=Math.max(0,Math.min(tooltipWidth,plotWidth-8));
 const height=Math.max(0,Math.min(tooltipHeight,plotHeight-8));
 let x=pointerX+offset;
 if(x+width>plotWidth-4)x=pointerX-width-offset;
 x=Math.max(4,Math.min(x,Math.max(4,plotWidth-width-4)));
 let y=pointerY-height-offset;
 if(y<4)y=pointerY+offset;
 y=Math.max(4,Math.min(y,Math.max(4,plotHeight-height-4)));
 return {x,y};
}
