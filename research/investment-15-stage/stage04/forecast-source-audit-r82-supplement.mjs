/**
 * R82 opt-in supplement. R29 remains unchanged.
 * A publisher metadata table can mislabel both the historic CAGR and the
 * forecast end year. A live whole-market overview and the forecast paragraph
 * must independently agree on the real end year, end value and CAGR. Historic
 * sizes must separately prove the table's rate. No stored CAGR is consulted.
 */

function plain(html) {
  return String(html)
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|nav|footer)\b[^>]*>[^]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ').trim();
}

const NUMBER = '([\\d,.]+)\\s+(million|billion|trillion)';
function money(number, unit) {
  const scalar = { million: 1e6, billion: 1e9, trillion: 1e12 }[unit.toLowerCase()];
  return Number(number.replaceAll(',', '')) * scalar;
}
const close = (a, b) => Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 &&
  Math.abs(a / b - 1) <= 0.00002;

export function proveR82ForecastMetadataPeriodMislabel(html) {
  const text = plain(html);
  const historicHeading = /What Is The\s+.{3,130}?\s+Market Size and Share 20\d{2}\s*\?/i.exec(text);
  const forecastHeading = /What Is The\s+.{3,130}?\s+Market Growth Forecast\s*\?/i.exec(text);
  const overviewStart = /\bMarket Overview\b/i.exec(text);
  const overviewEnd = /What Is Covered Under/i.exec(text);
  const tableHeading = /Market Report Forecast Analysis/i.exec(text);
  if (!historicHeading || !forecastHeading || !overviewStart || !overviewEnd ||
      overviewEnd.index <= overviewStart.index || !tableHeading ||
      historicHeading.index >= forecastHeading.index) return null;

  const historic = text.slice(historicHeading.index + historicHeading[0].length,
    forecastHeading.index);
  const forecast = text.slice(forecastHeading.index + forecastHeading[0].length,
    forecastHeading.index + forecastHeading[0].length + 850);
  const overview = text.slice(overviewStart.index + overviewStart[0].length,
    overviewEnd.index);
  const table = text.slice(tableHeading.index, tableHeading.index + 1250);
  const hist = new RegExp(`(?:will|is expected to)\\s+grow\\s+from\\s+\\$${NUMBER}\\s+in\\s+(20\\d{2})\\s+to\\s+\\$${NUMBER}\\s+in\\s+(20\\d{2})\\s+at\\s+(?:a\\s+)?compound\\s+annual\\s+growth\\s+rate\\s*\\(CAGR\\)\\s+of\\s+([\\d.]+)\\s*%`, 'i').exec(historic);
  const futurePattern = new RegExp(`(?:will|is expected to)\\s+grow\\s+to\\s+\\$${NUMBER}\\s+in\\s+(20\\d{2})\\s+at\\s+(?:a\\s+)?compound\\s+annual\\s+growth\\s+rate\\s*\\(CAGR\\)\\s+of\\s+([\\d.]+)\\s*%`, 'i');
  const predicted = futurePattern.exec(forecast);
  const overviewPredicted = new RegExp(`expected\\s+to\\s+grow\\s+to\\s+\\$${NUMBER}\\s+in\\s+(20\\d{2})\\s+at\\s+(?:a\\s+)?compound\\s+annual\\s+growth\\s+rate\\s*\\(CAGR\\)\\s+of\\s+([\\d.]+)\\s*%`, 'i').exec(overview);
  const base = new RegExp(`Market Size Value In\\s+(20\\d{2})\\s+\\$${NUMBER}`, 'i').exec(table);
  const end = new RegExp(`Revenue Forecast In\\s+(20\\d{2})\\s+\\$${NUMBER}`, 'i').exec(table);
  const rate = /Growth Rate\s+CAGR\s+of\s+([\d.]+)\s*%\s+from\s+(20\d{2})\s+to\s+(20\d{2})/i.exec(table);
  if (!hist || !predicted || !overviewPredicted || !base || !end || !rate) return null;
  const historicBase = money(hist[1], hist[2]);
  const historicEnd = money(hist[4], hist[5]);
  const forecastBase = money(base[2], base[3]);
  const forecastEnd = money(predicted[1], predicted[2]);
  const overviewEndValue = money(overviewPredicted[1], overviewPredicted[2]);
  const tableEndValue = money(end[2], end[3]);
  const hStart = Number(hist[3]);
  const hEnd = Number(hist[6]);
  const fStart = Number(base[1]);
  const fEnd = Number(predicted[3]);
  const overviewYear = Number(overviewPredicted[3]);
  const metadataYear = Number(end[1]);
  const tableStart = Number(rate[2]);
  const tableEnd = Number(rate[3]);
  const forecastRate = Number(predicted[4]);
  const overviewRate = Number(overviewPredicted[4]);
  const historicRate = Number(hist[7]);
  const tableRate = Number(rate[1]);
  if (!(hEnd === hStart + 1 && hEnd === fStart && fEnd > fStart && fEnd <= 2100 &&
      metadataYear !== fEnd && metadataYear === tableEnd && tableStart === fStart &&
      overviewYear === fEnd && close(historicEnd, forecastBase) &&
      close(forecastEnd, overviewEndValue) && close(forecastEnd, tableEndValue) &&
      Math.abs(forecastRate - overviewRate) <= 0.05 &&
      Math.abs(tableRate - historicRate) <= 0.05)) return null;
  const historicMath = (historicEnd / historicBase - 1) * 100;
  const futureMath = (Math.pow(forecastEnd / forecastBase, 1 / (fEnd - fStart)) - 1) * 100;
  if (![historicMath, futureMath].every(Number.isFinite) ||
      Math.abs(historicMath - historicRate) > 0.15 ||
      Math.abs(futureMath - forecastRate) > 0.15) return null;

  return {
    source_audit: 'RESOLVED_FORECAST_METADATA_YEAR_AND_HISTORIC_RATE_MISLABEL',
    source_conflict_reason: 'OVERVIEW_AND_FORECAST_SIZES_PROVE_MISLABELED_METADATA',
    forecast_narrative_pct: forecastRate,
    forecast_table_pct: tableRate,
    forecast_math_pct: Number(futureMath.toFixed(3)),
    forecast_base_year: fStart,
    forecast_end_year: fEnd,
    forecast_base_value: `${base[2]} ${base[3]}`,
    forecast_end_value: `${predicted[1]} ${predicted[2]}`,
    forecast_metadata_end_year: metadataYear,
    overview_forecast_year: overviewYear,
    overview_forecast_pct: overviewRate,
    historic_narrative_pct: historicRate,
    historic_math_pct: Number(historicMath.toFixed(3)),
    forecast_excerpt: `Market Size Value In ${fStart} $${base[2]} ${base[3]}. ` +
      `${forecastHeading[0]} ${forecast.slice(0, predicted.index + predicted[0].length)}`
  };
}
