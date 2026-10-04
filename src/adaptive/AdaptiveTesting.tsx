import { useMemo, useState } from "react";
import {
  type AdaptiveProject,
  BUILDINGS,
  UNITS,
  RESOURCES,
} from "../../packages/compiler/v2/model";
import {
  defaultAdaptiveSituation,
  evaluateAdaptive,
  type AdaptiveSituation,
} from "../../packages/compiler/v2/runtime";
import { NumberField, PageHeading, Panel } from "../components";
import { Allocation } from "./AdaptiveEditor";
import { nativeScenarios, nativeKitFiles } from "./nativeKit";
import { strToU8, zipSync } from "fflate";
import { download } from "../components";
export function AdaptiveTesting({ project }: { project: AdaptiveProject }) {
  const [snapshot, setSnapshot] = useState<AdaptiveSituation>(() =>
    structuredClone(defaultAdaptiveSituation),
  );
  const [building, setBuilding] = useState<(typeof BUILDINGS)[number]>("house");
  const [unit, setUnit] = useState<(typeof UNITS)[number]>("archer");
  const [showAll, setShowAll] = useState(false);
  const result = useMemo(
    () => evaluateAdaptive(project, snapshot),
    [project, snapshot],
  );
  function change(update: (s: AdaptiveSituation) => void) {
    const next = structuredClone(snapshot);
    update(next);
    setSnapshot(next);
  }
  return (
    <>
      <PageHeading
        title="Inspect decisions, then test in game"
        subtitle="A hypothetical snapshot explains decisions. It does not simulate a match."
      />
      <Panel
        title="Hypothetical situation"
        description="Enter only what the bot could observe. Unknown production checks remain unknown until you set them."
      >
        <div className="preview-state">
          <label className="select-label">
            Current age
            <select
              value={snapshot.age}
              onChange={(e) =>
                change((s) => {
                  s.age = e.target.value as AdaptiveSituation["age"];
                })
              }
            >
              {["dark", "feudal", "castle", "imperial"].map((age) => (
                <option key={age}>{age}</option>
              ))}
            </select>
          </label>
          <NumberField
            label="Game time"
            value={snapshot.gameSeconds}
            min={0}
            max={200000}
            suffix="s"
            onChange={(n) =>
              change((s) => {
                s.gameSeconds = n;
              })
            }
          />
          <NumberField
            label="Completed villagers"
            value={snapshot.villagers}
            min={0}
            max={200}
            onChange={(n) =>
              change((s) => {
                s.villagers = n;
                s.completedUnits.villager = n;
              })
            }
          />
          <NumberField
            label="Queued villagers"
            value={snapshot.queuedVillagers}
            min={0}
            max={200}
            onChange={(n) =>
              change((s) => {
                s.queuedVillagers = n;
              })
            }
          />
          <NumberField
            label="Housing headroom"
            value={snapshot.housingHeadroom}
            min={0}
            max={200}
            onChange={(n) =>
              change((s) => {
                s.housingHeadroom = n;
              })
            }
          />
          <NumberField
            label="Observed forward buildings"
            value={snapshot.enemyBuildingsInTown}
            min={0}
            max={200}
            onChange={(n) =>
              change((s) => {
                s.enemyBuildingsInTown = n;
                s.sightedAt.buildings = s.gameSeconds;
              })
            }
          />
        </div>
        <Allocation
          value={snapshot.resources}
          amounts
          label="Available resources"
          onChange={(resources) =>
            change((s) => {
              s.resources = resources;
            })
          }
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={snapshot.townUnderAttack}
            onChange={(e) =>
              change((s) => {
                s.townUnderAttack = e.target.checked;
              })
            }
          />
          Town is under attack
        </label>
        <details>
          <summary>Set completed outcomes and production availability</summary>
          <div className="two-fields">
            <label className="select-label">
              Building to inspect
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value as typeof building)}
              >
                {BUILDINGS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <NumberField
              label="Completed buildings"
              value={snapshot.completedBuildings[building] ?? 0}
              min={0}
              max={200}
              onChange={(n) =>
                change((s) => {
                  s.completedBuildings[building] = n;
                })
              }
            />
            <NumberField
              label="Pending foundations"
              value={snapshot.pendingBuildings[building] ?? 0}
              min={0}
              max={200}
              onChange={(n) =>
                change((s) => {
                  s.pendingBuildings[building] = n;
                })
              }
            />
            <label className="select-label">
              Can build now
              <select
                value={
                  snapshot.canBuild[building] === undefined
                    ? "unknown"
                    : String(snapshot.canBuild[building])
                }
                onChange={(e) =>
                  change((s) => {
                    if (e.target.value === "unknown")
                      delete s.canBuild[building];
                    else s.canBuild[building] = e.target.value === "true";
                  })
                }
              >
                <option value="unknown">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <div className="two-fields">
            <label className="select-label">
              Unit to inspect
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as typeof unit)}
              >
                {UNITS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <NumberField
              label="Completed units"
              value={snapshot.completedUnits[unit] ?? 0}
              min={0}
              max={200}
              onChange={(n) =>
                change((s) => {
                  s.completedUnits[unit] = n;
                })
              }
            />
            <NumberField
              label="Queued units"
              value={snapshot.queuedUnits[unit] ?? 0}
              min={0}
              max={200}
              onChange={(n) =>
                change((s) => {
                  s.queuedUnits[unit] = n;
                })
              }
            />
            <NumberField
              label="Observed enemy units in town"
              value={snapshot.enemyUnitsInTown[unit] ?? 0}
              min={0}
              max={200}
              onChange={(n) =>
                change((s) => {
                  s.enemyUnitsInTown[unit] = n;
                  s.sightedAt[unit] = s.gameSeconds;
                })
              }
            />
            <label className="select-label">
              Can train now
              <select
                value={
                  snapshot.canTrain[unit] === undefined
                    ? "unknown"
                    : String(snapshot.canTrain[unit])
                }
                onChange={(e) =>
                  change((s) => {
                    if (e.target.value === "unknown") delete s.canTrain[unit];
                    else s.canTrain[unit] = e.target.value === "true";
                  })
                }
              >
                <option value="unknown">Unknown</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <Allocation
            label="Hypothetical cost of selected building (leave unknown if not supplied)"
            value={
              snapshot.objectCosts[building] ?? {
                food: NaN,
                wood: NaN,
                gold: NaN,
                stone: NaN,
              }
            }
            amounts
            onChange={(cost) =>
              change((s) => {
                s.objectCosts[building] = cost;
              })
            }
          />
          <Allocation
            label="Hypothetical cost of selected unit (leave unknown if not supplied)"
            value={
              snapshot.objectCosts[unit] ?? {
                food: NaN,
                wood: NaN,
                gold: NaN,
                stone: NaN,
              }
            }
            amounts
            onChange={(cost) =>
              change((s) => {
                s.objectCosts[unit] = cost;
              })
            }
          />
          <h3 className="spaced-heading">Known resource deposits</h3>
          <p className="help">
            Unset means unknown; zero explicitly means no known deposits.
          </p>
          <div className="resource-fields">
            {RESOURCES.map((resource) => (
              <NumberField
                key={resource}
                label={resource}
                value={snapshot.resourceCounts[resource] ?? NaN}
                min={0}
                max={200}
                onChange={(n) =>
                  change((s) => {
                    if (Number.isFinite(n)) s.resourceCounts[resource] = n;
                    else delete s.resourceCounts[resource];
                  })
                }
              />
            ))}
          </div>
          <h3 className="spaced-heading">Research observations</h3>
          <div className="check-fields">
            {project.steps
              .filter((step) => step.kind === "research")
              .map((step) => (
                <label className="check-label" key={step.id}>
                  <input
                    type="checkbox"
                    checked={snapshot.completedResearch.includes(step.research)}
                    onChange={(e) =>
                      change((s) => {
                        s.completedResearch = e.target.checked
                          ? [...s.completedResearch, step.research]
                          : s.completedResearch.filter(
                              (r) => r !== step.research,
                            );
                      })
                    }
                  />
                  {step.label} is completed
                </label>
              ))}
          </div>
        </details>
        <div className="inline-actions">
          <button
            onClick={() =>
              change((s) => {
                s.memory = result.memory;
                s.gameSeconds += 10;
              })
            }
          >
            Advance snapshot by 10 seconds
          </button>
          <button
            onClick={() =>
              setSnapshot(structuredClone(defaultAdaptiveSituation))
            }
          >
            Reset snapshot
          </button>
        </div>
        <p className="help">
          Advancing this snapshot changes only its time. It does not gather
          resources, move units, or complete tasks.
        </p>
      </Panel>
      <Panel
        title="Decision trace"
        description={`Current strategy phase: ${result.phase}. Reasons are derived from the supplied observations.`}
      >
        <ul className="trace-list">
          {result.responses.map((response) => (
            <li key={response.id}>
              <strong>
                {response.active ? "Active" : "Waiting"} · {response.label}
              </strong>
              {response.reason}
            </li>
          ))}
        </ul>
        {result.scheduledActions.length > 0 && (
          <>
            <h3>Scheduled actions</h3>
            <ul className="trace-list">
              {result.scheduledActions.map((action, i) => (
                <li key={i}>
                  <strong>
                    {action.kind} · {action.owner}
                  </strong>
                  {action.reason}
                </li>
              ))}
            </ul>
          </>
        )}
        {result.diagnostics.map((text, i) => (
          <p key={i} className="help">
            {text}
          </p>
        ))}
        <label className="check-label">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show future phases
        </label>
        <ul className="trace-list">
          {result.steps
            .filter(
              (step) =>
                showAll ||
                project.steps.find((s) => s.id === step.id)?.phase ===
                  result.phase,
            )
            .map((step) => (
              <li key={step.id}>
                <strong>
                  {step.status} · {step.label}
                </strong>
                {step.reason}
              </li>
            ))}
        </ul>
      </Panel>
      <Panel
        title="Native Windows acceptance kit"
        description="All runs start as NOT RUN. Record actual observations; a browser preview is not a pass."
      >
        <button
          onClick={() => {
            const files = nativeKitFiles();
            const zip = zipSync(
              Object.fromEntries(
                Object.entries(files).map(([name, text]) => [
                  name,
                  strToU8(text),
                ]),
              ),
            );
            download(
              "Workshop-Windows-Test-Kit.zip",
              new Uint8Array(zip).buffer,
              "application/zip",
            );
          }}
        >
          Download Windows test kit
        </button>
        <p className="help">
          Both presets × five Arabia seeds, plus independent command probes and
          the controlled scenarios below. Include the exact DE build, project,
          replay and any errors.
        </p>
        <div className="native-scenarios">
          <table className="test-results">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Expected observation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {nativeScenarios.map(([id, name, , expected]) => (
                <tr key={id}>
                  <td>{name}</td>
                  <td>{expected}</td>
                  <td>Not run</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
