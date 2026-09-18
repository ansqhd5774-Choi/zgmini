const DEFAULT_TIMEOUT_MS = 8000;
const CENSUS_ENDPOINT = "https://api.census.gov/data/timeseries/eits/marts";
const TEMPORARY = "TEMPORARY_CENSUS_RUNTIME_PROBE_ONLY";

function json(body, status = 200) {
  return Response.json(
    { temporary: TEMPORARY, ...body },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-robots-tag": "noindex",
      },
    },
  );
}

function normalizedEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createCensusRuntimeProbeHandler({
  authenticate,
  env,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (typeof authenticate !== "function") {
    throw new TypeError("authenticate is required");
  }

  return async function handle() {
    let user;
    try {
      user = await authenticate();
    } catch {
      return json({ status: "AUTH_FAILED", providerRequestCount: 0 }, 401);
    }

    if (!user?.email) {
      return json({ status: "UNAUTHENTICATED", providerRequestCount: 0 }, 401);
    }

    const operatorEmail = normalizedEmail(env?.KFG_V2_CANARY_OPERATOR_EMAIL);
    if (!operatorEmail) {
      return json(
        {
          status: "OPERATOR_CONFIG_MISSING",
          providerRequestCount: 0,
          secretPresent: Boolean(String(env?.CENSUS_API_KEY ?? "").trim()),
        },
        503,
      );
    }

    if (normalizedEmail(user.email) !== operatorEmail) {
      return json({ status: "FORBIDDEN", providerRequestCount: 0 }, 403);
    }

    const key = String(env?.CENSUS_API_KEY ?? "").trim();
    if (!key) {
      return json(
        {
          status: "CENSUS_SECRET_MISSING",
          providerRequestCount: 0,
          secretPresent: false,
        },
        503,
      );
    }

    const url = new URL(CENSUS_ENDPOINT);
    url.searchParams.set(
      "get",
      "data_type_code,seasonally_adj,category_code,cell_value,error_data",
    );
    // Stable official example-year query: this probe validates runtime secret
    // injection + provider authentication, not current-period business logic.
    url.searchParams.set("time", "2012");
    url.searchParams.set("key", key);

    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const errorType =
        error && typeof error === "object" && "name" in error
          ? String(error.name)
          : "REQUEST_FAILED";
      return json(
        {
          status:
            errorType === "TimeoutError" || errorType === "AbortError"
              ? "TIMEOUT"
              : "REQUEST_FAILED",
          provider: "U.S. Census Bureau",
          dataset: "timeseries/eits/marts",
          providerRequestCount: 1,
          secretPresent: true,
          keyAccepted: false,
          errorType,
        },
        errorType === "TimeoutError" || errorType === "AbortError" ? 504 : 502,
      );
    }

    if (!response.ok) {
      return json(
        {
          status: "HTTP_ERROR",
          provider: "U.S. Census Bureau",
          dataset: "timeseries/eits/marts",
          providerRequestCount: 1,
          secretPresent: true,
          keyAccepted: false,
          httpStatus: response.status,
        },
        502,
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return json(
        {
          status: "INVALID_RESPONSE",
          provider: "U.S. Census Bureau",
          dataset: "timeseries/eits/marts",
          providerRequestCount: 1,
          secretPresent: true,
          keyAccepted: false,
          httpStatus: response.status,
          parserSuccess: false,
        },
        502,
      );
    }

    const header = Array.isArray(payload?.[0]) ? payload[0] : null;
    const rowsReceived = Array.isArray(payload) ? Math.max(0, payload.length - 1) : 0;
    const schemaValid =
      Array.isArray(header) &&
      header.includes("cell_value") &&
      header.includes("category_code") &&
      rowsReceived > 0;

    if (!schemaValid) {
      return json(
        {
          status: "INVALID_RESPONSE",
          provider: "U.S. Census Bureau",
          dataset: "timeseries/eits/marts",
          providerRequestCount: 1,
          secretPresent: true,
          keyAccepted: false,
          httpStatus: response.status,
          parserSuccess: true,
          schemaValid: false,
          rowsReceived,
        },
        502,
      );
    }

    return json({
      status: "SUCCESS",
      provider: "U.S. Census Bureau",
      dataset: "timeseries/eits/marts",
      providerRequestCount: 1,
      secretPresent: true,
      keyAccepted: true,
      httpStatus: response.status,
      parserSuccess: true,
      schemaValid: true,
      rowsReceived,
      probeScope: "AUTH_AND_TRANSPORT_ONLY",
    });
  };
}

export const censusRuntimeProbeContract = Object.freeze({
  endpoint: CENSUS_ENDPOINT,
  dataset: "timeseries/eits/marts",
  queryYear: "2012",
  timeoutMs: DEFAULT_TIMEOUT_MS,
  maxProviderRequests: 1,
  retryCount: 0,
  mutation: false,
  persistence: false,
});
