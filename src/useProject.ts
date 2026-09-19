import { useEffect, useReducer, useState } from 'react';
import { defaultProject, parseProject, type Project } from '../packages/compiler';
const storageKey = 'ai-workshop.project.v1';
type History = { past: Project[]; present: Project; future: Project[] };
type Action = { type: 'edit'; project: Project } | { type: 'undo' | 'redo' };
function reducer(state: History, action: Action): History {
  if (action.type === 'edit') {
    if (JSON.stringify(action.project) === JSON.stringify(state.present)) return state;
    return { past: [...state.past.slice(-99), state.present], present: action.project, future: [] };
  }
  if (action.type === 'undo' && state.past.length) return { past: state.past.slice(0, -1), present: state.past.at(-1)!, future: [state.present, ...state.future] };
  if (action.type === 'redo' && state.future.length) return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) };
  return state;
}
export function useProject() {
  const [initial] = useState(() => {
    try { const saved = localStorage.getItem(storageKey); return { project: saved ? parseProject(saved) : structuredClone(defaultProject), error: '' }; }
    catch { return { project: structuredClone(defaultProject), error: 'The saved draft could not be loaded. It has been preserved; open a saved project to recover your work.' }; }
  });
  const [state, dispatch] = useReducer(reducer, { past: [], present: initial.project, future: [] });
  const [storageStatus, setStorageStatus] = useState(initial.error || 'Saved on this device.');
  const [hasEdited, setHasEdited] = useState(false);
  useEffect(() => {
    if (initial.error && !hasEdited) return;
    // Preserve the last valid draft if an input is temporarily incomplete.
    try { parseProject(JSON.stringify(state.present)); }
    catch { setStorageStatus('Unsaved input. Check your fields.'); return; }
    try { localStorage.setItem(storageKey, JSON.stringify(state.present)); setStorageStatus('Saved on this device.'); }
    catch { setStorageStatus('Device storage unavailable. Use Save project.'); }
  }, [state.present, hasEdited, initial.error]);
  const edit = (project: Project) => { setHasEdited(true); dispatch({ type: 'edit', project }); };
  return { project: state.present, edit, undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }), canUndo: !!state.past.length, canRedo: !!state.future.length, storageStatus };
}
