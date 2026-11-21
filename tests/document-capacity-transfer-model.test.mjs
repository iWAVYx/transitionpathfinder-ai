/** Offline accounting model for document-capacity-transfer-design.json.
 * This is NOT application code, SQL enforcement, a concurrency test, or hosted
 * evidence. Small ceilings below are model inputs, not deployment policy.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const design = JSON.parse(readFileSync(new URL('../docs/production-readiness/proposals/document-capacity-transfer-design.json', import.meta.url)));
const pending = row => row.state !== 'completed';
const total = state => Object.values(state).filter(pending).length;
const count = (state, field, value) => Object.values(state).filter(row => pending(row) && row[field] === value).length;
const key = (id, kind) => `${id}:${kind}`;
const copy = state => structuredClone(state);
const refuse = () => { throw new Error('Unconfirmed capacity transition'); };
function reserve(state, id, actor, student, kind, caps) {
  if (!['register', 'rescan', 'apply'].includes(kind) || !actor || !student ||
      Object.values(state).some(row => row.id === id)) refuse();
  const units = kind === 'apply' ? 1 : 2;
  if (total(state) + units > caps.global || count(state, 'actor', actor) + units > caps.actor ||
      count(state, 'student', student) + units > caps.student) refuse();
  const next = copy(state);
  next[key(id, 'work')] = { id, actor, student, kind, state: 'active' };
  if (units === 2) next[key(id, 'summary')] = { id, actor, student, kind: 'summary', state: 'promised' };
  return next;
}
function transfer(state, id, actor, student, from, to) {
  const row = state[key(id, 'summary')];
  if (!row || row.actor !== actor || row.student !== student || row.state !== from || (from === 'promised' && state[key(id, 'work')]?.state !== 'active') ||
      ![['promised', 'queued'], ['queued', 'claimed']].some(pair => pair[0] === from && pair[1] === to)) refuse();
  const next = copy(state);
  next[key(id, 'summary')].state = to;
  return next;
}
function settle(state, id, part, outcome) {
  const row = state[key(id, part)];
  if (!row || !['completed', 'needs_review'].includes(outcome) ||
      row.state !== (part === 'summary' ? 'claimed' : 'active')) refuse();
  // Producer completion requires a queue transfer; quarantine is a different,
  // source/domain-validated terminal outcome, not a generic completion flag.
  if (outcome === 'completed' && part === 'work' && row.kind !== 'apply' &&
      state[key(id, 'summary')]?.state === 'promised') refuse();
  const next = copy(state);
  next[key(id, part)].state = outcome;
  return next;
}
function quarantine(state, id) {
  if (state[key(id, 'work')]?.state !== 'active' || state[key(id, 'summary')]?.state !== 'promised') refuse();
  const next = copy(state);
  next[key(id, 'work')].state = 'completed';
  next[key(id, 'summary')].state = 'completed';
  return next;
}
const caps = { global: 4, actor: 4, student: 4 };
const admitted = () => reserve({}, 'first', 'actor', 'student', 'register', caps);
const queued = () => transfer(admitted(), 'first', 'actor', 'student', 'promised', 'queued');
const claimed = () => transfer(queued(), 'first', 'actor', 'student', 'queued', 'claimed');

test('design explicitly leaves enforcement, numeric policy and hosted proof open', () => {
  for (const flag of ['general_operation_limits_implemented', 'queue_budget_reservation_implemented', 'manual_reconciliation_implemented', 'sql_proposal_added', 'canonical_migrations_changed', 'hosted_execution_authorized', 'production_access_authorized', 'ready_for_cutover']) assert.equal(design[flag], false);
  assert.match(design.accounting.numeric_policy, /Not selected/);
  assert.match(design.proof_boundary, /not SQL enforcement/);
});
for (const kind of ['register', 'rescan']) test(`${kind} reserves both obligations before work`, () => {
  assert.equal(total(reserve({}, 'first', 'actor', 'student', kind, caps)), 2);
  assert.throws(() => reserve({}, 'first', 'actor', 'student', kind, { ...caps, global: 1 }));
});
test('Apply reserves one student-bound obligation', () => {
  const state = reserve({}, 'first', 'actor', 'student', 'apply', caps);
  assert.equal(total(state), 1);
  assert.equal(total(settle(state, 'first', 'work', 'completed')), 0);
});
for (const dimension of ['global', 'actor', 'student']) test(`${dimension} ceiling refuses a partial producer reservation`, () => {
  const limits = { ...caps, [dimension]: 3 };
  const state = admitted();
  assert.throws(() => reserve(state, 'second', 'actor', 'student', 'register', limits));
  assert.equal(total(state), 2);
});
test('independent actors and students still share the global ceiling', () => {
  const state = reserve(admitted(), 'second', 'other', 'other', 'rescan', caps);
  assert.equal(total(state), 4);
  assert.throws(() => reserve(state, 'third', 'third', 'third', 'apply', caps));
});
test('queue and claim transfer at capacity without a new reservation', () => {
  let state = reserve(admitted(), 'second', 'other', 'other', 'register', caps);
  for (const [from, to] of [['promised', 'queued'], ['queued', 'claimed']]) {
    state = transfer(state, 'first', 'actor', 'student', from, to);
    assert.equal(total(state), 4);
    assert.equal(count(state, 'actor', 'actor'), 2);
    assert.equal(count(state, 'student', 'student'), 2);
  }
  assert.equal(total(settle(state, 'first', 'summary', 'completed')), 3);
});
test('producer completion leaves the queued summary counted', () => {
  assert.equal(total(settle(queued(), 'first', 'work', 'completed')), 1);
  assert.throws(() => settle(admitted(), 'first', 'work', 'completed'));
});
test('a held producer retains its unit while its accepted summary drains', () => {
  let state = settle(queued(), 'first', 'work', 'needs_review');
  state = transfer(state, 'first', 'actor', 'student', 'queued', 'claimed');
  state = settle(state, 'first', 'summary', 'completed');
  assert.equal(total(state), 1);
  assert.throws(() => settle(state, 'first', 'work', 'completed'));
});
test('unknown scan/queue outcomes retain both obligations', () => {
  assert.equal(total(settle(admitted(), 'first', 'work', 'needs_review')), 2);
});
test('quarantine is distinct from generic completion and cannot retire an enqueued summary', () => {
  assert.equal(total(quarantine(admitted(), 'first')), 0);
  assert.throws(() => quarantine(queued(), 'first'));
});
test('foreign identity and duplicate transfer leave the original accounting unchanged', () => {
  const state = queued();
  assert.throws(() => transfer(state, 'first', 'other', 'student', 'queued', 'claimed'));
  assert.throws(() => transfer(state, 'first', 'actor', 'other', 'queued', 'claimed'));
  assert.throws(() => transfer(state, 'first', 'actor', 'student', 'promised', 'queued'));
  assert.throws(() => reserve(state, 'first', 'actor', 'student', 'register', caps));
  assert.equal(total(state), 2);
});
test('held summaries cannot complete or be reclaimed through ordinary transitions', () => {
  const state = settle(claimed(), 'first', 'summary', 'needs_review');
  assert.throws(() => settle(state, 'first', 'summary', 'completed'));
  assert.throws(() => transfer(state, 'first', 'actor', 'student', 'queued', 'claimed'));
  assert.equal(total(state), 2);
});
test('a held producer cannot initiate a new queue transfer', () => {
  const state = settle(admitted(), 'first', 'work', 'needs_review');
  assert.throws(() => transfer(state, 'first', 'actor', 'student', 'promised', 'queued'));
  assert.equal(total(state), 2);
});
test('generic fresh summary admission cannot create an unreserved obligation', () => {
  assert.throws(() => reserve({}, 'first', 'actor', 'student', 'summary', caps));
});
test('enumerated serial schedules conserve identity and never exceed any ceiling', t => {
  // Enumerate transaction commit order, not actual DB isolation/lock behavior.
  const limits = { global: 3, actor: 3, student: 3 };
  const seen = new Set();
  const frontier = [{}];
  while (frontier.length) {
    const state = frontier.pop();
    const encoded = JSON.stringify(state);
    if (seen.has(encoded)) continue;
    seen.add(encoded);
    assert.ok(total(state) <= limits.global);
    for (const id of ['first', 'second']) {
      const actor = id === 'first' ? 'actor' : 'other';
      assert.ok(count(state, 'actor', actor) <= limits.actor);
      assert.ok(count(state, 'student', 'student') <= limits.student);
      const actions = [
        () => reserve(state, id, actor, 'student', 'register', limits),
        () => transfer(state, id, actor, 'student', 'promised', 'queued'),
        () => transfer(state, id, actor, 'student', 'queued', 'claimed'),
        () => quarantine(state, id),
        ...['work', 'summary'].flatMap(part => ['completed', 'needs_review'].map(outcome => () => settle(state, id, part, outcome))),
      ];
      for (const action of actions) {
        let next;
        try { next = action(); } catch (error) { assert.equal(error.message, 'Unconfirmed capacity transition'); continue; }
        for (const [identity, before] of Object.entries(state)) {
          assert.ok(next[identity]);
          for (const field of ['id', 'actor', 'student', 'kind']) assert.equal(next[identity][field], before[field]);
          if (['completed', 'needs_review'].includes(before.state)) assert.equal(next[identity].state, before.state);
        }
        frontier.push(next);
      }
    }
  }
  assert.ok(seen.size > 100, `Only ${seen.size} states explored`);
  t.diagnostic(`${seen.size} unique accounting states explored; transaction isolation is not modeled.`);
});
