// A single long-lived PGlite/WASM allocator exhausts memory after repeated
// catalog rebuilds. Use complementary fresh processes; keep every assertion.
// Native PostgreSQL uses the same exhaustive groups in fresh disposable databases;
// each original concurrency test retains its competing sessions and assertions.
import { spawn } from 'node:child_process';
if (process.env.PATHWAY_HISTORY_POSTGRES === '1' || !process.env.PATHWAY_HISTORY_PGLITE_MODULE) {
  throw new Error('This runner requires the credential-free local PGlite model only.');
}
import {documentPathPartitions as partitions} from './document-path-test-partitions.mjs';

const totals = { tests: 0, pass: 0, fail: 0, skipped: 0 };
let failed = false;
for (const [name, filters, belongs] of partitions) {
  process.stdout.write(`\n# Fresh local-model partition: ${name}\n`);
  // Stream progress so a slow local catalog rebuild can be diagnosed without
  // consuming the child pipe or waiting for a whole partition to finish.
  const run = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', ...filters, 'tests/database/document-path-exclusivity.test.mjs'], {
      env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', size = 0;
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > 64 * 1024 * 1024) { child.kill(); reject(new Error(`Local-model output exceeded its bound for ${name}.`)); return; }
      stdout += chunk; process.stdout.write(chunk);
    });
    child.stderr.on('data', chunk => process.stderr.write(chunk));
    child.on('error', reject);
    child.on('close', (status, signal) => resolve({ status, signal, stdout }));
  });
  if (run.status !== 0 || run.signal) failed = true;
  const names = [...(run.stdout ?? '').matchAll(/^# Subtest: (.*)$/gm)].map(match => match[1]);
  if (names.some(value => !belongs(value))) throw new Error(`Unexpected test selected for partition ${name}.`);
  for (const label of Object.keys(totals)) {
    const counts = [...(run.stdout ?? '').matchAll(new RegExp(`^# ${label} (\\d+)$`, 'gm'))];
    if (!counts.length) throw new Error(`Missing ${label} result for partition ${name}.`);
    totals[label] += Number(counts.at(-1)[1]);
  }
}
if (totals.tests !== totals.pass + totals.fail + totals.skipped) throw new Error('Incomplete local-model result counts.');
for (const [label, count] of Object.entries(totals)) process.stdout.write(`# local_model_${label} ${count}\n`);
process.exitCode = failed || totals.fail !== 0 ? 1 : 0;
