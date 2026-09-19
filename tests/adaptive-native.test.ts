import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultProject } from "../packages/compiler";
import {
  buildAdaptiveIR,
  compileAdaptive,
  createPreset,
  evaluateAdaptive,
  upgradeProject,
} from "../packages/compiler/v2";

test("both presets compile full-age native plans with an explicit unverified status", () => {
  for (const civilization of ["britons", "portuguese"] as const) {
    const project = createPreset(civilization);
    const compiled = compileAdaptive(project);
    assert.deepEqual(
      compiled.diagnostics.filter((item) => item.severity === "error"),
      [],
    );
    assert.match(compiled.script, /Native AoE II: DE status: UNVERIFIED/);
    for (const id of [
      "economy-dark-villagers",
      "economy-feudal-villagers",
      "economy-castle-villagers",
      "economy-imperial-villagers",
      "economy-postImperial-villagers",
      "economy-postImperial-farms",
      "economy-housing",
      "economy-maintain-mining-camp",
      "phase-imperial-observe",
    ]) {
      assert.ok(
        compiled.rules.some((rule) => rule.id === id),
        `${civilization} is missing ${id}`,
      );
    }
    assert.ok(
      !compiled.rules.some(
        (rule) => rule.id === "economy-maintain-lumber-camp",
      ),
      `${civilization} should let the authored lumber-camp step own its placement`,
    );
    assert.ok(
      compiled.rules
        .find((rule) => rule.id === "economy-housing")!
        .actions.some((action) => action.includes("place-control")),
    );
    assert.ok(
      compiled.rules
        .find((rule) => rule.id === "economy-feudal-villagers")!
        .conditions.includes("(current-age == feudal-age)"),
    );
    assert.ok(
      compiled.rules
        .find((rule) => rule.id === "economy-imperial-villagers")!
        .conditions.some((condition) =>
          condition.includes(
            `goal ${buildAdaptiveIR(project).phaseGoals.postImperial} 0`,
          ),
        ),
    );
    assert.ok(
      compiled.rules
        .find((rule) => rule.id === "economy-postImperial-villagers")!
        .conditions.some((condition) =>
          condition.includes(
            `goal ${buildAdaptiveIR(project).phaseGoals.postImperial} 1`,
          ),
        ),
    );
    assert.ok(
      compiled.rules.some((rule) => rule.id === "step-post-imperial-complete"),
    );
  }
});

test("outcome goals progress on observed completion and rebuild completed targets after losses", () => {
  const ir = buildAdaptiveIR(createPreset("britons"));
  const range = ir.stepGoals.ranges;
  assert.ok(range);
  const request = ir.rules.find((rule) => rule.id === "step-ranges-request")!;
  const complete = ir.rules.find((rule) => rule.id === "step-ranges-observe")!;
  const replace = ir.rules.find((rule) => rule.id === "step-ranges-replace")!;
  assert.ok(request.actions.includes(`(set-goal ${range.state} 1)`));
  assert.ok(!request.actions.includes(`(set-goal ${range.state} 2)`));
  assert.ok(
    complete.conditions.includes("(building-type-count archery-range >= 2)"),
  );
  assert.ok(complete.actions.includes(`(set-goal ${range.state} 2)`));
  assert.ok(
    replace.conditions.includes(
      "(building-type-count-total archery-range < 2)",
    ),
  );
});

test("placement retries are ordered, time bounded and eventually enter a retryable blocked state", () => {
  const ir = buildAdaptiveIR(createPreset("portuguese"));
  const meta = ir.stepGoals.castle;
  const first = ir.rules.find((rule) => rule.id === "step-castle-fallback-1")!;
  const second = ir.rules.find((rule) => rule.id === "step-castle-fallback-2")!;
  const blocked = ir.rules.find((rule) => rule.id === "step-castle-blocked")!;
  const retry = ir.rules.find(
    (rule) => rule.id === "step-castle-blocked-retry",
  )!;
  assert.ok(first.conditions.includes(`(goal ${meta.fallback} 0)`));
  assert.ok(second.conditions.includes(`(goal ${meta.fallback} 1)`));
  assert.ok(first.actions.includes(`(set-goal ${meta.fallback} 1)`));
  assert.ok(blocked.actions.includes(`(set-goal ${meta.state} 3)`));
  assert.ok(blocked.actions.includes(`(set-goal ${ir.stalledGoal} 1)`));
  assert.ok(retry.actions.includes(`(set-goal ${meta.state} 1)`));
});

test("responses enforce engine-measured resource ceilings and exclusive micro ownership", () => {
  const project = createPreset("britons");
  const ir = buildAdaptiveIR(project);
  const counter = ir.responseGoals["answer-counter-unit"];
  const enter = ir.rules.find(
    (rule) => rule.id === "response-answer-counter-unit-enter",
  )!;
  assert.ok(
    ir.rules.some(
      (rule) =>
        rule.id === "response-answer-counter-unit-cost" &&
        rule.actions.some((action) =>
          action.includes("(up-add-object-cost c: spearman-line c: 4)"),
        ),
    ),
  );
  assert.ok(
    enter.conditions.includes(`(up-compare-goal ${counter.costBase} <= 200)`),
  );
  assert.ok(
    enter.conditions.includes(
      `(up-compare-goal ${counter.costBase + 1} <= 120)`,
    ),
  );
  assert.notEqual(ir.microOwners.ranged.unit, ir.microOwners.screening.unit);
  for (const name of Object.keys(ir.microOwners))
    assert.ok(
      ir.rules
        .find((rule) => rule.id === `micro-${name}-setup`)!
        .actions.some((action) =>
          action.startsWith("(fe-exclude-from-attack-group"),
        ),
    );
  project.micro.ranged.targetPriorities.forEach((_, index) =>
    assert.ok(
      ir.rules.some((rule) => rule.id === `micro-ranged-priority-${index + 1}`),
    ),
  );
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "micro-screening-protect")!
      .actions.includes(
        "(up-target-objects 0 action-guard formation-box stance-defensive)",
      ),
  );
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "micro-siege-fallback")!
      .actions.some((action) => action.includes("action-move")),
  );
});

test("response scheduler runs before ordinary work, clears cooldowns and gives one direct order per unit", () => {
  const project = createPreset("britons");
  const ir = buildAdaptiveIR(project);
  const raidEnter = ir.rules.find(
    (rule) => rule.id === "response-defend-raid-enter",
  )!;
  const raidCooldown = ir.rules.find(
    (rule) => rule.id === "response-defend-raid-cooldown-ready",
  )!;
  assert.ok(
    ir.rules.indexOf(raidEnter) <
      ir.rules.findIndex((rule) => rule.id === "economy-dark-villagers"),
  );
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "economy-dark-villagers")!
      .conditions.includes(`(goal ${ir.activeResponseCountGoal} 0)`),
  );
  assert.ok(
    raidEnter.actions.some((action) => action.includes("action-patrol")),
  );
  assert.ok(
    !raidEnter.actions.some((action) => action.startsWith("(up-retreat")),
  );
  assert.deepEqual(raidCooldown.actions, [
    `(disable-timer ${ir.responseTimers["defend-raid"].cooldown})`,
  ]);

  const housingActive = ir.responseGoals["repair-housing"].active;
  const counterActive = ir.responseGoals["answer-counter-unit"].active;
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "response-answer-counter-unit-enter")!
      .conditions.includes(`(goal ${housingActive} 0)`),
  );
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "response-repair-housing-enter")!
      .conditions.includes(`(goal ${counterActive} 0)`),
  );
});

test("allocate steps maintain their villager outcome before completing", () => {
  const project = createPreset("britons");
  project.steps.splice(1, 0, {
    id: "opening-economy",
    label: "Reach the opening economy",
    phase: "dark",
    priority: 90,
    enabled: true,
    kind: "allocate",
    resources: { food: 55, wood: 35, gold: 10, stone: 0 },
    villagerCount: 24,
  });
  const ir = buildAdaptiveIR(project);
  const meta = ir.stepGoals["opening-economy"];
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "step-opening-economy-apply")!
      .actions.includes(`(set-goal ${meta.state} 1)`),
  );
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "step-opening-economy-villagers")!
      .conditions.includes("(unit-type-count-total villager < 24)"),
  );
  assert.ok(
    ir.rules
      .find((rule) => rule.id === "step-opening-economy-observe")!
      .conditions.includes("(unit-type-count villager >= 24)"),
  );
});

test("milestone recovery and disabled pivot branches use compiler-owned outcome goals", () => {
  const milestoneProject = createPreset("britons");
  milestoneProject.responses[0].recovery = {
    kind: "milestone",
    milestone: "post-imperial-sustain",
  };
  const milestoneIR = buildAdaptiveIR(milestoneProject);
  const milestoneExit = milestoneIR.rules.find(
    (rule) => rule.id === "response-repair-housing-exit",
  )!;
  assert.ok(
    milestoneExit.conditions.includes(
      `(goal ${milestoneIR.stepGoals["post-imperial"].state} 2)`,
    ),
  );

  const branchProject = createPreset("britons");
  branchProject.steps.push({
    id: "fallback-range",
    label: "Authorized fallback range",
    phase: "feudal",
    priority: 40,
    enabled: false,
    kind: "build",
    building: "archery-range",
    count: 3,
    placementId: "forward-range",
  });
  const stalled = branchProject.responses.find(
    (response) => response.id === "development-stalled",
  )!;
  stalled.actions = [
    { kind: "pivot", stepIds: ["fallback-range"], priority: 80 },
  ];
  const branchIR = buildAdaptiveIR(branchProject);
  const branch = branchIR.stepGoals["fallback-range"];
  assert.equal(branch.initial, -1);
  assert.ok(
    branchIR.rules
      .find((rule) => rule.id === "step-fallback-range-request")!
      .conditions.includes(`(goal ${branch.state} 0)`),
  );
  assert.ok(
    !branchIR.rules
      .find((rule) => rule.id === "step-fallback-range-blocked-retry")!
      .conditions.includes(`(goal ${branch.state} -1)`),
  );
  assert.ok(
    branchIR.rules
      .find((rule) => rule.id === "response-development-stalled-enter")!
      .actions.includes(`(set-goal ${branch.state} 0)`),
  );
});

test("unsupported placement geometry and target ordering are rejected at the responsible editor field", () => {
  const placement = createPreset("britons");
  placement.placements[0].distance = 4;
  placement.placements[0].fallback[0].spacing = 2;
  const placementErrors = buildAdaptiveIR(placement).diagnostics.filter(
    (item) => item.severity === "error",
  );
  assert.ok(
    placementErrors.some(
      (item) =>
        item.path === "placements.0.distance" &&
        item.code === "unsupported-placement-distance",
    ),
  );
  assert.ok(
    placementErrors.some(
      (item) =>
        item.path === "placements.0.fallback.0.spacing" &&
        item.code === "unsupported-placement-spacing",
    ),
  );

  const micro = createPreset("britons");
  micro.micro.ranged.targetPriorities = ["weakest"];
  assert.ok(
    buildAdaptiveIR(micro).diagnostics.some(
      (item) =>
        item.path === "micro.ranged.targetPriorities.0" &&
        item.code === "unsupported-micro-priority",
    ),
  );
});

test("numeric response recovery thresholds compile with hysteresis and reject looping values", () => {
  const project = createPreset("britons");
  const counter = project.responses.find(
    (response) => response.trigger.kind === "counter-army",
  )!;
  counter.recovery = { kind: "threshold", threshold: 1 };
  const ir = buildAdaptiveIR(project);
  assert.ok(
    ir.rules
      .find((rule) => rule.id === `response-${counter.id}-exit`)!
      .conditions.includes(
        `(up-unit-type-in-town c: ${counter.trigger.unit} <= 1)`,
      ),
  );
  counter.recovery = {
    kind: "threshold",
    threshold: counter.trigger.threshold ?? 2,
  };
  assert.ok(
    buildAdaptiveIR(project).diagnostics.some(
      (item) =>
        item.path.endsWith(".recovery.threshold") &&
        item.code === "response-hysteresis",
    ),
  );

  const raid = project.responses.find(
    (response) => response.trigger.kind === "raid",
  )!;
  raid.recovery = { kind: "threshold", threshold: 1 };
  assert.ok(
    buildAdaptiveIR(project).diagnostics.some(
      (item) =>
        item.path.endsWith(".recovery.threshold") &&
        item.code === "unsupported-recovery-threshold",
    ),
  );
});

test("explicit production sites gate queues and reject mismatched catalog choices", () => {
  const project = createPreset("portuguese");
  assert.ok(
    buildAdaptiveIR(project)
      .rules.find((rule) => rule.id === "step-organ-guns-request")!
      .conditions.includes("(building-type-count castle > 0)"),
  );
  const organ = project.steps.find((step) => step.id === "organ-guns");
  if (!organ || organ.kind !== "train")
    throw new Error("Preset requires the Organ Gun train step");
  organ.productionBuilding = "archery-range";
  assert.ok(
    buildAdaptiveIR(project).diagnostics.some(
      (item) =>
        item.path.endsWith(".productionBuilding") &&
        item.code === "catalog-production-site",
    ),
  );
});

test("denied research and training start deadlines and become recoverable stalled outcomes", () => {
  const research = createPreset("britons");
  research.responses = [];
  delete research.phases.postImperial.milestone;
  research.steps = [
    {
      id: "denied-loom",
      label: "Denied Loom",
      phase: "dark",
      priority: 80,
      enabled: true,
      kind: "research",
      research: "loom",
    },
  ];
  const researchIR = buildAdaptiveIR(research);
  let preview = evaluateAdaptive(research, {
    gameSeconds: 0,
    canResearch: { loom: false },
  });
  assert.equal(
    preview.memory.goals[researchIR.stepGoals["denied-loom"].deadline],
    30,
  );
  preview = evaluateAdaptive(research, {
    gameSeconds: 31,
    canResearch: { loom: false },
    memory: preview.memory,
  });
  assert.equal(
    preview.memory.goals[researchIR.stepGoals["denied-loom"].state],
    3,
  );
  assert.equal(preview.memory.goals[researchIR.stalledGoal], 1);

  const training = createPreset("britons");
  training.responses = [];
  delete training.phases.postImperial.milestone;
  training.steps = [
    {
      id: "denied-villagers",
      label: "Denied villagers",
      phase: "dark",
      priority: 80,
      enabled: true,
      kind: "train",
      unit: "villager",
      count: 10,
      productionBuilding: "town-center",
    },
  ];
  const trainingIR = buildAdaptiveIR(training);
  preview = evaluateAdaptive(training, {
    gameSeconds: 0,
    canTrain: { villager: false },
  });
  assert.equal(
    preview.memory.goals[trainingIR.stepGoals["denied-villagers"].deadline],
    30,
  );
  preview = evaluateAdaptive(training, {
    gameSeconds: 31,
    canTrain: { villager: false },
    memory: preview.memory,
  });
  assert.equal(
    preview.memory.goals[trainingIR.stepGoals["denied-villagers"].state],
    3,
  );
  assert.equal(preview.memory.goals[trainingIR.stalledGoal], 1);
});

test("legacy upgrade creates a non-mutating copy and carries editable opening targets", () => {
  const legacy = structuredClone(defaultProject);
  const before = structuredClone(legacy);
  const upgraded = upgradeProject(legacy);
  assert.deepEqual(legacy, before);
  assert.equal(upgraded.schemaVersion, 2);
  assert.equal(upgraded.phases.dark.villagers, legacy.dark.villagers);
  assert.deepEqual(upgraded.phases.feudal.resources, legacy.feudal.resources);
  assert.equal(
    upgraded.steps.find((step) => step.id === "legacy-dark-farms")?.kind,
    "build",
  );
  assert.equal(
    upgraded.steps.find((step) => step.id === "legacy-feudal-farms")?.kind,
    "build",
  );
  assert.equal(
    upgraded.responses.find(
      (response) => response.trigger.kind === "housing-shortage",
    )?.trigger.threshold,
    legacy.buildings.housingHeadroom,
  );
});

test('step priority orders competing requests without removing outcome prerequisites', () => {
  const project = createPreset('britons');
  const step = project.steps.find(s => s.id === 'loom')!;
  step.priority = 100;
  const ir = buildAdaptiveIR(project);
  const loom = ir.rules.findIndex(r => r.id === 'step-loom-request');
  const mill = ir.rules.findIndex(r => r.id === 'step-mill-request');
  assert.ok(loom < mill);
  assert.ok(ir.rules[loom].conditions.includes(`(goal ${ir.stepGoals.mill.state} 2)`), 'higher priority must still wait for its ordered predecessor');
});
