import { useId, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
export function NumberField({ label, value, onChange, min, max, suffix, help }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; suffix?: string; help?: string }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><div className="number-wrap"><input id={id} type="number" min={min} max={max} step="1" value={Number.isFinite(value) ? value : ''} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} aria-describedby={help ? `${id}-help` : undefined} />{suffix && <span>{suffix}</span>}</div>{help && <small id={`${id}-help`}>{help}</small>}</div>;
}
export function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) { return <section className="panel"><h2>{title}</h2>{description && <p className="panel-description">{description}</p>}{children}</section>; }
export function GameNotice() { return <div className="game-notice"><h3><AlertTriangle size={23}/>Game test needed</h3><p>Exported scripts have not yet been tested in AoE II: DE.</p></div>; }
export function PageHeading({ title, subtitle }: { title: string; subtitle: string }) { return <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>; }
export function download(name: string, data: BlobPart, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
