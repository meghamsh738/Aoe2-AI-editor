import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Route,
  ShieldCheck,
  Map,
  Swords,
  FlaskConical,
  Download,
  Undo2,
  Redo2,
  FolderOpen,
  Save,
  Laptop,
  X,
} from "lucide-react";
import { strToU8, zipSync } from "fflate";
import { parseProject, type Project } from "../../packages/compiler";
import {
  compileAdaptive,
  createPreset,
  parseAdaptiveProject,
} from "../../packages/compiler/v2";
import { download, GameNotice, PageHeading, Panel } from "../components";
import { AdaptiveEditor, type AdaptiveSection } from "./AdaptiveEditor";
import { AdaptiveTesting } from "./AdaptiveTesting";
import type { AdaptiveStore } from "./useAdaptiveProject";
import { nativeKitFiles } from "./nativeKit";
const navigation = [
  { name: "Overview", Icon: BookOpen },
  { name: "Build order", Icon: Route },
  { name: "Adaptation", Icon: ShieldCheck },
  { name: "Placement", Icon: Map },
  { name: "Micro", Icon: Swords },
  { name: "Testing", Icon: FlaskConical },
  { name: "Export", Icon: Download },
] as const;
export function downloadZip(name: string, files: Record<string, string>) {
  const zipped = zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, text]) => [path, strToU8(text)]),
    ),
  );
  download(name, new Uint8Array(zipped).buffer, "application/zip");
}
export function AdaptiveApp({
  store,
  onLegacy,
}: {
  store: AdaptiveStore;
  onLegacy: (project?: Project) => void;
}) {
  const {
    project,
    edit,
    undo,
    redo,
    canUndo,
    canRedo,
    storageStatus,
    recoveryDraft,
  } = store;
  const [section, setSection] = useState<AdaptiveSection>("Overview");
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [section]);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const compiled = useMemo(() => compileAdaptive(project), [project]);
  const errors = compiled.diagnostics.filter((d) => d.severity === "error");
  async function open(file?: File) {
    if (!file) return;
    try {
      if (file.size > 200_000)
        throw new Error("Open an AI Workshop project under 200 KB.");
      const text = await file.text();
      const version = JSON.parse(text)?.schemaVersion;
      if (version === 1) {
        onLegacy(parseProject(text));
        return;
      }
      if (version !== 2)
        throw new Error(
          `Unsupported schemaVersion: ${String(version)}. This editor supports versions 1 and 2.`,
        );
      const next = parseAdaptiveProject(text);
      edit(next);
      setMessage(`Opened ${next.name}. Undo restores the previous project.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not open project.",
      );
    }
  }
  function save() {
    try {
      parseAdaptiveProject(JSON.stringify(project));
      download(
        `${project.name}.workshop.json`,
        JSON.stringify(project, null, 2),
      );
      setMessage("Project download started.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Check your fields before saving.",
      );
    }
  }
  function exportBot() {
    if (!compiled.script || errors.length) return;
    downloadZip(`${project.name}.zip`, {
      ...compiled.files,
      ...Object.fromEntries(
        Object.entries(nativeKitFiles()).map(([key, value]) => [
          `native-test-kit/${key}`,
          value,
        ]),
      ),
    });
    setMessage(
      "Bot ZIP and Windows test kit downloaded. Native game behaviour is unverified.",
    );
  }
  function jump(path: string) {
    setSource(path === "Project" ? "main-content" : path);
    const prefix = path.split(".")[0];
    setSection(
      prefix === "responses" || prefix === "limits"
        ? "Adaptation"
        : prefix === "placements"
          ? "Placement"
          : prefix === "micro"
            ? "Micro"
            : prefix === "steps" || prefix === "phases"
              ? "Build order"
              : "Overview",
    );
    setMessage(`Editing source: ${path}`);
    requestAnimationFrame(() =>
      document
        .getElementById(path)
        ?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
  }
  return (
    <div className="app-shell adaptive-shell">
      <aside className="sidebar">
        <div className="brand">
          AI Workshop<small>Adaptive strategy editor</small>
        </div>
        <nav aria-label="Editor sections">
          {navigation.map(({ name, Icon }) => (
            <button
              key={name}
              aria-current={section === name ? "page" : undefined}
              onClick={() => {
                setSection(name);
                setSource("");
              }}
            >
              <Icon size={22} />
              {name}
            </button>
          ))}
        </nav>
        <div className="local-status">
          <Laptop size={22} />
          <div>
            Local project · v2<small>{storageStatus}</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="toolbar">
          <label className="bot-name">
            Bot name
            <input
              aria-label="Bot name"
              value={project.name}
              maxLength={48}
              onChange={(e) => edit({ ...project, name: e.target.value })}
            />
          </label>
          <span className="status-pill">
            Experimental · Native DE: unverified
          </span>
          <div className="toolbar-actions">
            <button onClick={undo} disabled={!canUndo}>
              <Undo2 size={18} />
              Undo
            </button>
            <button onClick={redo} disabled={!canRedo}>
              <Redo2 size={18} />
              Redo
            </button>
            <button onClick={() => fileRef.current?.click()}>
              <FolderOpen size={18} />
              Open
            </button>
            <button onClick={save}>
              <Save size={18} />
              Save project
            </button>
            <button className="primary" onClick={() => setSection("Export")}>
              <Download size={18} />
              Export bot
            </button>
          </div>
          <input
            ref={fileRef}
            aria-label="Open project file"
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              void open(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </header>
        {recoveryDraft !== null && (
          <div className="message" role="status">
            <span>A damaged draft has been preserved.</span>
            <button
              onClick={() =>
                download(
                  "AI-Workshop-v2-recovery.txt",
                  recoveryDraft,
                  "text/plain",
                )
              }
            >
              Download recovery copy
            </button>
          </div>
        )}
        {message && (
          <div className="message" role="status">
            <span>{message}</span>
            <button aria-label="Dismiss message" onClick={() => setMessage("")}>
              <X size={18} />
            </button>
          </div>
        )}
        <div className="content-grid">
          <main id="main-content">
            {errors.length > 0 && (
              <div className="validation-banner" role="alert">
                <strong>Resolve these settings before exporting</strong>
                {errors.map((d, i) => (
                  <p key={i}>
                    <button
                      className="text-button"
                      onClick={() => jump(d.path)}
                    >
                      {d.path || "Project"}
                    </button>{" "}
                    {d.message}
                  </p>
                ))}
              </div>
            )}
            {section === "Export" ? (
              <>
                <PageHeading
                  title="Take your strategy into DE"
                  subtitle="Native scripts, editable project, and a repeatable Windows test kit."
                />
                <Panel
                  title="Experimental native export"
                  description="No game build has been certified. Compiler checks do not establish gameplay compatibility."
                >
                  <p>
                    Choose the matching civilization on Arabia, with standard
                    resources, Dark Age start and 200 population.
                  </p>
                  <div className="inline-actions">
                    <button
                      className="primary"
                      disabled={!compiled.script || errors.length > 0}
                      onClick={exportBot}
                    >
                      Download bot ZIP
                    </button>
                    <button
                      onClick={() =>
                        downloadZip(
                          "Workshop-Windows-Test-Kit.zip",
                          nativeKitFiles(),
                        )
                      }
                    >
                      Download Windows test kit
                    </button>
                  </div>
                </Panel>
                <Panel
                  title="Generated script"
                  description="Every mapped rule links back to its authoring control."
                >
                  <label className="select-label">
                    Show source
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    >
                      <option value="">Entire script</option>
                      {Array.from(
                        new Set(
                          compiled.sourceMap.map((m) => String(m.source)),
                        ),
                      ).map((path) => (
                        <option key={path}>{path}</option>
                      ))}
                    </select>
                  </label>
                  {source && (
                    <button onClick={() => jump(source)}>
                      Edit this source
                    </button>
                  )}
                  <pre tabIndex={0} aria-label="Generated AI script">
                    <code>
                      {compiled.script
                        ? source
                          ? compiled.sourceMap
                              .filter((m) => m.source === source)
                              .map((m) =>
                                compiled.script
                                  .split(/\r?\n/)
                                  .slice(m.startLine - 1, m.endLine)
                                  .join("\n"),
                              )
                              .join("\n\n")
                          : compiled.script
                        : "Fix project errors to generate a script."}
                    </code>
                  </pre>
                </Panel>
              </>
            ) : section === "Testing" ? (
              <AdaptiveTesting project={project} />
            ) : (
              <AdaptiveEditor
                focusPath={source}
                section={section}
                project={project}
                edit={edit}
                onPreset={(civ) => {
                  edit(createPreset(civ));
                  setSource("");
                  setMessage(
                    "Opened a new preset. Undo restores your previous project.",
                  );
                }}
                onLegacy={() => onLegacy()}
              />
            )}
          </main>
          <aside className="inspector" aria-label="Strategy explanation">
            <h2>A plan that can recover</h2>
            <ol className="strategy-steps">
              <li>
                <h3>Observe the result</h3>
                <p>
                  A queued order is not a completed step. Replace losses and
                  wait for real progress.
                </p>
              </li>
              <li>
                <h3>Respond within your limits</h3>
                <p>
                  Repair and defend first. Use only the alternatives and
                  spending you allow.
                </p>
              </li>
              <li>
                <h3>Return when safe</h3>
                <p>
                  Recovery thresholds and cooldowns keep the bot from repeatedly
                  switching plans.
                </p>
              </li>
            </ol>
            {compiled.diagnostics
              .filter((d) => d.severity === "warning")
              .map((d, i) => (
                <p key={i} className="help">
                  <button className="text-button" onClick={() => jump(d.path)}>
                    {d.path}
                  </button>
                  : {d.message}
                </p>
              ))}
            <GameNotice />
          </aside>
        </div>
      </div>
    </div>
  );
}
