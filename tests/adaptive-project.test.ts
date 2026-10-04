import { test } from "node:test";
import assert from "node:assert/strict";
import { createPreset } from "../packages/compiler/v2/presets";
import {
  parseAdaptiveProject,
  validateAdaptiveProject,
} from "../packages/compiler/v2/model";
test("v2 structural parser round-trips both editable presets", () => {
  for (const civ of ["britons", "portuguese"] as const) {
    const p = createPreset(civ);
    assert.deepEqual(parseAdaptiveProject(JSON.stringify(p)), p);
  }
});
test("well-shaped invalid totals remain repairable but are diagnosed", () => {
  const p = createPreset("britons");
  p.phases.dark.resources.food = 1;
  assert.deepEqual(parseAdaptiveProject(JSON.stringify(p)), p);
  assert.ok(
    validateAdaptiveProject(p).some(
      (d) => d.severity === "error" && d.path.includes("phases.dark"),
    ),
  );
});
test("unknown versions, script injection fields, unsafe names and malformed numeric values are rejected", () => {
  const p = createPreset("britons");
  for (const value of [
    { ...p, schemaVersion: 99 },
    { ...p, script: "(cc-add-resource food 99)" },
    { ...p, name: "../test" },
    { ...p, name: "NUL" },
    { ...p, name: "x\n(defrule)" },
  ])
    assert.throws(() => parseAdaptiveProject(JSON.stringify(value)));
  p.phases.dark.villagers = NaN;
  assert.throws(() => parseAdaptiveProject(JSON.stringify(p)));
  assert.throws(() => parseAdaptiveProject(" ".repeat(200001)));
});
test("dangling response pivots and placement references have source diagnostics", () => {
  const p = createPreset("britons");
  const build = p.steps.find((s) => s.kind === "build")!;
  if (build.kind === "build") build.placementId = "does-not-exist";
  p.responses[0].actions = [
    { kind: "pivot", priority: 50, stepIds: ["missing-step"] },
  ];
  const errors = validateAdaptiveProject(p).filter(
    (d) => d.severity === "error",
  );
  assert.ok(errors.some((e) => e.path.startsWith("steps.")));
  assert.ok(errors.some((e) => e.path.startsWith("responses.")));
});

test("v2 generated source links identify the exact emitted rule and archive source", async () => {
  const { compileAdaptive } = await import("../packages/compiler/v2/index");
  for (const civilization of ["britons", "portuguese"] as const) {
    const project = createPreset(civilization);
    const result = compileAdaptive(project);
    assert.ok(result.script);
    const lines = result.script.split(/\r?\n/);
    for (const entry of result.sourceMap) {
      assert.ok(lines[entry.startLine - 1].includes(entry.rule));
      assert.ok(
        result.rules.some(
          (rule) => rule.id === entry.rule && rule.source === entry.source,
        ),
      );
      assert.equal(lines[entry.endLine - 1], ")");
    }
    assert.deepEqual(
      JSON.parse(result.files[`${project.name}.workshop.json`]),
      project,
    );
    assert.equal(result.files[`${project.name}.ai`], "");
    assert.equal(result.files[`${project.name}.per`], result.script);
  }
});
