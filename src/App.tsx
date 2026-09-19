import { useMemo, useRef, useState } from 'react';
import { BarChart3, House, Swords, ScrollText, Play, Upload, Undo2, Redo2, FolderOpen, Save, Laptop, X } from 'lucide-react';
import { strToU8, zipSync } from 'fflate';
import { compile, exportFiles, parseProject } from '../packages/compiler';
import { Editor, type Section } from './Editor';
import { Export } from './Export';
import { Testing } from './Testing';
import { download, GameNotice } from './components';
import { useProject } from './useProject';
const navigation = [{ name: 'Economy', Icon: BarChart3 }, { name: 'Buildings', Icon: House }, { name: 'Army', Icon: Swords }, { name: 'Strategy', Icon: ScrollText }, { name: 'Testing', Icon: Play }, { name: 'Export', Icon: Upload }] as const;
export default function App() {
  const { project, edit, undo, redo, canUndo, canRedo, storageStatus, recoveryDraft } = useProject();
  const [section, setSection] = useState<Section>('Economy');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const compiled = useMemo(() => compile(project), [project]);
  const errors = compiled.diagnostics.filter(d => d.severity === 'error');
  async function open(file?: File) {
    if (!file) return;
    try { if (file.size > 100_000) throw new Error('Open a project under 100 KB.'); const p = parseProject(await file.text()); edit(p); setMessage(`Opened ${p.name}. Undo restores the previous project.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open that project.'); }
  }
  function save() {
    try { parseProject(JSON.stringify(project)); download(`${project.name}.workshop.json`, JSON.stringify(project, null, 2)); setMessage('Project download started. Keep this file to edit your bot later.'); }
    catch { setMessage('Check the bot name and numeric fields before saving.'); }
  }
  function exportBot() {
    try { const files = exportFiles(project); const zip = zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(content)]))); download(`${project.name}.zip`, new Uint8Array(zip).buffer, 'application/zip'); setMessage('Bot ZIP download started. Installation and game-testing steps are included.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); }
  }
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand">AI Workshop<small>Age of Empires II · DE</small></div><nav aria-label="Editor sections">{navigation.map(({ name, Icon }) => <button key={name} aria-current={section === name ? 'page' : undefined} onClick={() => { setSection(name); setMessage(''); }}><Icon size={24}/>{name}</button>)}</nav><div className="local-status"><Laptop size={24}/><div>Local project<small>{storageStatus}</small></div></div></aside>
    <div className="workspace"><header className="toolbar"><label className="bot-name">Bot name<input aria-label="Bot name" value={project.name} maxLength={48} onChange={e => edit({ ...project, name: e.target.value })}/></label><div className="profile"><small>Civilization · Scenario</small><span>Britons · Land skirmish</span></div><div className="toolbar-actions"><button onClick={undo} disabled={!canUndo}><Undo2 size={19}/>Undo</button><button onClick={redo} disabled={!canRedo}><Redo2 size={19}/>Redo</button><button onClick={() => fileRef.current?.click()}><FolderOpen size={19}/>Open</button><button onClick={save}><Save size={19}/>Save project</button><button className="primary" onClick={() => setSection('Export')}><Upload size={19}/>Export bot</button></div><input ref={fileRef} aria-label="Open project file" type="file" accept=".json,application/json" hidden onChange={e => { void open(e.target.files?.[0]); e.target.value = ''; }}/></header>
      {recoveryDraft !== null && <div className="message" role="status"><span>A previous draft could not be loaded. Download its original contents for recovery.</span><button onClick={() => download("AI-Workshop-recovery.txt", recoveryDraft, "text/plain")}>Download recovery copy</button></div>}
      {message && <div className="message" role="status"><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage('')}><X size={18}/></button></div>}
      <div className="content-grid"><main id="main-content">{errors.length > 0 && section !== 'Testing' && section !== 'Export' && <div className="validation-banner" role="alert"><strong>Check your project</strong>{errors.map((e, i) => <p key={i}>{e.path}: {e.message}</p>)}</div>}{section === 'Export' ? <Export project={project} compiled={compiled} onExport={exportBot}/> : section === 'Testing' ? <Testing project={project} diagnostics={compiled.diagnostics}/> : <Editor section={section} project={project} edit={edit}/>}</main>
      <aside className="inspector" aria-label="Strategy explanation"><h2>Your strategy, explained</h2><ol className="strategy-steps"><li><h3>Grow your economy</h3><p>Train up to {Number.isFinite(project.dark.villagers) ? project.dark.villagers : '—'} villagers and replace losses. Use your resource shares to support the opening.</p></li><li><h3>Save for Feudal</h3><p>At {Number.isFinite(project.dark.villagers) ? project.dark.villagers : '—'} completed villagers, pause training and save food. Resume production once the Feudal Age completes.</p></li><li><h3>Train an archer army</h3><p>Grow toward {Number.isFinite(project.army.archers) ? project.army.archers : '—'} archers. Send available soldiers at {Number.isFinite(project.army.attackAt) ? project.army.attackAt : '—'} completed archers, with a cooldown between orders.</p></li></ol><GameNotice/></aside></div>
    </div></div>;
}
