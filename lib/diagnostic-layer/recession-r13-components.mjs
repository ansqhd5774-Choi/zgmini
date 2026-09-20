import {recessionDefense} from './model.mjs';
import {normalizeRows} from './series-math.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);

function monthKey(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0,7) : null;
}

function shiftMonth(month, delta) {
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  if (!m) return null;
  const total = Number(m[1]) * 12 + Number(m[2]) - 1 + delta;
  const y = Math.floor(total / 12);
  const mo = total - y * 12 + 1;
  return `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}`;
}

function quarterKey(date) {
  if (typeof date !== 'string') return null;
  const m = /^(\d{4})-(\d{2})/.exec(date);
  if (!m) return null;
  return `${m[1]}Q${Math.floor((Number(m[2])-1)/3)+1}`;
}

function shiftQuarter(quarter, delta) {
  const m = /^(\d{4})Q([1-4])$/.exec(quarter ?? '');
  if (!m) return null;
  const total = Number(m[1]) * 4 + Number(m[2]) - 1 + delta;
  const y = Math.floor(total / 4);
  const q = total - y * 4 + 1;
  return `${y}Q${q}`;
}

function lastByMonth(rows) {
  const map = new Map();
  for (const row of normalizeRows(rows)) map.set(monthKey(row.observationDate), row.value);
  return map;
}

function byQuarter(rows) {
  const map = new Map();
  for (const row of normalizeRows(rows)) {
    const key = quarterKey(row.observationDate);
    if (key) map.set(key, row.value);
  }
  return map;
}

export function annualizedGrowth(current, lag, periodsPerYear, periods) {
  if (!(current > 0 && lag > 0) || !finite(periodsPerYear) || !finite(periods) || periods <= 0) return null;
  return 100 * ((current / lag) ** (periodsPerYear / periods) - 1);
}

export function sahmGapScore(gap) {
  if (!finite(gap)) return null;
  if (gap <= 0.10) return 100;
  if (gap <= 0.50) return 100 + (25 - 100) * (gap - 0.10) / 0.40;
  if (gap <= 1.00) return 25 + (0 - 25) * (gap - 0.50) / 0.50;
  return 0;
}

export function prefixPercentile(values, index, minValid = 60, inverse = false) {
  const current = values[index];
  if (!finite(current)) return null;
  const ref = values.slice(0,index+1).filter(finite);
  if (ref.length < minValid) return null;
  let lower = 0, equal = 0;
  for (const value of ref) {
    if (value < current) lower++;
    else if (value === current) equal++;
  }
  const rank = (lower + 0.5 * equal) / ref.length;
  return 100 * (inverse ? 1-rank : rank);
}

export function buildRecessionDefenseR13({
  payems = [],
  gdpc1 = [],
  indpro = [],
  realPce = [],
  unemployment = [],
  retailSales = [],
  disposableIncome = [],
} = {}) {
  const pay = lastByMonth(payems);
  const ip = lastByMonth(indpro);
  const pce = lastByMonth(realPce);
  const unemp = lastByMonth(unemployment);
  const retail = lastByMonth(retailSales);
  const income = lastByMonth(disposableIncome);
  const gdp = byQuarter(gdpc1);

  const months = [...new Set([
    ...pay.keys(), ...ip.keys(), ...pce.keys(), ...unemp.keys(), ...retail.keys(), ...income.keys(),
  ])].filter(Boolean).sort();

  const raw = [];
  for (const month of months) {
    const [year, mo] = month.split('-').map(Number);
    const quarter = `${year}Q${Math.floor((mo-1)/3)+1}`;
    const u = unemp.get(month);
    const u1 = unemp.get(shiftMonth(month,-1));
    const u2 = unemp.get(shiftMonth(month,-2));
    const u3ma = [u,u1,u2].every(finite) ? (u+u1+u2)/3 : null;

    let min12 = null;
    if (finite(u3ma)) {
      const values = [];
      for (let j=0;j<12;j++) {
        const mk = shiftMonth(month,-j);
        const a = unemp.get(mk);
        const b = unemp.get(shiftMonth(mk,-1));
        const c = unemp.get(shiftMonth(mk,-2));
        if ([a,b,c].every(finite)) values.push((a+b+c)/3);
      }
      if (values.length >= 12) min12 = Math.min(...values);
    }
    const sahm = finite(u3ma) && finite(min12) ? u3ma-min12 : null;

    raw.push({
      month,
      observationDate:`${month}-01`,
      nfp:annualizedGrowth(pay.get(month),pay.get(shiftMonth(month,-3)),12,3),
      realGdp:annualizedGrowth(gdp.get(quarter),gdp.get(shiftQuarter(quarter,-2)),4,2),
      industrialProduction:annualizedGrowth(ip.get(month),ip.get(shiftMonth(month,-3)),12,3),
      realPce:annualizedGrowth(pce.get(month),pce.get(shiftMonth(month,-3)),12,3),
      retailSales:annualizedGrowth(retail.get(month),retail.get(shiftMonth(month,-3)),12,3),
      disposableIncome:annualizedGrowth(income.get(month),income.get(shiftMonth(month,-3)),12,3),
      sahmGap:sahm,
    });
  }

  const growthKeys=['nfp','realGdp','industrialProduction','realPce','retailSales','disposableIncome'];
  const arrays=Object.fromEntries(growthKeys.map(key=>[key,raw.map(row=>row[key])]));

  const rows = raw.map((row,index)=>{
    const scores=Object.fromEntries(growthKeys.map(key=>[key,prefixPercentile(arrays[key],index,60,false)]));
    scores.unemployment=sahmGapScore(row.sahmGap);
    const final=recessionDefense(scores);
    return {
      ...row,
      nfpScore:scores.nfp,
      realGdpScore:scores.realGdp,
      industrialProductionScore:scores.industrialProduction,
      realPceScore:scores.realPce,
      unemploymentScore:scores.unemployment,
      retailSalesScore:scores.retailSales,
      disposableIncomeScore:scores.disposableIncome,
      status:final.status,
      score:final.score,
      missing:final.missing,
    };
  });

  return {
    status:rows.length && rows.at(-1)?.status==='READY' ? 'READY_CURRENT_VINTAGE' : 'PARTIAL',
    historyMode:'CURRENT_VINTAGE_ONLY',
    lookAheadSafe:false,
    rows,
  };
}
