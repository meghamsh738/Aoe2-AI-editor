import { useState } from 'react';
import { Download } from 'lucide-react';
import type { Compilation, Project } from '../packages/compiler';
import { PageHeading, Panel } from './components';
export function Export({ project, compiled, onExport }: { project: Project; compiled: Compilation; onExport: () => void }) {
  const [selected, select] = useState('all');
  const entry = compiled.sourceMap.find(s => s.rule === selected);
  const code = entry ? compiled.per.split(/\r?\n/).slice(entry.startLine - 1, entry.endLine).join('\n') : compiled.per;
  return <><PageHeading title="Take your bot into the game" subtitle="Your decisions become native AI scripts."/>
    <Panel title="Export an experimental bot" description="Download both game files, your editable project, and installation notes in one ZIP.">
      <div className="file-row"><code>{project.name || 'Bot'}.ai</code><span>Game discovery file</span></div><div className="file-row"><code>{project.name || 'Bot'}.per</code><span>Generated behavior</span></div>
      <button className="primary export-button" disabled={!compiled.per} onClick={onExport}><Download size={18}/>Download bot ZIP</button>
      <p className="help">Select Britons in a standard-resource, 200-population land match. Start in the Dark Age. This template stops at the Feudal Age.</p>
      {compiled.diagnostics.map((d, i) => <p key={i} className="error-text">{d.message}</p>)}
    </Panel>
    <Panel title="Generated script" description="Read-only output. Edit the strategy settings to change the script.">
      <label className="select-label">Show policy<select value={selected} onChange={e => select(e.target.value)}><option value="all">Entire script</option>{compiled.rules.map(r => <option key={r.id} value={r.id}>{r.id} · {r.source}</option>)}</select></label>
      {entry && <p className="help">Source: {entry.source} · Lines {entry.startLine}–{entry.endLine}</p>}
      <pre tabIndex={0} aria-label="Generated AI script"><code>{code || 'Fix project errors to generate a script.'}</code></pre>
    </Panel>
    <Panel title="Native game test checklist"><ol className="instructions"><li>Back up any same-name bot, then copy the matching .ai and .per files together into the game’s AI folder.</li><li>Choose this bot in a single-player land skirmish and set its civilization to Britons.</li><li>Record the game build, map seed, and settings. Check script errors, gathering, housing, age advancement, archer training, and attacks.</li><li>Check replacement villagers and archers after losses. Keep your original project to revise the strategy.</li></ol><p className="help">No native game run has been performed for this build.</p></Panel>
  </>;
}
