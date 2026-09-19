import { useEffect, useReducer, useState } from 'react';
import { defaultProject, parseProject, type Project } from '../packages/compiler';
const storageKey = 'ai-workshop.project.v1';
const recoveryKey = 'ai-workshop.recovery.v1';
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
    let raw: string | null = null;
    let recovery: string | null = null;
    try {
      raw = localStorage.getItem(storageKey);
      recovery = localStorage.getItem(recoveryKey);
      return { project: raw ? parseProject(raw) : structuredClone(defaultProject), error: '', recovery, damaged: null as string | null };
    } catch {
      return { project: structuredClone(defaultProject), error: raw !== null ? 'Saved draft could not be loaded. A recovery copy is available.' : 'Device storage unavailable. Use Save project.', recovery: raw ?? recovery, damaged: raw };
    }
  });
  const [state, dispatch] = useReducer(reducer, { past: [], present: initial.project, future: [] });
  const [storageStatus, setStorageStatus] = useState(initial.error || 'Saved on this device.');
  const [hasEdited, setHasEdited] = useState(false);
  useEffect(() => {
    if (initial.error && !hasEdited) return;
    // Preserve the last valid draft if an input is temporarily incomplete.
    try { parseProject(JSON.stringify(state.present)); }
    catch { setStorageStatus('Unsaved input. Check your fields.'); return; }
    try {
      // Backup must succeed before replacing the damaged original. A failed backup
      // leaves the original untouched; the user can still download it from memory.
      if (initial.damaged !== null) localStorage.setItem(recoveryKey, initial.damaged);
      localStorage.setItem(storageKey, JSON.stringify(state.present));
      setStorageStatus('Saved on this device.');
    } catch { setStorageStatus('Device storage unavailable. Use Save project.'); }
  }, [state.present, hasEdited, initial]);
  const edit = (project: Project) => { setHasEdited(true); dispatch({ type: 'edit', project }); };
  return { project: state.present, edit, undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }), canUndo: !!state.past.length, canRedo: !!state.future.length, storageStatus, recoveryDraft: initial.recovery };
}
