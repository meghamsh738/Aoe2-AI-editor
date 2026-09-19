import { z } from 'zod';
const integer = (min: number, max: number) => z.number().int().min(min).max(max);
const allocation = z.object({ food: integer(0, 100), wood: integer(0, 100), gold: integer(0, 100), stone: integer(0, 100) }).strict();
const economy = z.object({ villagers: integer(4, 150), resources: allocation }).strict();
export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(48).regex(/^[A-Za-z0-9][A-Za-z0-9 _-]*$/).refine(n => n === n.trim() && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(n), 'Use a portable filename, without trailing spaces or reserved names.'),
  profile: z.literal('de-britons-land-feudal-v1'),
  dark: economy,
  feudal: economy,
  buildings: z.object({ housingHeadroom: integer(2, 20), darkFarms: integer(2, 20), feudalFarms: integer(2, 40), ranges: integer(1, 4) }).strict(),
  army: z.object({ archers: integer(1, 100), attackAt: integer(1, 100), attackInterval: integer(60, 600) }).strict(),
}).strict();
export type Project = z.infer<typeof projectSchema>;
export type Age = 'dark' | 'feudal';
export type Resource = keyof Project['dark']['resources'];
export const resources: Resource[] = ['food', 'wood', 'gold', 'stone'];
export const defaultProject: Project = {
  schemaVersion: 1, name: 'Greenwood Archers', profile: 'de-britons-land-feudal-v1',
  dark: { villagers: 22, resources: { food: 60, wood: 40, gold: 0, stone: 0 } },
  feudal: { villagers: 40, resources: { food: 40, wood: 40, gold: 20, stone: 0 } },
  buildings: { housingHeadroom: 5, darkFarms: 6, feudalFarms: 14, ranges: 2 },
  army: { archers: 24, attackAt: 12, attackInterval: 120 },
};
export function parseProject(text: string): Project {
  if (text.length > 100_000) throw new Error('Project is too large. Open an AI Workshop JSON project under 100 KB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This is not valid JSON. Open a saved AI Workshop project.'); }
  const result = projectSchema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues.map(i => `${i.path.join('.') || 'Project'}: ${i.message}`).join('\n'));
  return result.data;
}
export type Diagnostic = { severity: 'error' | 'warning'; path: string; message: string };
export function validateProject(input: unknown): Diagnostic[] {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return parsed.error.issues.map(i => ({ severity: 'error', path: i.path.join('.'), message: i.message }));
  const p = parsed.data;
  const issues: Diagnostic[] = [];
  const error = (path: string, message: string) => issues.push({ severity: 'error', path, message });
  for (const age of ['dark', 'feudal'] as const) {
    const r = p[age].resources;
    if (resources.reduce((sum, key) => sum + r[key], 0) !== 100) error(`${age}.resources`, `${age === 'dark' ? 'Dark' : 'Feudal'} Age resource shares must add up to 100%.`);
    if (r.food === 0 || r.wood === 0) error(`${age}.resources`, 'Keep some villagers on both food and wood so the economy can continue.');
  }
  if (p.feudal.resources.gold === 0) error('feudal.resources.gold', 'Archers cost gold. Assign gold gatherers in the Feudal Age.');
  if (p.army.attackAt > p.army.archers) error('army.attackAt', 'The attack threshold exceeds the archer target, so the bot may never attack.');
  if (p.feudal.villagers < p.dark.villagers) error('feudal.villagers', 'The Feudal villager target must be at least the Dark Age target.');
  if (p.feudal.villagers + p.army.archers + 1 > 200) error('army.archers', 'Villagers, archers and the starting scout exceed the 200 population profile.');
  if (p.buildings.feudalFarms < p.buildings.darkFarms) error('buildings.feudalFarms', 'The Feudal farm target must be at least the Dark Age target.');
  if (p.dark.resources.gold + p.dark.resources.stone > 0) issues.push({ severity: 'warning', path: 'dark.resources', message: 'Early mining delays food and wood collection for Feudal advancement.' });
  return issues;
}
