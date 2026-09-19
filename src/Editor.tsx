import { useState } from 'react';
import { resources, type Project, type Age } from '../packages/compiler';
import { NumberField, PageHeading, Panel } from './components';
export type Section = 'Economy' | 'Buildings' | 'Army' | 'Strategy' | 'Testing' | 'Export';
export function Editor({ section, project: p, edit }: { section: Section; project: Project; edit: (p: Project) => void }) {
  const [age, setAge] = useState<Age>('dark');
  const updateBuildings = (key: keyof Project['buildings'], value: number) => edit({ ...p, buildings: { ...p.buildings, [key]: value } });
  const updateArmy = (key: keyof Project['army'], value: number) => edit({ ...p, army: { ...p.army, [key]: value } });
  const updateAge = (key: 'villagers', value: number) => edit({ ...p, [age]: { ...p[age], [key]: value } });
  if (section === 'Economy') return <>
    <PageHeading title="Build your economy" subtitle="Give your army a strong foundation."/>
    <div className="tabs" role="tablist" aria-label="Economy age">{(['dark', 'feudal'] as const).map(a => <button key={a} role="tab" aria-selected={age === a} onClick={() => setAge(a)}>{a === 'dark' ? 'Dark Age' : 'Feudal Age'}</button>)}</div>
    <Panel title="Maintain villagers" description="Train villagers up to your target and replace losses.">
      <NumberField label="Villager target" value={p[age].villagers} min={4} max={150} onChange={n => updateAge('villagers', n)}/>
      <p className="help">Existing villagers and queued villagers count toward this target.</p>
    </Panel>
    <Panel title="Resource priorities" description="Choose how your villagers divide their work.">
      <div className="resource-fields">{resources.map(r => <NumberField key={r} label={r[0].toUpperCase() + r.slice(1)} value={p[age].resources[r]} min={0} max={100} suffix="%" onChange={n => edit({ ...p, [age]: { ...p[age], resources: { ...p[age].resources, [r]: n } } })}/>)}</div>
      <div className="resource-bar" aria-hidden="true">{resources.map(r => <span className={r} key={r} style={{ flex: Math.max(0, p[age].resources[r]) || 0 }}/>)}</div>
      <div className="resource-legend">{resources.map(r => <span key={r}><i className={r}/>{r[0].toUpperCase() + r.slice(1)} {Number.isFinite(p[age].resources[r]) ? p[age].resources[r] : '—'}%</span>)}</div>
      <p className="help">Resource shares must add up to 100%.</p>
    </Panel>
    <Panel title="What happens next"><p>{age === 'dark' ? `At ${p.dark.villagers || '—'} completed villagers, pause training and save for the Feudal Age. Production resumes after the age completes.` : `Maintain ${p.feudal.villagers || '—'} villagers and support an army of ${p.army.archers || '—'} archers. This template stays in the Feudal Age.`}</p></Panel>
  </>;
  if (section === 'Buildings') return <>
    <PageHeading title="Make room to grow" subtitle="Keep your economy and army supplied."/>
    <Panel title="Stay ahead of housing" description="Build a house when free population space falls below your threshold."><NumberField label="Free population threshold" value={p.buildings.housingHeadroom} min={2} max={20} onChange={n => updateBuildings('housingHeadroom', n)}/><p className="help">A 25-second cooldown limits construction requests. Building still requires wood and space.</p></Panel>
    <Panel title="Maintain your farms" description="Build and replace farms while food stock is below 200."><div className="two-fields"><NumberField label="Dark Age farms" value={p.buildings.darkFarms} min={2} max={20} onChange={n => updateBuildings('darkFarms', n)}/><NumberField label="Feudal Age farms" value={p.buildings.feudalFarms} min={2} max={40} onChange={n => updateBuildings('feudalFarms', n)}/></div></Panel>
    <Panel title="Army production"><NumberField label="Archery ranges" value={p.buildings.ranges} min={1} max={4} onChange={n => updateBuildings('ranges', n)}/><p className="help">Built in the Feudal Age, after a barracks is available.</p></Panel>
    <Panel title="Included supporting buildings"><p>One lumber camp, mill, mining camp, and barracks. The mill and lumber camp support Feudal advancement. Mining starts in Feudal unless you assign early miners.</p></Panel>
  </>;
  if (section === 'Army') return <>
    <PageHeading title="Build your archer army" subtitle="Set a target, then decide when to march."/>
    <Panel title="Maintain archers" description="Train archers in the Feudal Age and replace losses."><NumberField label="Archer target" value={p.army.archers} min={1} max={100} onChange={n => updateArmy('archers', n)}/><p className="help">Queued archers count toward the target. Each archer requires 25 wood, 45 gold, population space, and an available archery range.</p></Panel>
    <Panel title="Attack timing" description="Send available soldiers when enough completed archers exist."><div className="two-fields"><NumberField label="Attack at this many archers" value={p.army.attackAt} min={1} max={100} onChange={n => updateArmy('attackAt', n)}/><NumberField label="Minimum time between orders" value={p.army.attackInterval} min={60} max={600} suffix="sec" onChange={n => updateArmy('attackInterval', n)}/></div><p className="help">This counts all surviving archers, including those already attacking. It is an order threshold, not a guaranteed new wave size. The first cooldown begins at game start.</p></Panel>
    <Panel title="Supported in this build"><p>Briton archers in the Feudal Age. Unit upgrades, other civilizations, custom reactions, and later-age armies are planned after native game testing.</p></Panel>
  </>;
  return <>
    <PageHeading title="A simple plan, clearly defined" subtitle="From a small settlement to a Feudal archer army."/>
    <Panel title="1. Establish your economy"><p>Start in the Dark Age. Maintain {p.dark.villagers} villagers, gather resources, build housing, and establish a mill and lumber camp.</p></Panel>
    <Panel title="2. Save for the Feudal Age"><p>At {p.dark.villagers} completed villagers, stop adding villagers. Research Feudal once the town center is idle, prerequisites are met, and 500 food is available. After the request, villager production waits until the age completes.</p></Panel>
    <Panel title="3. Grow and attack"><p>After the Feudal Age completes, maintain {p.feudal.villagers} villagers, {p.buildings.ranges} archery ranges, and {p.army.archers} archers. Send an attack at {p.army.attackAt} completed archers, with at least {p.army.attackInterval} seconds between orders.</p></Panel>
    <Panel title="Match profile"><p>Britons · 1v1 land skirmish · Standard resources · Dark Age start · 200 population. Set these in the game; exported scripts cannot configure your lobby. This first template stays in the Feudal Age.</p></Panel>
  </>;
}
