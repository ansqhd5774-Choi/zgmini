export const EMPLOYMENT_R4_BED_REVISION = "EMP-R4-BED-FEATURE-R1";

export const EMPLOYMENT_R4_BED_FREEZE = Object.freeze({
  "schemaVersion": 1,
  "revision": "EMP-R4-BED-FEATURE-FREEZE-R1",
  "sourceEvidenceSha256": "3bb74c5803e28e80e0419b57a8dd491e4ca5cf63d19ed381894e83eea4158653",
  "sourceContract": {
    "provider": "U.S. Bureau of Labor Statistics / Business Employment Dynamics",
    "frequency": "quarterly",
    "historyStart": "1992-09",
    "releaseLag": "ABOUT_6_MONTHS",
    "seasonalModelRevision": "ANNUAL",
    "api": {
      "route": "https://api.bls.gov/publicAPI/v1/timeseries/data/",
      "version": "v1_unregistered",
      "dailyQueryLimit": 25,
      "seriesPerQuery": 25,
      "yearsPerQuery": 10,
      "sampleValidated": true
    }
  },
  "researchUniverse": {
    "stateBreadth": {
      "count": 51,
      "policy": "50_STATES_PLUS_DC",
      "exclude": [
        "72 Puerto Rico",
        "78 Virgin Islands"
      ],
      "requireFullUniverse": true,
      "pairs": [
        {
          "code": "01",
          "name": "Alabama",
          "gainSeriesId": "BDS0000001000000000110001LQ5",
          "lossSeriesId": "BDS0000001000000000110004LQ5"
        },
        {
          "code": "02",
          "name": "Alaska",
          "gainSeriesId": "BDS0000002000000000110001LQ5",
          "lossSeriesId": "BDS0000002000000000110004LQ5"
        },
        {
          "code": "04",
          "name": "Arizona",
          "gainSeriesId": "BDS0000004000000000110001LQ5",
          "lossSeriesId": "BDS0000004000000000110004LQ5"
        },
        {
          "code": "05",
          "name": "Arkansas",
          "gainSeriesId": "BDS0000005000000000110001LQ5",
          "lossSeriesId": "BDS0000005000000000110004LQ5"
        },
        {
          "code": "06",
          "name": "California",
          "gainSeriesId": "BDS0000006000000000110001LQ5",
          "lossSeriesId": "BDS0000006000000000110004LQ5"
        },
        {
          "code": "08",
          "name": "Colorado",
          "gainSeriesId": "BDS0000008000000000110001LQ5",
          "lossSeriesId": "BDS0000008000000000110004LQ5"
        },
        {
          "code": "09",
          "name": "Connecticut",
          "gainSeriesId": "BDS0000009000000000110001LQ5",
          "lossSeriesId": "BDS0000009000000000110004LQ5"
        },
        {
          "code": "10",
          "name": "Delaware",
          "gainSeriesId": "BDS0000010000000000110001LQ5",
          "lossSeriesId": "BDS0000010000000000110004LQ5"
        },
        {
          "code": "11",
          "name": "District of Columbia",
          "gainSeriesId": "BDS0000011000000000110001LQ5",
          "lossSeriesId": "BDS0000011000000000110004LQ5"
        },
        {
          "code": "12",
          "name": "Florida",
          "gainSeriesId": "BDS0000012000000000110001LQ5",
          "lossSeriesId": "BDS0000012000000000110004LQ5"
        },
        {
          "code": "13",
          "name": "Georgia",
          "gainSeriesId": "BDS0000013000000000110001LQ5",
          "lossSeriesId": "BDS0000013000000000110004LQ5"
        },
        {
          "code": "15",
          "name": "Hawaii",
          "gainSeriesId": "BDS0000015000000000110001LQ5",
          "lossSeriesId": "BDS0000015000000000110004LQ5"
        },
        {
          "code": "16",
          "name": "Idaho",
          "gainSeriesId": "BDS0000016000000000110001LQ5",
          "lossSeriesId": "BDS0000016000000000110004LQ5"
        },
        {
          "code": "17",
          "name": "Illinois",
          "gainSeriesId": "BDS0000017000000000110001LQ5",
          "lossSeriesId": "BDS0000017000000000110004LQ5"
        },
        {
          "code": "18",
          "name": "Indiana",
          "gainSeriesId": "BDS0000018000000000110001LQ5",
          "lossSeriesId": "BDS0000018000000000110004LQ5"
        },
        {
          "code": "19",
          "name": "Iowa",
          "gainSeriesId": "BDS0000019000000000110001LQ5",
          "lossSeriesId": "BDS0000019000000000110004LQ5"
        },
        {
          "code": "20",
          "name": "Kansas",
          "gainSeriesId": "BDS0000020000000000110001LQ5",
          "lossSeriesId": "BDS0000020000000000110004LQ5"
        },
        {
          "code": "21",
          "name": "Kentucky",
          "gainSeriesId": "BDS0000021000000000110001LQ5",
          "lossSeriesId": "BDS0000021000000000110004LQ5"
        },
        {
          "code": "22",
          "name": "Louisiana",
          "gainSeriesId": "BDS0000022000000000110001LQ5",
          "lossSeriesId": "BDS0000022000000000110004LQ5"
        },
        {
          "code": "23",
          "name": "Maine",
          "gainSeriesId": "BDS0000023000000000110001LQ5",
          "lossSeriesId": "BDS0000023000000000110004LQ5"
        },
        {
          "code": "24",
          "name": "Maryland",
          "gainSeriesId": "BDS0000024000000000110001LQ5",
          "lossSeriesId": "BDS0000024000000000110004LQ5"
        },
        {
          "code": "25",
          "name": "Massachusetts",
          "gainSeriesId": "BDS0000025000000000110001LQ5",
          "lossSeriesId": "BDS0000025000000000110004LQ5"
        },
        {
          "code": "26",
          "name": "Michigan",
          "gainSeriesId": "BDS0000026000000000110001LQ5",
          "lossSeriesId": "BDS0000026000000000110004LQ5"
        },
        {
          "code": "27",
          "name": "Minnesota",
          "gainSeriesId": "BDS0000027000000000110001LQ5",
          "lossSeriesId": "BDS0000027000000000110004LQ5"
        },
        {
          "code": "28",
          "name": "Mississippi",
          "gainSeriesId": "BDS0000028000000000110001LQ5",
          "lossSeriesId": "BDS0000028000000000110004LQ5"
        },
        {
          "code": "29",
          "name": "Missouri",
          "gainSeriesId": "BDS0000029000000000110001LQ5",
          "lossSeriesId": "BDS0000029000000000110004LQ5"
        },
        {
          "code": "30",
          "name": "Montana",
          "gainSeriesId": "BDS0000030000000000110001LQ5",
          "lossSeriesId": "BDS0000030000000000110004LQ5"
        },
        {
          "code": "31",
          "name": "Nebraska",
          "gainSeriesId": "BDS0000031000000000110001LQ5",
          "lossSeriesId": "BDS0000031000000000110004LQ5"
        },
        {
          "code": "32",
          "name": "Nevada",
          "gainSeriesId": "BDS0000032000000000110001LQ5",
          "lossSeriesId": "BDS0000032000000000110004LQ5"
        },
        {
          "code": "33",
          "name": "New Hampshire",
          "gainSeriesId": "BDS0000033000000000110001LQ5",
          "lossSeriesId": "BDS0000033000000000110004LQ5"
        },
        {
          "code": "34",
          "name": "New Jersey",
          "gainSeriesId": "BDS0000034000000000110001LQ5",
          "lossSeriesId": "BDS0000034000000000110004LQ5"
        },
        {
          "code": "35",
          "name": "New Mexico",
          "gainSeriesId": "BDS0000035000000000110001LQ5",
          "lossSeriesId": "BDS0000035000000000110004LQ5"
        },
        {
          "code": "36",
          "name": "New York",
          "gainSeriesId": "BDS0000036000000000110001LQ5",
          "lossSeriesId": "BDS0000036000000000110004LQ5"
        },
        {
          "code": "37",
          "name": "North Carolina",
          "gainSeriesId": "BDS0000037000000000110001LQ5",
          "lossSeriesId": "BDS0000037000000000110004LQ5"
        },
        {
          "code": "38",
          "name": "North Dakota",
          "gainSeriesId": "BDS0000038000000000110001LQ5",
          "lossSeriesId": "BDS0000038000000000110004LQ5"
        },
        {
          "code": "39",
          "name": "Ohio",
          "gainSeriesId": "BDS0000039000000000110001LQ5",
          "lossSeriesId": "BDS0000039000000000110004LQ5"
        },
        {
          "code": "40",
          "name": "Oklahoma",
          "gainSeriesId": "BDS0000040000000000110001LQ5",
          "lossSeriesId": "BDS0000040000000000110004LQ5"
        },
        {
          "code": "41",
          "name": "Oregon",
          "gainSeriesId": "BDS0000041000000000110001LQ5",
          "lossSeriesId": "BDS0000041000000000110004LQ5"
        },
        {
          "code": "42",
          "name": "Pennsylvania",
          "gainSeriesId": "BDS0000042000000000110001LQ5",
          "lossSeriesId": "BDS0000042000000000110004LQ5"
        },
        {
          "code": "44",
          "name": "Rhode Island",
          "gainSeriesId": "BDS0000044000000000110001LQ5",
          "lossSeriesId": "BDS0000044000000000110004LQ5"
        },
        {
          "code": "45",
          "name": "South Carolina",
          "gainSeriesId": "BDS0000045000000000110001LQ5",
          "lossSeriesId": "BDS0000045000000000110004LQ5"
        },
        {
          "code": "46",
          "name": "South Dakota",
          "gainSeriesId": "BDS0000046000000000110001LQ5",
          "lossSeriesId": "BDS0000046000000000110004LQ5"
        },
        {
          "code": "47",
          "name": "Tennessee",
          "gainSeriesId": "BDS0000047000000000110001LQ5",
          "lossSeriesId": "BDS0000047000000000110004LQ5"
        },
        {
          "code": "48",
          "name": "Texas",
          "gainSeriesId": "BDS0000048000000000110001LQ5",
          "lossSeriesId": "BDS0000048000000000110004LQ5"
        },
        {
          "code": "49",
          "name": "Utah",
          "gainSeriesId": "BDS0000049000000000110001LQ5",
          "lossSeriesId": "BDS0000049000000000110004LQ5"
        },
        {
          "code": "50",
          "name": "Vermont",
          "gainSeriesId": "BDS0000050000000000110001LQ5",
          "lossSeriesId": "BDS0000050000000000110004LQ5"
        },
        {
          "code": "51",
          "name": "Virginia",
          "gainSeriesId": "BDS0000051000000000110001LQ5",
          "lossSeriesId": "BDS0000051000000000110004LQ5"
        },
        {
          "code": "53",
          "name": "Washington",
          "gainSeriesId": "BDS0000053000000000110001LQ5",
          "lossSeriesId": "BDS0000053000000000110004LQ5"
        },
        {
          "code": "54",
          "name": "West Virginia",
          "gainSeriesId": "BDS0000054000000000110001LQ5",
          "lossSeriesId": "BDS0000054000000000110004LQ5"
        },
        {
          "code": "55",
          "name": "Wisconsin",
          "gainSeriesId": "BDS0000055000000000110001LQ5",
          "lossSeriesId": "BDS0000055000000000110004LQ5"
        },
        {
          "code": "56",
          "name": "Wyoming",
          "gainSeriesId": "BDS0000056000000000110001LQ5",
          "lossSeriesId": "BDS0000056000000000110004LQ5"
        }
      ]
    },
    "smallFirm": {
      "sizeClassCodes": [
        "01",
        "02",
        "03",
        "04"
      ],
      "labels": [
        "1-4 employees",
        "5-9 employees",
        "10-19 employees",
        "20-49 employees"
      ],
      "levelPairs": {
        "01": {
          "gainSeriesId": "BDS0000000000000000110101LQ5",
          "lossSeriesId": "BDS0000000000000000110104LQ5"
        },
        "02": {
          "gainSeriesId": "BDS0000000000000000110201LQ5",
          "lossSeriesId": "BDS0000000000000000110204LQ5"
        },
        "03": {
          "gainSeriesId": "BDS0000000000000000110301LQ5",
          "lossSeriesId": "BDS0000000000000000110304LQ5"
        },
        "04": {
          "gainSeriesId": "BDS0000000000000000110401LQ5",
          "lossSeriesId": "BDS0000000000000000110404LQ5"
        }
      },
      "captureCorrection": "Prior metadata regex also matched sizeclass 31 (1 to 4 jobs); no selected BED firm-size series used 31. R1 freezes firm-size codes exactly 01-04."
    }
  },
  "features": {
    "BED_NET_GROSS_RATE": {
      "gainSeriesId": "BDS0000000000000000110001RQ5",
      "lossSeriesId": "BDS0000000000000000110004RQ5",
      "formula": "grossGainsRate - grossLossRate",
      "direction": "higher_positive"
    },
    "BED_SMALL_FIRM_NET_LEVEL": {
      "formula": "sum(gain levels sizeclass 01-04) - sum(loss levels sizeclass 01-04)",
      "direction": "higher_positive",
      "requiresAll8Series": true
    },
    "BED_STATE_BREADTH": {
      "formula": "100 * count(state gain level > state loss level) / 51",
      "direction": "higher_positive",
      "fullUniverseRequired": true
    },
    "BED_BIRTH_DEATH_DIAGNOSTIC": {
      "birthRateSeriesId": "BDS0000000000000000110007RQ5",
      "deathRateSeriesId": "BDS0000000000000000110008RQ5",
      "formula": "birthRate - deathRate when both finite",
      "direction": "higher_positive",
      "diagnosticOnly": true,
      "noMissingImputation": true
    }
  },
  "contracts": {
    "storedDataOnlyForScoring": true,
    "providerDirectIntoScore": false,
    "nullToZero": false,
    "survivorDenominatorShrink": false,
    "historicalCurrentVintageResearchOnly": true,
    "activeMethodologyChanged": false,
    "bedRole": "OPTIONAL_STRUCTURAL_CANDIDATE"
  }
});

const finite = (v) => typeof v === "number" && Number.isFinite(v);
const val = (row) => {
  const n = Number(row?.value);
  return Number.isFinite(n) ? n : null;
};

function indexBySeries(rows) {
  const m = new Map();
  for (const r of rows ?? []) {
    const id = String(r?.seriesId ?? r?.series_id ?? r?.providerSeriesId ?? r?.provider_series_id ?? "");
    if (!id) continue;
    m.set(id, val(r));
  }
  return m;
}

export function computeBedNetGrossRate(rows) {
  const m = indexBySeries(rows);
  const f = EMPLOYMENT_R4_BED_FREEZE.features.BED_NET_GROSS_RATE;
  const gains = m.get(f.gainSeriesId);
  const losses = m.get(f.lossSeriesId);
  if (!finite(gains) || !finite(losses)) return {value:null,status:"PARTIAL_REQUIRED_SERIES_MISSING"};
  return {value:gains-losses,status:"READY",grossGainsRate:gains,grossLossRate:losses};
}

export function computeBedSmallFirmNetLevel(rows) {
  const m = indexBySeries(rows);
  let gains=0, losses=0;
  const missing=[];
  for (const code of EMPLOYMENT_R4_BED_FREEZE.researchUniverse.smallFirm.sizeClassCodes) {
    const p = EMPLOYMENT_R4_BED_FREEZE.researchUniverse.smallFirm.levelPairs[code];
    const g=m.get(p.gainSeriesId), l=m.get(p.lossSeriesId);
    if (!finite(g)) missing.push(p.gainSeriesId); else gains+=g;
    if (!finite(l)) missing.push(p.lossSeriesId); else losses+=l;
  }
  if (missing.length) return {value:null,status:"PARTIAL_REQUIRED_SERIES_MISSING",missing};
  return {value:gains-losses,status:"READY",grossGainsLevel:gains,grossLossLevel:losses};
}

export function computeBedStateBreadth(rows) {
  const m = indexBySeries(rows);
  const pairs = EMPLOYMENT_R4_BED_FREEZE.researchUniverse.stateBreadth.pairs;
  const missing=[];
  let positive=0;
  for (const p of pairs) {
    const g=m.get(p.gainSeriesId), l=m.get(p.lossSeriesId);
    if (!finite(g)) missing.push(p.gainSeriesId);
    if (!finite(l)) missing.push(p.lossSeriesId);
    if (finite(g) && finite(l) && g>l) positive++;
  }
  if (missing.length) return {
    value:null,status:"PARTIAL_FULL_51_UNIVERSE_REQUIRED",
    validJurisdictions:51-new Set(missing.map(id=>pairs.find(p=>p.gainSeriesId===id||p.lossSeriesId===id)?.code).filter(Boolean)).size,
    missing
  };
  return {value:100*positive/51,status:"READY",positiveJurisdictions:positive,denominator:51};
}

export function computeBedBirthDeathDiagnostic(rows) {
  const m=indexBySeries(rows);
  const f=EMPLOYMENT_R4_BED_FREEZE.features.BED_BIRTH_DEATH_DIAGNOSTIC;
  const birth=m.get(f.birthRateSeriesId), death=m.get(f.deathRateSeriesId);
  if (!finite(birth) || !finite(death)) return {value:null,status:"DIAGNOSTIC_MISSING_NO_IMPUTATION"};
  return {value:birth-death,status:"READY_DIAGNOSTIC",birthRate:birth,deathRate:death};
}

export function buildBedRawFeatures(rows) {
  return Object.freeze({
    netGrossRate:computeBedNetGrossRate(rows),
    smallFirmNetLevel:computeBedSmallFirmNetLevel(rows),
    stateBreadth:computeBedStateBreadth(rows),
    birthDeathDiagnostic:computeBedBirthDeathDiagnostic(rows),
    scoreComputed:false,
    providerCalled:false,
    activeMethodologyChanged:false
  });
}

export const EMPLOYMENT_R4_BED_CONTRACT = Object.freeze({
  researchOnly:true,
  storedRowsInputOnly:true,
  providerCalls:0,
  scoreComputed:false,
  activeMethodologyChanged:false,
  overallWeightChanged:false,
  publicUiChanged:false
});
