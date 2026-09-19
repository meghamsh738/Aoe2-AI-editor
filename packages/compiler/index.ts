import { projectSchema, validateProject, resources, type Diagnostic, type Project } from './model';
export * from './model';
export interface NativeRule { id: string; source: string; description: string; conditions: string[]; actions: string[] }
export interface SourceMap { rule: string; source: string; startLine: number; endLine: number }
export interface Compilation { per: string; rules: NativeRule[]; sourceMap: SourceMap[]; diagnostics: Diagnostic[] }
// Internal identifiers are owned here; never accepted as free text from a project.
const ids = { ageStarted: 1, houseReady: 2, houseTimer: 1, attackTimer: 2 } as const;
export function compile(input: unknown): Compilation {
  const diagnostics = validateProject(input);
  if (diagnostics.some(i => i.severity === 'error')) return { per: '', rules: [], sourceMap: [], diagnostics };
  const p = projectSchema.parse(input);
  const rules: NativeRule[] = [];
  function add(id: string, source: string, description: string, conditions: string[], actions: string[]) { rules.push({ id, source, description, conditions, actions }); }
  const sn = (key: string, value: number) => `(set-strategic-number sn-${key} ${value})`;
  add('setup', 'profile', 'Initialize scouting, attack allocation and internal state.', ['(true)'], [
    sn('do-not-scale-for-difficulty-level', 1), sn('cap-civilian-explorers', 0), sn('number-explore-groups', 1),
    sn('total-number-explorers', 1), sn('percent-half-exploration', 100), sn('number-attack-groups', 0), sn('percent-attack-soldiers', 100),
    `(set-goal ${ids.ageStarted} 0)`, `(set-goal ${ids.houseReady} 1)`, `(enable-timer ${ids.attackTimer} ${p.army.attackInterval})`, '(disable-self)',
  ]);
  for (const age of ['dark', 'feudal'] as const) {
    add(`${age}-allocation`, `${age}.resources`, `Set ${age} age gathering targets once the age is reached.`, [`(current-age == ${age}-age)`], [
      ...resources.map(r => sn(`${r}-gatherer-percentage`, p[age].resources[r])), '(disable-self)',
    ]);
  }
  add('house-timer', 'buildings.housingHeadroom', 'Allow another house after 25 seconds.', [`(timer-triggered ${ids.houseTimer})`], [`(disable-timer ${ids.houseTimer})`, `(set-goal ${ids.houseReady} 1)`]);
  add('housing', 'buildings.housingHeadroom', 'Build housing before reaching capacity, with a construction cooldown.', [
    `(housing-headroom < ${p.buildings.housingHeadroom})`, '(population-headroom > 0)', `(goal ${ids.houseReady} 1)`, '(can-build house)',
  ], ['(build house)', `(set-goal ${ids.houseReady} 0)`, `(enable-timer ${ids.houseTimer} 25)`]);
  function building(id: string, count: number, conditions: string[], source: string) {
    add(`build-${id}`, source, `Maintain ${count} ${id}; foundations count toward the target.`, [...conditions, `(building-type-count-total ${id} < ${count})`, `(can-build ${id})`], [`(build ${id})`]);
  }
  building('lumber-camp', 1, [], 'buildings');
  building('mill', 1, [], 'buildings');
  const miningEarly = p.dark.resources.gold + p.dark.resources.stone > 0;
  building('mining-camp', 1, miningEarly ? [] : ['(current-age >= feudal-age)'], 'buildings');
  // Two completed Dark Age buildings (mill + lumber camp) unlock Feudal research.
  add('advance-feudal', 'dark.villagers', 'Pause villager production at the opening target, then request Feudal when affordable.', [
    '(current-age == dark-age)', `(unit-type-count villager >= ${p.dark.villagers})`, `(goal ${ids.ageStarted} 0)`, '(can-research feudal-age)',
  ], ['(research feudal-age)', `(set-goal ${ids.ageStarted} 1)`]);
  // Production resumes only on observed age completion, never on issuing research.
  add('dark-villagers', 'dark.villagers', 'Maintain opening villagers until age research starts.', ['(current-age == dark-age)', `(goal ${ids.ageStarted} 0)`, `(unit-type-count-total villager < ${p.dark.villagers})`, '(can-train villager)'], ['(train villager)']);
  add('feudal-villagers', 'feudal.villagers', 'Maintain Feudal villagers, including queued units.', ['(current-age == feudal-age)', `(unit-type-count-total villager < ${p.feudal.villagers})`, '(can-train villager)'], ['(train villager)']);
  for (const age of ['dark', 'feudal'] as const) {
    const target = age === 'dark' ? p.buildings.darkFarms : p.buildings.feudalFarms;
    add(`${age}-farms`, `buildings.${age}Farms`, 'Maintain farms when food stock is low; exhausted farms are replaced.', [`(current-age == ${age}-age)`, '(food-amount < 200)', `(building-type-count-total farm < ${target})`, '(can-build farm)'], ['(build farm)']);
  }
  building('barracks', 1, ['(current-age >= feudal-age)'], 'buildings');
  building('archery-range', p.buildings.ranges, ['(current-age >= feudal-age)'], 'buildings.ranges');
  add('archers', 'army.archers', 'Maintain archers and replace losses; production includes queued archers.', ['(current-age == feudal-age)', `(unit-type-count-total archer < ${p.army.archers})`, '(can-train archer)'], ['(train archer)']);
  add('attack', 'army.attackAt', 'Send available soldiers when enough completed archers exist, at most once per cooldown.', ['(current-age == feudal-age)', `(unit-type-count archer >= ${p.army.attackAt})`, `(timer-triggered ${ids.attackTimer})`], ['(attack-now)', `(disable-timer ${ids.attackTimer})`, `(enable-timer ${ids.attackTimer} ${p.army.attackInterval})`]);
  const lines = [`; ${p.name} | AI Workshop 0.1.0`, '; Profile: Britons, land skirmish, standard resources, Dark Age start, 200 population.', '; Experimental export: native DE game validation has NOT been performed.', '; This template remains in Feudal Age. No cheats, external loads, or custom code.', ''];
  const sourceMap: SourceMap[] = [];
  for (const rule of rules) {
    const startLine = lines.length + 1;
    lines.push(`; ${rule.id} | ${rule.source}`, `; ${rule.description}`, '(defrule', ...rule.conditions.map(c => `    ${c}`), '=>', ...rule.actions.map(a => `    ${a}`), ')', '');
    sourceMap.push({ rule: rule.id, source: rule.source, startLine, endLine: lines.length - 1 });
  }
  return { per: lines.join('\r\n'), rules, sourceMap, diagnostics };
}
export function exportFiles(project: Project): Record<string, string> {
  const compiled = compile(project);
  if (!compiled.per) throw new Error('Fix project errors before exporting.');
  return {
    [`${project.name}.ai`]: '',
    [`${project.name}.per`]: compiled.per,
    [`${project.name}.workshop.json`]: JSON.stringify(project, null, 2),
    'source-map.json': JSON.stringify(compiled.sourceMap, null, 2),
    'README.txt': `AI Workshop experimental export\n\nNative game test: NOT PERFORMED.\nNo game build has been certified.\n\nCopy the matching ${project.name}.ai and ${project.name}.per files together into your DE AI directory (commonly resources/_common/ai inside the game installation). Back up any files with the same name before replacing them. Do not replace other bots. Restart the game if necessary. Select this bot and set its civilization to Britons.\n\nTest profile: single-player 1v1 land map (e.g. Arabia), standard starting resources, Dark Age start, 200 population. The bot stays in Feudal Age. No naval play, walls, later ages, upgrades or custom reaction editor yet.\n\nRecord your game build, map seed, settings and any script errors. Check gathering, housing, 22-villager saving (or edited target), completed Feudal advancement, ranges, archer production and attacks. Repeat after losses. Static checks and policy tests cannot prove game compatibility or strength.\n\nProject JSON is the editable source. Native code is generated output.\n`,
  };
}
