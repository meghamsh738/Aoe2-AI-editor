import {
  AGE_ORDER,
  type AdaptiveProject,
  type AgeKey,
  type BuildingId,
  type Civilization,
  type NativeAge,
  type Resource,
  type ResourceAmounts,
  type ResearchId,
  type ResponseAction,
  type StrategyStep,
  type UnitId,
} from "./model";
import { buildAdaptiveIR, type AdaptiveNativeRule } from "./ir";
export type UnitCounts = Partial<Record<UnitId, number>>;
export type BuildingCounts = Partial<Record<BuildingId, number>>;
export interface PreviewMemory {
  projectKey: string;
  lastTime: number;
  goals: Record<number, number>;
  timers: Record<number, number>;
  strategicNumbers: Record<string, number>;
  disabledRules: string[];
  unknownGoals?: number[];
  costBase?: number;
}
/** Only supplied observations are evaluated. Memory tracks policy state, never game simulation. */
export interface AdaptiveSituation {
  age: NativeAge;
  gameSeconds: number;
  villagers: number;
  queuedVillagers: number;
  resources: ResourceAmounts;
  housingHeadroom: number;
  completedBuildings: BuildingCounts;
  pendingBuildings: BuildingCounts;
  completedResearch: ResearchId[];
  researching: ResearchId[];
  completedUnits: UnitCounts;
  queuedUnits: UnitCounts;
  canBuild: Partial<Record<BuildingId, boolean>>;
  canTrain: Partial<Record<UnitId, boolean>>;
  canResearch: Partial<Record<ResearchId, boolean>>;
  resourceCounts: Partial<Record<Resource, number>>;
  townUnderAttack: boolean;
  enemyBuildingsInTown: number;
  enemyUnitsInTown: UnitCounts;
  sightedAt: Partial<Record<UnitId | "buildings", number>>;
  placementBlocked: BuildingId[];
  completedSteps: string[];
  blockedSteps: string[];
  milestones: string[];
  responseState: Record<string, { enteredAt: number; lastActivatedAt: number }>;
  ownedGroups: Record<string, string>;
  /** Explicit checks from a hypothetical or recorded native snapshot; unknown is omitted. */
  nativeFacts: Record<string, boolean | number>;
  objectCosts: Partial<Record<UnitId | BuildingId, ResourceAmounts>>;
  memory?: PreviewMemory;
}
export const defaultAdaptiveSituation: AdaptiveSituation = {
  age: "dark",
  gameSeconds: 0,
  villagers: 3,
  queuedVillagers: 0,
  resources: { food: 200, wood: 200, gold: 100, stone: 200 },
  housingHeadroom: 2,
  completedBuildings: { "town-center": 1 },
  pendingBuildings: {},
  completedResearch: [],
  researching: [],
  completedUnits: { villager: 3, "scout-cavalry-line": 1 },
  queuedUnits: {},
  canBuild: {},
  canTrain: {},
  canResearch: {},
  resourceCounts: {},
  townUnderAttack: false,
  enemyBuildingsInTown: 0,
  enemyUnitsInTown: {},
  sightedAt: {},
  placementBlocked: [],
  completedSteps: [],
  blockedSteps: [],
  milestones: [],
  responseState: {},
  ownedGroups: {},
  nativeFacts: {},
  objectCosts: {},
};
export type StepStatus = "requested" | "active" | "completed" | "blocked";
export interface StepDecision {
  id: string;
  label: string;
  status: StepStatus;
  reason: string;
  action: StrategyStep;
}
export interface ResponseDecision {
  id: string;
  label: string;
  active: boolean;
  reason: string;
  actions: ResponseAction[];
}
export interface ScheduledAction {
  owner: string;
  kind: string;
  priority: number;
  action: string;
  reason: string;
}
export interface AdaptiveEvaluation {
  phase: AgeKey;
  steps: StepDecision[];
  responses: ResponseDecision[];
  scheduledActions: ScheduledAction[];
  diagnostics: string[];
  memory: PreviewMemory;
  firedRules: string[];
}
type Form = string | Form[];
type Truth = boolean | undefined;
/** Tiny parser for compiler-owned forms; it never evaluates JavaScript or imported code. */
function parse(text: string): Form {
  const tokens = text.match(/"(?:[^"\\]|\\.)*"|[()]|[^\s()]+/g) ?? [];
  let index = 0;
  function read(): Form {
    const token = tokens[index++];
    if (token !== "(") return token ?? "";
    const values: Form[] = [];
    while (index < tokens.length && tokens[index] !== ")") values.push(read());
    index++;
    return values;
  }
  return read();
}
const compare = (
  left: number | undefined,
  op: string,
  right: number | undefined,
): Truth => {
  if (
    left === undefined ||
    right === undefined ||
    !Number.isFinite(left) ||
    !Number.isFinite(right)
  )
    return undefined;
  switch (op) {
    case "==":
    case "=":
      return left === right;
    case "!=":
      return left !== right;
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    default:
      return undefined;
  }
};
const ranks: Record<string, number> = {
  dark: 0,
  feudal: 1,
  castle: 2,
  imperial: 3,
  "post-imperial": 3,
  "dark-age": 0,
  "feudal-age": 1,
  "castle-age": 2,
  "imperial-age": 3,
};
const symbols: Record<string, number> = {
  ...ranks,
  "timer-disabled": 0,
  "timer-running": 2,
  "timer-triggered": 1,
  "research-disabled": -1,
  "research-complete": 3,
  "research-queued": 4,
  "research-completed": 3,
  "research-pending": 2,
  "research-available": 1,
  "research-unavailable": 0,
};
const scalar = (value: Form | undefined): string =>
  typeof value === "string" ? value : "";
export function normalizeSituation(
  input: Partial<AdaptiveSituation> = {},
): AdaptiveSituation {
  return structuredClone({
    ...defaultAdaptiveSituation,
    ...input,
    resources: { ...defaultAdaptiveSituation.resources, ...input.resources },
    completedBuildings: {
      ...defaultAdaptiveSituation.completedBuildings,
      ...input.completedBuildings,
    },
    completedUnits: {
      ...defaultAdaptiveSituation.completedUnits,
      ...input.completedUnits,
    },
    nativeFacts: { ...input.nativeFacts },
    objectCosts: { ...input.objectCosts },
    sightedAt: { ...input.sightedAt },
  });
}
function isFresh(state: AdaptiveSituation, unit: string): boolean {
  const time = state.sightedAt[unit as keyof AdaptiveSituation["sightedAt"]];
  return (
    time !== undefined &&
    state.gameSeconds >= time &&
    state.gameSeconds - time <= 5
  );
}
function completedUnits(state: AdaptiveSituation, unit: string): number {
  if (unit === "villager") return state.villagers;
  if (unit === "archer-line")
    return (
      (state.completedUnits.archer ?? 0) +
      (state.completedUnits.crossbowman ?? 0) +
      (state.completedUnits.arbalest ?? 0)
    );
  return state.completedUnits[unit as UnitId] ?? 0;
}
function count(
  state: AdaptiveSituation,
  name: string,
  parameter: string,
): number | undefined {
  if (name === "game-time") return state.gameSeconds;
  if (name === "current-age") return ranks[state.age];
  if (name === "housing-headroom") return state.housingHeadroom;
  if (name === "population-headroom")
    return Math.max(
      0,
      200 -
        Object.entries(state.completedUnits)
          .filter(([unit]) => unit !== "villager")
          .reduce((n, [, value]) => n + (value ?? 0), state.villagers),
    );
  if (
    name.endsWith("-amount") &&
    ["food", "wood", "gold", "stone"].includes(name.slice(0, -7))
  )
    return state.resources[name.slice(0, -7) as Resource];
  if (name === "unit-type-count") return completedUnits(state, parameter);
  if (name === "unit-type-count-total")
    return (
      completedUnits(state, parameter) +
      (parameter === "villager"
        ? state.queuedVillagers
        : (state.queuedUnits[parameter as UnitId] ?? 0))
    );
  if (name === "building-type-count")
    return state.completedBuildings[parameter as BuildingId] ?? 0;
  if (name === "building-type-count-total")
    return (
      (state.completedBuildings[parameter as BuildingId] ?? 0) +
      (state.pendingBuildings[parameter as BuildingId] ?? 0)
    );
  return undefined;
}
function memoryFor(
  project: AdaptiveProject,
  state: AdaptiveSituation,
): PreviewMemory {
  const projectKey = JSON.stringify(project);
  if (
    state.memory?.projectKey === projectKey &&
    state.gameSeconds >= state.memory.lastTime
  )
    return structuredClone(state.memory);
  return {
    projectKey,
    lastTime: state.gameSeconds,
    goals: {},
    timers: {},
    strategicNumbers: {},
    disabledRules: [],
  };
}
/** Execute policy bookkeeping from the SAME rule IR emitted as native code. */
export function evaluateAdaptive(
  project: AdaptiveProject,
  input?: Partial<AdaptiveSituation>,
): AdaptiveEvaluation {
  const state = normalizeSituation(input);
  const memory = memoryFor(project, state);
  const ir = buildAdaptiveIR(project);
  const diagnostics = ir.diagnostics.map((d) => `${d.path}: ${d.message}`);
  const scheduledActions: ScheduledAction[] = [];
  const firedRules: string[] = [];
  const unknown = new Set<string>();
  const conditionsByRule = new Map<string, Truth>();
  const disabled = new Set(memory.disabledRules);
  const unknownGoals = new Set(memory.unknownGoals ?? []);
  const goal = (value: Form | undefined): number | undefined =>
    unknownGoals.has(Number(scalar(value)))
      ? undefined
      : (memory.goals[Number(scalar(value))] ?? 0);
  const setGoal = (id: number, n: number | undefined) => {
    if (n === undefined) {
      unknownGoals.add(id);
      delete memory.goals[id];
    } else {
      unknownGoals.delete(id);
      memory.goals[id] = n;
    }
  };
  const value = (text: string): number | undefined =>
    text in symbols
      ? symbols[text]
      : Number.isFinite(Number(text)) && text !== ""
        ? Number(text)
        : undefined;
  function operand(mode: string, token: string): number | undefined {
    return mode.startsWith("g:")
      ? goal(token)
      : mode.startsWith("s:")
        ? memory.strategicNumbers[token]
        : value(token);
  }
  function test(form: Form, original: string): Truth {
    if (!Array.isArray(form)) return undefined;
    const [head, ...tail] = form;
    const name = scalar(head);
    const p = tail.map(scalar);
    const exact = state.nativeFacts[original];
    if (typeof exact === "boolean") return exact;
    if (name === "true") return true;
    if (name === "false") return false;
    if (name === "not") {
      const result = test(tail[0], "");
      return result === undefined ? undefined : !result;
    }
    if (name === "or" || name === "and") {
      const values = tail.map((f) => test(f, ""));
      if (name === "or")
        return values.includes(true)
          ? true
          : values.includes(undefined)
            ? undefined
            : false;
      return values.includes(false)
        ? false
        : values.includes(undefined)
          ? undefined
          : true;
    }
    if (name === "goal") return compare(goal(tail[0]), "==", value(p[1]));
    if (name === "up-compare-goal")
      return compare(
        goal(tail[0]),
        p[1].replace(/^[cgs]:/, ""),
        operand(p[1], p[2]),
      );
    if (name === "strategic-number")
      return compare(memory.strategicNumbers[p[0]], p[1], value(p[2]));
    if (name === "timer-triggered")
      return (
        memory.timers[Number(p[0])] !== undefined &&
        state.gameSeconds >= memory.timers[Number(p[0])]
      );
    if (name === "up-timer-status") {
      const parts = p.filter((x) => x !== "c:");
      const deadline = memory.timers[Number(parts[0])];
      return compare(
        deadline === undefined ? 0 : state.gameSeconds >= deadline ? 1 : 2,
        parts[1],
        value(parts[2]),
      );
    }
    if (name === "town-under-attack") return state.townUnderAttack;
    if (name === "can-build" || name === "up-can-build")
      return state.canBuild[p.at(-1) as BuildingId];
    if (name === "can-train" || name === "up-can-train")
      return state.canTrain[p.at(-1) as UnitId];
    if (name === "up-research-status") {
      const research = p[1] as ResearchId;
      const rank =
        state.completedResearch.includes(research) ||
        (research.endsWith("-age") && ranks[research] <= ranks[state.age])
          ? 3
          : state.researching.includes(research)
            ? 2
            : state.canResearch[research] === true
              ? 1
              : state.canResearch[research] === false
                ? 0
                : undefined;
      return compare(rank, p[2].replace(/^[cgs]:/, ""), operand(p[2], p[3]));
    }
    if (name === "up-gaia-type-count")
      return compare(
        state.resourceCounts[p[1] as Resource],
        p[2].replace(/^[cgs]:/, ""),
        operand(p[2], p[3]),
      );
    if (name === "can-research" || name === "up-can-research")
      return state.canResearch[p.at(-1) as ResearchId] === true &&
        !state.completedResearch.includes(p.at(-1) as ResearchId) &&
        !state.researching.includes(p.at(-1) as ResearchId)
        ? true
        : state.canResearch[p.at(-1) as ResearchId] === false ||
            state.completedResearch.includes(p.at(-1) as ResearchId) ||
            state.researching.includes(p.at(-1) as ResearchId)
          ? false
          : undefined;
    if (name === "research-completed")
      return state.completedResearch.includes(p[0] as ResearchId);
    if (name === "research-available")
      return state.canResearch[p[0] as ResearchId];
    if (name === "up-pending-placement")
      return state.placementBlocked.includes(p.at(-1) as BuildingId);
    if (name === "up-pending-objects")
      return compare(
        state.pendingBuildings[p[1] as BuildingId] ??
          state.queuedUnits[p[1] as UnitId] ??
          0,
        p[2],
        value(p[3]),
      );
    if (
      name === "up-enemy-buildings-in-town" ||
      name === "enemy-buildings-in-town"
    )
      return isFresh(state, "buildings")
        ? compare(state.enemyBuildingsInTown, p.at(-2)!, value(p.at(-1)!))
        : undefined;
    if (name === "up-unit-type-in-town") {
      const id = p.find((x) => UNITS_RUNTIME.has(x));
      return id && isFresh(state, id)
        ? compare(
            state.enemyUnitsInTown[id as UnitId] ?? 0,
            p.at(-2)!,
            value(p.at(-1)!),
          )
        : undefined;
    }
    const hasParameter =
      name.startsWith("unit-type-") || name.startsWith("building-type-");
    const number = count(state, name, hasParameter ? p[0] : "");
    if (number !== undefined)
      return compare(
        number,
        p[hasParameter ? 1 : 0],
        value(p[hasParameter ? 2 : 1]),
      );
    return undefined;
  }
  function execute(text: string, rule: AdaptiveNativeRule) {
    const form = parse(text);
    if (!Array.isArray(form)) return;
    const [head, ...tail] = form;
    const name = scalar(head);
    const p = tail.map(scalar);
    if (name === "set-goal") {
      const n = value(p[1]);
      setGoal(Number(p[0]), n);
      return;
    }
    if (name === "up-modify-goal") {
      const id = Number(p[0]);
      const a = goal(p[0]);
      const b = operand(p[1], p[2]);
      if (b === undefined || (a === undefined && !p[1].endsWith("="))) {
        setGoal(id, undefined);
        unknown.add(text);
        return;
      }
      const op = p[1].replace(/^[cgs]:/, "");
      const next =
        op === "="
          ? b
          : op === "+"
            ? (a ?? 0) + b
            : op === "-"
              ? (a ?? 0) - b
              : op === "*"
                ? (a ?? 0) * b
                : op === "/" && b !== 0
                  ? Math.trunc((a ?? 0) / b)
                  : op === "min"
                    ? Math.min(a ?? 0, b)
                    : op === "max"
                      ? Math.max(a ?? 0, b)
                      : undefined;
      setGoal(id, next);
      if (next === undefined) unknown.add(text);
      return;
    }
    if (name === "up-get-fact") {
      const n = count(state, p[0], p[1]);
      setGoal(Number(p[2]), n);
      if (n === undefined) unknown.add(text);
      return;
    }
    if (name === "up-setup-cost-data") {
      memory.costBase = Number(p[1]);
      if (p[0] === "1")
        for (let offset = 0; offset < 4; offset++)
          setGoal(memory.costBase + offset, 0);
      return;
    }
    if (name === "up-add-object-cost") {
      const cost = state.objectCosts[p[1] as UnitId | BuildingId];
      const amount = operand(p[2], p[3]);
      if (memory.costBase !== undefined)
        (["food", "wood", "stone", "gold"] as const).forEach(
          (resource, offset) => {
            const id = memory.costBase! + offset;
            const current = goal(String(id));
            const unitCost = cost?.[resource];
            setGoal(
              id,
              current !== undefined &&
                unitCost !== undefined &&
                Number.isFinite(unitCost) &&
                amount !== undefined
                ? current + unitCost * amount
                : undefined,
            );
          },
        );
      if (!cost) unknown.add(text);
      return;
    }
    if (name === "up-get-cost-delta") {
      (["food", "wood", "stone", "gold"] as const).forEach(
        (resource, offset) => {
          const cost =
            memory.costBase === undefined
              ? undefined
              : goal(String(memory.costBase + offset));
          setGoal(
            Number(p[0]) + offset,
            cost === undefined ? undefined : state.resources[resource] - cost,
          );
        },
      );
      return;
    }
    if (name === "set-strategic-number") {
      const n = value(p[1]);
      if (n !== undefined) memory.strategicNumbers[p[0]] = n;
      return;
    }
    if (name === "enable-timer") {
      memory.timers[Number(p[0])] = state.gameSeconds + Number(p[1]);
      return;
    }
    if (name === "disable-timer") {
      delete memory.timers[Number(p[0])];
      return;
    }
    if (name === "disable-self") {
      disabled.add(rule.id);
      return;
    }
    if (name === "do-nothing" || name.startsWith("chat-")) return;
    if (
      [
        "build",
        "up-build",
        "train",
        "up-train",
        "research",
        "up-research",
        "up-target-point",
        "up-target-objects",
        "attack-now",
        "up-retreat-now",
        "up-retreat-to",
        "up-reset-placement",
      ].includes(name)
    ) {
      scheduledActions.push({
        owner: rule.source,
        kind: name,
        priority: 0,
        action: text,
        reason: `Rule ${rule.id}: all supplied conditions passed. This is a request, not an observed outcome.`,
      });
      return;
    }
    // Mark engine-produced values unknown rather than letting zero act as evidence.
    const outputs: Record<string, [number, number]> = {
      "up-get-search-state": [Number(p[0]), 4],
      "up-get-point": [Number(p[1]), 2],
      "up-get-object-data": [Number(p[1]), 1],
      "up-get-cost-delta": [Number(p[0]), 4],
    };
    const output = outputs[name];
    if (output)
      for (let offset = 0; offset < output[1]; offset++)
        setGoal(output[0] + offset, undefined);
    unknown.add(text);
  }
  if (!ir.diagnostics.some((d) => d.severity === "error"))
    for (const rule of ir.rules) {
      if (!rule.enabled || disabled.has(rule.id)) continue;
      const results = rule.conditions.map((c) => test(parse(c), c));
      const truth = results.includes(false)
        ? false
        : results.includes(undefined)
          ? undefined
          : true;
      conditionsByRule.set(rule.id, truth);
      if (truth === undefined)
        rule.conditions.forEach((c, i) => {
          if (results[i] === undefined) unknown.add(c);
        });
      if (truth !== true) continue;
      firedRules.push(rule.id);
      rule.actions.forEach((action) => execute(action, rule));
    }
  memory.lastTime = state.gameSeconds;
  memory.disabledRules = [...disabled];
  memory.unknownGoals = [...unknownGoals];
  let phase: AgeKey = state.age === "post-imperial" ? "imperial" : state.age;
  if (phase === "imperial" && memory.goals[ir.phaseGoals.postImperial] === 1)
    phase = "postImperial";
  const steps: StepDecision[] = project.steps
    .filter((s) => s.enabled)
    .map((step) => {
      const source = `steps.${project.steps.indexOf(step)}`;
      const requested = scheduledActions.some(
        (a) => a.owner === source || a.owner.startsWith(`${source}.`),
      );
      const rank = AGE_ORDER.indexOf(step.phase);
      const current = AGE_ORDER.indexOf(phase);
      let status: StepStatus = "requested";
      let reason = `Waiting for ${step.phase} and preceding outcomes.`;
      if (state.blockedSteps.includes(step.id)) {
        status = "blocked";
        reason = "The snapshot explicitly reports this outcome blocked.";
      } else if (step.kind === "build") {
        const done = state.completedBuildings[step.building] ?? 0;
        const pending = state.pendingBuildings[step.building] ?? 0;
        if (done >= step.count) {
          status = "completed";
          reason = `${done} completed buildings meet the target.`;
        } else if (state.placementBlocked.includes(step.building)) {
          status = "blocked";
          reason = "The requested placement is blocked.";
        } else if (pending > 0 || requested) {
          status = "active";
          reason = `${done} completed, ${pending} pending. Wait for observed completion.`;
        } else if (rank <= current && state.canBuild[step.building] === false) {
          status = "blocked";
          reason =
            "Observed affordability or prerequisites block construction.";
        }
      } else if (step.kind === "train") {
        const done = completedUnits(state, step.unit);
        const queued =
          step.unit === "villager"
            ? state.queuedVillagers
            : (state.queuedUnits[step.unit] ?? 0);
        if (done >= step.count) {
          status = "completed";
          reason = `${done} completed units meet the target.`;
        } else if (queued > 0 || requested) {
          status = "active";
          reason = `${done} completed, ${queued} queued. Queued units do not complete the outcome.`;
        } else if (rank <= current && state.canTrain[step.unit] === false) {
          status = "blocked";
          reason = "Observed production or affordability blocks training.";
        }
      } else if (step.kind === "research") {
        if (
          state.completedResearch.includes(step.research) ||
          (step.research.endsWith("-age") &&
            (ranks[step.research] ?? 100) <= ranks[state.age])
        ) {
          status = "completed";
          reason = "Research completion or the resulting age is observed.";
        } else if (state.researching.includes(step.research) || requested) {
          status = "active";
          reason =
            "Research requested/in progress; completion has not been observed.";
        } else if (
          rank <= current &&
          state.canResearch[step.research] === false
        ) {
          status = "blocked";
          reason =
            "Research is currently unavailable according to the snapshot.";
        }
      } else if (
        step.kind === "milestone" &&
        state.milestones.includes(step.milestone)
      ) {
        status = "completed";
        reason =
          "This milestone is explicitly recorded in the observation snapshot.";
      } else if (
        step.kind === "allocate" &&
        firedRules.some(
          (id) => ir.rules.find((r) => r.id === id)?.source === source,
        )
      ) {
        status = "active";
        reason =
          "Allocation policy applied. Worker movement and gathering are not simulated.";
      }
      const nativeState = ir.stepGoals[step.id]
        ? goal(String(ir.stepGoals[step.id].state))
        : undefined;
      if (nativeState === 3) {
        status = "blocked";
        reason =
          "The shared native policy has entered its blocked state; approved recovery may retry.";
      } else if (
        (step.kind === "milestone" || step.kind === "allocate") &&
        nativeState === 2
      ) {
        status = "completed";
        reason =
          "The shared native policy completed this checkpoint after its prerequisite gates.";
      } else if (nativeState === 1 && status === "requested") {
        status = "active";
        reason =
          "The native policy has issued this outcome and is waiting for observed completion.";
      }
      return { id: step.id, label: step.label, status, reason, action: step };
    });
  const responses: ResponseDecision[] = project.responses
    .filter((r) => r.enabled)
    .map((response) => {
      const source = `responses.${project.responses.indexOf(response)}`;
      const issued = scheduledActions.filter(
        (action) =>
          action.owner === source || action.owner.startsWith(`${source}.`),
      );
      const matching = ir.rules.filter(
        (rule) =>
          rule.source === source || rule.source.startsWith(`${source}.`),
      );
      const unknownConditions = matching.some(
        (rule) => conditionsByRule.get(rule.id) === undefined,
      );
      const active = ir.responseGoals[response.id]
        ? goal(String(ir.responseGoals[response.id].active)) === 1
        : false;
      const recoveryText =
        response.recovery.kind === "threshold"
          ? `recovery threshold ${response.recovery.threshold}`
          : response.recovery.kind === "milestone"
            ? `milestone ${response.recovery.milestone}`
            : `${response.recovery.afterSeconds}s recovery timeout`;
      const activeReason = `Active after ${response.trigger.kind} met its ${response.trigger.sustainedSeconds}s trigger window. Ends after ${recoveryText} and minimum dwell, or the ${response.limits.maxDurationSeconds}s maximum duration.`;
      return {
        id: response.id,
        label: response.label,
        active,
        reason: active
          ? `${activeReason}${issued.length ? ` Requested ${issued.map((a) => a.kind).join(", ")}.` : ""}`
          : unknownConditions
            ? "Waiting: one or more native observations are unknown in this snapshot."
            : "Waiting for the native trigger, sustained interval, authority or recovery/cooldown gates.",
        actions: active ? response.actions : [],
      };
    });
  if (unknown.size)
    diagnostics.push(
      `${unknown.size} engine-dependent checks or actions are not supplied by this snapshot. They are not assumed successful. No pathfinding, combat or production is simulated.`,
    );
  return {
    phase,
    steps,
    responses,
    scheduledActions,
    diagnostics,
    memory,
    firedRules,
  };
}
const UNITS_RUNTIME = new Set([
  "archer",
  "archer-line",
  "crossbowman",
  "arbalest",
  "spearman-line",
  "knight-line",
  "organ-gun",
  "skirmisher-line",
  "trebuchet",
]);
export const previewAdaptive = evaluateAdaptive;
export function phaseForAge(age: NativeAge): AgeKey {
  return age === "post-imperial" ? "imperial" : age;
}
export function nativeAgeRank(age: NativeAge): number {
  return ranks[age];
}
export function nativeAgeForPhase(age: AgeKey): NativeAge {
  return age === "postImperial" ? "imperial" : age;
}
export function isPhaseReached(age: NativeAge, phase: AgeKey): boolean {
  return phase !== "postImperial" && ranks[age] >= AGE_ORDER.indexOf(phase);
}
export function civilizationName(civilization: Civilization): string {
  return civilization === "britons" ? "Britons" : "Portuguese";
}
