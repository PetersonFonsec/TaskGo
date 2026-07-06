#!/usr/bin/env node

const baseUrl = process.env.BACKOFFICE_API_BASE_URL ?? 'http://localhost:3000';
const token = process.env.ADMIN_TOKEN;
const durationSeconds = Number(process.env.LOAD_DURATION_SECONDS ?? 60);
const warmupSeconds = Number(process.env.LOAD_WARMUP_SECONDS ?? 10);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 8);
const endpoints = [
  '/admin/providers?page=1&limit=50',
  '/admin/audit-logs?page=1&limit=50',
];

if (!token) {
  console.error('ADMIN_TOKEN is required to run the Backoffice load profile.');
  process.exit(2);
}

const results = Object.fromEntries(endpoints.map((endpoint) => [endpoint, []]));
const startedAt = Date.now();
const stopAt = startedAt + (warmupSeconds + durationSeconds) * 1000;
const sampleAfter = startedAt + warmupSeconds * 1000;

await Promise.all(
  Array.from({ length: concurrency }, async (_, workerIndex) => {
    let index = workerIndex;
    while (Date.now() < stopAt) {
      const endpoint = endpoints[index % endpoints.length];
      index += 1;
      const elapsed = await timeRequest(`${baseUrl}${endpoint}`);
      if (Date.now() >= sampleAfter) results[endpoint].push(elapsed);
    }
  }),
);

const report = {
  profile: {
    baseUrl,
    concurrency,
    warmupSeconds,
    durationSeconds,
    endpoints,
    dataset: {
      providers: Number(process.env.LOAD_DATASET_PROVIDERS ?? 10000),
      auditLogs: Number(process.env.LOAD_DATASET_AUDIT_LOGS ?? 50000),
    },
  },
  results: Object.fromEntries(
    Object.entries(results).map(([endpoint, samples]) => [
      endpoint,
      {
        samples: samples.length,
        p95Ms: percentile(samples, 0.95),
        maxMs: Math.max(...samples),
      },
    ]),
  ),
};

console.log(JSON.stringify(report, null, 2));

async function timeRequest(url) {
  const started = process.hrtime.bigint();
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Load request failed: ${response.status} ${url}`);
  }

  await response.arrayBuffer();
  return Number(process.hrtime.bigint() - started) / Number(1_000_000n);
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(Math.ceil(sorted.length * percentileValue) - 1, 0)];
}
