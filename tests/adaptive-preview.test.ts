import { test } from "node:test";
import assert from "node:assert/strict";
import { createPreset } from "../packages/compiler/v2/presets";
import {
  evaluateAdaptive,
  defaultAdaptiveSituation,
} from "../packages/compiler/v2/runtime";
import { buildAdaptiveIR } from "../packages/compiler/v2/ir";
test("queued units and pending foundations are active outcomes, not completed", () => {
  const project = createPreset("britons");
  const build = project.steps.find((s) => s.kind === "build")!;
  const train = project.steps.find(
    (s) => s.kind === "train" && s.unit !== "villager",
  )!;
  assert.equal(build.kind, "build");
  assert.equal(train.kind, "train");
  if (build.kind !== "build" || train.kind !== "train") return;
  const result = evaluateAdaptive(project, {
    ...defaultAdaptiveSituation,
    age: "castle",
    pendingBuildings: { [build.building]: build.count },
    queuedUnits: { [train.unit]: train.count },
  });
  assert.equal(result.steps.find((s) => s.id === build.id)?.status, "active");
  assert.equal(result.steps.find((s) => s.id === train.id)?.status, "active");
});
test("preview completion is based on observed research, not request or affordability", () => {
  const project = createPreset("britons");
  const research = project.steps.find(
    (s) => s.kind === "research" && s.research === "loom",
  )!;
  if (research.kind !== "research") throw new Error("Preset needs Loom");
  const pending = evaluateAdaptive(project, {
    researching: ["loom"],
    canResearch: { loom: true },
  });
  assert.equal(
    pending.steps.find((s) => s.id === research.id)?.status,
    "active",
  );
  const done = evaluateAdaptive(project, { completedResearch: ["loom"] });
  assert.equal(
    done.steps.find((s) => s.id === research.id)?.status,
    "completed",
  );
});
test("preview requests reference only native IR rules and do not mutate observations", () => {
  const project = createPreset("britons");
  const snapshot = structuredClone(defaultAdaptiveSituation);
  snapshot.canBuild["lumber-camp"] = true;
  const before = structuredClone(snapshot);
  const result = evaluateAdaptive(project, snapshot);
  const ir = buildAdaptiveIR(project);
  assert.ok(result.firedRules.every((id) => ir.rules.some((r) => r.id === id)));
  for (const action of result.scheduledActions)
    assert.ok(
      ir.rules.some(
        (r) => r.source === action.owner && r.actions.includes(action.action),
      ),
    );
  assert.deepEqual(snapshot, before);
});
test("a new project or rewound snapshot resets policy memory", () => {
  const project = createPreset("britons");
  const first = evaluateAdaptive(project, { gameSeconds: 100 });
  first.memory.goals[15998] = 12345;
  const rewound = evaluateAdaptive(project, {
    gameSeconds: 0,
    memory: first.memory,
  });
  assert.equal(rewound.memory.goals[15998], undefined);
  const changed = structuredClone(project);
  changed.name = "Changed project";
  const next = evaluateAdaptive(changed, {
    gameSeconds: 110,
    memory: first.memory,
  });
  assert.equal(next.memory.goals[15998], undefined);
});
test("native Imperial age is not automatically post-Imperial", () => {
  const project = createPreset("britons");
  const result = evaluateAdaptive(project, {
    age: "imperial",
    completedResearch: [],
    completedUnits: {},
    completedBuildings: {},
  });
  assert.equal(result.phase, "imperial");
});

test("sustained response activation uses native timers and enforces spending ceilings", () => {
  const project = createPreset("britons");
  const response = project.responses.find(
    (r) => r.trigger.kind === "housing-shortage",
  )!;
  response.limits.emergencySpend.wood = 24;
  const state = {
    ...structuredClone(defaultAdaptiveSituation),
    housingHeadroom: 0,
    canBuild: { house: true },
    objectCosts: { house: { food: 0, wood: 25, gold: 0, stone: 0 } },
  };
  const armed = evaluateAdaptive(project, state);
  assert.equal(
    armed.responses.find((r) => r.id === response.id)?.active,
    false,
  );
  const held = evaluateAdaptive(project, {
    ...state,
    gameSeconds: response.trigger.sustainedSeconds + 1,
    memory: armed.memory,
  });
  assert.equal(
    held.responses.find((r) => r.id === response.id)?.active,
    false,
    "a 25-wood request must not fit a 24-wood allowance",
  );
  response.limits.emergencySpend.wood = 25;
  const reset = evaluateAdaptive(project, state);
  const activated = evaluateAdaptive(project, {
    ...state,
    gameSeconds: response.trigger.sustainedSeconds + 1,
    memory: reset.memory,
  });
  assert.equal(
    activated.responses.find((r) => r.id === response.id)?.active,
    true,
  );
});

test("counter response ignores stale sightings and caps training requests across passes", () => {
  const project = createPreset("britons");
  const response = project.responses.find(
    (r) => r.trigger.kind === "counter-army",
  )!;
  const action = response.actions.find((a) => a.kind === "train");
  if (!action || action.kind !== "train" || !response.trigger.unit)
    throw new Error("Preset requires a counter response");
  const state = {
    ...structuredClone(defaultAdaptiveSituation),
    age: "castle" as const,
    housingHeadroom: 20,
    gameSeconds: 0,
    enemyUnitsInTown: {
      [response.trigger.unit]: response.trigger.threshold ?? 2,
    },
    sightedAt: { [response.trigger.unit]: 0 },
    canTrain: { [action.unit]: true },
    objectCosts: { [action.unit]: { food: 35, wood: 25, gold: 0, stone: 0 } },
  };
  const first = evaluateAdaptive(project, state);
  const stale = evaluateAdaptive(project, {
    ...state,
    gameSeconds: 20,
    memory: first.memory,
  });
  assert.equal(
    stale.responses.find((r) => r.id === response.id)?.active,
    false,
  );
  let result = first;
  let requests = 0;
  const owner = `responses.${project.responses.indexOf(response)}.actions`;
  for (
    let seconds = response.trigger.sustainedSeconds;
    seconds < response.trigger.sustainedSeconds + action.count + 3;
    seconds++
  ) {
    result = evaluateAdaptive(project, {
      ...state,
      gameSeconds: seconds,
      sightedAt: { [response.trigger.unit]: seconds },
      memory: result.memory,
    });
    requests += result.scheduledActions.filter(
      (a) => a.owner.startsWith(owner) && a.kind === "up-train",
    ).length;
  }
  assert.equal(requests, action.count);
});

test("raid response respects minimum dwell, recovery and cooldown across snapshots", () => {
  const project = createPreset("britons");
  const response = project.responses.find((r) => r.trigger.kind === "raid")!;
  response.trigger.sustainedSeconds = 0;
  response.recovery = { kind: "threshold", threshold: 0 };
  response.actions = [{ kind: "defend", priority: 100 }];
  response.cooldownSeconds = 30;
  project.limits.minimumResponseSeconds = 10;
  const active = evaluateAdaptive(project, {
    gameSeconds: 0,
    townUnderAttack: true,
  });
  assert.equal(
    active.responses.find((r) => r.id === response.id)?.active,
    true,
  );
  const early = evaluateAdaptive(project, {
    gameSeconds: 5,
    townUnderAttack: false,
    memory: active.memory,
  });
  assert.equal(early.responses.find((r) => r.id === response.id)?.active, true);
  const recovered = evaluateAdaptive(project, {
    gameSeconds: 11,
    townUnderAttack: false,
    memory: early.memory,
  });
  assert.equal(
    recovered.responses.find((r) => r.id === response.id)?.active,
    false,
  );
  const cooling = evaluateAdaptive(project, {
    gameSeconds: 20,
    townUnderAttack: true,
    memory: recovered.memory,
  });
  assert.equal(
    cooling.responses.find((r) => r.id === response.id)?.active,
    false,
  );
  const next = evaluateAdaptive(project, {
    gameSeconds: 42,
    townUnderAttack: true,
    memory: cooling.memory,
  });
  assert.equal(next.responses.find((r) => r.id === response.id)?.active, true);
});

test("failed construction without a foundation exhausts approved fallbacks instead of resetting forever", () => {
  const project = createPreset("britons");
  project.responses.forEach((response) => {
    response.enabled = false;
  });
  const ir = buildAdaptiveIR(project);
  const step = project.steps.find((s) => s.id === "lumber-camp")!;
  const meta = ir.stepGoals[step.id];
  let result = evaluateAdaptive(project, {
    gameSeconds: 0,
    canBuild: { "lumber-camp": true },
  });
  const initialDeadline = result.memory.goals[meta.deadline];
  result = evaluateAdaptive(project, {
    gameSeconds: 10,
    canBuild: { "lumber-camp": true },
    memory: result.memory,
  });
  assert.equal(
    result.memory.goals[meta.deadline],
    initialDeadline,
    "no observed progress must not reset the placement deadline",
  );
  for (const gameSeconds of [31, 62, 93]) {
    result = evaluateAdaptive(project, {
      gameSeconds,
      canBuild: { "lumber-camp": true },
      memory: result.memory,
    });
  }
  assert.equal(result.memory.goals[meta.state], 3);
  assert.equal(result.memory.goals[ir.stalledGoal], 1);
});

test("denied research becomes blocked and resumes after prerequisites recover without repeating completed research", () => {
  const project = createPreset("britons");
  project.responses.forEach((response) => {
    response.enabled = false;
  });
  const ir = buildAdaptiveIR(project);
  const meta = ir.stepGoals.loom;
  const observed = {
    completedBuildings: { "town-center": 1, "lumber-camp": 1, mill: 1 },
    canResearch: { loom: false },
  };
  const waiting = evaluateAdaptive(project, { ...observed, gameSeconds: 0 });
  const blocked = evaluateAdaptive(project, {
    ...observed,
    gameSeconds: 31,
    memory: waiting.memory,
  });
  assert.equal(blocked.memory.goals[meta.state], 3);
  assert.equal(blocked.memory.goals[ir.stalledGoal], 1);
  const resumed = evaluateAdaptive(project, {
    ...observed,
    gameSeconds: 122,
    canResearch: { loom: true },
    memory: blocked.memory,
  });
  assert.ok(
    resumed.scheduledActions.some(
      (a) => a.action === "(up-research 0 c: loom)",
    ),
  );
  const completed = evaluateAdaptive(project, {
    ...observed,
    gameSeconds: 160,
    completedResearch: ["loom"],
    memory: resumed.memory,
  });
  assert.equal(completed.memory.goals[meta.state], 2);
  const casualties = evaluateAdaptive(project, {
    ...observed,
    gameSeconds: 170,
    villagers: 1,
    completedResearch: ["loom"],
    memory: completed.memory,
  });
  assert.equal(casualties.memory.goals[meta.state], 2);
  assert.ok(
    !casualties.scheduledActions.some(
      (a) => a.action === "(up-research 0 c: loom)",
    ),
  );
});
