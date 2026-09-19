import type { Project } from "../model";
import {
  validateAdaptiveProject,
  adaptiveProjectSchema,
  type AdaptiveProject,
  type Diagnostic,
} from "./model";
import { CATALOG_PROVENANCE, CATALOG_STATUS, CATALOG_VERSION } from "./catalog";
import { buildAdaptiveIR, type AdaptiveNativeRule } from "./ir";
import { createPreset } from "./presets";

export * from "./model";
export * from "./catalog";
export * from "./ir";
export * from "./presets";
export * from "./runtime";

export interface AdaptiveSourceMap {
  rule: string;
  source: string;
  startLine: number;
  endLine: number;
}

export interface AdaptiveCompilation {
  script: string;
  per: string;
  files: Record<string, string>;
  sourceMap: AdaptiveSourceMap[];
  diagnostics: Diagnostic[];
  rules: AdaptiveNativeRule[];
}

const safeComment = (value: string): string =>
  value
    .replace(/[\r\n]+/g, " ")
    .replace(/[;()#]/g, "")
    .trim()
    .slice(0, 180);

export function compileAdaptive(input: unknown): AdaptiveCompilation {
  const ir = buildAdaptiveIR(input);
  if (ir.diagnostics.some((item) => item.severity === "error"))
    return {
      script: "",
      per: "",
      files: {},
      sourceMap: [],
      diagnostics: ir.diagnostics,
      rules: ir.rules,
    };
  const project = adaptiveProjectSchema.parse(input);
  const lines = [
    `; ${safeComment(project.name)} | AI Workshop adaptive compiler`,
    `; Civilization: ${project.civilization} | Catalog: ${CATALOG_VERSION}`,
    "; Native AoE II: DE status: UNVERIFIED. Static checks are not a game test.",
    "; Fair mode: native observations and remembered buildings only; no resource or map cheats.",
    "",
  ];
  const sourceMap: AdaptiveSourceMap[] = [];
  for (const rule of ir.rules.filter((item) => item.enabled)) {
    const startLine = lines.length + 1;
    lines.push(
      `; ${safeComment(rule.id)} | ${safeComment(rule.source)}`,
      `; ${safeComment(rule.description)}`,
      "(defrule",
      ...rule.conditions.map((condition) => `    ${condition}`),
      "=>",
      ...rule.actions.map((action) => `    ${action}`),
      ")",
      "",
    );
    sourceMap.push({
      rule: rule.id,
      source: rule.source,
      startLine,
      endLine: lines.length - 1,
    });
  }
  const script = lines.join("\r\n");
  const files: Record<string, string> = {
    [`${project.name}.ai`]: "",
    [`${project.name}.per`]: script,
    [`${project.name}.workshop.json`]: JSON.stringify(project, null, 2),
    "source-map.json": JSON.stringify(sourceMap, null, 2),
    "README.txt": `AI Workshop adaptive export\n\nNative AoE II: DE status: UNVERIFIED. No game build has been certified.\nCatalog: ${CATALOG_VERSION} (${CATALOG_STATUS})\nCommand reference: ${CATALOG_PROVENANCE.commands}\nPinned game data: ${CATALOG_PROVENANCE.gameData}\n\nUse ${project.name}.ai and ${project.name}.per together. Select ${project.civilization === "britons" ? "Britons" : "Portuguese"} on an Arabia-style 1v1 with standard resources, Dark Age start, and 200 population. The project JSON is the editable source. Record the game build, seed, script errors, replay, and observations with the included Windows test kit.\n`,
  };
  return {
    script,
    per: script,
    files,
    sourceMap,
    diagnostics: ir.diagnostics,
    rules: ir.rules,
  };
}

/** Create an editable v2 copy without mutating the legacy project. */
export function upgradeProject(legacyInput: Project): AdaptiveProject {
  const legacy = structuredClone(legacyInput);
  const next = createPreset("britons");
  next.name = legacy.name;
  next.phases.dark.villagers = legacy.dark.villagers;
  next.phases.dark.resources = { ...legacy.dark.resources };
  next.phases.feudal.villagers = legacy.feudal.villagers;
  next.phases.feudal.resources = { ...legacy.feudal.resources };
  const buildTargets: Partial<Record<string, number>> = {
    "archery-range": legacy.buildings.ranges,
  };
  next.steps = next.steps.map((step) => {
    if (step.kind === "build" && buildTargets[step.building] !== undefined)
      return { ...step, count: buildTargets[step.building]! };
    if (step.kind === "train" && step.unit === "archer")
      return { ...step, count: legacy.army.archers };
    return step;
  });
  const millIndex = next.steps.findIndex((step) => step.id === "mill");
  next.steps.splice(millIndex + 1, 0, {
    id: "legacy-dark-farms",
    label: "Preserve the version 1 Dark Age farm target",
    phase: "dark",
    priority: 85,
    enabled: true,
    kind: "build",
    building: "farm",
    count: legacy.buildings.darkFarms,
  });
  const rangeIndex = next.steps.findIndex((step) => step.id === "ranges");
  next.steps.splice(rangeIndex + 1, 0, {
    id: "legacy-feudal-farms",
    label: "Preserve the version 1 Feudal farm target",
    phase: "feudal",
    priority: 85,
    enabled: true,
    kind: "build",
    building: "farm",
    count: legacy.buildings.feudalFarms,
  });
  next.responses = next.responses.map((response) =>
    response.trigger.kind === "housing-shortage"
      ? {
          ...response,
          trigger: {
            ...response.trigger,
            threshold: legacy.buildings.housingHeadroom,
          },
          recovery: {
            kind: "threshold" as const,
            threshold: legacy.buildings.housingHeadroom + 2,
          },
        }
      : response,
  );
  next.micro.ranged.groupSize = Math.min(
    40,
    Math.max(2, legacy.army.attackAt * 2),
  );
  next.micro.ranged.searchIntervalSeconds = Math.min(
    60,
    Math.max(2, legacy.army.attackInterval),
  );
  return adaptiveProjectSchema.parse(next);
}

export function validateForAdaptiveExport(input: unknown): Diagnostic[] {
  return validateAdaptiveProject(input);
}
