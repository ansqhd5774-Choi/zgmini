export function scoreMotionChange(previous,current){
 if(![previous,current].every(v=>typeof v==='number'&&Number.isFinite(v)))return null;
 const before=Number(previous.toFixed(1)),after=Number(current.toFixed(1));
 return after===before?null:after>before?'up':'down';
}
