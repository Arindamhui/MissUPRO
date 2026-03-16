let requestsTotal = 0;
let requestsErrorsTotal = 0;
let requestDurationSumMs = 0;
let requestDurationCount = 0;

export function recordRequest(statusCode: number, durationMs: number) {
  requestsTotal += 1;
  if (statusCode >= 400) requestsErrorsTotal += 1;
  requestDurationSumMs += durationMs;
  requestDurationCount += 1;
}

export function getRequestMetrics() {
  return {
    requestsTotal,
    requestsErrorsTotal,
    requestDurationSumMs,
    requestDurationCount,
    requestDurationAvgMs: requestDurationCount > 0 ? requestDurationSumMs / requestDurationCount : 0,
  };
}
