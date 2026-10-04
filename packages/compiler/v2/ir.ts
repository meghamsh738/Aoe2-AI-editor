import {
  adaptiveProjectSchema,
  AGE_ORDER,
  validateAdaptiveProject,
  type AdaptiveProject,
  type AgeKey,
  type BuildingId,
  type Diagnostic,
  type PlacementOption,
  type PlacementPolicy,
  type ResourceAllocation,
  type ResponseAction,
  type ResponseRule,
  type StrategyStep,
} from "./model";
import {
  ageCondition,
  RESPONSE_NATIVE_SUPPORT,
  supportsBuilding,
  supportsResearch,
  supportsUnit,
  UNIT_PRODUCTION_BUILDINGS,
} from "./catalog";

export interface AdaptiveNativeRule {
  id: string;
  source: string;
  description: string;
  phase?: AgeKey;
  conditions: string[];
  actions: string[];
  enabled: boolean;
}
export interface StepGoalMetadata {
  state: number;
  deadline: number;
  fallback: number;
  previous?: number;
  initial?: number;
}
export interface ResponseGoalMetadata {
  active: number;
  deadline: number;
  costBase: number;
  actionCounters: Record<number, number>;
}
export interface AdaptiveIR {
  rules: AdaptiveNativeRule[];
  diagnostics: Diagnostic[];
  phaseGoals: Record<AgeKey, number>;
  stepGoals: Record<string, StepGoalMetadata>;
  responseGoals: Record<string, ResponseGoalMetadata>;
  responseTimers: Record<
    string,
    { arm: number; minimum: number; cooldown: number }
  >;
  microTimers: Record<string, number>;
  microOwners: Record<string, { group: number; unit: string }>;
  clockGoal: number;
  stalledGoal: number;
  activeResponseCountGoal: number;
}

const GOAL = {
  clock: 100,
  targetPlayer: 101,
  activeResponses: 102,
  stalled: 103,
  phase: 300,
  stepState: 1000,
  stepDeadline: 1400,
  stepFallback: 1800,
  responseActive: 2400,
  responseDeadline: 2600,
  responseAction: 3000,
  cost: 6000,
  microHealth: 7000,
  point: 9000,
} as const;
const TIMER = { response: 1, micro: 41 } as const;
const INACTIVE = -1,
  REQUESTED = 0,
  ACTIVE = 1,
  COMPLETE = 2,
  BLOCKED = 3;
const BUILD_RETRY_SECONDS = 30,
  BLOCKED_RETRY_SECONDS = 90;

const phaseGoalIds = (): Record<AgeKey, number> => ({
  dark: GOAL.phase,
  feudal: GOAL.phase + 1,
  castle: GOAL.phase + 2,
  imperial: GOAL.phase + 3,
  postImperial: GOAL.phase + 4,
});
function add(
  rules: AdaptiveNativeRule[],
  id: string,
  source: string,
  description: string,
  conditions: string[],
  actions: string[],
  phase?: AgeKey,
): void {
  rules.push({
    id,
    source,
    description,
    conditions,
    actions,
    phase,
    enabled: true,
  });
}
const setAllocation = (value: ResourceAllocation): string[] => [
  `(set-strategic-number sn-food-gatherer-percentage ${value.food})`,
  `(set-strategic-number sn-wood-gatherer-percentage ${value.wood})`,
  `(set-strategic-number sn-gold-gatherer-percentage ${value.gold})`,
  `(set-strategic-number sn-stone-gatherer-percentage ${value.stone})`,
];
const deadlineActions = (goal: number, seconds: number): string[] => [
  `(up-modify-goal ${goal} g:= ${GOAL.clock})`,
  `(up-modify-goal ${goal} c:+ ${seconds})`,
];

function placementDistance(policy: PlacementPolicy | PlacementOption): number {
  if (policy.direction === "behind") return -Math.abs(policy.distance);
  if (policy.direction === "toward-enemy") return Math.abs(policy.distance);
  return 0;
}
function placementActions(
  policy: PlacementPolicy | PlacementOption | undefined,
  building: BuildingId,
): string[] {
  if (!policy) return [`(up-build place-normal 0 c: ${building})`];
  if (policy.anchor === "forward-pressure")
    return [`(up-build place-forward 0 c: ${building})`];
  if (policy.anchor === "map-center")
    return [
      `(up-get-point position-center ${GOAL.point})`,
      `(up-set-target-point ${GOAL.point})`,
      `(up-build place-point 0 c: ${building})`,
    ];
  const object =
    policy.anchor === "home-town-center"
      ? "-1"
      : policy.anchor === "production"
        ? "anchorBuilding" in policy && policy.anchorBuilding
          ? policy.anchorBuilding
          : "barracks"
        : "anchorBuilding" in policy && policy.anchorBuilding
          ? policy.anchorBuilding
          : "resource" in policy && policy.resource === "food"
            ? "mill"
            : "mining-camp";
  return [
    `(up-set-placement-data my-player-number ${object} c: ${placementDistance(policy)})`,
    `(up-build place-control 0 c: ${building})`,
  ];
}
const placementById = (
  project: AdaptiveProject,
  id?: string,
): PlacementPolicy | undefined =>
  id ? project.placements.find((item) => item.id === id) : undefined;

function phaseConditions(
  step: StrategyStep,
  phaseGoals: Record<AgeKey, number>,
): string[] {
  return step.kind === "milestone" && step.phase === "postImperial"
    ? ["(current-age == imperial-age)"]
    : ageCondition(step.phase, phaseGoals);
}
function exactPhaseConditions(
  age: AgeKey,
  phaseGoals: Record<AgeKey, number>,
): string[] {
  if (age === "dark") return ["(current-age == dark-age)"];
  if (age === "feudal") return ["(current-age == feudal-age)"];
  if (age === "castle") return ["(current-age == castle-age)"];
  if (age === "imperial")
    return [
      "(current-age == imperial-age)",
      `(goal ${phaseGoals.postImperial} 0)`,
    ];
  return [
    "(current-age == imperial-age)",
    `(goal ${phaseGoals.postImperial} 1)`,
  ];
}
function completionConditions(step: StrategyStep): string[] {
  if (step.kind === "build")
    return [`(building-type-count ${step.building} >= ${step.count})`];
  if (step.kind === "train")
    return [`(unit-type-count ${step.unit} >= ${step.count})`];
  if (step.kind === "research") {
    if (step.research === "feudal-age") return ["(current-age >= feudal-age)"];
    if (step.research === "castle-age") return ["(current-age >= castle-age)"];
    if (step.research === "imperial-age")
      return ["(current-age == imperial-age)"];
    return [`(up-research-status c: ${step.research} == research-complete)`];
  }
  return ["(true)"];
}
function progressionConditions(
  step: StrategyStep,
  project: AdaptiveProject,
  phaseGoals: Record<AgeKey, number>,
  meta: StepGoalMetadata,
): string[] {
  const conditions = [...phaseConditions(step, phaseGoals)];
  if (meta.previous !== undefined)
    conditions.push(`(goal ${meta.previous} ${COMPLETE})`);
  if (step.kind === "research") {
    if (step.research === "feudal-age")
      conditions.push(
        `(unit-type-count villager >= ${project.phases.dark.villagers})`,
      );
    if (step.research === "castle-age")
      conditions.push(
        `(unit-type-count villager >= ${project.phases.feudal.villagers})`,
      );
    if (step.research === "imperial-age")
      conditions.push(
        `(unit-type-count villager >= ${project.phases.castle.villagers})`,
      );
  }
  return conditions;
}
function requestConditions(
  step: StrategyStep,
  project: AdaptiveProject,
  phaseGoals: Record<AgeKey, number>,
  meta: StepGoalMetadata,
): string[] {
  const conditions = [
    ...progressionConditions(step, project, phaseGoals, meta),
    `(goal ${meta.state} ${REQUESTED})`,
  ];
  if (step.kind === "research")
    conditions.push(
      `(up-research-status c: ${step.research} < research-pending)`,
    );
  return conditions;
}

function addStepRules(
  rules: AdaptiveNativeRule[],
  project: AdaptiveProject,
  step: StrategyStep,
  index: number,
  phaseGoals: Record<AgeKey, number>,
  meta: StepGoalMetadata,
): void {
  const source = `steps.${index}`,
    ordinaryGate = `(goal ${GOAL.activeResponses} 0)`,
    progress = progressionConditions(step, project, phaseGoals, meta),
    base = [
      ...requestConditions(step, project, phaseGoals, meta),
      ...(step.kind === "milestone" ? [] : [ordinaryGate]),
    ];
  if (step.kind === "allocate") {
    const target = step.villagerCount;
    add(
      rules,
      `step-${step.id}-apply`,
      source,
      step.label,
      base,
      [
        ...setAllocation(step.resources),
        `(set-goal ${meta.state} ${target === undefined ? COMPLETE : ACTIVE})`,
      ],
      step.phase,
    );
    if (target !== undefined) {
      add(
        rules,
        `step-${step.id}-villagers`,
        `${source}.villagerCount`,
        `Maintain ${target} villagers while ${step.label} is active.`,
        [
          ordinaryGate,
          `(goal ${meta.state} ${ACTIVE})`,
          `(unit-type-count-total villager < ${target})`,
          "(can-train villager)",
          "(population-headroom > 0)",
        ],
        ["(train villager)"],
        step.phase,
      );
      add(
        rules,
        `step-${step.id}-observe`,
        `${source}.villagerCount`,
        `Complete ${step.label} after the villager outcome is observed.`,
        [
          `(goal ${meta.state} ${ACTIVE})`,
          `(unit-type-count villager >= ${target})`,
        ],
        [`(set-goal ${meta.state} ${COMPLETE})`],
        step.phase,
      );
    }
    return;
  }
  if (step.kind === "milestone") {
    add(
      rules,
      `step-${step.id}-complete`,
      source,
      step.label,
      base,
      [
        `(set-goal ${meta.state} ${COMPLETE})`,
        `(set-goal ${phaseGoals[step.phase]} 1)`,
      ],
      step.phase,
    );
    return;
  }
  add(
    rules,
    `step-${step.id}-observe`,
    source,
    `Mark ${step.label} complete only after its outcome is observed.`,
    [
      `(up-compare-goal ${meta.state} != ${COMPLETE})`,
      ...completionConditions(step),
    ],
    [`(set-goal ${meta.state} ${COMPLETE})`],
    step.phase,
  );
  if (step.kind === "research") {
    const unavailable = `(not (up-can-research 0 c: ${step.research}))`,
      notPending = `(up-research-status c: ${step.research} < research-pending)`;
    add(
      rules,
      `step-${step.id}-wait-start`,
      source,
      `Start a bounded prerequisite/resource wait for ${step.label}.`,
      [...base, `(goal ${meta.deadline} 0)`, unavailable],
      deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-request`,
      source,
      step.label,
      [...base, `(up-can-research 0 c: ${step.research})`],
      [
        `(up-research 0 c: ${step.research})`,
        `(set-goal ${meta.state} ${ACTIVE})`,
        ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-retry`,
      source,
      `Retry ${step.label} if its request is no longer queued.`,
      [
        ordinaryGate,
        ...progress,
        `(goal ${meta.state} ${ACTIVE})`,
        notPending,
        `(up-can-research 0 c: ${step.research})`,
      ],
      [
        `(up-research 0 c: ${step.research})`,
        ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-stalled-request`,
      source,
      `Block ${step.label} after a bounded denied-request wait.`,
      [
        ...progress,
        `(goal ${meta.state} ${REQUESTED})`,
        `(up-compare-goal ${meta.deadline} > 0)`,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
        notPending,
        unavailable,
      ],
      [
        `(set-goal ${meta.state} ${BLOCKED})`,
        `(set-goal ${GOAL.stalled} 1)`,
        ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-stalled-active`,
      source,
      `Block ${step.label} when a disappeared research request cannot be restored.`,
      [
        ...progress,
        `(goal ${meta.state} ${ACTIVE})`,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
        notPending,
        unavailable,
      ],
      [
        `(set-goal ${meta.state} ${BLOCKED})`,
        `(set-goal ${GOAL.stalled} 1)`,
        ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-blocked-retry`,
      source,
      `Resume ${step.label} after its blocked pause when native prerequisites recover.`,
      [
        ordinaryGate,
        ...progress,
        `(goal ${meta.state} ${BLOCKED})`,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
        notPending,
        `(up-can-research 0 c: ${step.research})`,
      ],
      [
        `(up-research 0 c: ${step.research})`,
        `(set-goal ${meta.state} ${ACTIVE})`,
        `(set-goal ${GOAL.stalled} 0)`,
        ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      ],
      step.phase,
    );
    return;
  }
  if (step.kind === "train") {
    const production = step.productionBuilding
      ? [`(building-type-count ${step.productionBuilding} > 0)`]
      : [];
    const branchGuard = step.whileBuildingMissing
      ? [`(building-type-count ${step.whileBuildingMissing} < 1)`]
      : [];
    const queueUnavailable = `(or (not (up-can-train 0 c: ${step.unit})) (population-headroom <= 0))`;
    const unavailable = step.productionBuilding
      ? `(or (building-type-count ${step.productionBuilding} <= 0) ${queueUnavailable})`
      : queueUnavailable;
    add(
      rules,
      `step-${step.id}-wait-start`,
      source,
      `Start a bounded prerequisite/resource wait for ${step.label}.`,
      [...base, ...branchGuard, `(goal ${meta.deadline} 0)`, unavailable],
      deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-request`,
      source,
      step.label,
      [
        ...base,
        ...branchGuard,
        ...production,
        `(up-can-train 0 c: ${step.unit})`,
        "(population-headroom > 0)",
      ],
      [
        `(up-train 0 c: ${step.unit})`,
        `(set-goal ${meta.state} ${ACTIVE})`,
        ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-maintain`,
      source,
      `Maintain ${step.count} ${step.unit}, including queued units.`,
      [
        ordinaryGate,
        ...progress,
        ...branchGuard,
        `(up-compare-goal ${meta.state} >= ${ACTIVE})`,
        `(up-compare-goal ${meta.state} <= ${COMPLETE})`,
        ...production,
        `(unit-type-count-total ${step.unit} < ${step.count})`,
        `(up-can-train 0 c: ${step.unit})`,
        "(population-headroom > 0)",
      ],
      [
        `(up-train 0 c: ${step.unit})`,
        ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-stalled-request`,
      source,
      `Block ${step.label} after a bounded denied-request wait.`,
      [
        ...progress,
        ...branchGuard,
        `(goal ${meta.state} ${REQUESTED})`,
        `(up-compare-goal ${meta.deadline} > 0)`,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
        unavailable,
      ],
      [
        `(set-goal ${meta.state} ${BLOCKED})`,
        `(set-goal ${GOAL.stalled} 1)`,
        ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-stalled-active`,
      source,
      `Block ${step.label} when its incomplete queue cannot progress.`,
      [
        ...progress,
        ...branchGuard,
        `(goal ${meta.state} ${ACTIVE})`,
        `(unit-type-count-total ${step.unit} < ${step.count})`,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
        unavailable,
      ],
      [
        `(set-goal ${meta.state} ${BLOCKED})`,
        `(set-goal ${GOAL.stalled} 1)`,
        ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
      ],
      step.phase,
    );
    add(
      rules,
      `step-${step.id}-blocked-retry`,
      source,
      `Resume ${step.label} after its blocked pause when production recovers.`,
      [
        ordinaryGate,
        ...progress,
        ...branchGuard,
        `(goal ${meta.state} ${BLOCKED})`,
        ...production,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
        `(up-can-train 0 c: ${step.unit})`,
        "(population-headroom > 0)",
      ],
      [
        `(up-train 0 c: ${step.unit})`,
        `(set-goal ${meta.state} ${ACTIVE})`,
        `(set-goal ${GOAL.stalled} 0)`,
        ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      ],
      step.phase,
    );
    return;
  }
  const placement = placementById(project, step.placementId);
  const noProgress = [
    `(building-type-count-total ${step.building} < ${step.count})`,
    `(up-pending-objects c: ${step.building} < 1)`,
  ];
  const missing = [
      ...noProgress,
      `(not (up-pending-placement c: ${step.building}))`,
    ],
    ready = [...missing, `(up-can-build 0 c: ${step.building})`],
    unavailable = `(not (up-can-build 0 c: ${step.building}))`;
  add(
    rules,
    `step-${step.id}-wait-start`,
    source,
    `Start a bounded prerequisite/resource wait for ${step.label}.`,
    [...base, ...missing, `(goal ${meta.deadline} 0)`, unavailable],
    deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
    step.phase,
  );
  add(
    rules,
    `step-${step.id}-request`,
    source,
    step.label,
    [...base, ...ready],
    [
      ...placementActions(placement, step.building),
      `(set-goal ${meta.state} ${ACTIVE})`,
      `(set-goal ${meta.fallback} 0)`,
      ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
    ],
    step.phase,
  );
  add(
    rules,
    `step-${step.id}-replace`,
    source,
    `Replace a lost completed ${step.building} outcome.`,
    [
      ordinaryGate,
      ...phaseConditions(step, phaseGoals),
      `(goal ${meta.state} ${COMPLETE})`,
      ...ready,
    ],
    [
      ...placementActions(placement, step.building),
      `(set-goal ${meta.state} ${ACTIVE})`,
      ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
    ],
    step.phase,
  );
  add(
    rules,
    `step-${step.id}-stalled-request`,
    source,
    `Block ${step.label} after a bounded denied-request wait.`,
    [
      ...progress,
      `(goal ${meta.state} ${REQUESTED})`,
      ...missing,
      `(up-compare-goal ${meta.deadline} > 0)`,
      `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
      unavailable,
    ],
    [
      `(set-goal ${meta.state} ${BLOCKED})`,
      `(set-goal ${GOAL.stalled} 1)`,
      ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
    ],
    step.phase,
  );
  add(
    rules,
    `step-${step.id}-stalled-active`,
    source,
    `Block ${step.label} when a lost outcome cannot be restored.`,
    [
      ...progress,
      `(up-compare-goal ${meta.state} >= ${ACTIVE})`,
      `(up-compare-goal ${meta.state} <= ${COMPLETE})`,
      ...missing,
      `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
      unavailable,
    ],
    [
      `(set-goal ${meta.state} ${BLOCKED})`,
      `(set-goal ${GOAL.stalled} 1)`,
      ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
    ],
    step.phase,
  );
  add(
    rules,
    `step-${step.id}-blocked-retry`,
    source,
    `Retry ${step.label} after a bounded blocked-state pause.`,
    [
      ordinaryGate,
      ...progress,
      `(goal ${meta.state} ${BLOCKED})`,
      `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
      `(up-can-build 0 c: ${step.building})`,
    ],
    [
      ...placementActions(placement, step.building),
      `(set-goal ${meta.state} ${ACTIVE})`,
      `(set-goal ${meta.fallback} 0)`,
      `(set-goal ${GOAL.stalled} 0)`,
      ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
    ],
    step.phase,
  );
  if (!placement) {
    add(
      rules,
      `step-${step.id}-blocked`,
      source,
      `Mark ${step.label} blocked when normal placement makes no progress.`,
      [
        ordinaryGate,
        `(goal ${meta.state} ${ACTIVE})`,
        ...noProgress,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
      ],
      [
        `(up-reset-placement c: ${step.building})`,
        `(set-goal ${meta.state} ${BLOCKED})`,
        `(set-goal ${GOAL.stalled} 1)`,
        ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
      ],
      step.phase,
    );
    return;
  }
  placement.fallback.forEach((fallback, fallbackIndex) =>
    add(
      rules,
      `step-${step.id}-fallback-${fallbackIndex + 1}`,
      `${source}.placementId`,
      `Retry ${step.building} with ordered fallback ${fallbackIndex + 1}.`,
      [
        ordinaryGate,
        `(goal ${meta.state} ${ACTIVE})`,
        `(goal ${meta.fallback} ${fallbackIndex})`,
        ...noProgress,
        `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
      ],
      [
        `(up-reset-placement c: ${step.building})`,
        ...placementActions(fallback, step.building),
        `(set-goal ${meta.fallback} ${fallbackIndex + 1})`,
        ...deadlineActions(meta.deadline, BUILD_RETRY_SECONDS),
      ],
      step.phase,
    ),
  );
  add(
    rules,
    `step-${step.id}-blocked`,
    source,
    `Mark ${step.label} blocked after all placement fallbacks fail.`,
    [
      ordinaryGate,
      `(goal ${meta.state} ${ACTIVE})`,
      `(goal ${meta.fallback} ${placement.fallback.length})`,
      ...noProgress,
      `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
    ],
    [
      `(up-reset-placement c: ${step.building})`,
      `(set-goal ${meta.state} ${BLOCKED})`,
      `(set-goal ${GOAL.stalled} 1)`,
      ...deadlineActions(meta.deadline, BLOCKED_RETRY_SECONDS),
    ],
    step.phase,
  );
}

function responseTrigger(response: ResponseRule): string[] | null {
  const trigger = response.trigger;
  if (trigger.kind === "housing-shortage")
    return [`(housing-headroom <= ${trigger.threshold ?? 0})`];
  if (trigger.kind === "raid") return ["(town-under-attack)"];
  if (trigger.kind === "forward-defense")
    return [`(up-enemy-buildings-in-town >= ${trigger.threshold ?? 1})`];
  if (trigger.kind === "counter-army")
    return [
      `(up-unit-type-in-town c: ${trigger.unit ?? "knight-line"} >= ${trigger.threshold ?? 1})`,
    ];
  if (trigger.kind === "resource-depleted")
    return [
      `(up-gaia-type-count c: ${trigger.resource ?? "food"} <= ${trigger.threshold ?? 0})`,
    ];
  if (
    trigger.kind === "builder-lost" ||
    trigger.kind === "foundation-lost" ||
    trigger.kind === "development-stalled"
  )
    return [`(goal ${GOAL.stalled} 1)`];
  if (trigger.kind === "placement-blocked") {
    const action = response.actions.find(
      (item) => item.kind === "build" || item.kind === "reset-placement",
    );
    return action &&
      (action.kind === "build" || action.kind === "reset-placement")
      ? [`(up-pending-placement c: ${action.building})`]
      : null;
  }
  return null;
}
const negate = (conditions: string[]): string[] =>
  conditions.map((condition) => `(not ${condition})`);
function conflictKeys(response: ResponseRule): Set<string> {
  const keys = new Set<string>();
  response.actions.forEach((action) => {
    if (action.kind === "defend" || action.kind === "retreat")
      keys.add(`micro:${action.unit ?? "all"}`);
    else if (action.kind === "allocate") keys.add("economy");
    else if (action.kind === "build") {
      keys.add(`build:${action.building}`);
      keys.add("emergency-budget");
    } else if (action.kind === "reset-placement")
      keys.add(`build:${action.building}`);
    else if (action.kind === "train") {
      keys.add(`train:${action.unit}`);
      keys.add("emergency-budget");
    } else keys.add("pivot");
  });
  return keys;
}
function directAction(
  action: ResponseAction,
  project: AdaptiveProject,
): string[] {
  if (action.kind === "defend") {
    const unit = action.unit ?? "all-units-class";
    return [
      `(up-reset-unit c: ${unit})`,
      "(up-reset-attack-now)",
      "(up-full-reset-search)",
      `(up-find-local c: ${unit} c: 40)`,
      `(up-get-point position-self ${GOAL.point})`,
      `(up-target-point ${GOAL.point} action-patrol formation-stagger stance-defensive)`,
    ];
  }
  if (action.kind === "retreat")
    return action.unit
      ? [
          `(up-reset-unit c: ${action.unit})`,
          "(up-reset-attack-now)",
          `(up-retreat-to town-center c: ${action.unit})`,
        ]
      : [
          "(up-reset-unit c: all-units-class)",
          "(up-reset-attack-now)",
          "(up-retreat-now)",
        ];
  if (action.kind === "allocate") return setAllocation(action.resources);
  if (action.kind === "reset-placement")
    return [`(up-reset-placement c: ${action.building})`];
  if (action.kind === "pivot")
    return action.stepIds.flatMap((id) => {
      const index = project.steps.findIndex((step) => step.id === id);
      return index < 0
        ? []
        : [`(set-goal ${GOAL.stepState + index} ${REQUESTED})`];
    });
  return [];
}
function scheduledDirectActions(
  response: ResponseRule,
  project: AdaptiveProject,
): string[] {
  const selected = new Map<string, { action: ResponseAction; index: number }>();
  response.actions.forEach((action, index) => {
    if (action.kind === "build" || action.kind === "train") return;
    const key =
      action.kind === "defend" || action.kind === "retreat"
        ? `unit:${action.unit ?? "all"}`
        : action.kind === "allocate"
          ? "economy"
          : action.kind === "pivot"
            ? "pivot"
            : `placement:${action.building}`;
    const current = selected.get(key);
    if (!current || action.priority > current.action.priority)
      selected.set(key, { action, index });
  });
  return [...selected.values()]
    .sort((a, b) => a.action.priority - b.action.priority || a.index - b.index)
    .flatMap(({ action }) => directAction(action, project));
}
function recoveryConditions(
  response: ResponseRule,
  trigger: string[],
  project: AdaptiveProject,
): string[] {
  if (response.recovery.kind === "milestone") {
    const milestone = response.recovery.milestone;
    const index = project.steps.findIndex(
      (step) => step.kind === "milestone" && step.milestone === milestone,
    );
    return index < 0
      ? ["(false)"]
      : [`(goal ${GOAL.stepState + index} ${COMPLETE})`];
  }
  if (response.recovery.kind !== "threshold") return [];
  if (response.trigger.kind === "housing-shortage")
    return [`(housing-headroom >= ${response.recovery.threshold})`];
  if (
    response.trigger.kind === "resource-depleted" &&
    response.trigger.resource
  )
    return [
      `(up-gaia-type-count c: ${response.trigger.resource} > ${response.recovery.threshold})`,
    ];
  if (response.trigger.kind === "counter-army")
    return [
      `(up-unit-type-in-town c: ${response.trigger.unit ?? "knight-line"} <= ${response.recovery.threshold})`,
    ];
  if (response.trigger.kind === "forward-defense")
    return [`(up-enemy-buildings-in-town <= ${response.recovery.threshold})`];
  return negate(trigger);
}

function addResponseRules(
  rules: AdaptiveNativeRule[],
  project: AdaptiveProject,
  response: ResponseRule,
  sourceIndex: number,
  meta: ResponseGoalMetadata,
  timers: { arm: number; minimum: number; cooldown: number },
  peers: Array<{ response: ResponseRule; meta: ResponseGoalMetadata }>,
  phaseGoals: Record<AgeKey, number>,
  diagnostics: Diagnostic[],
): void {
  const source = `responses.${sourceIndex}`,
    trigger = responseTrigger(response);
  if (!trigger) {
    diagnostics.push({
      severity: "error",
      path: `${source}.trigger`,
      message: RESPONSE_NATIVE_SUPPORT[response.trigger.kind].explanation,
      code: "unsupported-trigger",
    });
    return;
  }
  add(
    rules,
    `response-${response.id}-cooldown-ready`,
    `${source}.cooldownSeconds`,
    `Release ${response.label} after its cooldown expires.`,
    [`(up-timer-status ${timers.cooldown} == timer-triggered)`],
    [`(disable-timer ${timers.cooldown})`],
  );
  const conflicts = conflictKeys(response);
  const conflictGuards = peers
    .filter(
      (item) =>
        item.response.id !== response.id &&
        [...conflictKeys(item.response)].some((key) => conflicts.has(key)),
    )
    .map((item) => `(goal ${item.meta.active} 0)`);
  const armReady = [
    `(goal ${meta.active} 0)`,
    `(up-timer-status ${timers.cooldown} == timer-disabled)`,
    ...trigger,
  ];
  if (response.trigger.sustainedSeconds > 0) {
    add(
      rules,
      `response-${response.id}-arm`,
      `${source}.trigger`,
      `Start the sustained trigger window for ${response.label}.`,
      [...armReady, `(up-timer-status ${timers.arm} == timer-disabled)`],
      [`(enable-timer ${timers.arm} ${response.trigger.sustainedSeconds})`],
    );
    add(
      rules,
      `response-${response.id}-cancel`,
      `${source}.trigger`,
      `Cancel the trigger window when ${response.label} clears.`,
      [
        `(goal ${meta.active} 0)`,
        ...negate(trigger),
        `(up-timer-status ${timers.arm} == timer-running)`,
      ],
      [`(disable-timer ${timers.arm})`],
    );
  }
  const ready = [
    ...armReady,
    ...conflictGuards,
    `(up-compare-goal ${GOAL.activeResponses} < ${project.limits.maxConcurrentResponses})`,
  ];
  if (response.trigger.sustainedSeconds > 0)
    ready.push(`(timer-triggered ${timers.arm})`);
  const spends = response.actions.filter(
    (action): action is Extract<ResponseAction, { kind: "build" | "train" }> =>
      action.kind === "build" || action.kind === "train",
  );
  if (spends.length) {
    add(
      rules,
      `response-${response.id}-cost`,
      `${source}.limits.emergencySpend`,
      `Measure civilization-adjusted costs for ${response.label}.`,
      ready,
      [
        `(up-setup-cost-data 1 ${meta.costBase})`,
        ...spends.map(
          (action) =>
            `(up-add-object-cost c: ${action.kind === "build" ? action.building : action.unit} c: ${action.count})`,
        ),
      ],
    );
    const allowed = project.limits.allowEmergencySpend
      ? {
          food: Math.min(
            response.limits.emergencySpend.food,
            project.limits.maxEmergencySpend.food,
          ),
          wood: Math.min(
            response.limits.emergencySpend.wood,
            project.limits.maxEmergencySpend.wood,
          ),
          stone: Math.min(
            response.limits.emergencySpend.stone,
            project.limits.maxEmergencySpend.stone,
          ),
          gold: Math.min(
            response.limits.emergencySpend.gold,
            project.limits.maxEmergencySpend.gold,
          ),
        }
      : { food: 0, wood: 0, stone: 0, gold: 0 };
    ready.push(
      `(up-compare-goal ${meta.costBase} <= ${allowed.food})`,
      `(up-compare-goal ${meta.costBase + 1} <= ${allowed.wood})`,
      `(up-compare-goal ${meta.costBase + 2} <= ${allowed.stone})`,
      `(up-compare-goal ${meta.costBase + 3} <= ${allowed.gold})`,
    );
  }
  add(rules, `response-${response.id}-enter`, source, response.label, ready, [
    ...scheduledDirectActions(response, project),
    `(set-goal ${meta.active} 1)`,
    `(up-modify-goal ${GOAL.activeResponses} c:+ 1)`,
    ...deadlineActions(meta.deadline, response.limits.maxDurationSeconds),
    `(enable-timer ${timers.minimum} ${Math.max(project.limits.minimumResponseSeconds, response.recovery.kind === "timeout" ? response.recovery.afterSeconds : 0)})`,
    ...(response.trigger.sustainedSeconds > 0
      ? [`(disable-timer ${timers.arm})`]
      : []),
    ...Object.values(meta.actionCounters).map((goal) => `(set-goal ${goal} 0)`),
  ]);
  response.actions
    .map((action, actionIndex) => ({ action, actionIndex }))
    .sort(
      (a, b) =>
        b.action.priority - a.action.priority || a.actionIndex - b.actionIndex,
    )
    .forEach(({ action, actionIndex }) => {
      const counter = meta.actionCounters[actionIndex];
      if (counter === undefined) return;
      if (action.kind === "train")
        add(
          rules,
          `response-${response.id}-action-${actionIndex + 1}`,
          `${source}.actions.${actionIndex}`,
          `Train up to ${action.count} ${action.unit} during this activation.`,
          [
            `(goal ${meta.active} 1)`,
            `(up-compare-goal ${counter} < ${action.count})`,
            `(up-can-train 0 c: ${action.unit})`,
            "(population-headroom > 0)",
          ],
          [
            `(up-train 0 c: ${action.unit})`,
            `(up-modify-goal ${counter} c:+ 1)`,
          ],
        );
      if (action.kind === "build")
        add(
          rules,
          `response-${response.id}-action-${actionIndex + 1}`,
          `${source}.actions.${actionIndex}`,
          `Build up to ${action.count} ${action.building} during this activation.`,
          [
            `(goal ${meta.active} 1)`,
            `(up-compare-goal ${counter} < ${action.count})`,
            `(up-pending-objects c: ${action.building} < 1)`,
            `(up-can-build 0 c: ${action.building})`,
          ],
          [
            `(up-assign-builders c: ${action.building} c: ${response.limits.maxWorkers})`,
            ...placementActions(
              placementById(project, action.placementId),
              action.building,
            ),
            `(up-modify-goal ${counter} c:+ 1)`,
          ],
        );
    });
  const actionDone = Object.entries(meta.actionCounters).map(
    ([index, goal]) =>
      `(up-compare-goal ${goal} >= ${(response.actions[Number(index)] as Extract<ResponseAction, { kind: "build" | "train" }>).count})`,
  );
  const ordinaryExit = [
    `(goal ${meta.active} 1)`,
    `(timer-triggered ${timers.minimum})`,
    ...actionDone,
    ...recoveryConditions(response, trigger, project),
  ];
  const exit = [
    ...response.actions.flatMap((action) =>
      action.kind === "build"
        ? [`(up-assign-builders c: ${action.building} c: -1)`]
        : [],
    ),
    `(set-goal ${meta.active} 0)`,
    `(up-modify-goal ${GOAL.activeResponses} c:- 1)`,
    `(disable-timer ${timers.minimum})`,
    `(enable-timer ${timers.cooldown} ${Math.max(1, response.cooldownSeconds)})`,
  ];
  if (response.actions.some((action) => action.kind === "allocate"))
    AGE_ORDER.forEach((age) =>
      add(
        rules,
        `response-${response.id}-exit-${age}`,
        `${source}.recovery`,
        `End ${response.label} and restore ${age} allocation.`,
        [...ordinaryExit, ...ageCondition(age, phaseGoals)],
        [...exit, ...setAllocation(project.phases[age].resources)],
        age,
      ),
    );
  else
    add(
      rules,
      `response-${response.id}-exit`,
      `${source}.recovery`,
      `End ${response.label} after its recovery condition and minimum duration.`,
      ordinaryExit,
      exit,
    );
  add(
    rules,
    `response-${response.id}-timeout`,
    `${source}.limits.maxDurationSeconds`,
    `Force ${response.label} to end at its creator-set maximum duration.`,
    [
      `(goal ${meta.active} 1)`,
      `(up-compare-goal ${GOAL.clock} g:>= ${meta.deadline})`,
    ],
    exit,
  );
}

const localUnit = (project: AdaptiveProject, name: string): string =>
  name === "ranged"
    ? project.civilization === "portuguese"
      ? "organ-gun-line"
      : "archer-line"
    : name === "screening"
      ? "spearman-line"
      : name === "melee"
        ? "infantry-class"
        : "siege-weapon-class";
const remoteType = (priority: string): string =>
  priority === "ranged"
    ? "archery-class"
    : priority === "siege"
      ? "siege-weapon-class"
      : priority === "villagers"
        ? "villager-class"
        : priority === "buildings"
          ? "building-class"
          : "all-units-class";
function addMicroRules(
  rules: AdaptiveNativeRule[],
  project: AdaptiveProject,
  responseGoals: Record<string, ResponseGoalMetadata>,
  microTimers: Record<string, number>,
  microOwners: Record<string, { group: number; unit: string }>,
): void {
  const modules = [
    ["ranged", project.micro.ranged],
    ["melee", project.micro.melee],
    ["siege", project.micro.siege],
    ["screening", project.micro.screening],
  ] as const;
  const noResponse = Object.values(responseGoals).map(
    (meta) => `(goal ${meta.active} 0)`,
  );
  let group = 0;
  modules.forEach(([name, module], index) => {
    if (!module.enabled) return;
    const timer = TIMER.micro + index,
      unit = localUnit(project, name),
      hp = GOAL.microHealth + index * 2,
      maxhp = hp + 1,
      regroup = Math.max(2, Math.ceil(module.groupSize / 2));
    const stance =
        module.aggression === "aggressive"
          ? "stance-aggressive"
          : module.aggression === "cautious"
            ? "stance-defensive"
            : "stance-stand-ground",
      formation = name === "siege" ? "formation-line" : "formation-stagger";
    microTimers[name] = timer;
    microOwners[name] = { group, unit };
    add(
      rules,
      `micro-${name}-setup`,
      `micro.${name}`,
      `Reserve ${unit} for the exclusive ${name} controller.`,
      ["(true)"],
      [
        `(fe-exclude-from-attack-group c: ${unit})`,
        `(enable-timer ${timer} ${module.searchIntervalSeconds})`,
        "(disable-self)",
      ],
    );
    add(
      rules,
      `micro-${name}-regroup`,
      `micro.${name}.regroupSeconds`,
      `Regroup a small ${name} force at home.`,
      [
        `(timer-triggered ${timer})`,
        ...noResponse,
        `(unit-type-count ${unit} > 0)`,
        `(unit-type-count ${unit} < ${regroup})`,
      ],
      [
        "(up-full-reset-search)",
        `(up-find-local c: ${unit} c: ${module.groupSize})`,
        `(up-modify-group-flag 1 c: ${group})`,
        `(up-get-point position-self ${GOAL.point})`,
        `(up-target-point ${GOAL.point} action-move ${formation} ${stance})`,
        `(disable-timer ${timer})`,
        `(enable-timer ${timer} ${module.regroupSeconds})`,
      ],
    );
    add(
      rules,
      `micro-${name}-sample`,
      `micro.${name}.retreatHealthPercent`,
      `Sample a controlled ${name} unit before choosing retreat or engagement.`,
      [
        `(timer-triggered ${timer})`,
        ...noResponse,
        `(unit-type-count ${unit} >= ${regroup})`,
      ],
      [
        "(up-full-reset-search)",
        `(up-find-local c: ${unit} c: ${module.groupSize})`,
        `(up-modify-group-flag 1 c: ${group})`,
        "(up-set-target-object search-local c: 0)",
        `(up-get-object-data object-data-hitpoints ${hp})`,
        `(up-get-object-data object-data-maxhp ${maxhp})`,
        `(up-modify-goal ${hp} g:%/ ${maxhp})`,
      ],
    );
    add(
      rules,
      `micro-${name}-retreat`,
      `micro.${name}.retreatHealthPercent`,
      `Retreat the exclusive ${name} group when its sampled front unit is badly damaged.`,
      [
        `(timer-triggered ${timer})`,
        ...noResponse,
        `(up-compare-goal ${hp} >= 0)`,
        `(up-compare-goal ${hp} <= ${module.retreatHealthPercent})`,
      ],
      [
        `(up-get-point position-self ${GOAL.point})`,
        `(up-target-point ${GOAL.point} action-move ${formation} stance-defensive)`,
        `(disable-timer ${timer})`,
        `(enable-timer ${timer} ${module.regroupSeconds})`,
      ],
    );
    module.targetPriorities.forEach((priority, priorityIndex) => {
      const target = remoteType(priority);
      add(
        rules,
        `micro-${name}-priority-${priorityIndex + 1}`,
        `micro.${name}.targetPriorities.${priorityIndex}`,
        `Patrol the exclusive ${name} group toward observed ${priority} targets when higher priorities are absent.`,
        [
          `(timer-triggered ${timer})`,
          ...noResponse,
          `(up-compare-goal ${hp} > ${module.retreatHealthPercent})`,
          `(up-find-remote c: ${target} c: ${Math.min(40, module.groupSize)})`,
        ],
        [
          `(up-target-objects 0 action-patrol ${formation} ${stance})`,
          `(disable-timer ${timer})`,
          `(enable-timer ${timer} ${Math.max(project.micro.globalReactionIntervalSeconds, module.searchIntervalSeconds)})`,
        ],
      );
    });
    if (name === "screening") {
      const protectedUnit =
        project.civilization === "portuguese"
          ? "organ-gun-line"
          : "archer-line";
      add(
        rules,
        `micro-${name}-protect`,
        `micro.${name}`,
        `Guard the ranged core when no configured enemy target is currently observable.`,
        [
          `(timer-triggered ${timer})`,
          ...noResponse,
          `(up-compare-goal ${hp} > ${module.retreatHealthPercent})`,
        ],
        [
          `(up-modify-sn sn-focus-player-number c:= my-player-number)`,
          `(up-find-remote c: ${protectedUnit} c: 1)`,
          `(up-target-objects 0 action-guard formation-box stance-defensive)`,
          `(up-modify-sn sn-focus-player-number g:= ${GOAL.targetPlayer})`,
          `(disable-timer ${timer})`,
          `(enable-timer ${timer} ${Math.max(project.micro.globalReactionIntervalSeconds, module.searchIntervalSeconds)})`,
        ],
      );
    } else {
      const description =
        name === "siege"
          ? "Keep siege near home when no approved target is observable."
          : `Regroup the ${name} controller when no configured target is observable.`;
      add(
        rules,
        `micro-${name}-fallback`,
        `micro.${name}`,
        description,
        [
          `(timer-triggered ${timer})`,
          ...noResponse,
          `(up-compare-goal ${hp} > ${module.retreatHealthPercent})`,
        ],
        [
          `(up-get-point position-self ${GOAL.point})`,
          `(up-target-point ${GOAL.point} action-move ${formation} stance-defensive)`,
          `(disable-timer ${timer})`,
          `(enable-timer ${timer} ${module.regroupSeconds})`,
        ],
      );
    }
    group += 1;
  });
}

function nativeDiagnostics(project: AdaptiveProject): Diagnostic[] {
  const issues: Diagnostic[] = [],
    error = (path: string, message: string, code: string) =>
      issues.push({ severity: "error" as const, path, message, code });
  project.steps.forEach((step, index) => {
    if (
      step.kind === "build" &&
      !supportsBuilding(project.civilization, step.building)
    )
      error(
        `steps.${index}.building`,
        `${step.building} is unavailable to ${project.civilization}.`,
        "catalog-building",
      );
    if (
      step.kind === "research" &&
      !supportsResearch(project.civilization, step.research)
    )
      error(
        `steps.${index}.research`,
        `${step.research} is unavailable to ${project.civilization}.`,
        "catalog-research",
      );
    if (step.kind === "train") {
      if (!supportsUnit(project.civilization, step.unit))
        error(
          `steps.${index}.unit`,
          `${step.unit} is unavailable to ${project.civilization}.`,
          "catalog-unit",
        );
      if (step.productionBuilding) {
        if (!supportsBuilding(project.civilization, step.productionBuilding))
          error(
            `steps.${index}.productionBuilding`,
            `${step.productionBuilding} is unavailable to ${project.civilization}.`,
            "catalog-building",
          );
        else if (
          !(UNIT_PRODUCTION_BUILDINGS[step.unit] ?? []).includes(
            step.productionBuilding,
          )
        )
          error(
            `steps.${index}.productionBuilding`,
            `${step.unit} is not produced at ${step.productionBuilding} in the pinned catalog.`,
            "catalog-production-site",
          );
      }
      if (
        step.whileBuildingMissing &&
        !supportsBuilding(project.civilization, step.whileBuildingMissing)
      )
        error(
          `steps.${index}.whileBuildingMissing`,
          `${step.whileBuildingMissing} is unavailable to ${project.civilization}.`,
          "catalog-building",
        );
    }
    if (
      step.kind === "build" &&
      (step.building === "palisade-wall" || step.building === "stone-wall")
    )
      error(
        `steps.${index}.building`,
        "Wall lines require authored endpoint pairs and are outside this release.",
        "unsupported-wall-placement",
      );
  });
  project.placements.forEach((placement, index) => {
    const validateOption = (
      option: PlacementPolicy | PlacementOption,
      path: string,
    ) => {
      if (option.direction === "left" || option.direction === "right")
        error(
          `${path}.direction`,
          "Native controlled placement cannot enforce lateral offsets.",
          "unsupported-placement-direction",
        );
      if (
        (option.direction === "around" || option.direction === "none") &&
        option.distance !== 0
      )
        error(
          `${path}.distance`,
          "Around and none have no signed native offset. Use distance 0, or choose toward-enemy/behind.",
          "unsupported-placement-distance",
        );
      if (option.spacing !== 0)
        error(
          `${path}.spacing`,
          "Native managed placement cannot enforce inter-building spacing. Use zero.",
          "unsupported-placement-spacing",
        );
    };
    if (placement.strict)
      error(
        `placements.${index}.strict`,
        "Native placement cannot guarantee hard geometry.",
        "unsupported-placement-constraint",
      );
    validateOption(placement, `placements.${index}`);
    placement.fallback.forEach((fallback, fallbackIndex) =>
      validateOption(fallback, `placements.${index}.fallback.${fallbackIndex}`),
    );
  });
  project.responses.forEach((response, index) => {
    if (!response.enabled) return;
    if (!RESPONSE_NATIVE_SUPPORT[response.trigger.kind].supported)
      error(
        `responses.${index}.trigger`,
        RESPONSE_NATIVE_SUPPORT[response.trigger.kind].explanation,
        "unsupported-trigger",
      );
    if (
      response.actions.some((action) => action.kind === "pivot") &&
      (!project.limits.allowPivots || !response.limits.allowPivot)
    )
      error(
        `responses.${index}.actions`,
        "This pivot exceeds the creator-set pivot authority.",
        "authority-limit",
      );
    if (
      response.actions.some(
        (action) => action.kind === "build" || action.kind === "train",
      ) &&
      !project.limits.allowEmergencySpend
    )
      error(
        `responses.${index}.actions`,
        "This response spends resources while emergency spending is disabled.",
        "authority-limit",
      );
  });
  AGE_ORDER.forEach((age) => {
    const milestone = project.phases[age].milestone;
    if (
      milestone &&
      !project.steps.some(
        (step) =>
          step.enabled &&
          step.kind === "milestone" &&
          step.phase === age &&
          step.milestone === milestone,
      )
    )
      error(
        `phases.${age}.milestone`,
        `Phase milestone '${milestone}' needs an enabled matching milestone step in ${age}.`,
        "unknown-phase-milestone",
      );
  });
  if (project.limits.strictPlacement)
    error(
      "limits.strictPlacement",
      "Native managed placement cannot guarantee hard geometry. Disable strict placement and use ordered fallbacks.",
      "unsupported-placement-constraint",
    );
  if (project.responses.filter((response) => response.enabled).length > 13)
    error(
      "responses",
      "Native timers support at most 13 enabled responses while the four micro timers are reserved.",
      "native-timer-capacity",
    );
  if (project.micro.melee.enabled && project.micro.screening.enabled)
    error(
      "micro",
      "Melee and screening both claim the infantry class; enable only one exclusive controller.",
      "micro-overlap",
    );
  (["ranged", "melee", "siege", "screening"] as const).forEach((name) => {
    const module = project.micro[name];
    if (!module.enabled) return;
    module.targetPriorities.forEach((priority, priorityIndex) => {
      if (
        priority === "closest" ||
        priority === "weakest" ||
        priority === "highest-threat"
      )
        error(
          `micro.${name}.targetPriorities.${priorityIndex}`,
          `Native DUC can select observed target classes but cannot reliably order them by ${priority}. Choose ranged, siege, villagers, or buildings.`,
          "unsupported-micro-priority",
        );
    });
  });
  return issues;
}

export function buildAdaptiveIR(input: unknown): AdaptiveIR {
  const phaseGoals = phaseGoalIds();
  const empty = (diagnostics: Diagnostic[]): AdaptiveIR => ({
    rules: [],
    diagnostics,
    phaseGoals,
    stepGoals: {},
    responseGoals: {},
    responseTimers: {},
    microTimers: {},
    microOwners: {},
    clockGoal: GOAL.clock,
    stalledGoal: GOAL.stalled,
    activeResponseCountGoal: GOAL.activeResponses,
  });
  const structural = adaptiveProjectSchema.safeParse(input);
  if (!structural.success)
    return empty(
      structural.error.issues.map((issue) => ({
        severity: "error",
        path: issue.path.join(".") || "Project",
        message: issue.message,
        code: "schema",
      })),
    );
  const project = structural.data,
    diagnostics = [
      ...validateAdaptiveProject(project),
      ...nativeDiagnostics(project),
    ],
    rules: AdaptiveNativeRule[] = [],
    stepGoals: Record<string, StepGoalMetadata> = {},
    responseGoals: Record<string, ResponseGoalMetadata> = {},
    responseTimers: Record<
      string,
      { arm: number; minimum: number; cooldown: number }
    > = {},
    microTimers: Record<string, number> = {},
    microOwners: Record<string, { group: number; unit: string }> = {};
  const indexedSteps = project.steps.map((step, index) => ({ step, index }));
  const steps = indexedSteps.filter((item) => item.step.enabled);
  const authorizedPivotActions = project.responses
    .filter(
      (response) =>
        response.enabled &&
        response.limits.allowPivot &&
        project.limits.allowPivots,
    )
    .flatMap((response) =>
      response.actions.filter(
        (action): action is Extract<ResponseAction, { kind: "pivot" }> =>
          action.kind === "pivot",
      ),
    );
  const pivotBranchIds = new Set(
    authorizedPivotActions.flatMap((action) => action.stepIds),
  );
  const branchPrevious = new Map<string, string>();
  authorizedPivotActions.forEach((action) =>
    action.stepIds.forEach((id, index) => {
      if (index > 0) branchPrevious.set(id, action.stepIds[index - 1]);
    }),
  );
  const branchSteps = indexedSteps.filter(
    (item) => !item.step.enabled && pivotBranchIds.has(item.step.id),
  );
  steps.forEach((item, ordinal) => {
    stepGoals[item.step.id] = {
      state: GOAL.stepState + item.index,
      deadline: GOAL.stepDeadline + item.index,
      fallback: GOAL.stepFallback + item.index,
      ...(ordinal > 0
        ? { previous: GOAL.stepState + steps[ordinal - 1].index }
        : {}),
    };
  });
  branchSteps.forEach((item) => {
    const previousId = branchPrevious.get(item.step.id),
      previousIndex = previousId
        ? project.steps.findIndex((step) => step.id === previousId)
        : -1;
    stepGoals[item.step.id] = {
      state: GOAL.stepState + item.index,
      deadline: GOAL.stepDeadline + item.index,
      fallback: GOAL.stepFallback + item.index,
      initial: INACTIVE,
      ...(previousIndex >= 0
        ? { previous: GOAL.stepState + previousIndex }
        : {}),
    };
  });
  const responses = project.responses
    .map((response, index) => ({ response, index }))
    .filter((item) => item.response.enabled)
    .sort(
      (a, b) => b.response.priority - a.response.priority || a.index - b.index,
    );
  responses.forEach(({ response, index }, ordinal) => {
    const actionCounters: Record<number, number> = {};
    response.actions.forEach((action, actionIndex) => {
      if (action.kind === "build" || action.kind === "train")
        actionCounters[actionIndex] =
          GOAL.responseAction + index * 20 + actionIndex;
    });
    responseGoals[response.id] = {
      active: GOAL.responseActive + index,
      deadline: GOAL.responseDeadline + index,
      costBase: GOAL.cost + index * 8,
      actionCounters,
    };
    responseTimers[response.id] = {
      arm: TIMER.response + ordinal * 3,
      minimum: TIMER.response + ordinal * 3 + 1,
      cooldown: TIMER.response + ordinal * 3 + 2,
    };
  });
  add(
    rules,
    "v2-setup",
    "limits",
    "Initialize compiler-owned state, fair targeting, placement, and response scheduling.",
    ["(true)"],
    [
      "(set-strategic-number sn-do-not-scale-for-difficulty-level 1)",
      "(set-strategic-number sn-number-attack-groups 0)",
      "(set-strategic-number sn-disable-defend-groups 1)",
      "(set-strategic-number sn-placement-zone-size 1)",
      "(set-strategic-number sn-placement-fail-delta 2)",
      "(set-strategic-number sn-allow-civilian-defense 1)",
      `(set-goal ${GOAL.activeResponses} 0)`,
      `(set-goal ${GOAL.stalled} 0)`,
      `(set-goal ${phaseGoals.dark} 1)`,
      ...AGE_ORDER.slice(1).map((age) => `(set-goal ${phaseGoals[age]} 0)`),
      `(up-find-player enemy find-closest ${GOAL.targetPlayer})`,
      `(up-modify-sn sn-focus-player-number g:= ${GOAL.targetPlayer})`,
      "(disable-self)",
    ],
  );
  Object.entries(stepGoals).forEach(([id, meta]) =>
    add(
      rules,
      `v2-step-state-${id}`,
      `steps.${project.steps.findIndex((step) => step.id === id)}`,
      `Initialize outcome state for ${id}.`,
      ["(true)"],
      [
        `(set-goal ${meta.state} ${meta.initial ?? REQUESTED})`,
        `(set-goal ${meta.deadline} 0)`,
        `(set-goal ${meta.fallback} 0)`,
        "(disable-self)",
      ],
    ),
  );
  Object.entries(responseGoals).forEach(([id, meta]) => {
    const timers = responseTimers[id],
      sourceIndex = project.responses.findIndex(
        (response) => response.id === id,
      );
    add(
      rules,
      `v2-response-state-${id}`,
      `responses.${sourceIndex}`,
      `Initialize response state for ${id}.`,
      ["(true)"],
      [
        `(set-goal ${meta.active} 0)`,
        `(set-goal ${meta.deadline} 0)`,
        ...Object.values(meta.actionCounters).map(
          (goal) => `(set-goal ${goal} 0)`,
        ),
        `(disable-timer ${timers.arm})`,
        `(disable-timer ${timers.minimum})`,
        `(disable-timer ${timers.cooldown})`,
        "(disable-self)",
      ],
    );
  });
  add(
    rules,
    "v2-clock",
    "limits",
    "Read native game time for retry and maximum-duration deadlines.",
    ["(true)"],
    [`(up-get-fact game-time 0 ${GOAL.clock})`],
  );
  add(
    rules,
    "phase-feudal-observe",
    "phases.feudal",
    "Observe Feudal Age completion.",
    [`(goal ${phaseGoals.feudal} 0)`, "(current-age >= feudal-age)"],
    [`(set-goal ${phaseGoals.feudal} 1)`],
    "feudal",
  );
  add(
    rules,
    "phase-castle-observe",
    "phases.castle",
    "Observe Castle Age completion.",
    [`(goal ${phaseGoals.castle} 0)`, "(current-age >= castle-age)"],
    [`(set-goal ${phaseGoals.castle} 1)`],
    "castle",
  );
  add(
    rules,
    "phase-imperial-observe",
    "phases.imperial",
    "Observe Imperial Age completion.",
    [`(goal ${phaseGoals.imperial} 0)`, "(current-age == imperial-age)"],
    [`(set-goal ${phaseGoals.imperial} 1)`],
    "imperial",
  );
  const responsePeers = responses.map(({ response }) => ({
    response,
    meta: responseGoals[response.id],
  }));
  responses.forEach(({ response, index }) =>
    addResponseRules(
      rules,
      project,
      response,
      index,
      responseGoals[response.id],
      responseTimers[response.id],
      responsePeers,
      phaseGoals,
      diagnostics,
    ),
  );
  const ordinaryGate = `(goal ${GOAL.activeResponses} 0)`;
  AGE_ORDER.forEach((age) =>
    add(
      rules,
      `phase-${age}-allocation`,
      `phases.${age}.resources`,
      `Apply the ${age} economy target after the phase is observed.`,
      [ordinaryGate, ...ageCondition(age, phaseGoals)],
      [...setAllocation(project.phases[age].resources), "(disable-self)"],
      age,
    ),
  );
  AGE_ORDER.forEach((age) => {
    const next =
        age === "dark"
          ? "feudal-age"
          : age === "feudal"
            ? "castle-age"
            : age === "castle"
              ? "imperial-age"
              : null,
      phase = project.phases[age],
      exact = exactPhaseConditions(age, phaseGoals);
    add(
      rules,
      `economy-${age}-villagers`,
      `phases.${age}.villagers`,
      `Maintain ${phase.villagers} villagers and replace losses during this exact strategy phase.`,
      [
        ordinaryGate,
        ...exact,
        `(unit-type-count-total villager < ${phase.villagers})`,
        "(can-train villager)",
        "(population-headroom > 0)",
        ...(next ? [`(up-research-status c: ${next} < research-pending)`] : []),
      ],
      ["(train villager)"],
      age,
    );
    const farms = Math.max(
      4,
      Math.min(
        40,
        Math.ceil(((phase.villagers * phase.resources.food) / 100) * 0.7),
      ),
    );
    add(
      rules,
      `economy-${age}-farms`,
      `phases.${age}.resources.food`,
      `Maintain up to ${farms} farms for this exact strategy phase.`,
      [
        ordinaryGate,
        ...exact,
        `(building-type-count-total farm < ${farms})`,
        "(up-pending-objects c: farm < 1)",
        "(up-can-build 0 c: farm)",
      ],
      ["(up-build place-normal 0 c: farm)"],
      age,
    );
  });
  (
    [
      ["lumber-camp", "phases.dark.resources.wood"],
      ["mill", "phases.dark.resources.food"],
      ["mining-camp", "phases.feudal.resources.gold"],
    ] as const
  ).forEach(([building, source]) => {
    if (
      project.steps.some(
        (step) =>
          step.enabled && step.kind === "build" && step.building === building,
      )
    )
      return;
    const policy = project.placements.find(
      (item) => item.building === building,
    );
    add(
      rules,
      `economy-maintain-${building}`,
      policy ? `placements.${project.placements.indexOf(policy)}` : source,
      `Maintain an essential ${building}.`,
      [
        ordinaryGate,
        `(building-type-count-total ${building} < 1)`,
        `(up-pending-objects c: ${building} < 1)`,
        `(up-can-build 0 c: ${building})`,
      ],
      placementActions(policy, building),
    );
  });
  const housingIndex = project.responses.findIndex(
    (response) => response.trigger.kind === "housing-shortage",
  );
  const housingHeadroom =
    housingIndex >= 0
      ? (project.responses[housingIndex].trigger.threshold ?? 4)
      : 4;
  const housingPolicy = project.placements.find(
    (item) => item.building === "house",
  );
  add(
    rules,
    "economy-housing",
    housingIndex >= 0
      ? `responses.${housingIndex}.trigger.threshold`
      : housingPolicy
        ? `placements.${project.placements.indexOf(housingPolicy)}`
        : "phases.dark",
    "Maintain housing before production becomes blocked.",
    [
      ordinaryGate,
      `(housing-headroom <= ${housingHeadroom})`,
      "(population-headroom > 0)",
      "(up-pending-objects c: house < 1)",
      "(up-can-build 0 c: house)",
    ],
    placementActions(housingPolicy, "house"),
  );
  [...steps, ...branchSteps]
    .sort((a, b) => b.step.priority - a.step.priority || a.index - b.index)
    .forEach(({ step, index }) =>
      addStepRules(rules, project, step, index, phaseGoals, stepGoals[step.id]),
    );
  addMicroRules(rules, project, responseGoals, microTimers, microOwners);
  return {
    rules,
    diagnostics,
    phaseGoals,
    stepGoals,
    responseGoals,
    responseTimers,
    microTimers,
    microOwners,
    clockGoal: GOAL.clock,
    stalledGoal: GOAL.stalled,
    activeResponseCountGoal: GOAL.activeResponses,
  };
}
