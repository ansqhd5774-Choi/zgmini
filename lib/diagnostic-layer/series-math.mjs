const finite = value => typeof value === 'number' && Number.isFinite(value);

export function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  const byDate = new Map();
  for (const row of rows) {
    if (!row || typeof row.observationDate !== 'string' || !finite(row.value)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.observationDate)) continue;
    if (byDate.has(row.observationDate) && byDate.get(row.observationDate) !== row.value) {
      throw new Error(`DUPLICATE_CONFLICT:${row.observationDate}`);
    }
    byDate.set(row.observationDate, row.value);
  }
  return [...byDate]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([observationDate, value]) => ({observationDate, value}));
}

export function shiftMonth(date, deltaMonths) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const total = year * 12 + (month - 1) + deltaMonths;
  const y = Math.floor(total / 12);
  const m = total - y * 12 + 1;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function exactLagTransform(rows, lagMonths, transform) {
  const normalized = normalizeRows(rows);
  const map = new Map(normalized.map(row => [row.observationDate, row.value]));
  const out = [];
  for (const row of normalized) {
    const lagDate = shiftMonth(row.observationDate, -lagMonths);
    if (!map.has(lagDate)) continue;
    const value = transform(row.value, map.get(lagDate));
    if (finite(value)) out.push({observationDate: row.observationDate, value});
  }
  return out;
}

export function yoyPercent(rows) {
  return exactLagTransform(rows, 12, (current, lag) =>
    current > 0 && lag > 0 ? 100 * (current / lag - 1) : null
  );
}

export function changeMonths(rows, lagMonths) {
  return exactLagTransform(rows, lagMonths, (current, lag) => current - lag);
}

export function exactAlign(namedSeries) {
  const entries = Object.entries(namedSeries).map(([name, rows]) => [
    name,
    new Map(normalizeRows(rows).map(row => [row.observationDate, row.value])),
  ]);
  if (!entries.length) return [];
  const dates = [...entries[0][1].keys()]
    .filter(date => entries.every(([, map]) => map.has(date)))
    .sort();
  return dates.map(observationDate => ({
    observationDate,
    ...Object.fromEntries(entries.map(([name, map]) => [name, map.get(observationDate)])),
  }));
}


export function expandingPercentileValues(values,{inverse=false,minValid=1}={}){
  const finiteValues=values.filter(finite);
  const unique=[...new Set(finiteValues)].sort((a,b)=>a-b);
  const indexOf=value=>{
    let lo=0,hi=unique.length-1;
    while(lo<=hi){
      const mid=(lo+hi)>>1,cur=unique[mid];
      if(cur<value)lo=mid+1;
      else if(cur>value)hi=mid-1;
      else return mid+1;
    }
    return 0;
  };
  const tree=new Int32Array(unique.length+1);
  const add=(index,delta)=>{for(let i=index;i<tree.length;i+=i&-i)tree[i]+=delta};
  const sum=index=>{let total=0;for(let i=index;i>0;i-=i&-i)total+=tree[i];return total};
  const out=new Array(values.length).fill(null);
  let valid=0;
  for(let i=0;i<values.length;i++){
    const value=values[i];
    if(!finite(value))continue;
    const idx=indexOf(value);
    add(idx,1);valid++;
    if(valid<minValid)continue;
    const lower=sum(idx-1),equal=sum(idx)-lower;
    const rank=(lower+0.5*equal)/valid;
    out[i]=100*(inverse?1-rank:rank);
  }
  return out;
}

export function expandingPercentileRows(rows, {inverse = false, minValid = 1} = {}) {
  const normalized=normalizeRows(rows);
  const scores=expandingPercentileValues(normalized.map(row=>row.value),{inverse,minValid});
  const out=[];
  let validHistory=0;
  for(let i=0;i<normalized.length;i++){
    validHistory+=1;
    if(scores[i]===null)continue;
    out.push({
      observationDate:normalized[i].observationDate,
      value:scores[i],
      rawValue:normalized[i].value,
      validHistory,
    });
  }
  return out;
}

export function expandingMedianRows(rows, {minValid = 1} = {}) {
  const history = [];
  const out = [];
  for (const row of normalizeRows(rows)) {
    history.push(row.value);
    if (history.length < minValid) continue;
    const sorted = [...history].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
    out.push({
      observationDate: row.observationDate,
      value: median,
      rawValue: row.value,
      validHistory: history.length,
    });
  }
  return out;
}

export function calendarQuarterAverage(rows) {
  const normalized = normalizeRows(rows);
  const groups = new Map();
  for (const row of normalized) {
    const [year, month] = row.observationDate.split('-').map(Number);
    const quarter = Math.floor((month - 1) / 3);
    const quarterStartMonth = quarter * 3 + 1;
    const key = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`;
    if (!groups.has(key)) groups.set(key, new Map());
    groups.get(key).set(month, row.value);
  }

  const out = [];
  for (const [observationDate, months] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const start = Number(observationDate.slice(5, 7));
    const expected = [start, start + 1, start + 2];
    if (!expected.every(month => months.has(month))) continue;
    out.push({
      observationDate,
      value: expected.reduce((sum, month) => sum + months.get(month), 0) / 3,
    });
  }
  return out;
}

export function quarterlyYoyPercent(rows) {
  return exactLagTransform(rows, 12, (current, lag) =>
    current > 0 && lag > 0 ? 100 * (current / lag - 1) : null
  );
}

export function logShockRows(rows) {
  const normalized = normalizeRows(rows);
  const map = new Map(normalized.map(row => [row.observationDate, row.value]));
  const out = [];
  for (const row of normalized) {
    const lag1 = map.get(shiftMonth(row.observationDate, -1));
    const lag3 = map.get(shiftMonth(row.observationDate, -3));
    if (!(row.value > 0) || !(lag1 > 0) || !(lag3 > 0)) continue;
    const shock1m = Math.max(0, Math.log(row.value / lag1));
    const shock3m = Math.max(0, Math.log(row.value / lag3));
    out.push({
      observationDate: row.observationDate,
      value: Math.max(shock1m, shock3m),
      shock1m,
      shock3m,
    });
  }
  return out;
}
