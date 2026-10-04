import { test } from "node:test";
import assert from "node:assert/strict";
import { nativeKitFiles, nativeScenarios } from "../src/adaptive/nativeKit";
test("native kit records ten unperformed matches and pairs independent probes", () => {
  const files = nativeKitFiles();
  assert.equal(files["MATCHES.csv"].split("\n").length, 11);
  assert.equal(Object.keys(files).filter((x) => x.endsWith(".per")).length, 4);
  for (const name of Object.keys(files).filter((x) => x.endsWith(".per"))) {
    assert.equal(files[name.replace(/\.per$/, ".ai")], "");
    assert.match(files[name], /UNVERIFIED/);
    assert.doesNotMatch(files[name], /\(cc-|\(up-cc-|\(load /);
  }
  const record = JSON.parse(files["run-record.json"]);
  assert.equal(record.status, "NOT RUN");
  assert.equal(record.scenarios.length, nativeScenarios.length);
  assert.ok(
    record.scenarios.every((x: { result: string }) => x.result === "NOT RUN"),
  );
});
