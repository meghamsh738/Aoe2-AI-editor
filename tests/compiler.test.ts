import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compile, defaultProject, exportFiles, parseProject, validateProject } from '../packages/compiler';
import { defaultSituation, testPolicies } from '../packages/compiler/policy';
import { strToU8, strFromU8, zipSync, unzipSync } from 'fflate';
const fresh = () => structuredClone(defaultProject);
test('default project round-trips and compiles deterministically with no errors', () => {
  const p = fresh(); assert.deepEqual(parseProject(JSON.stringify(p)), p); assert.deepEqual(validateProject(p), []);
  assert.deepEqual(compile(p), compile(parseProject(JSON.stringify(p))));
  assert.ok(compile(p).rules.length >= 15);
});
test('all rules map back to exact emitted lines and balanced forms', () => {
  const c = compile(fresh()); const lines = c.per.split(/\r?\n/);
  for (const m of c.sourceMap) {
    assert.ok(lines[m.startLine - 1].includes(m.rule)); assert.equal(lines[m.endLine - 1], ')');
    const text = lines.slice(m.startLine - 1, m.endLine).filter(l => !l.startsWith(';')).join('\n');
    let depth = 0; for (const ch of text) { if (ch === '(') depth++; if (ch === ')') depth--; assert.ok(depth >= 0); } assert.equal(depth, 0);
  }
});
test('production counts queued units but advancement and attacks count completed units', () => {
  const c = compile(fresh());
  assert.ok(c.rules.find(r => r.id === 'dark-villagers')!.conditions.includes('(unit-type-count-total villager < 22)'));
  assert.ok(c.rules.find(r => r.id === 'advance-feudal')!.conditions.includes('(unit-type-count villager >= 22)'));
  assert.ok(c.rules.find(r => r.id === 'attack')!.conditions.includes('(unit-type-count archer >= 12)'));
  assert.ok(c.rules.find(r => r.id === 'feudal-villagers')!.conditions.includes('(current-age == feudal-age)'));
});
test('attack command has timer guard and resets cooldown; no commands from imported strings', () => {
  const p = fresh(); p.army.attackInterval = 240;
  const attack = compile(p).rules.find(r => r.id === 'attack')!;
  assert.ok(attack.conditions.includes('(timer-triggered 2)'));
  assert.ok(attack.actions.includes('(disable-timer 2)'));
  assert.ok(attack.actions.includes('(enable-timer 2 240)'));
  assert.doesNotMatch(compile(p).per, /\(cc-add-resource|\(load|\(up-cc-add-resource/);
});
test('cross-field conflicts block native export and reference friendly fields', () => {
  const p = fresh(); p.dark.resources.food = 55; p.army.attackAt = 25; p.feudal.resources.gold = 0;
  const c = compile(p); assert.equal(c.per, '');
  assert.ok(c.diagnostics.some(d => d.path === 'dark.resources'));
  assert.ok(c.diagnostics.some(d => d.path === 'army.attackAt'));
  assert.ok(c.diagnostics.some(d => d.path === 'feudal.resources.gold'));
  assert.throws(() => exportFiles(p));
});
test('rejects malformed projects, unsupported versions, unknown fields and unsafe names', () => {
  for (const value of [null, [], {}, { ...fresh(), schemaVersion: 2 }, { ...fresh(), profile: 'anything' }, { ...fresh(), script: '(cc-add-resource food 999)' }]) assert.throws(() => parseProject(JSON.stringify(value)));
  for (const name of ['../escape', 'CON', 'nul', 'bot\n(defrule)', 'trailing ', '']) assert.throws(() => parseProject(JSON.stringify({ ...fresh(), name })));
  assert.throws(() => parseProject('bad json')); assert.throws(() => parseProject(' '.repeat(100001)));
  const p = fresh(); p.army.archers = 1.2; assert.equal(compile(p).per, ''); p.army.archers = NaN; assert.equal(compile(p).per, '');
});
test('building prerequisites and mining activation are compiled', () => {
  const c = compile(fresh()); for (const id of ['build-mill','build-lumber-camp','build-barracks','build-archery-range','dark-farms','feudal-farms','housing']) assert.ok(c.rules.some(r => r.id === id));
  assert.ok(c.rules.find(r => r.id === 'build-mining-camp')!.conditions.includes('(current-age >= feudal-age)'));
  const p = fresh(); p.dark.resources.gold = 10; p.dark.resources.food = 50;
  assert.ok(!compile(p).rules.find(r => r.id === 'build-mining-camp')!.conditions.some(c => c.includes('current-age')));
});
test('all editable strategy controls affect generated behavior', () => {
  const base = compile(fresh()).per;
  for (const mutate of [
    (p: ReturnType<typeof fresh>) => { p.dark.villagers = 23; },
    (p: ReturnType<typeof fresh>) => { p.feudal.villagers = 42; },
    (p: ReturnType<typeof fresh>) => { p.dark.resources.food = 55; p.dark.resources.wood = 45; },
    (p: ReturnType<typeof fresh>) => { p.feudal.resources.food = 35; p.feudal.resources.wood = 45; },
    ...(['housingHeadroom', 'darkFarms', 'feudalFarms', 'ranges'] as const).map(k => (p: ReturnType<typeof fresh>) => { p.buildings[k]++; }),
    ...(['archers', 'attackAt', 'attackInterval'] as const).map(k => (p: ReturnType<typeof fresh>) => { p.army[k]++; }),
  ]) { const p = fresh(); mutate(p); const c = compile(p); assert.notEqual(c.per, ''); assert.notEqual(c.per, base); }
});
test('ZIP includes empty discovery file and matching native, project, provenance and install files', () => {
  const p = fresh(); const files = exportFiles(p); const result = unzipSync(zipSync(Object.fromEntries(Object.entries(files).map(([n, c]) => [n, strToU8(c)]))));
  assert.equal(result[`${p.name}.ai`].length, 0); assert.equal(strFromU8(result[`${p.name}.per`]), compile(p).per);
  assert.deepEqual(parseProject(strFromU8(result[`${p.name}.workshop.json`])), p);
  assert.match(strFromU8(result['README.txt']), /NOT PERFORMED/); assert.ok(result['source-map.json']);
});
test('policy gates distinguish queues, research requests, resources and attack cooldown', () => {
  const p = fresh(); const s = { ...defaultSituation, villagers: 21, queuedVillagers: 1, food: 500, townCenterIdle: true };
  assert.equal(testPolicies(p, s)[0].active, false); assert.equal(testPolicies(p, s)[1].active, false);
  s.villagers = 22; s.queuedVillagers = 0; assert.equal(testPolicies(p, s)[1].active, true);
  s.researchStarted = true; assert.equal(testPolicies(p, s)[1].active, false);
  const feudal = { ...s, age: 'feudal' as const, archers: 12, wood: 25, gold: 45, rangeReady: true, attackTimerReady: true };
  assert.equal(testPolicies(p, feudal)[2].active, true); assert.equal(testPolicies(p, feudal)[3].active, true);
  feudal.gold = 44; feudal.attackTimerReady = false; assert.equal(testPolicies(p, feudal)[2].active, false); assert.equal(testPolicies(p, feudal)[3].active, false);
});
test('initial policy situation does not assume the attack timer has elapsed', () => {
  assert.equal(defaultSituation.attackTimerReady, false);
  const s = { ...defaultSituation, age: 'feudal' as const, archers: 12 };
  assert.equal(testPolicies(fresh(), s)[3].active, false);
});
