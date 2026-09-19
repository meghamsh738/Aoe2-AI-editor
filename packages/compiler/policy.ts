import type { Project } from './model';
export interface Situation { age: 'dark' | 'feudal'; villagers: number; queuedVillagers: number; archers: number; queuedArchers: number; food: number; wood: number; gold: number; headroom: number; townCenterIdle: boolean; rangeReady: boolean; agePrerequisites: boolean; researchStarted: boolean; attackTimerReady: boolean }
export const defaultSituation: Situation = { age: 'dark', villagers: 18, queuedVillagers: 1, archers: 0, queuedArchers: 0, food: 150, wood: 100, gold: 0, headroom: 4, townCenterIdle: false, rangeReady: false, agePrerequisites: true, researchStarted: false, attackTimerReady: false };
export function testPolicies(p: Project, s: Situation) {
  const target = p[s.age].villagers;
  return [
    { name: 'Train a villager', active: s.villagers + s.queuedVillagers < target && s.food >= 50 && s.headroom > 0 && s.townCenterIdle && !(s.age === 'dark' && s.researchStarted), explanation: `Requires fewer than ${target} existing + queued villagers, 50 food, free housing, and an idle town center. Paused during age research.` },
    { name: 'Research Feudal Age', active: s.age === 'dark' && s.villagers >= p.dark.villagers && s.food >= 500 && s.townCenterIdle && s.agePrerequisites && !s.researchStarted, explanation: `Requires ${p.dark.villagers} completed villagers, 500 food, two completed qualifying Dark Age buildings, and an idle town center.` },
    { name: 'Train an archer', active: s.age === 'feudal' && s.archers + s.queuedArchers < p.army.archers && s.wood >= 25 && s.gold >= 45 && s.headroom > 0 && s.rangeReady, explanation: `Requires Feudal Age, fewer than ${p.army.archers} existing + queued archers, 25 wood, 45 gold, free housing, and an idle range.` },
    { name: 'Issue an attack order', active: s.age === 'feudal' && s.archers >= p.army.attackAt && s.attackTimerReady, explanation: `Requires Feudal Age, at least ${p.army.attackAt} completed archers, and an elapsed ${p.army.attackInterval}-second cooldown. Available soldiers respond.` },
  ];
}
