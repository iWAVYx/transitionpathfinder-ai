// A single long-lived PGlite/WASM allocator exhausts memory after repeated
// catalog rebuilds. Use complementary fresh processes; keep every assertion.
// Native PostgreSQL continues to run the entire file in one disposable database.
import { spawn } from 'node:child_process';
if (process.env.PATHWAY_HISTORY_POSTGRES === '1' || !process.env.PATHWAY_HISTORY_PGLITE_MODULE) {
  throw new Error('This runner requires the credential-free local PGlite model only.');
}
const prefix = '^(?:rescan|registration|capacity|summary)';
const partitions = [
  ['summary automatic settlement', ['--test-name-pattern=^summary auto'], name => /^summary auto/.test(name)],
  ['counted worker', ['--test-name-pattern=^counted worker'], name => /^counted worker/.test(name)],
  ['other boundaries', [`--test-skip-pattern=${prefix}|^counted worker`], name => !/^(?:rescan|registration|capacity|summary|counted worker)/.test(name)],
  ['producer and summary boundaries', ['--test-name-pattern=^(?:registration|capacity|summary)', '--test-skip-pattern=^summary auto'], name => /^(?:registration|capacity|summary)/.test(name) && !/^summary auto/.test(name)],
  ['rescan source and pending', ['--test-name-pattern=^rescan', '--test-skip-pattern=^rescan (?:outcome|settlement)'], name => /^rescan/.test(name) && !/^rescan (?:outcome|settlement)/.test(name)],
  ['rescan outcome', ['--test-name-pattern=^rescan outcome'], name => /^rescan outcome/.test(name)],
  ['rescan settlement', ['--test-name-pattern=^rescan settlement'], name => /^rescan settlement/.test(name)],
];
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
