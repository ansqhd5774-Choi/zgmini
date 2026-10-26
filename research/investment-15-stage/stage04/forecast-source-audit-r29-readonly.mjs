/**
 * R29: audit one live TBRC publisher report's forecast against its own
 * forecast table and the arithmetically implied CAGR. Research-only.
 * No source numbers are hardcoded, and conflicting figures are not repaired.
 */

function reportText(html) {
  return String(html)
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ').trim();
}

function amount(value, unit) {
  const number = Number(String(value).replaceAll(',', ''));
  const scale = ({ million: 1e6, billion: 1e9, trillion: 1e12 })[String(unit).toLowerCase()];
  return Number.isFinite(number) && scale ? number * scale : null;
}

function valueMatch(text, expression) {
  const m = text.match(expression);
  return m ? { year: Number(m[1]), number: Number(m[2].replaceAll(',', '')),
    unit: m[3].toLowerCase(), value: amount(m[2], m[3]) } : null;
}

export function auditForecastSource(html) {
  const text = reportText(html);
  const audit = { source_audit: 'INCOMPLETE', source_conflict_reason: null,
    forecast_narrative_pct: null, forecast_table_pct: null,
    forecast_math_pct: null, forecast_base_year: null, forecast_end_year: null,
    forecast_base_value: null, forecast_end_value: null,
    forecast_excerpt: null };

  const section = text.match(/What Is The\s+.{3,130}?\s+Market Growth Forecast\s*\?/i);
  if (!section) {
    audit.source_conflict_reason = 'MISSING_GROWTH_FORECAST_HEADING';
    return audit;
  }
  // The forecast body, not the preceding 2025→2026 "historic period" paragraph.
  const sectionText = text.slice(section.index + section[0].length,
    section.index + section[0].length + 850);
  const narrative = sectionText.match(/(?:will|is expected to)\s+grow\s+to\s+\$([\d,.]+)\s+(million|billion|trillion)\s+in\s+(20\d{2})\s+at\s+(?:a\s+)?compound\s+annual\s+growth\s+rate\s*\(CAGR\)\s+of\s+([\d.]+)\s*%/i);
  if (!narrative) {
    audit.source_conflict_reason = 'MISSING_NARRATIVE_CAGR';
    return audit;
  }
  audit.forecast_narrative_pct = Number(narrative[4]);

  // Extract explicit base/forecast values from the report's own attribute table.
  const tableIndex = text.search(/Market Report Forecast Analysis/i);
  const tableText = tableIndex < 0 ? '' : text.slice(tableIndex, tableIndex + 1250);
  const base = valueMatch(tableText,
    /Market Size Value In\s+(20\d{2})\s+\$([\d,.]+)\s+(million|billion|trillion)/i);
  const end = valueMatch(tableText,
    /Revenue Forecast In\s+(20\d{2})\s+\$([\d,.]+)\s+(million|billion|trillion)/i);
  const table = tableText.match(/Growth Rate\s+CAGR\s+of\s+([\d.]+)\s*%\s+from\s+(20\d{2})\s+to\s+(20\d{2})/i);
  if (table) audit.forecast_table_pct = Number(table[1]);
  if (base) {
    audit.forecast_base_year = base.year;
    audit.forecast_base_value = `${base.number} ${base.unit}`;
  }
  if (end) {
    audit.forecast_end_year = end.year;
    audit.forecast_end_value = `${end.number} ${end.unit}`;
  }
  if (!base || !end || !table || !Number.isFinite(audit.forecast_narrative_pct)) {
    audit.source_conflict_reason = 'MISSING_REPORT_FORECAST_ATTRIBUTES';
    return audit;
  }
  if (base.year !== Number(table[2]) || end.year !== Number(table[3]) ||
      end.year !== Number(narrative[3]) || end.year <= base.year ||
      !base.value || !end.value || base.value <= 0 || end.value <= 0) {
    audit.source_conflict_reason = 'INCONSISTENT_REPORT_PERIOD_OR_UNITS';
    return audit;
  }

  const computed = (Math.pow(end.value / base.value, 1 / (end.year - base.year)) - 1) * 100;
  audit.forecast_math_pct = Number(computed.toFixed(3));
  // Tolerance covers rounded published percentage/market-size figures;
  // this is only a conflict-detection gate, never an investment-score formula.
  const tolerancePp = 0.15;
  const narrativeAgrees = Math.abs(computed - audit.forecast_narrative_pct) <= tolerancePp;
  const tableAgrees = Math.abs(computed - audit.forecast_table_pct) <= tolerancePp;

  if (!narrativeAgrees || !tableAgrees) {
    audit.source_audit = 'SOURCE_CONFLICT';
    audit.source_conflict_reason = !narrativeAgrees && !tableAgrees
      ? 'NARRATIVE_AND_TABLE_DISAGREE_WITH_MARKET_SIZES'
      : !narrativeAgrees ? 'NARRATIVE_DISAGREES_WITH_MARKET_SIZES'
        : 'TABLE_DISAGREES_WITH_MARKET_SIZES';
  } else {
    audit.source_audit = 'CONSISTENT';
  }

  // Only direct excerpts from the single page are passed to the model.
  // Give it the forecast paragraph plus the publisher's actual base-value text;
  // do not expose the conflicting metadata CAGR as if it were authoritative.
  const baseText = tableText.match(/Market Size Value In\s+20\d{2}\s+\$[\d,.]+\s+(?:million|billion|trillion)/i)?.[0] || '';
  const forecastText = (section[0] + ' ' + sectionText.slice(0, narrative.index + narrative[0].length)).trim();
  audit.forecast_excerpt = `${baseText}. ${forecastText}`.slice(0, 650);
  return audit;
}
