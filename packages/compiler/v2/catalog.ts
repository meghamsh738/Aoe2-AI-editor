import type {
  AgeKey,
  BuildingId,
  Civilization,
  ResearchId,
  ResponseKind,
  UnitId,
} from "./model";

/**
 * A small, pinned command/data catalog for the first DE land-bot release.
 *
 * This is intentionally narrower than the complete game data set.  It keeps
 * the compiler from emitting a plausible-looking command for a unit or
 * technology that the selected civilisation cannot use.  The command names
 * are the native AI identifiers documented by AIREf; native compatibility is
 * still an external Windows test gate.
 */
export const CATALOG_VERSION = "aoe2de-land-v1-reviewed-unverified";
export const CATALOG_STATUS = "native-DE-validation-pending" as const;
export const CATALOG_PROVENANCE = {
  commands: "https://airef.github.io/commands/commands-details.html",
  gameData:
    "https://github.com/SiegeEngineers/aoe2techtree/blob/b9d494df6921d4080df69b22f9dbb7a4d1dcd9f0/data/data.json",
  gameDataRevision: "b9d494df6921d4080df69b22f9dbb7a4d1dcd9f0",
  reviewedOn: "2026-09-20",
  nativeStatus: "UNVERIFIED" as const,
};

export const CIVILIZATION_CATALOG: Record<
  Civilization,
  {
    label: string;
    units: readonly UnitId[];
    buildings: readonly BuildingId[];
    research: readonly ResearchId[];
  }
> = {
  britons: {
    label: "Britons",
    units: [
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
      "mangonel-line",
      "scorpion-line",
      "battering-ram-line",
      "trebuchet",
    ],
    buildings: [
      "house",
      "farm",
      "lumber-camp",
      "mill",
      "mining-camp",
      "barracks",
      "archery-range",
      "blacksmith",
      "market",
      "siege-workshop",
      "university",
      "monastery",
      "castle",
      "town-center",
      "palisade-wall",
      "stone-wall",
      "watch-tower",
    ],
    research: [
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
    ],
  },
  portuguese: {
    label: "Portuguese",
    units: [
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
    ],
    buildings: [
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
    ],
    research: [
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
      "my-second-unique-research",
      "my-unique-research",
    ],
  },
};

export const RESPONSE_NATIVE_SUPPORT: Record<
  ResponseKind,
  {
    supported: boolean;
    fact: string | null;
    explanation: string;
  }
> = {
  "housing-shortage": {
    supported: true,
    fact: "housing-headroom",
    explanation: "Uses the native housing-headroom fact.",
  },
  "builder-lost": {
    supported: true,
    fact: "progress-deadline",
    explanation:
      "Infers a lost builder when an active construction outcome has neither completed nor remained queued by its retry deadline.",
  },
  "foundation-lost": {
    supported: true,
    fact: "progress-deadline",
    explanation:
      "Infers a lost foundation from an active build outcome that falls below its completed/pending target.",
  },
  "resource-depleted": {
    supported: true,
    fact: "up-gaia-type-count",
    explanation:
      "Uses the native count of sighted resources that still exist; this is not omniscient.",
  },
  "resource-threatened": {
    supported: false,
    fact: null,
    explanation:
      "The native command set has no observation that reliably connects an attack to a particular resource location.",
  },
  raid: {
    supported: true,
    fact: "town-under-attack",
    explanation: "Uses the native town-under-attack event.",
  },
  "forward-defense": {
    supported: true,
    fact: "enemy-buildings-in-town",
    explanation:
      "Uses sighted enemy buildings inside the configured town radius.",
  },
  "placement-blocked": {
    supported: true,
    fact: "up-pending-placement",
    explanation: "Uses the native pending-placement fact.",
  },
  "counter-army": {
    supported: true,
    fact: "up-unit-type-in-town",
    explanation: "Uses targetable, sighted enemy units in town.",
  },
  "development-stalled": {
    supported: true,
    fact: "progress-deadline",
    explanation:
      "Uses compiler-owned outcome state and game-time deadlines after ordered placement retries are exhausted.",
  },
};

export const NATIVE_CAPABILITIES = {
  placement: ["place-normal", "place-forward", "place-control"] as const,
  targetActions: [
    "action-default",
    "action-move",
    "action-patrol",
    "action-guard",
    "action-follow",
    "action-stop",
    "action-ground",
    "action-garrison",
    "action-delete",
    "action-gather",
    "action-none",
  ] as const,
  formations: [
    "formation-line",
    "formation-box",
    "formation-stagger",
    "formation-flank",
  ] as const,
  stances: [
    "stance-aggressive",
    "stance-defensive",
    "stance-stand-ground",
    "stance-no-attack",
  ] as const,
  observations: ["observed", "remembered"] as const,
} as const;

/** Reviewed land production sites used to validate the editor's explicit queue choice. */
export const UNIT_PRODUCTION_BUILDINGS: Partial<
  Record<UnitId, readonly BuildingId[]>
> = {
  villager: ["town-center"],
  "scout-cavalry-line": ["stable"],
  archer: ["archery-range"],
  crossbowman: ["archery-range"],
  arbalest: ["archery-range"],
  "skirmisher-line": ["archery-range"],
  "elite-skirmisher": ["archery-range"],
  "spearman-line": ["barracks"],
  pikeman: ["barracks"],
  halberdier: ["barracks"],
  "knight-line": ["stable"],
  "hand-cannoneer": ["archery-range"],
  "organ-gun": ["castle"],
  trebuchet: ["castle"],
  "mangonel-line": ["siege-workshop"],
  "scorpion-line": ["siege-workshop"],
  "battering-ram-line": ["siege-workshop"],
};

export function supportsUnit(
  civilization: Civilization,
  unit: UnitId,
): boolean {
  return CIVILIZATION_CATALOG[civilization].units.includes(unit);
}

export function supportsBuilding(
  civilization: Civilization,
  building: BuildingId,
): boolean {
  return CIVILIZATION_CATALOG[civilization].buildings.includes(building);
}

export function supportsResearch(
  civilization: Civilization,
  research: ResearchId,
): boolean {
  return CIVILIZATION_CATALOG[civilization].research.includes(research);
}

export function ageCondition(
  age: AgeKey,
  phaseGoals: Record<AgeKey, number>,
): string[] {
  switch (age) {
    case "dark":
      return ["(current-age == dark-age)"];
    case "feudal":
      return ["(current-age >= feudal-age)"];
    case "castle":
      return ["(current-age >= castle-age)"];
    case "imperial":
      return ["(current-age == imperial-age)"];
    case "postImperial":
      return [
        "(current-age == imperial-age)",
        `(goal ${phaseGoals.postImperial} 1)`,
      ];
  }
}

export function phaseAgeName(age: AgeKey): string {
  return age === "postImperial" ? "post-imperial" : `${age}-age`;
}
