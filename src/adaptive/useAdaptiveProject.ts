import { useEffect, useReducer, useState } from "react";
import {
  createPreset,
  parseAdaptiveProject,
  type AdaptiveProject,
} from "../../packages/compiler/v2";
const key = "ai-workshop.project.v2";
const backupKey = "ai-workshop.recovery.v2";
type History = {
  past: AdaptiveProject[];
  present: AdaptiveProject;
  future: AdaptiveProject[];
};
type Action =
  | { type: "edit"; value: AdaptiveProject }
  | { type: "undo" | "redo" };
function reduce(state: History, action: Action): History {
  if (action.type === "edit") {
    if (JSON.stringify(action.value) === JSON.stringify(state.present))
      return state;
    return {
      past: [...state.past.slice(-99), state.present],
      present: action.value,
      future: [],
    };
  }
  if (action.type === "undo" && state.past.length)
    return {
      past: state.past.slice(0, -1),
      present: state.past.at(-1)!,
      future: [state.present, ...state.future],
    };
  if (action.type === "redo" && state.future.length)
    return {
      past: [...state.past, state.present],
      present: state.future[0],
      future: state.future.slice(1),
    };
  return state;
}
export function useAdaptiveProject() {
  const [initial] = useState(() => {
    let raw: string | null = null;
    let recovery: string | null = null;
    try {
      raw = localStorage.getItem(key);
      recovery = localStorage.getItem(backupKey);
      return {
        project: raw ? parseAdaptiveProject(raw) : createPreset("britons"),
        recovery,
        damaged: null as string | null,
        error: "",
      };
    } catch {
      return {
        project: createPreset("britons"),
        recovery: raw ?? recovery,
        damaged: raw,
        error: raw
          ? "Draft could not be loaded. Recovery copy preserved."
          : "Storage unavailable. Download your project to save.",
      };
    }
  });
  const [state, dispatch] = useReducer(reduce, {
    past: [],
    present: initial.project,
    future: [],
  });
  const [edited, setEdited] = useState(false);
  const [storageStatus, setStatus] = useState(
    initial.error || "Saved on this device.",
  );
  useEffect(() => {
    if (initial.error && !edited) return;
    try {
      parseAdaptiveProject(JSON.stringify(state.present));
    } catch {
      setStatus("Unsaved input. Check your fields.");
      return;
    }
    try {
      if (initial.damaged !== null)
        localStorage.setItem(backupKey, initial.damaged);
      localStorage.setItem(key, JSON.stringify(state.present));
      setStatus("Saved on this device.");
    } catch {
      setStatus("Storage unavailable. Download your project to save.");
    }
  }, [state.present, edited, initial]);
  return {
    project: state.present,
    edit: (value: AdaptiveProject) => {
      setEdited(true);
      dispatch({ type: "edit", value });
    },
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    canUndo: !!state.past.length,
    canRedo: !!state.future.length,
    storageStatus,
    recoveryDraft: initial.recovery,
  };
}
export type AdaptiveStore = ReturnType<typeof useAdaptiveProject>;
