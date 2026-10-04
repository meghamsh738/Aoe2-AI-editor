import { compile } from "./index";
import type { Project } from "./model";
export interface Situation {
  age: "dark" | "feudal";
  villagers: number;
  queuedVillagers: number;
  archers: number;
  queuedArchers: number;
  food: number;
  wood: number;
  gold: number;
  headroom: number;
  townCenterIdle: boolean;
  rangeReady: boolean;
  agePrerequisites: boolean;
  researchStarted: boolean;
  attackTimerReady: boolean;
}
export const defaultSituation: Situation = {
  age: "dark",
  villagers: 18,
  queuedVillagers: 1,
  archers: 0,
  queuedArchers: 0,
  food: 150,
  wood: 100,
  gold: 0,
  headroom: 4,
  townCenterIdle: false,
  rangeReady: false,
  agePrerequisites: true,
  researchStarted: false,
  attackTimerReady: false,
};
// Interpret only the documented facts required by the legacy preview. Policy
// thresholds and age/queue gates come from the emitted rule IR, not a second policy.
function fact(text: string, s: Situation): boolean {
  const parts = text.slice(1, -1).split(/\s+/);
  const compare = (a: number, op: string, b: number) =>
    op === "<" ? a < b : op === ">=" ? a >= b : op === "==" ? a === b : false;
  if (parts[0] === "current-age")
    return compare(
      s.age === "dark" ? 0 : 1,
      parts[1],
      parts[2] === "dark-age" ? 0 : 1,
    );
  if (parts[0] === "goal" && parts[1] === "1")
    return Number(s.researchStarted) === Number(parts[2]);
  if (parts[0] === "unit-type-count" || parts[0] === "unit-type-count-total") {
    const total = parts[0].endsWith("-total");
    const n =
      parts[1] === "villager"
        ? s.villagers + (total ? s.queuedVillagers : 0)
        : s.archers + (total ? s.queuedArchers : 0);
    return compare(n, parts[2], Number(parts[3]));
  }
  if (parts[0] === "can-train" && parts[1] === "villager")
    return s.food >= 50 && s.headroom > 0 && s.townCenterIdle;
  if (parts[0] === "can-train" && parts[1] === "archer")
    return s.wood >= 25 && s.gold >= 45 && s.headroom > 0 && s.rangeReady;
  if (parts[0] === "can-research" && parts[1] === "feudal-age")
    return (
      s.food >= 500 &&
      s.townCenterIdle &&
      s.agePrerequisites &&
      !s.researchStarted
    );
  if (parts[0] === "timer-triggered" && parts[1] === "2")
    return s.attackTimerReady;
  // Unknown facts fail closed; the preview never guesses that an engine check passed.
  return false;
}
export function testPolicies(p: Project, s: Situation) {
  const rules = compile(p).rules;
  const definitions = [
    [
      s.age === "dark" ? "dark-villagers" : "feudal-villagers",
      "Train a villager",
      "Uses existing plus queued villagers, affordability, housing and town-center availability.",
    ],
    [
      "advance-feudal",
      "Research Feudal Age",
      "Requires the completed opening target, age prerequisites, affordability and an idle town center.",
    ],
    [
      "archers",
      "Train an archer",
      "Uses existing plus queued archers, affordability, housing and range availability.",
    ],
    [
      "attack",
      "Issue an attack order",
      "Uses completed archers and the elapsed attack cooldown.",
    ],
  ];
  return definitions.map(([id, name, explanation]) => {
    const rule = rules.find((r) => r.id === id);
    return {
      name,
      active: !!rule && rule.conditions.every((c) => fact(c, s)),
      explanation,
    };
  });
}
