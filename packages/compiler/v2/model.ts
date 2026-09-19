import { z } from "zod";

/**
 * The v2 project format is deliberately data-only.  Native identifiers are
 * selected from the catalog in catalog.ts; projects cannot inject script
 * fragments or arbitrary command names.
 */

export const AGE_ORDER = [
  "dark",
  "feudal",
  "castle",
  "imperial",
  "postImperial",
] as const;
export type AgeKey = (typeof AGE_ORDER)[number];
export type NativeAge =
  | "dark"
  | "feudal"
  | "castle"
  | "imperial"
  | "post-imperial";

export const NATIVE_AGE: Record<AgeKey, NativeAge> = {
  dark: "dark",
  feudal: "feudal",
  castle: "castle",
  imperial: "imperial",
  postImperial: "post-imperial",
};

export const CIVILIZATIONS = ["britons", "portuguese"] as const;
export type Civilization = (typeof CIVILIZATIONS)[number];

export const RESOURCES = ["food", "wood", "gold", "stone"] as const;
export type Resource = (typeof RESOURCES)[number];

export const BUILDINGS = [
  "house",
  "farm",
  "lumber-camp",
  "mill",
  "mining-camp",
  "barracks",
  "archery-range",
  "blacksmith",
  "stable",
  "market",
  "siege-workshop",
  "university",
  "monastery",
  "castle",
  "town-center",
  "palisade-wall",
  "stone-wall",
  "watch-tower",
] as const;
export type BuildingId = (typeof BUILDINGS)[number];

export const UNITS = [
  "villager",
  "scout-cavalry-line",
  "archer",
  "crossbowman",
  "arbalest",
  "skirmisher-line",
  "elite-skirmisher",
  "spearman-line",
  "pikeman",
  "halberdier",
  "knight-line",
  "hand-cannoneer",
  "organ-gun",
  "mangonel-line",
  "scorpion-line",
  "battering-ram-line",
  "trebuchet",
] as const;
export type UnitId = (typeof UNITS)[number];

/** Research names use the spelling accepted by the native AI command set. */
export const RESEARCH = [
  "loom",
  "feudal-age",
  "castle-age",
  "imperial-age",
  "ri-wheel-barrow",
  "ri-double-bit-axe",
  "ri-horse-collar",
  "ri-bow-saw",
  "ri-fletching",
  "ri-bodkin-arrow",
  "ri-bracer",
  "ri-crossbow",
  "ri-arbalest",
  "ri-chemistry",
  "ri-pikeman",
  "ri-yeoman",
  "my-second-unique-research",
  "my-unique-research",
] as const;
export type ResearchId = (typeof RESEARCH)[number];

const integer = (min: number, max: number) =>
  z.number().int().min(min).max(max);
const nonNegativeInteger = (max: number) => integer(0, max);
const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9-]*$/);
const label = z.string().min(1).max(120);

export const resourceAllocationSchema = z
  .object({
    food: integer(0, 100),
    wood: integer(0, 100),
    gold: integer(0, 100),
    stone: integer(0, 100),
  })
  .strict();
export type ResourceAllocation = z.infer<typeof resourceAllocationSchema>;

export const resourceAmountsSchema = z
  .object({
    food: nonNegativeInteger(200_000),
    wood: nonNegativeInteger(200_000),
    gold: nonNegativeInteger(200_000),
    stone: nonNegativeInteger(200_000),
  })
  .strict();
export type ResourceAmounts = z.infer<typeof resourceAmountsSchema>;

export const phaseSchema = z
  .object({
    villagers: integer(4, 200),
    resources: resourceAllocationSchema,
    milestone: label.optional(),
  })
  .strict();
export type Phase = z.infer<typeof phaseSchema>;

const stepBase = {
  id: slug,
  label,
  phase: z.enum(AGE_ORDER),
  priority: integer(0, 100),
  enabled: z.boolean(),
};

export const allocateStepSchema = z
  .object({
    ...stepBase,
    kind: z.literal("allocate"),
    resources: resourceAllocationSchema,
    villagerCount: integer(0, 200).optional(),
  })
  .strict();

export const buildStepSchema = z
  .object({
    ...stepBase,
    kind: z.literal("build"),
    building: z.enum(BUILDINGS),
    count: integer(1, 200),
    placementId: slug.optional(),
  })
  .strict();

export const researchStepSchema = z
  .object({
    ...stepBase,
    kind: z.literal("research"),
    research: z.enum(RESEARCH),
  })
  .strict();

export const trainStepSchema = z
  .object({
    ...stepBase,
    kind: z.literal("train"),
    unit: z.enum(UNITS),
    count: integer(1, 200),
    productionBuilding: z.enum(BUILDINGS).optional(),
    whileBuildingMissing: z.enum(BUILDINGS).optional(),
  })
  .strict();

export const milestoneStepSchema = z
  .object({
    ...stepBase,
    kind: z.literal("milestone"),
    milestone: slug,
  })
  .strict();

export const stepSchema = z.discriminatedUnion("kind", [
  allocateStepSchema,
  buildStepSchema,
  researchStepSchema,
  trainStepSchema,
  milestoneStepSchema,
]);
export type AllocateStep = z.infer<typeof allocateStepSchema>;
export type BuildStep = z.infer<typeof buildStepSchema>;
export type ResearchStep = z.infer<typeof researchStepSchema>;
export type TrainStep = z.infer<typeof trainStepSchema>;
export type MilestoneStep = z.infer<typeof milestoneStepSchema>;
export type StrategyStep = z.infer<typeof stepSchema>;

export const PLACEMENT_ANCHORS = [
  "home-town-center",
  "resource",
  "production",
  "forward-pressure",
  "map-center",
] as const;
export type PlacementAnchor = (typeof PLACEMENT_ANCHORS)[number];

export const PLACEMENT_DIRECTIONS = [
  "behind",
  "toward-enemy",
  "left",
  "right",
  "around",
  "none",
] as const;
export type PlacementDirection = (typeof PLACEMENT_DIRECTIONS)[number];

export const PLACEMENT_FALLBACKS = [
  "home-town-center",
  "resource",
  "production",
  "forward-pressure",
  "map-center",
  "normal",
] as const;
export type PlacementFallback = (typeof PLACEMENT_FALLBACKS)[number];

const placementOptionSchema = z
  .object({
    anchor: z.enum(PLACEMENT_ANCHORS),
    direction: z.enum(PLACEMENT_DIRECTIONS),
    distance: integer(-254, 254),
    spacing: integer(0, 20),
  })
  .strict();

export const placementSchema = z
  .object({
    id: slug,
    label,
    building: z.enum(BUILDINGS),
    anchor: z.enum(PLACEMENT_ANCHORS),
    direction: z.enum(PLACEMENT_DIRECTIONS),
    distance: integer(-254, 254),
    spacing: integer(0, 20),
    strict: z.boolean(),
    observedOnly: z.boolean(),
    resource: z.enum(RESOURCES).optional(),
    anchorBuilding: z.enum(BUILDINGS).optional(),
    fallback: z.array(placementOptionSchema).max(5),
  })
  .strict();
export type PlacementOption = z.infer<typeof placementOptionSchema>;
export type PlacementPolicy = z.infer<typeof placementSchema>;

export const RESPONSE_KINDS = [
  "housing-shortage",
  "builder-lost",
  "foundation-lost",
  "resource-depleted",
  "resource-threatened",
  "raid",
  "forward-defense",
  "placement-blocked",
  "counter-army",
  "development-stalled",
] as const;
export type ResponseKind = (typeof RESPONSE_KINDS)[number];

export const observationSchema = z.enum(["observed", "remembered", "either"]);
export type ObservationMode = z.infer<typeof observationSchema>;

export const responseTriggerSchema = z
  .object({
    kind: z.enum(RESPONSE_KINDS),
    threshold: integer(0, 200_000).optional(),
    unit: z.enum(UNITS).optional(),
    resource: z.enum(RESOURCES).optional(),
    sustainedSeconds: integer(0, 3_600),
    observation: observationSchema,
  })
  .strict();
export type ResponseTrigger = z.infer<typeof responseTriggerSchema>;

const responseActionBase = { priority: integer(0, 100) };
export const defendActionSchema = z
  .object({
    ...responseActionBase,
    kind: z.literal("defend"),
    unit: z.enum(UNITS).optional(),
  })
  .strict();
export const retreatActionSchema = z
  .object({
    ...responseActionBase,
    kind: z.literal("retreat"),
    unit: z.enum(UNITS).optional(),
  })
  .strict();
export const allocateActionSchema = z
  .object({
    ...responseActionBase,
    kind: z.literal("allocate"),
    resources: resourceAllocationSchema,
  })
  .strict();
export const responseBuildActionSchema = z
  .object({
    ...responseActionBase,
    kind: z.literal("build"),
    building: z.enum(BUILDINGS),
    count: integer(1, 20),
    placementId: slug.optional(),
  })
  .strict();
export const responseTrainActionSchema = z
  .object({
    ...responseActionBase,
    kind: z.literal("train"),
    unit: z.enum(UNITS),
    count: integer(1, 100),
  })
  .strict();
export const pivotActionSchema = z
  .object({
    ...responseActionBase,
    kind: z.literal("pivot"),
    stepIds: z.array(slug).min(1).max(20),
  })
  .strict();
export const resetPlacementActionSchema = z
  .object({
    ...responseActionBase,
    kind: z.literal("reset-placement"),
    building: z.enum(BUILDINGS),
  })
  .strict();

export const responseActionSchema = z.discriminatedUnion("kind", [
  defendActionSchema,
  retreatActionSchema,
  allocateActionSchema,
  responseBuildActionSchema,
  responseTrainActionSchema,
  pivotActionSchema,
  resetPlacementActionSchema,
]);
export type ResponseAction = z.infer<typeof responseActionSchema>;

export const recoverySchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("threshold"),
      threshold: integer(0, 200_000),
      resource: z.enum(RESOURCES).optional(),
    })
    .strict(),
  z.object({ kind: z.literal("milestone"), milestone: slug }).strict(),
  z
    .object({ kind: z.literal("timeout"), afterSeconds: integer(1, 3_600) })
    .strict(),
]);
export type RecoveryCondition = z.infer<typeof recoverySchema>;

export const responseLimitsSchema = z
  .object({
    maxDurationSeconds: integer(5, 3_600),
    maxWorkers: integer(0, 50),
    emergencySpend: resourceAmountsSchema,
    allowPivot: z.boolean(),
  })
  .strict();
export type ResponseLimits = z.infer<typeof responseLimitsSchema>;

export const responseSchema = z
  .object({
    id: slug,
    label,
    enabled: z.boolean(),
    priority: integer(0, 100),
    trigger: responseTriggerSchema,
    actions: z.array(responseActionSchema).min(1).max(20),
    recovery: recoverySchema,
    cooldownSeconds: integer(0, 3_600),
    limits: responseLimitsSchema,
  })
  .strict();
export type ResponseRule = z.infer<typeof responseSchema>;

export const TARGET_PRIORITIES = [
  "closest",
  "ranged",
  "siege",
  "villagers",
  "buildings",
  "weakest",
  "highest-threat",
] as const;
export type TargetPriority = (typeof TARGET_PRIORITIES)[number];
export const MICRO_AGGRESSION = ["cautious", "balanced", "aggressive"] as const;
export type MicroAggression = (typeof MICRO_AGGRESSION)[number];

export const microModuleSchema = z
  .object({
    enabled: z.boolean(),
    aggression: z.enum(MICRO_AGGRESSION),
    targetPriorities: z.array(z.enum(TARGET_PRIORITIES)).min(1).max(7),
    retreatHealthPercent: integer(0, 100),
    regroupSeconds: integer(2, 120),
    searchIntervalSeconds: integer(2, 60),
    groupSize: integer(1, 40),
    observedOnly: z.boolean(),
  })
  .strict();
export type MicroModule = z.infer<typeof microModuleSchema>;

export const microSchema = z
  .object({
    ownership: z.literal("exclusive"),
    globalReactionIntervalSeconds: integer(2, 60),
    ranged: microModuleSchema,
    melee: microModuleSchema,
    siege: microModuleSchema,
    screening: microModuleSchema,
  })
  .strict();
export type MicroProfile = z.infer<typeof microSchema>;

export const authorityLimitsSchema = z
  .object({
    allowPivots: z.boolean(),
    allowEmergencySpend: z.boolean(),
    maxEmergencySpend: resourceAmountsSchema,
    maxConcurrentResponses: integer(1, 8),
    minimumResponseSeconds: integer(2, 600),
    strictPlacement: z.boolean(),
  })
  .strict();
export type AuthorityLimits = z.infer<typeof authorityLimitsSchema>;

export const scenarioSchema = z
  .object({
    mapStyle: z.literal("arabia-1v1"),
    playerCount: z.literal(2),
    resources: z.literal("standard"),
    startingAge: z.literal("dark"),
    populationLimit: z.literal(200),
  })
  .strict();
export type Scenario = z.infer<typeof scenarioSchema>;

export const adaptiveProjectSchema = z
  .object({
    schemaVersion: z.literal(2),
    name: z
      .string()
      .min(1)
      .max(48)
      .regex(/^[A-Za-z0-9][A-Za-z0-9 _-]*$/)
      .refine(
        (n) =>
          n === n.trim() && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(n),
        "Use a portable filename, without trailing spaces or reserved names.",
      ),
    civilization: z.enum(CIVILIZATIONS),
    scenario: scenarioSchema,
    phases: z
      .object({
        dark: phaseSchema,
        feudal: phaseSchema,
        castle: phaseSchema,
        imperial: phaseSchema,
        postImperial: phaseSchema,
      })
      .strict(),
    steps: z.array(stepSchema).min(1).max(300),
    responses: z.array(responseSchema).max(100),
    placements: z.array(placementSchema).max(100),
    micro: microSchema,
    limits: authorityLimitsSchema,
  })
  .strict();
export type AdaptiveProject = z.infer<typeof adaptiveProjectSchema>;

export type Diagnostic = {
  severity: "error" | "warning";
  path: string;
  message: string;
  code?: string;
};

const nameForPath = (path: PropertyKey[]) =>
  path.length ? path.map(String).join(".") : "Project";

/** Structural and cross-field validation shared by the editor and compiler. */
export function validateAdaptiveProject(input: unknown): Diagnostic[] {
  const parsed = adaptiveProjectSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      severity: "error" as const,
      path: nameForPath(issue.path),
      message: issue.message,
      code: "schema",
    }));
  }
  const project = parsed.data;
  const issues: Diagnostic[] = [];
  const error = (path: string, message: string, code = "invalid") =>
    issues.push({ severity: "error", path, message, code });
  const warning = (path: string, message: string, code = "warning") =>
    issues.push({ severity: "warning", path, message, code });

  let previousVillagers = 0;
  for (const age of AGE_ORDER) {
    const phase = project.phases[age];
    const total = RESOURCES.reduce(
      (sum, resource) => sum + phase.resources[resource],
      0,
    );
    if (total !== 100)
      error(
        `phases.${age}.resources`,
        "Resource shares must add up to 100%.",
        "resource-total",
      );
    if (phase.resources.food === 0 || phase.resources.wood === 0)
      error(
        `phases.${age}.resources`,
        "Keep some villagers on both food and wood.",
        "economy-continuity",
      );
    if (phase.villagers < previousVillagers)
      error(
        `phases.${age}.villagers`,
        "Villager targets cannot decrease between phases.",
        "villager-regression",
      );
    previousVillagers = phase.villagers;
  }

  const stepIds = new Set<string>();
  for (const [index, step] of project.steps.entries()) {
    if (stepIds.has(step.id))
      error(
        `steps.${index}.id`,
        `Step id '${step.id}' is duplicated.`,
        "duplicate-id",
      );
    stepIds.add(step.id);
    if (!step.enabled)
      warning(
        `steps.${index}`,
        "This step is disabled in the main order. It is emitted only when an enabled, authorized pivot references it.",
        "disabled-step",
      );
  }

  const placementIds = new Set<string>();
  for (const [index, placement] of project.placements.entries()) {
    if (placementIds.has(placement.id))
      error(
        `placements.${index}.id`,
        `Placement id '${placement.id}' is duplicated.`,
        "duplicate-id",
      );
    placementIds.add(placement.id);
    if (
      placement.anchor === "resource" &&
      !placement.resource &&
      !placement.anchorBuilding
    ) {
      error(
        `placements.${index}`,
        "Resource placement needs a resource or anchor building.",
        "placement-anchor",
      );
    }
    if (
      placement.anchor !== "resource" &&
      (placement.resource || placement.anchorBuilding)
    ) {
      warning(
        `placements.${index}`,
        "Resource and anchor-building fields are ignored outside resource placement.",
        "placement-field",
      );
    }
    if (placement.strict) {
      error(
        `placements.${index}.strict`,
        "Native placement expands its search zone when blocked, so hard geometry is not enforceable; disable strict placement and use ordered fallbacks.",
        "unsupported-placement-constraint",
      );
    } else if (placement.spacing > 0) {
      error(
        `placements.${index}.spacing`,
        "Native managed placement does not expose reliable inter-building spacing. Use zero until blueprint placement is available.",
        "unsupported-placement-spacing",
      );
    }
    if (project.limits.strictPlacement && !placement.strict) {
      error(
        `placements.${index}.strict`,
        "The project requests strict placement globally, but native placement cannot guarantee hard geometry.",
        "strict-placement",
      );
    }
  }
  for (const [index, step] of project.steps.entries()) {
    if (
      step.kind === "build" &&
      step.placementId &&
      !placementIds.has(step.placementId)
    )
      error(
        `steps.${index}.placementId`,
        `Unknown placement '${step.placementId}'.`,
        "unknown-reference",
      );
  }

  const responseIds = new Set<string>();
  for (const [index, response] of project.responses.entries()) {
    if (responseIds.has(response.id))
      error(
        `responses.${index}.id`,
        `Response id '${response.id}' is duplicated.`,
        "duplicate-id",
      );
    responseIds.add(response.id);
    if (response.limits.allowPivot && !project.limits.allowPivots)
      warning(
        `responses.${index}.limits.allowPivot`,
        "Project-level pivot authority is disabled; this response cannot pivot.",
        "authority-limit",
      );
    if (response.trigger.kind === "counter-army" && !response.trigger.unit)
      error(
        `responses.${index}.trigger.unit`,
        "Counter-army triggers need an observed unit type.",
        "trigger-field",
      );
    if (
      response.trigger.kind === "resource-depleted" &&
      !response.trigger.resource
    )
      error(
        `responses.${index}.trigger.resource`,
        "Resource-depleted triggers need a resource.",
        "trigger-field",
      );
    for (const [actionIndex, action] of response.actions.entries()) {
      if (action.kind === "pivot") {
        for (const stepId of action.stepIds)
          if (!stepIds.has(stepId))
            error(
              `responses.${index}.actions.${actionIndex}`,
              `Unknown pivot step '${stepId}'.`,
              "unknown-reference",
            );
      }
      if (
        action.kind === "build" &&
        action.placementId &&
        !placementIds.has(action.placementId)
      )
        error(
          `responses.${index}.actions.${actionIndex}.placementId`,
          `Unknown placement '${action.placementId}'.`,
          "unknown-reference",
        );
    }
    const recovery = response.recovery;
    if (
      recovery.kind === "milestone" &&
      !project.steps.some(
        (step) =>
          step.kind === "milestone" && step.milestone === recovery.milestone,
      )
    ) {
      error(
        `responses.${index}.recovery.milestone`,
        `Unknown recovery milestone '${recovery.milestone}'.`,
        "unknown-reference",
      );
    }
    if (recovery.kind === "threshold") {
      const entry =
        response.trigger.threshold ??
        (response.trigger.kind === "housing-shortage" ||
        response.trigger.kind === "resource-depleted"
          ? 0
          : 1);
      if (
        (response.trigger.kind === "housing-shortage" ||
          response.trigger.kind === "resource-depleted") &&
        recovery.threshold <= entry
      ) {
        error(
          `responses.${index}.recovery.threshold`,
          "Recovery must be above the entry threshold to provide hysteresis.",
          "response-hysteresis",
        );
      } else if (
        (response.trigger.kind === "counter-army" ||
          response.trigger.kind === "forward-defense") &&
        recovery.threshold >= entry
      ) {
        error(
          `responses.${index}.recovery.threshold`,
          "Recovery must be below the entry threshold to provide hysteresis.",
          "response-hysteresis",
        );
      } else if (
        ![
          "housing-shortage",
          "resource-depleted",
          "counter-army",
          "forward-defense",
        ].includes(response.trigger.kind) &&
        recovery.threshold !== 0
      ) {
        error(
          `responses.${index}.recovery.threshold`,
          "This boolean trigger supports threshold recovery only at 0 (trigger cleared).",
          "unsupported-recovery-threshold",
        );
      }
    }
  }

  const totalPeak =
    project.phases.postImperial.villagers +
    project.steps.reduce(
      (sum, step) =>
        step.kind === "train" && step.enabled ? sum + step.count : sum,
      0,
    );
  if (totalPeak > project.scenario.populationLimit)
    warning(
      "steps",
      "Configured villager and unit targets can approach or exceed the 200 population profile; native housing and can-train checks remain authoritative.",
      "population-budget",
    );
  if (project.micro.ownership !== "exclusive")
    error(
      "micro.ownership",
      "Micro controllers must have exclusive ownership.",
      "micro-ownership",
    );
  return issues;
}

export function parseAdaptiveProject(text: string): AdaptiveProject {
  if (text.length > 200_000)
    throw new Error(
      "Project is too large. Open an AI Workshop v2 JSON project under 200 KB.",
    );
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "This is not valid JSON. Open a saved AI Workshop project.",
    );
  }
  const structural = adaptiveProjectSchema.safeParse(value);
  if (!structural.success)
    throw new Error(
      structural.error.issues
        .map((issue) => `${nameForPath(issue.path)}: ${issue.message}`)
        .join("\n"),
    );
  // Keep structural parsing separate from semantic validation.  The editor
  // must be able to open and repair an otherwise well-shaped draft; compiler
  // and export callers use validateAdaptiveProject as their semantic gate.
  return structural.data;
}
