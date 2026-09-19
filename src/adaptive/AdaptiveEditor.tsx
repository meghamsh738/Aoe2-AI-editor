import { useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { PageHeading, Panel, NumberField } from "../components";
import {
  AGE_ORDER,
  BUILDINGS,
  RESEARCH,
  UNITS,
  RESOURCES,
  PLACEMENT_ANCHORS,
  PLACEMENT_DIRECTIONS,
  RESPONSE_KINDS,
  TARGET_PRIORITIES,
  type AdaptiveProject,
  type AgeKey,
  type ResourceAllocation,
  type ResourceAmounts,
  type StrategyStep,
  type PlacementPolicy,
  type ResponseAction,
  type ResponseRule,
  type MicroModule,
} from "../../packages/compiler/v2/model";
export type AdaptiveSection =
  | "Overview"
  | "Build order"
  | "Adaptation"
  | "Placement"
  | "Micro"
  | "Testing"
  | "Export";
const phaseName: Record<AgeKey, string> = {
  dark: "Dark Age",
  feudal: "Feudal Age",
  castle: "Castle Age",
  imperial: "Imperial Age",
  postImperial: "Post-Imperial",
};
const readable = (text: string) =>
  text
    .replace(/^ri-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (x) => x.toUpperCase());
function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <label className="select-label" htmlFor={id}>
      {label}
      <select
        aria-label={label}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {readable(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="check-label">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="select-label">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Allocation({
  value,
  onChange,
  amounts = false,
  label = "Resource shares",
}: {
  value: ResourceAllocation | ResourceAmounts;
  onChange: (value: ResourceAllocation) => void;
  amounts?: boolean;
  label?: string;
}) {
  return (
    <fieldset className="allocation">
      <legend>{label}</legend>
      <div className="resource-fields">
        {RESOURCES.map((resource) => (
          <NumberField
            key={resource}
            label={readable(resource)}
            value={value[resource]}
            min={0}
            max={amounts ? 200000 : 100}
            suffix={amounts ? undefined : "%"}
            onChange={(n) => onChange({ ...value, [resource]: n })}
          />
        ))}
      </div>
      {!amounts && (
        <>
          <div className="resource-bar" aria-hidden="true">
            {RESOURCES.map((resource) => (
              <span
                key={resource}
                className={resource}
                style={{
                  width: `${Number.isFinite(value[resource]) ? value[resource] : 0}%`,
                }}
              />
            ))}
          </div>
          <p className="help">
            Total:{" "}
            {RESOURCES.reduce(
              (n, resource) =>
                n + (Number.isFinite(value[resource]) ? value[resource] : 0),
              0,
            )}
            % · Must equal 100%.
          </p>
        </>
      )}
    </fieldset>
  );
}
const zero = { food: 0, wood: 0, gold: 0, stone: 0 };
function unique(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
export function AdaptiveEditor({
  section,
  project,
  edit,
  onPreset,
  onLegacy,
  focusPath = "",
}: {
  focusPath?: string;
  section: AdaptiveSection;
  project: AdaptiveProject;
  edit: (p: AdaptiveProject) => void;
  onPreset: (civ: "britons" | "portuguese") => void;
  onLegacy: () => void;
}) {
  const [phase, setPhase] = useState<AgeKey>("dark");
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    if (!focusPath) return;
    const parts = focusPath.split(".");
    if (parts[0] === "phases" && AGE_ORDER.includes(parts[1] as AgeKey))
      setPhase(parts[1] as AgeKey);
    if (parts[0] === "steps" && project.steps[Number(parts[1])])
      setPhase(project.steps[Number(parts[1])].phase);
  }, [focusPath, project.steps]);
  useEffect(() => {
    if (!focusPath) return;
    const id = focusPath.split(".").slice(0, 2).join(".");
    const frame = requestAnimationFrame(() => {
      const node =
        document.getElementById(id) ??
        document.getElementById(focusPath.split(".")[0]);
      if (node) {
        const details = node.querySelector("details");
        if (details) details.open = true;
        node.scrollIntoView({ block: "center" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focusPath, phase, section]);
  function change(update: (p: AdaptiveProject) => void) {
    const next = structuredClone(project);
    update(next);
    edit(next);
  }
  function insertStep(p: AdaptiveProject, step: StrategyStep) {
    const nextPhase = p.steps.findIndex(
      (s) => AGE_ORDER.indexOf(s.phase) > AGE_ORDER.indexOf(step.phase),
    );
    p.steps.splice(nextPhase < 0 ? p.steps.length : nextPhase, 0, step);
  }
  function stepEdit(index: number, patch: Partial<StrategyStep>) {
    change((p) => {
      p.steps[index] = { ...p.steps[index], ...patch } as StrategyStep;
    });
  }
  function responseEdit(index: number, patch: Partial<ResponseRule>) {
    change((p) => {
      p.responses[index] = { ...p.responses[index], ...patch };
    });
  }
  function move<T>(items: T[], from: number, delta: number) {
    const to = from + delta;
    if (to < 0 || to >= items.length) return;
    [items[from], items[to]] = [items[to], items[from]];
  }
  const phaseTabs = (
    <div className="phase-timeline" role="tablist" aria-label="Strategy phase">
      {AGE_ORDER.map((age) => (
        <button
          role="tab"
          key={age}
          aria-selected={phase === age}
          onClick={() => setPhase(age)}
        >
          {phaseName[age]}
          <small>{project.phases[age].villagers} villagers</small>
        </button>
      ))}
    </div>
  );
  if (section === "Overview")
    return (
      <>
        <PageHeading
          title="Build a strategy that adapts"
          subtitle="Choose an opening. Shape how it develops, responds, and recovers."
        />
        <div className="preset-grid">
          <Panel
            title="Britons · Ranged development"
            description="Develop an archer army, expand in Castle Age, and support your Imperial force."
          >
            <button className="primary" onClick={() => onPreset("britons")}>
              Use Britons preset
            </button>
          </Panel>
          <Panel
            title="Portuguese · Fast Castle"
            description="A Phosphoru-inspired Organ Gun opening with recovery and defensive placement."
          >
            <button className="primary" onClick={() => onPreset("portuguese")}>
              Use Portuguese preset
            </button>
          </Panel>
        </div>
        <Panel
          title={`Current strategy · ${readable(project.civilization)}`}
          description="Arabia-style 1v1 · Standard resources · Dark Age start · 200 population"
        >
          {phaseTabs}
          <p className="help">
            {project.phases[phase].milestone ||
              "Progress is based on completed outcomes."}{" "}
            Post-Imperial is a development phase within Imperial Age.
          </p>
          <div className="summary-stats">
            <span>
              <strong>{project.steps.filter((s) => s.enabled).length}</strong>{" "}
              build steps
            </span>
            <span>
              <strong>
                {project.responses.filter((r) => r.enabled).length}
              </strong>{" "}
              enabled responses
            </span>
            <span>
              <strong>{project.placements.length}</strong> placement policies
            </span>
          </div>
        </Panel>
        <Panel title="Your choices remain in charge">
          <p>
            Emergency responses use the limits you set. The bot can repair its
            economy and defend, then use approved alternatives when needed.
            Enemy reactions depend on scouting and remembered sightings.
          </p>
          <p className="help">
            Opening a preset replaces this workspace draft; Undo restores it.
            Save project keeps a portable copy.
          </p>
        </Panel>
        <Panel title="Existing projects">
          <p>
            Your original version-1 Feudal project is kept in its own workspace.
            Open it there and choose “Upgrade a copy” when ready.
          </p>
          <button onClick={onLegacy}>Open version-1 editor</button>
        </Panel>
      </>
    );
  if (section === "Build order")
    return (
      <>
        <div id="steps" />
        <div id="phases" />
        <PageHeading
          title="From opening to late game"
          subtitle="Set outcomes, then decide the order in which to pursue them."
        />
        {phaseTabs}
        <section id={`phases.${phase}`}>
          <Panel title={`${phaseName[phase]} economy`}>
            <Select
              label="Phase milestone"
              value={project.phases[phase].milestone ?? "none"}
              options={[
                "none",
                ...project.steps
                  .filter((s) => s.kind === "milestone")
                  .map((s) => (s.kind === "milestone" ? s.milestone : "")),
              ]}
              onChange={(value) =>
                change((p) => {
                  p.phases[phase].milestone =
                    value === "none" ? undefined : value;
                })
              }
            />
            <NumberField
              label="Villager target"
              value={project.phases[phase].villagers}
              min={4}
              max={200}
              onChange={(n) =>
                change((p) => {
                  p.phases[phase].villagers = n;
                })
              }
            />
            <Allocation
              value={project.phases[phase].resources}
              onChange={(value) =>
                change((p) => {
                  p.phases[phase].resources = value;
                })
              }
            />
          </Panel>
        </section>
        <div className="section-title">
          <h2>Ordered outcomes</h2>
          <Check
            label="Advanced controls"
            checked={advanced}
            onChange={setAdvanced}
          />
        </div>
        {project.steps.map((step, index) =>
          step.phase !== phase ? null : (
            <section
              className="panel step-card"
              id={`steps.${index}`}
              key={step.id}
            >
              <div className="card-heading">
                <span className="step-number">{index + 1}</span>
                <h3>{step.label}</h3>
                <div className="inline-actions">
                  <button
                    aria-label={`Move ${step.label} earlier`}
                    disabled={
                      index === 0 || project.steps[index - 1].phase !== phase
                    }
                    onClick={() => change((p) => move(p.steps, index, -1))}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    aria-label={`Move ${step.label} later`}
                    disabled={
                      index === project.steps.length - 1 ||
                      project.steps[index + 1].phase !== phase
                    }
                    onClick={() => change((p) => move(p.steps, index, 1))}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    aria-label={`Remove ${step.label}`}
                    onClick={() =>
                      change((p) => {
                        p.steps.splice(index, 1);
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <Check
                label="Enabled"
                checked={step.enabled}
                onChange={(enabled) => stepEdit(index, { enabled })}
              />
              <div className="two-fields">
                <Text
                  label="Step name"
                  value={step.label}
                  onChange={(label) => stepEdit(index, { label })}
                />
                <Select
                  label="Outcome"
                  value={step.kind}
                  options={[
                    "build",
                    "train",
                    "research",
                    "allocate",
                    "milestone",
                  ]}
                  onChange={(kind) =>
                    change((p) => {
                      const base = {
                        id: step.id,
                        label: step.label,
                        phase: step.phase,
                        priority: step.priority,
                        enabled: step.enabled,
                      };
                      p.steps[index] =
                        kind === "build"
                          ? { ...base, kind, building: "house", count: 1 }
                          : kind === "train"
                            ? { ...base, kind, unit: "archer", count: 10 }
                            : kind === "research"
                              ? { ...base, kind, research: "loom" }
                              : kind === "allocate"
                                ? {
                                    ...base,
                                    kind,
                                    resources: { ...p.phases[phase].resources },
                                  }
                                : {
                                    ...base,
                                    kind,
                                    milestone: unique("milestone"),
                                  };
                    })
                  }
                />
              </div>
              {step.kind === "build" && (
                <div className="two-fields">
                  <Select
                    label="Building"
                    value={step.building}
                    options={BUILDINGS}
                    onChange={(building) =>
                      stepEdit(index, { building, placementId: undefined })
                    }
                  />
                  <NumberField
                    label="Completed target"
                    value={step.count}
                    min={1}
                    max={200}
                    onChange={(count) => stepEdit(index, { count })}
                  />
                  <label className="select-label">
                    Placement policy
                    <select
                      value={step.placementId ?? ""}
                      onChange={(e) =>
                        change((p) => {
                          const target = p.steps[index];
                          if (target.kind === "build") {
                            if (e.target.value)
                              target.placementId = e.target.value;
                            else delete target.placementId;
                          }
                        })
                      }
                    >
                      <option value="">Native default</option>
                      {project.placements
                        .filter((policy) => policy.building === step.building)
                        .map((policy) => (
                          <option key={policy.id} value={policy.id}>
                            {policy.label}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              )}
              {step.kind === "train" && (
                <div className="two-fields">
                  <Select
                    label="Only train while building is missing"
                    value={step.whileBuildingMissing ?? "no-condition"}
                    options={["no-condition", ...BUILDINGS]}
                    onChange={(value) =>
                      stepEdit(index, {
                        whileBuildingMissing:
                          value === "no-condition" ? undefined : value,
                      })
                    }
                  />
                  <Select
                    label="Production building"
                    value={step.productionBuilding ?? "automatic"}
                    options={["automatic", ...BUILDINGS]}
                    onChange={(value) =>
                      stepEdit(index, {
                        productionBuilding:
                          value === "automatic" ? undefined : value,
                      })
                    }
                  />
                  <Select
                    label="Unit"
                    value={step.unit}
                    options={UNITS}
                    onChange={(unit) => stepEdit(index, { unit })}
                  />
                  <NumberField
                    label="Completed target"
                    value={step.count}
                    min={1}
                    max={200}
                    onChange={(count) => stepEdit(index, { count })}
                  />
                </div>
              )}
              {step.kind === "research" && (
                <Select
                  label="Technology"
                  value={step.research}
                  options={RESEARCH}
                  onChange={(research) => stepEdit(index, { research })}
                />
              )}
              {step.kind === "allocate" && (
                <>
                  <Allocation
                    value={step.resources}
                    onChange={(resources) => stepEdit(index, { resources })}
                  />
                  <NumberField
                    label="Worker target (0 uses phase target)"
                    value={step.villagerCount ?? 0}
                    min={0}
                    max={200}
                    onChange={(villagerCount) =>
                      stepEdit(index, { villagerCount })
                    }
                  />
                </>
              )}
              {step.kind === "milestone" && (
                <p className="help">
                  A checkpoint after the preceding outcomes. Completion must be
                  observed before progression.
                </p>
              )}
              {advanced && (
                <div className="two-fields">
                  <Select
                    label="Phase"
                    value={step.phase}
                    options={AGE_ORDER}
                    onChange={(phase) =>
                      change((p) => {
                        const [moved] = p.steps.splice(index, 1);
                        moved.phase = phase;
                        insertStep(p, moved);
                      })
                    }
                  />
                  <NumberField
                    label="Priority"
                    value={step.priority}
                    min={0}
                    max={100}
                    onChange={(priority) => stepEdit(index, { priority })}
                  />
                </div>
              )}
              <p className="help">
                {step.kind === "research"
                  ? "Request once available; completion is observed separately."
                  : "Queued production counts toward requests. A queued order alone does not complete the outcome."}
              </p>
            </section>
          ),
        )}
        <button
          onClick={() =>
            change((p) => {
              insertStep(p, {
                id: unique("step"),
                label: "New building outcome",
                phase,
                priority: 20,
                enabled: true,
                kind: "build",
                building: "house",
                count: 1,
              });
            })
          }
        >
          <Plus size={18} />
          Add build step
        </button>
      </>
    );
  if (section === "Adaptation")
    return (
      <>
        <PageHeading
          title="When the plan is interrupted"
          subtitle="Define what the bot may change, and when it should return."
        />
        <div id="responses" />
        <section id="limits">
          <Check
            label="Require strict placement for every policy"
            checked={project.limits.strictPlacement}
            onChange={(value) =>
              change((p) => {
                p.limits.strictPlacement = value;
              })
            }
          />
          <Panel title="Creator limits">
            <div className="check-fields">
              <Check
                label="Allow approved strategy pivots"
                checked={project.limits.allowPivots}
                onChange={(n) =>
                  change((p) => {
                    p.limits.allowPivots = n;
                  })
                }
              />
              <Check
                label="Allow emergency spending"
                checked={project.limits.allowEmergencySpend}
                onChange={(n) =>
                  change((p) => {
                    p.limits.allowEmergencySpend = n;
                  })
                }
              />
            </div>
            <Allocation
              value={project.limits.maxEmergencySpend}
              amounts
              label="Maximum emergency allowance"
              onChange={(value) =>
                change((p) => {
                  p.limits.maxEmergencySpend = value;
                })
              }
            />
            <div className="two-fields">
              <NumberField
                label="Minimum response duration"
                value={project.limits.minimumResponseSeconds}
                min={2}
                max={600}
                suffix="s"
                onChange={(n) =>
                  change((p) => {
                    p.limits.minimumResponseSeconds = n;
                  })
                }
              />
              <NumberField
                label="Concurrent responses"
                value={project.limits.maxConcurrentResponses}
                min={1}
                max={8}
                onChange={(n) =>
                  change((p) => {
                    p.limits.maxConcurrentResponses = n;
                  })
                }
              />
            </div>
          </Panel>
        </section>
        {project.responses.map((response, index) => (
          <section
            className="panel response-card"
            id={`responses.${index}`}
            key={response.id}
          >
            <div className="card-heading">
              <h2>{response.label}</h2>
              <Check
                label="Enabled"
                checked={response.enabled}
                onChange={(enabled) => responseEdit(index, { enabled })}
              />
            </div>
            <p className="help">
              When {readable(response.trigger.kind).toLowerCase()} persists for{" "}
              {response.trigger.sustainedSeconds}s, request the allowed actions.
              Cooldown: {response.cooldownSeconds}s.
            </p>
            <div className="response-flow">
              <span>Observe</span>
              <span aria-hidden="true">→</span>
              <span>
                {response.actions.map((a) => readable(a.kind)).join(" + ")}
              </span>
              <span aria-hidden="true">→</span>
              <span>Recover</span>
            </div>
            <details>
              <summary>Edit response conditions and actions</summary>
              <Text
                label="Response name"
                value={response.label}
                onChange={(label) => responseEdit(index, { label })}
              />
              <div className="two-fields">
                <Select
                  label="When"
                  value={response.trigger.kind}
                  options={RESPONSE_KINDS}
                  onChange={(kind) =>
                    responseEdit(index, {
                      trigger: {
                        ...response.trigger,
                        kind,
                        ...(kind.startsWith("resource-")
                          ? { resource: response.trigger.resource ?? "gold" }
                          : {}),
                        ...(kind === "counter-army"
                          ? { unit: response.trigger.unit ?? "archer" }
                          : {}),
                      },
                    })
                  }
                />
                <NumberField
                  label="Trigger threshold"
                  value={response.trigger.threshold ?? 0}
                  min={0}
                  max={200000}
                  onChange={(threshold) =>
                    responseEdit(index, {
                      trigger: { ...response.trigger, threshold },
                    })
                  }
                />
                <NumberField
                  label="Must persist for"
                  value={response.trigger.sustainedSeconds}
                  min={0}
                  max={3600}
                  suffix="s"
                  onChange={(sustainedSeconds) =>
                    responseEdit(index, {
                      trigger: { ...response.trigger, sustainedSeconds },
                    })
                  }
                />
                <Select
                  label="Sighting evidence"
                  value={response.trigger.observation}
                  options={["observed", "remembered", "either"]}
                  onChange={(observation) =>
                    responseEdit(index, {
                      trigger: { ...response.trigger, observation },
                    })
                  }
                />
                {response.trigger.kind === "counter-army" && (
                  <Select
                    label="Observed enemy unit"
                    value={response.trigger.unit ?? "archer"}
                    options={UNITS}
                    onChange={(unit) =>
                      responseEdit(index, {
                        trigger: { ...response.trigger, unit },
                      })
                    }
                  />
                )}{" "}
                {response.trigger.kind.startsWith("resource-") && (
                  <Select
                    label="Affected resource"
                    value={response.trigger.resource ?? "gold"}
                    options={RESOURCES}
                    onChange={(resource) =>
                      responseEdit(index, {
                        trigger: { ...response.trigger, resource },
                      })
                    }
                  />
                )}
              </div>
              <h3>Allowed actions</h3>
              {response.actions.map((action, actionIndex) => (
                <div className="action-row" key={actionIndex}>
                  <ActionEditor
                    action={action}
                    project={project}
                    change={(next) =>
                      change((p) => {
                        p.responses[index].actions[actionIndex] = next;
                      })
                    }
                  />
                  <button
                    aria-label={`Remove action ${actionIndex + 1} from ${response.label}`}
                    disabled={response.actions.length === 1}
                    onClick={() =>
                      change((p) => {
                        p.responses[index].actions.splice(actionIndex, 1);
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  change((p) => {
                    p.responses[index].actions.push({
                      kind: "defend",
                      priority: 80,
                    });
                  })
                }
              >
                <Plus size={16} />
                Add response action
              </button>
              <div className="two-fields">
                <Select
                  label="Recovery condition"
                  value={response.recovery.kind}
                  options={
                    project.steps.some((s) => s.kind === "milestone")
                      ? ["threshold", "timeout", "milestone"]
                      : ["threshold", "timeout"]
                  }
                  onChange={(kind) =>
                    responseEdit(index, {
                      recovery:
                        kind === "threshold"
                          ? { kind, threshold: 0 }
                          : kind === "timeout"
                            ? { kind, afterSeconds: 60 }
                            : {
                                kind,
                                milestone:
                                  project.steps.find(
                                    (s) => s.kind === "milestone",
                                  )?.milestone ?? "unknown",
                              },
                    })
                  }
                />
                {response.recovery.kind === "threshold" && (
                  <NumberField
                    label="Recovered threshold"
                    value={response.recovery.threshold}
                    min={0}
                    max={200000}
                    onChange={(threshold) =>
                      responseEdit(index, {
                        recovery: { kind: "threshold", threshold },
                      })
                    }
                  />
                )}{" "}
                {response.recovery.kind === "timeout" && (
                  <NumberField
                    label="Recovery timeout"
                    value={response.recovery.afterSeconds}
                    min={1}
                    max={3600}
                    suffix="s"
                    onChange={(afterSeconds) =>
                      responseEdit(index, {
                        recovery: { kind: "timeout", afterSeconds },
                      })
                    }
                  />
                )}{" "}
                {response.recovery.kind === "milestone" && (
                  <Select
                    label="Recovery milestone"
                    value={response.recovery.milestone}
                    options={project.steps
                      .filter((s) => s.kind === "milestone")
                      .map((s) => s.milestone)}
                    onChange={(milestone) =>
                      responseEdit(index, {
                        recovery: { kind: "milestone", milestone },
                      })
                    }
                  />
                )}
                <NumberField
                  label="Cooldown"
                  value={response.cooldownSeconds}
                  min={0}
                  max={3600}
                  suffix="s"
                  onChange={(cooldownSeconds) =>
                    responseEdit(index, { cooldownSeconds })
                  }
                />
                <NumberField
                  label="Response priority"
                  value={response.priority}
                  min={0}
                  max={100}
                  onChange={(priority) => responseEdit(index, { priority })}
                />
                <NumberField
                  label="Maximum duration"
                  value={response.limits.maxDurationSeconds}
                  min={5}
                  max={3600}
                  suffix="s"
                  onChange={(maxDurationSeconds) =>
                    responseEdit(index, {
                      limits: { ...response.limits, maxDurationSeconds },
                    })
                  }
                />
                <NumberField
                  label="Maximum workers"
                  value={response.limits.maxWorkers}
                  min={0}
                  max={50}
                  onChange={(maxWorkers) =>
                    responseEdit(index, {
                      limits: { ...response.limits, maxWorkers },
                    })
                  }
                />
              </div>
              <Check
                label="Permit this response to pivot"
                checked={response.limits.allowPivot}
                onChange={(allowPivot) =>
                  responseEdit(index, {
                    limits: { ...response.limits, allowPivot },
                  })
                }
              />
              <Allocation
                value={response.limits.emergencySpend}
                amounts
                label="This response's spending allowance"
                onChange={(emergencySpend) =>
                  responseEdit(index, {
                    limits: { ...response.limits, emergencySpend },
                  })
                }
              />
              <button
                onClick={() =>
                  change((p) => {
                    p.responses.splice(index, 1);
                  })
                }
              >
                Remove response
              </button>
            </details>
          </section>
        ))}
        <button
          onClick={() =>
            change((p) =>
              p.responses.push({
                id: unique("response"),
                label: "New recovery response",
                enabled: false,
                priority: 70,
                trigger: {
                  kind: "raid",
                  threshold: 3,
                  sustainedSeconds: 5,
                  observation: "observed",
                },
                actions: [{ kind: "defend", priority: 80 }],
                recovery: { kind: "threshold", threshold: 0 },
                cooldownSeconds: 60,
                limits: {
                  maxDurationSeconds: 120,
                  maxWorkers: 0,
                  emergencySpend: { ...zero },
                  allowPivot: false,
                },
              }),
            )
          }
        >
          <Plus size={18} />
          Add response rule
        </button>
      </>
    );
  if (section === "Placement")
    return (
      <>
        <div id="placements" />
        <PageHeading
          title="Give each building a purpose"
          subtitle="Choose preferred regions and an explicit fallback order."
        />
        <p className="section-intro">
          These diagrams illustrate intent, not a generated map. Native
          placement can expand its search; unsupported strict geometry blocks
          export.
        </p>
        {project.placements.map((policy, index) => (
          <section className="panel" id={`placements.${index}`} key={policy.id}>
            <div className="card-heading">
              <h2>{policy.label}</h2>
            </div>
            <PlacementDiagram policy={policy} />
            <Text
              label="Policy name"
              value={policy.label}
              onChange={(label) =>
                change((p) => {
                  p.placements[index].label = label;
                })
              }
            />
            <div className="two-fields">
              <Select
                label="Building"
                value={policy.building}
                options={BUILDINGS}
                onChange={(building) =>
                  change((p) => {
                    p.placements[index].building = building;
                  })
                }
              />
              <Select
                label="Anchor"
                value={policy.anchor}
                options={PLACEMENT_ANCHORS}
                onChange={(anchor) =>
                  change((p) => {
                    p.placements[index].anchor = anchor;
                    if (anchor === "resource")
                      p.placements[index].resource ??= "gold";
                  })
                }
              />
              <Select
                label="Direction"
                value={policy.direction}
                options={PLACEMENT_DIRECTIONS}
                onChange={(direction) =>
                  change((p) => {
                    p.placements[index].direction = direction;
                  })
                }
              />
              <NumberField
                label="Preferred distance"
                value={policy.distance}
                min={-254}
                max={254}
                suffix="tiles"
                onChange={(distance) =>
                  change((p) => {
                    p.placements[index].distance = distance;
                  })
                }
              />
              <NumberField
                label="Spacing preference"
                value={policy.spacing}
                min={0}
                max={20}
                suffix="tiles"
                onChange={(spacing) =>
                  change((p) => {
                    p.placements[index].spacing = spacing;
                  })
                }
              />
              {(policy.anchor === "production" ||
                policy.anchor === "resource") && (
                <Select
                  label="Anchor building"
                  value={policy.anchorBuilding ?? "automatic"}
                  options={["automatic", ...BUILDINGS]}
                  onChange={(value) =>
                    change((p) => {
                      p.placements[index].anchorBuilding =
                        value === "automatic"
                          ? undefined
                          : (value as NonNullable<
                              PlacementPolicy["anchorBuilding"]
                            >);
                    })
                  }
                />
              )}
              {policy.anchor === "resource" && (
                <Select
                  label="Resource"
                  value={policy.resource ?? "gold"}
                  options={RESOURCES}
                  onChange={(resource) =>
                    change((p) => {
                      p.placements[index].resource = resource;
                    })
                  }
                />
              )}
            </div>
            <Check
              label="Require strict geometry (export only when supported)"
              checked={policy.strict}
              onChange={(strict) =>
                change((p) => {
                  p.placements[index].strict = strict;
                })
              }
            />
            <Check
              label="Use observed placement information only"
              checked={policy.observedOnly}
              onChange={(observedOnly) =>
                change((p) => {
                  p.placements[index].observedOnly = observedOnly;
                })
              }
            />
            <h3 className="spaced-heading">Approved fallbacks, in order</h3>
            {policy.fallback.map((fallback, fi) => (
              <div key={fi} className="fallback-row">
                <span>{fi + 1}</span>
                <Select
                  label="Fallback anchor"
                  value={fallback.anchor}
                  options={PLACEMENT_ANCHORS}
                  onChange={(anchor) =>
                    change((p) => {
                      p.placements[index].fallback[fi].anchor = anchor;
                    })
                  }
                />
                <Select
                  label="Fallback direction"
                  value={fallback.direction}
                  options={PLACEMENT_DIRECTIONS}
                  onChange={(direction) =>
                    change((p) => {
                      p.placements[index].fallback[fi].direction = direction;
                    })
                  }
                />
                <NumberField
                  label="Fallback distance"
                  value={fallback.distance}
                  min={-254}
                  max={254}
                  onChange={(distance) =>
                    change((p) => {
                      p.placements[index].fallback[fi].distance = distance;
                    })
                  }
                />
                <button
                  aria-label={`Move fallback ${fi + 1} earlier`}
                  disabled={fi === 0}
                  onClick={() =>
                    change((p) => move(p.placements[index].fallback, fi, -1))
                  }
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  aria-label={`Remove fallback ${fi + 1}`}
                  onClick={() =>
                    change((p) => {
                      p.placements[index].fallback.splice(fi, 1);
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="inline-actions">
              <button
                disabled={policy.fallback.length >= 5}
                onClick={() =>
                  change((p) => {
                    p.placements[index].fallback.push({
                      anchor: "home-town-center",
                      direction: "around",
                      distance: 0,
                      spacing: 0,
                    });
                  })
                }
              >
                Add approved fallback
              </button>
              <button
                onClick={() =>
                  change((p) => {
                    p.placements.splice(index, 1);
                  })
                }
              >
                Remove placement policy
              </button>
            </div>
            <p className="help">
              If all approved choices fail, the affected step remains blocked.
              No silent switch to unrestricted placement.
            </p>
          </section>
        ))}
        <button
          onClick={() =>
            change((p) => {
              p.placements.push({
                id: unique("placement"),
                label: "New placement policy",
                building: "house",
                anchor: "home-town-center",
                direction: "behind",
                distance: 10,
                spacing: 0,
                strict: false,
                observedOnly: true,
                fallback: [],
              });
            })
          }
        >
          <Plus size={18} />
          Add placement policy
        </button>
      </>
    );
  return (
    <>
      <div id="micro" />
      <PageHeading
        title="Shape how your army fights"
        subtitle="Editable core behaviours with one controller per group."
      />
      <Panel
        title="Reaction budget"
        description="Searches and commands are bounded. Faster reactions do not provide hidden enemy information."
      >
        <NumberField
          label="Global reaction interval"
          value={project.micro.globalReactionIntervalSeconds}
          min={2}
          max={60}
          suffix="s"
          onChange={(n) =>
            change((p) => {
              p.micro.globalReactionIntervalSeconds = n;
            })
          }
        />
      </Panel>
      {(["ranged", "melee", "screening", "siege"] as const).map((key) => {
        const module = project.micro[key];
        const update = (patch: Partial<MicroModule>) =>
          change((p) => {
            p.micro[key] = { ...p.micro[key], ...patch };
          });
        return (
          <section className="panel" id={`micro.${key}`} key={key}>
            <div className="card-heading">
              <h2>
                {
                  {
                    ranged: "Ranged focus and retreat",
                    melee: "Melee control",
                    screening: "Screen and regroup",
                    siege: "Siege protection",
                  }[key]
                }
              </h2>
              <Check
                label="Enabled"
                checked={module.enabled}
                onChange={(enabled) => update({ enabled })}
              />
            </div>
            <div className="two-fields">
              <Select
                label="Aggression"
                value={module.aggression}
                options={["cautious", "balanced", "aggressive"]}
                onChange={(aggression) => update({ aggression })}
              />
              <NumberField
                label="Group size"
                value={module.groupSize}
                min={1}
                max={40}
                onChange={(groupSize) => update({ groupSize })}
              />
              <NumberField
                label="Retreat below health"
                value={module.retreatHealthPercent}
                min={0}
                max={100}
                suffix="%"
                onChange={(retreatHealthPercent) =>
                  update({ retreatHealthPercent })
                }
              />
              <NumberField
                label="Regroup duration"
                value={module.regroupSeconds}
                min={2}
                max={120}
                suffix="s"
                onChange={(regroupSeconds) => update({ regroupSeconds })}
              />
              <NumberField
                label="Search interval"
                value={module.searchIntervalSeconds}
                min={2}
                max={60}
                suffix="s"
                onChange={(searchIntervalSeconds) =>
                  update({ searchIntervalSeconds })
                }
              />
            </div>
            <details>
              <summary>Edit target priority order</summary>
              {module.targetPriorities.map((priority, index) => (
                <div className="priority-row" key={index}>
                  <span>{index + 1}</span>
                  <Select
                    label={`Priority ${index + 1}`}
                    value={priority}
                    options={TARGET_PRIORITIES}
                    onChange={(value) => {
                      const priorities = [...module.targetPriorities];
                      priorities[index] = value;
                      update({ targetPriorities: priorities });
                    }}
                  />
                  <button
                    aria-label={`Move priority ${index + 1} earlier`}
                    disabled={index === 0}
                    onClick={() => {
                      const priorities = [...module.targetPriorities];
                      move(priorities, index, -1);
                      update({ targetPriorities: priorities });
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    aria-label={`Remove priority ${index + 1}`}
                    disabled={module.targetPriorities.length === 1}
                    onClick={() =>
                      update({
                        targetPriorities: module.targetPriorities.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                disabled={module.targetPriorities.length >= 7}
                onClick={() =>
                  update({
                    targetPriorities: [...module.targetPriorities, "ranged"],
                  })
                }
              >
                Add target preference
              </button>
            </details>
            <Check
              label="Use observed targets only"
              checked={module.observedOnly}
              onChange={(observedOnly) => update({ observedOnly })}
            />
            <p className="help">
              Uses supported native control. Actual combat behaviour needs the
              Windows test kit. Advanced dodging and monk tricks are outside
              this release.
            </p>
          </section>
        );
      })}
    </>
  );
}
function ActionEditor({
  action,
  project,
  change,
}: {
  action: ResponseAction;
  project: AdaptiveProject;
  change: (action: ResponseAction) => void;
}) {
  return (
    <div className="action-fields">
      <Select
        label="Action"
        value={action.kind}
        options={[
          "defend",
          "retreat",
          "allocate",
          "build",
          "train",
          "pivot",
          "reset-placement",
        ]}
        onChange={(kind) => {
          const priority = action.priority;
          change(
            kind === "build"
              ? { kind, priority, building: "house", count: 1 }
              : kind === "train"
                ? { kind, priority, unit: "spearman-line", count: 3 }
                : kind === "allocate"
                  ? {
                      kind,
                      priority,
                      resources: { food: 50, wood: 30, gold: 20, stone: 0 },
                    }
                  : kind === "pivot"
                    ? { kind, priority, stepIds: [project.steps[0].id] }
                    : kind === "reset-placement"
                      ? { kind, priority, building: "house" }
                      : { kind, priority },
          );
        }}
      />
      {(action.kind === "build" || action.kind === "reset-placement") && (
        <Select
          label="Action building"
          value={action.building}
          options={BUILDINGS}
          onChange={(building) =>
            change(
              action.kind === "build"
                ? { ...action, building, placementId: undefined }
                : { ...action, building },
            )
          }
        />
      )}{" "}
      {action.kind === "build" && (
        <Select
          label="Response placement policy"
          value={action.placementId ?? "native-default"}
          options={[
            "native-default",
            ...project.placements
              .filter((p) => p.building === action.building)
              .map((p) => p.id),
          ]}
          onChange={(value) =>
            change({
              ...action,
              placementId: value === "native-default" ? undefined : value,
            })
          }
        />
      )}
      {action.kind === "train" && (
        <Select
          label="Action unit"
          value={action.unit}
          options={UNITS}
          onChange={(unit) => change({ ...action, unit })}
        />
      )}{" "}
      {(action.kind === "train" || action.kind === "build") && (
        <NumberField
          label="Action target"
          value={action.count}
          min={1}
          max={action.kind === "build" ? 20 : 100}
          onChange={(count) => change({ ...action, count })}
        />
      )}{" "}
      {action.kind === "allocate" && (
        <Allocation
          value={action.resources}
          onChange={(resources) => change({ ...action, resources })}
        />
      )}{" "}
      {action.kind === "pivot" && (
        <fieldset className="check-fields">
          <legend>Allowed alternate steps</legend>
          {project.steps.map((step) => (
            <Check
              key={step.id}
              label={step.label}
              checked={action.stepIds.includes(step.id)}
              onChange={(checked) =>
                change({
                  ...action,
                  stepIds: checked
                    ? [...action.stepIds, step.id]
                    : action.stepIds.filter((id) => id !== step.id),
                })
              }
            />
          ))}
        </fieldset>
      )}
      <NumberField
        label="Action priority"
        value={action.priority}
        min={0}
        max={100}
        onChange={(priority) => change({ ...action, priority })}
      />
    </div>
  );
}
function PlacementDiagram({ policy }: { policy: PlacementPolicy }) {
  const offset = Math.min(100, Math.max(25, Math.abs(policy.distance) * 5));
  const dx =
    policy.direction === "left"
      ? -offset
      : policy.direction === "right"
        ? offset
        : 0;
  const dy =
    policy.direction === "behind"
      ? offset
      : policy.direction === "toward-enemy"
        ? -offset
        : 0;
  return (
    <figure className="placement-figure">
      <svg
        viewBox="0 0 480 300"
        role="img"
        aria-label={`${readable(policy.building)} ${policy.direction}, ${policy.distance} tiles from ${policy.anchor}. Illustrative only.`}
      >
        <defs>
          <pattern
            id={`grid-${policy.id}`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#dce6de" />
          </pattern>
        </defs>
        <rect
          width="480"
          height="300"
          rx="8"
          fill={`url(#grid-${policy.id})`}
        />
        <text x="240" y="22" textAnchor="middle" fill="#596578" fontSize="13">
          Toward known enemy / map centre
        </text>
        <circle
          cx="240"
          cy="150"
          r={offset}
          fill="none"
          stroke="#8ab8a0"
          strokeDasharray="5 5"
        />
        <rect x="220" y="132" width="40" height="36" rx="5" fill="#173c34" />
        <text x="240" y="155" textAnchor="middle" fill="white" fontSize="13">
          Base
        </text>
        <line
          x1="240"
          y1="150"
          x2={240 + dx}
          y2={150 + dy}
          stroke="#ad8531"
          strokeWidth="2"
        />
        <rect
          x={224 + dx}
          y={134 + dy}
          width="32"
          height="32"
          fill="#e9bc59"
          stroke="#9e7625"
          rx="4"
        />
        <text x="240" y="285" textAnchor="middle" fill="#596578" fontSize="13">
          Preferred region · not an exact footprint
        </text>
      </svg>
      <figcaption>
        Anchor: {readable(policy.anchor)} · {readable(policy.direction)} ·{" "}
        {policy.fallback.length} approved fallbacks
      </figcaption>
    </figure>
  );
}
