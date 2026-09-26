export const BREADTH_R2_STORAGE_CONTRACT_R1 = "BREADTH-R2-STORAGE-CONTRACT-R1";

export const BREADTH_R2_PROVIDERS = Object.freeze({
  BEA: "BEA",
  SEC: "SEC",
  CFTC: "CFTC",
});

export const BREADTH_R2_METRICS = Object.freeze({
  BEA_FOREIGN_PORTFOLIO: "EquityAndInvFundSharesLiabs",
  SEC_SHARES: "WeightedAverageNumberOfSharesOutstandingBasic",
  CFTC_OPEN_INTEREST: "open_interest_all",
  CFTC_ASSET_LONG: "asset_mgr_positions_long",
  CFTC_ASSET_SHORT: "asset_mgr_positions_short",
  CFTC_LEV_LONG: "lev_money_positions_long",
  CFTC_LEV_SHORT: "lev_money_positions_short",
});

export const BREADTH_R2_CFTC_REQUIRED_CODES = Object.freeze([
  "13874A",
  "209742",
  "124603",
  "33874A",
]);

export const BREADTH_R2_SEC_UNIVERSE_KEY = "SEC:WAVG";
export const BREADTH_R2_CFTC_UNIVERSE_KEY = "CFTC:TFF:REQUIRED";

export function quarterEndDate(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(?:CY)?(\d{4})Q([1-4])$/);
  if (!match) return null;
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const monthDay = ["03-31", "06-30", "09-30", "12-31"][quarter - 1];
  return `${year}-${monthDay}`;
}

export function normalizeCik(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits || digits.length > 10) return null;
  const out = digits.padStart(10, "0");
  return out === "0000000000" ? null : out;
}
