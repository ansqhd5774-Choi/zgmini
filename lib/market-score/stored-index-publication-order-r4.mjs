// Separate the publication clock from the underlying observation/source clock.
// A newly published correction may legitimately refer to an earlier source time.
const stamp=value=>typeof value==='string'&&value.trim()?Date.parse(value):NaN;

/**
 * Return the next accepted header-order checkpoint or null for a regression.
 * The caller additionally checks the stored body observation/publication order.
 * Once the endpoint provides an explicit verified publication timestamp,
 * an undated response cannot replace it using only an unrelated source clock.
 */
export function nextStoredIndexPublicationOrder(previous,{publishedAt=null,snapshotAt=null}={}){
 const publication=stamp(publishedAt),snapshot=stamp(snapshotAt);
 const oldPublication=previous?.publication??null,oldSnapshot=previous?.snapshot??null;
 if(oldPublication!==null){
  if(!Number.isFinite(publication)||publication<oldPublication)return null;
 }else if(!Number.isFinite(publication)&&oldSnapshot!==null&&
          Number.isFinite(snapshot)&&snapshot<oldSnapshot)return null;
 return {
  publication:Number.isFinite(publication)?publication:oldPublication,
  snapshot:Number.isFinite(snapshot)?snapshot:oldSnapshot,
 };
}
