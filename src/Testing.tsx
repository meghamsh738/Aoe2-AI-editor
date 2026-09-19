import { useState } from 'react';
import type { Project, Diagnostic } from '../packages/compiler';
import { defaultSituation, testPolicies, type Situation } from '../packages/compiler/policy';
import { NumberField, Panel, PageHeading } from './components';
export function Testing({ project, diagnostics }: { project: Project; diagnostics: Diagnostic[] }) {
  const [s, set] = useState(defaultSituation);
  const update = <K extends keyof Situation>(key: K, value: Situation[K]) => set({ ...s, [key]: value });
  const valid = Object.values(s).every(v => typeof v !== 'number' || (Number.isInteger(v) && v >= 0 && v <= 10000));
  return <><PageHeading title="Understand your decisions" subtitle="Try a hypothetical situation before exporting."/>
    <Panel title="Project checks">{diagnostics.length ? diagnostics.map((d, i) => <p key={i} className={d.severity === 'error' ? 'error-text' : ''}>{d.message}</p>) : <p className="success-text">Project checks passed. This is not a native game test.</p>}</Panel>
    <Panel title="Policy test" description="Checks four policy gates against your inputs independently. Does not simulate gathering, spending order, combat, or engine behavior.">
      <label className="select-label">Current age<select value={s.age} onChange={e => update('age', e.target.value as Situation['age'])}><option value="dark">Dark Age</option><option value="feudal">Feudal Age</option></select></label>
      <div className="test-fields">{([['villagers', 'Completed villagers'], ['queuedVillagers', 'Queued villagers'], ['archers', 'Completed archers'], ['queuedArchers', 'Queued archers'], ['food', 'Available food'], ['wood', 'Available wood'], ['gold', 'Available gold'], ['headroom', 'Free housing']] as const).map(([key, label]) => <NumberField key={key} label={label} value={s[key]} min={0} max={10000} onChange={n => update(key, n)}/>)}</div>
      <div className="check-fields">{([['townCenterIdle', 'Town center is idle'], ['rangeReady', 'Archery range exists and is idle'], ['agePrerequisites', 'Mill and lumber camp completed'], ['researchStarted', 'Feudal research already requested'], ['attackTimerReady', 'Attack cooldown has elapsed']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={s[key]} onChange={e => update(key, e.target.checked)}/>{label}</label>)}</div>
    </Panel>
    <Panel title="Which policies activate?">{!valid || diagnostics.some(d => d.severity === 'error') ? <p className="error-text">Fix invalid project or situation fields to run the policy test.</p> : testPolicies(project, s).map(result => <div className="policy-result" key={result.name}><div><h3>{result.name}</h3><p>{result.explanation}</p></div><span className={result.active ? 'active-state' : 'blocked-state'}>{result.active ? 'Ready' : 'Waiting'}</span></div>)}</Panel>
  </>;
}
