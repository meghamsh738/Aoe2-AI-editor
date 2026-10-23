import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeKitFiles, nativeScenarios, nativeProbeChecks } from "../src/adaptive/nativeKit";
test("native kit records ten unperformed matches and pairs independent probes", () => {
  const files = nativeKitFiles();
  assert.equal(files["MATCHES.csv"].split("\n").length, 11);
  assert.equal(Object.keys(files).filter((x) => x.endsWith(".per")).length, 5);
  for (const name of Object.keys(files).filter((x) => x.endsWith(".per"))) {
    assert.equal(files[name.replace(/\.per$/, ".ai")], "");
    assert.match(files[name], /UNVERIFIED/);
    assert.doesNotMatch(files[name], /\(cc-|\(up-cc-|\(load /);
  }
  const record = JSON.parse(files["run-record.json"]);
  assert.equal(record.status, "NOT RUN");
  for (const field of ["runId", "platform", "osVersion", "gameBuild", "projectVersion", "projectFile", "scriptFile", "replay", "save", "errorLog", "actual"]) {
    assert.equal(record[field], "", `${field} must not claim unobserved evidence`);
  }
});

test("native kit gives each capability and applicable preset scenario its own unrun record", () => {
  const files = nativeKitFiles();
  for (const [id, name] of nativeProbeChecks) {
    assert.ok(files[`probes/${name}.per`]);
    assert.ok(files["PROBES.csv"].split("\n").some((line) => line.startsWith(`probe-${id},`)));
  }
  assert.equal(files["PROBES.csv"].split("\n").length, nativeProbeChecks.length + 1);
  const scenarios = files["SCENARIOS.csv"].split("\n").slice(1);
  assert.equal(scenarios.length, nativeScenarios.length * 2 - 1);
  assert.equal(new Set(scenarios.map((line) => line.split(",")[0])).size, scenarios.length);
  assert.ok(scenarios.every((line) => line.endsWith(",NOT RUN,,")));
  assert.ok(scenarios.some((line) => line.startsWith("portuguese-castle-loss,")));
  assert.ok(!scenarios.some((line) => line.startsWith("britons-castle-loss,")));
  for (const civ of ["britons", "portuguese"]) {
    const matches = files["MATCHES.csv"].split("\n").filter((line) => line.startsWith(`${civ}-seed-`));
    assert.equal(matches.length, 5);
    assert.ok(matches.every((line) => line.endsWith(",,NOT RUN,,,")));
  }
  assert.match(files["BASELINE.csv"], /15 minutes/);
  assert.match(files["START-HERE.txt"], /Mac success does not verify Windows/);
  assert.match(files["START-HERE.txt"], /BLOCKED/);
});
