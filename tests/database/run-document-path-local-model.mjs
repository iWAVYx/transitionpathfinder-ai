// A single long-lived PGlite/WASM allocator exhausts memory after repeated
// catalog rebuilds. Use complementary fresh processes; keep every assertion.
// Native PostgreSQL continues to run the entire file in one disposable database.
import { spawnSync } from 'node:child_process';
if (process.env.PATHWAY_HISTORY_POSTGRES === '1' || !process.env.PATHWAY_HISTORY_PGLITE_MODULE) {
  throw new Error('This runner requires the credential-free local PGlite model only.');
}
const prefix = '^(?:rescan|registration|capacity|summary)';
const partitions = [
  ['counted worker', ['--test-name-pattern=^counted worker'], name => /^counted worker/.test(name)],
  ['other boundaries', [`--test-skip-pattern=${prefix}|^counted worker`], name => !/^(?:rescan|registration|capacity|summary|counted worker)/.test(name)],
  ['producer boundaries', [`--test-name-pattern=${prefix}`, '--test-skip-pattern=^rescan (?:outcome|settlement)'], name => /^(?:rescan|registration|capacity|summary)/.test(name) && !/^rescan (?:outcome|settlement)/.test(name)],
  ['rescan outcome', ['--test-name-pattern=^rescan outcome'], name => /^rescan outcome/.test(name)],
  ['rescan settlement', ['--test-name-pattern=^rescan settlement'], name => /^rescan settlement/.test(name)],
];
const totals = { tests: 0, pass: 0, fail: 0, skipped: 0 };
let failed = false;
for (const [name, filters, belongs] of partitions) {
  process.stdout.write(`\n# Fresh local-model partition: ${name}\n`);
  const run = spawnSync(process.execPath, ['--test', ...filters, 'tests/database/document-path-exclusivity.test.mjs'], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env,
  });
  process.stdout.write(run.stdout ?? ''); process.stderr.write(run.stderr ?? '');
  if (run.error) throw run.error;
  if (run.status !== 0) failed = true;
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
