import React, { useMemo, useRef, useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Upload,
  Columns3,
  ShieldCheck,
  Eye,
  CircleCheck,
  ClipboardList,
  AlertTriangle,
  Check,
  Lock,
  ArrowLeft,
  ArrowRight,
  FileWarning,
  type LucideIcon,
} from 'lucide-react';
import {
  type ColumnMapping,
  type ImportContext,
  type ImportModuleConfig,
  type ParsedSheet,
  type RowAction,
  type ValidatedRow,
  autoMapColumns,
  downloadCsv,
  errorReportRows,
  parseImportFile,
  templateRows,
  validateRows,
} from './importSystem';
import { AdminDrawer, LocalTag, NotInSchemaTag } from './adminDrawer';
import { UiOnlyTag } from './visitBadges';
import { DisabledButton } from './catalogUi';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEPS: { id: Step; label: string; icon: LucideIcon }[] = [
  { id: 1, label: 'Template', icon: FileDown },
  { id: 2, label: 'Upload', icon: Upload },
  { id: 3, label: 'Map Columns', icon: Columns3 },
  { id: 4, label: 'Validate', icon: ShieldCheck },
  { id: 5, label: 'Preview', icon: Eye },
  { id: 6, label: 'Confirm', icon: Lock },
  { id: 7, label: 'Results', icon: ClipboardList },
];

const ACTION_META: Record<RowAction, { label: string; className: string }> = {
  create: { label: 'Create', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  update: { label: 'Update', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  skip: { label: 'Skip', className: 'border-rose-200 bg-rose-50 text-rose-700' },
};

const ROW_LIMIT = 50;

const typeLabel = (f: ImportModuleConfig['fields'][number]) =>
  f.type === 'enum' ? 'One of' : f.type === 'reference' ? 'Reference' : f.type === 'list' ? 'List' : f.type === 'longtext' ? 'Text' : f.type.charAt(0).toUpperCase() + f.type.slice(1);

const Stat: React.FC<{ label: string; value: number; tone?: 'default' | 'good' | 'bad' | 'warn' }> = ({ label, value, tone = 'default' }) => {
  const tones = { default: 'text-slate-900', good: 'text-emerald-700', bad: 'text-rose-700', warn: 'text-amber-700' };
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`font-mono text-xl font-bold leading-none ${value === 0 && tone !== 'good' ? 'text-slate-400' : tones[tone]}`}>{value.toLocaleString()}</span>
    </div>
  );
};

const Card: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ title, aside, children }) => (
  <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {aside}
    </header>
    {children}
  </section>
);

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const td = 'px-3 py-2 align-top';

interface ImportWizardProps {
  config: ImportModuleConfig;
  context: ImportContext;
  /** Explains where reference values (suppliers, categories, brands) come from. */
  referenceNote: string;
  onClose: () => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({ config, context, referenceNote, onClose }) => {
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<RowAction | 'all'>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = `import-wizard-${config.id}`;

  const unmappedRequired = config.fields.filter((f) => f.required && (mapping[f.key] ?? null) === null);
  const validation = useMemo(() => (sheet && step >= 4 ? validateRows(config, sheet, mapping, context) : null), [sheet, mapping, context, config, step]);

  const goTo = (s: Step) => {
    setStep(s);
    if (s > maxStep) setMaxStep(s);
  };

  const loadSheet = (parsed: ParsedSheet) => {
    setSheet(parsed);
    setMapping(autoMapColumns(config, parsed.headers));
    setParseError(null);
    setMaxStep(2);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      loadSheet(await parseImportFile(file));
    } catch (err) {
      setSheet(null);
      setParseError(err instanceof Error ? err.message : 'The file could not be read.');
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const loadSampleFile = () => {
    const [headers, ...rows] = templateRows(config);
    // Test rows that exercise each validation rule; clearly named as sample data.
    const broken = config.fields.map((f) => (f.required ? '' : 'Sample'));
    const badRefs = config.fields.map((f) => (f.type === 'reference' ? 'Unknown Reference Ltd' : f.type === 'enum' ? 'pending' : config.sampleRows[0]?.[f.key] ?? ''));
    loadSheet({ fileName: `${config.id}-sample-test-data.csv`, headers, rows: [...rows, rows[0], broken, badRefs] });
  };

  const canNext =
    step === 1 ? true : step === 2 ? sheet !== null : step === 3 ? unmappedRequired.length === 0 : step === 4 ? true : step === 5 ? true : false;

  const previewRows = (validation?.rows ?? []).filter((r) => previewFilter === 'all' || r.action === previewFilter);
  const keyFields = config.fields.filter((f) => f.required || f.key === 'brand' || f.key === 'parent').slice(0, 4);
  const invalidRows = (validation?.rows ?? []).filter((r) => r.issues.length > 0);
  const summary = validation?.summary;

  const RowsTable: React.FC<{ rows: ValidatedRow[]; showIssues?: boolean }> = ({ rows, showIssues }) => (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs text-slate-700">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th scope="col" className={th}>Row</th>
            <th scope="col" className={th}>Action</th>
            {keyFields.map((f) => (
              <th key={f.key} scope="col" className={th}>{f.label}</th>
            ))}
            <th scope="col" className={th}>{showIssues ? 'Problems' : 'Notes'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.slice(0, ROW_LIMIT).map((r) => (
            <tr key={r.rowNumber}>
              <td className={`${td} font-mono text-slate-500`}>{r.rowNumber}</td>
              <td className={td}>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ACTION_META[r.action].className}`}>{ACTION_META[r.action].label}</span>
              </td>
              {keyFields.map((f) => (
                <td key={f.key} className={`${td} max-w-48 truncate`}>
                  {r.values[f.key] || <span className="text-slate-400">{'\u2014'}</span>}
                </td>
              ))}
              <td className={`${td} min-w-56`}>
                {r.issues.length > 0 ? (
                  <ul className="flex flex-col gap-0.5 text-rose-700">
                    {r.issues.map((i, n) => (
                      <li key={n} className="leading-relaxed">{i.message}</li>
                    ))}
                  </ul>
                ) : r.matches ? (
                  <span className="text-slate-600">Matches existing: {r.matches}</span>
                ) : (
                  <span className="text-slate-500">New {config.entitySingular}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > ROW_LIMIT && <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">Showing first {ROW_LIMIT} of {rows.length.toLocaleString()} rows.</p>}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => (step === 1 ? onClose() : goTo((step - 1) as Step))}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
      >
        {step === 1 ? 'Cancel' : (
          <>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back
          </>
        )}
      </button>
      <span className="hidden text-[11px] text-slate-500 sm:block">
        Step {step} of {STEPS.length}
      </span>
      {step < 6 && (
        <button
          type="button"
          disabled={!canNext}
          onClick={() => goTo((step + 1) as Step)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white enabled:hover:bg-slate-800 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step === 5 ? 'Review & confirm' : 'Continue'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
      {step === 6 && (
        <button type="button" onClick={() => goTo(7)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-900 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 cursor-pointer">
          Preview results screen
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
      {step === 7 && (
        <button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer">
          Close
        </button>
      )}
    </div>
  );

  return (
    <AdminDrawer
      titleId={titleId}
      title={`Import ${config.entityPlural}`}
      eyebrow={
        <>
          Bulk import center <UiOnlyTag />
        </>
      }
      icon={FileSpreadsheet}
      onClose={onClose}
      footer={footer}
      width="max-w-5xl"
    >
      <nav aria-label="Import steps" className="border-b border-slate-200 bg-white px-5 py-3">
        <ol className="flex gap-1 overflow-x-auto">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = s.id < step;
            const active = s.id === step;
            const reachable = s.id <= maxStep;
            return (
              <li key={s.id} className="flex-1">
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex w-full min-w-24 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold enabled:cursor-pointer disabled:cursor-not-allowed ${
                    active ? 'bg-slate-900 text-white' : done ? 'text-slate-900 enabled:hover:bg-slate-50' : 'text-slate-400'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? 'bg-white/15' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                    {done ? <Check className="h-3 w-3" aria-hidden="true" /> : <Icon className="h-3 w-3" aria-hidden="true" />}
                  </span>
                  <span className="truncate">
                    <span className="sr-only">Step {s.id}: </span>
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-col gap-4 p-5">
        {step === 1 && (
          <>
            <Card
              title="Template columns"
              aside={
                <span className="flex items-center gap-2">
                  <LocalTag label="Local download" />
                  <button
                    type="button"
                    onClick={() => downloadCsv(config.templateFileName, templateRows(config))}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                    Download template
                  </button>
                </span>
              }
            >
              <p className="text-xs leading-relaxed text-slate-500 text-pretty">
                The template is a UTF-8 CSV that opens directly in Excel. Keep the header row; extra columns are ignored. Required columns are marked with an asterisk.
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th scope="col" className={th}>Column</th>
                      <th scope="col" className={th}>Required</th>
                      <th scope="col" className={th}>Type / permitted values</th>
                      <th scope="col" className={th}>Guidance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {config.fields.map((f) => (
                      <tr key={f.key}>
                        <td className={`${td} whitespace-nowrap font-semibold text-slate-900`}>
                          <span className="flex items-center gap-1.5">
                            {f.label}
                            {f.required && <span className="text-rose-600" aria-hidden="true">*</span>}
                            {f.notInSchema && <NotInSchemaTag />}
                          </span>
                        </td>
                        <td className={td}>{f.required ? <span className="font-semibold text-slate-900">Yes</span> : <span className="text-slate-500">Optional</span>}</td>
                        <td className={td}>
                          <span className="flex flex-col gap-1">
                            <span className="text-slate-600">{typeLabel(f)}</span>
                            {f.allowed && (
                              <span className="flex flex-wrap gap-1">
                                {f.allowed.map((a) => (
                                  <code key={a} className="rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-700">{a}</code>
                                ))}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`${td} text-slate-500`}>{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Sample rows">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-slate-700">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {config.fields.map((f) => (
                        <th key={f.key} scope="col" className={`${th} whitespace-nowrap`}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {config.sampleRows.map((row, i) => (
                      <tr key={i}>
                        {config.fields.map((f) => (
                          <td key={f.key} className={`${td} whitespace-nowrap`}>{row[f.key] || <span className="text-slate-300">{'\u2014'}</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500">
                Columns marked <NotInSchemaTag /> are accepted and validated, but have no database column yet.
              </p>
            </Card>
          </>
        )}

        {step === 2 && (
          <Card title="Upload file" aside={<LocalTag label="Parsed in your browser" />}>
            <label
              htmlFor={`${titleId}-file`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void handleFile(e.dataTransfer.files[0]);
              }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragging ? 'border-blue-600 bg-blue-50/60' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <Upload className="h-6 w-6 text-slate-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">{parsing ? 'Reading file\u2026' : 'Drop an .xlsx or .csv file, or click to browse'}</span>
              <span className="text-xs text-slate-500">First sheet only, header in row 1, up to 5,000 rows. The file never leaves this browser.</span>
              <input
                ref={fileRef}
                id={`${titleId}-file`}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">No file to hand? Load the template with deliberately broken test rows.</span>
              <button type="button" onClick={loadSampleFile} className="font-semibold text-blue-700 hover:text-blue-800 cursor-pointer">
                Load sample test file
              </button>
            </div>
            {parseError && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {parseError}
              </p>
            )}
            {sheet && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
                <CircleCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold text-slate-900">{sheet.fileName}</span>
                  <span className="text-[11px] text-slate-600">
                    {sheet.rows.length.toLocaleString()} data rows {'\u2022'} {sheet.headers.length} columns
                  </span>
                </span>
              </div>
            )}
          </Card>
        )}

        {step === 3 && sheet && (
          <Card
            title="Map columns to SOKO fields"
            aside={
              unmappedRequired.length > 0 ? (
                <span className="text-[11px] font-semibold text-rose-700">{unmappedRequired.length} required field(s) unmapped</span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700">All required fields mapped</span>
              )
            }
          >
            <p className="text-xs leading-relaxed text-slate-500">Columns were matched automatically by header name. Adjust any mapping; unmapped optional fields are left blank.</p>
            <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
              {config.fields.map((f) => {
                const col = mapping[f.key] ?? null;
                const sample = col === null ? '' : sheet.rows.find((r) => (r[col] ?? '').trim())?.[col] ?? '';
                const missing = f.required && col === null;
                return (
                  <li key={f.key} className={`grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-3 ${missing ? 'bg-rose-50/50' : ''}`}>
                    <label htmlFor={`${titleId}-map-${f.key}`} className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-900">
                      {f.label}
                      {f.required && <span className="text-rose-600" aria-hidden="true">*</span>}
                      {f.notInSchema && <NotInSchemaTag />}
                    </label>
                    <select
                      id={`${titleId}-map-${f.key}`}
                      value={col === null ? '' : String(col)}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                      className={`w-full rounded-lg border bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer ${missing ? 'border-rose-300' : 'border-slate-300'}`}
                    >
                      <option value="">{f.required ? 'Select a column\u2026' : 'Not mapped'}</option>
                      {sheet.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    <span className="truncate font-mono text-[11px] text-slate-500">{sample ? `e.g. ${sample}` : col === null ? '' : 'Column is empty'}</span>
                  </li>
                );
              })}
            </ul>
            {(() => {
              const used = new Set(Object.values(mapping).filter((v): v is number => v !== null));
              const ignored = sheet.headers.filter((_, i) => !used.has(i));
              return ignored.length > 0 ? <p className="text-[11px] text-slate-500">Ignored columns: {ignored.map((h, i) => h || `Column ${i + 1}`).join(', ')}</p> : null;
            })()}
          </Card>
        )}

        {step === 4 && summary && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <Stat label="Total rows" value={summary.total} />
              <Stat label="Valid" value={summary.valid} tone="good" />
              <Stat label="Invalid" value={summary.invalid} tone="bad" />
              <Stat label="Duplicates" value={summary.duplicates} tone="warn" />
              <Stat label="Missing mandatory" value={summary.missingMandatory} tone="bad" />
              <Stat label="Invalid category / brand" value={summary.invalidTaxonomy} tone="bad" />
              <Stat label="Invalid supplier" value={summary.invalidSupplier} tone="bad" />
            </div>
            <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
              {referenceNote}
            </p>
            <Card title="Rows with problems" aside={<span className="text-[11px] text-slate-500">{invalidRows.length} of {summary.total}</span>}>
              {invalidRows.length === 0 ? <p className="text-xs text-emerald-700">Every row passed validation.</p> : <RowsTable rows={invalidRows} showIssues />}
            </Card>
          </>
        )}

        {step === 5 && summary && (
          <Card
            title="Preview changes"
            aside={
              <div role="group" aria-label="Filter preview" className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
                {(['all', 'create', 'update', 'skip'] as const).map((a) => {
                  const count = a === 'all' ? summary.total : summary[a];
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={previewFilter === a}
                      onClick={() => setPreviewFilter(a)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${previewFilter === a ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {a === 'all' ? 'All' : ACTION_META[a].label} <span className="font-mono">{count}</span>
                    </button>
                  );
                })}
              </div>
            }
          >
            <p className="text-xs leading-relaxed text-slate-500">
              Rows matching an existing {config.entitySingular} would update it; new rows would be created; rows with any problem are skipped.
            </p>
            {previewRows.length === 0 ? <p className="text-xs text-slate-500">No rows in this group.</p> : <RowsTable rows={previewRows} />}
          </Card>
        )}

        {step === 6 && summary && (
          <Card title="Confirm import">
            <div className="flex items-start gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  UI only. No records will be written. <UiOnlyTag />
                </span>
                <p className="text-xs leading-relaxed text-slate-600 text-pretty">
                  Importing needs an authorized backend workflow that re-validates the file server-side, checks your admin permissions and writes inside a transaction. Until it exists, the confirm button is disabled.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                ['File', sheet?.fileName ?? '\u2014'],
                ['Target', `${config.entityPlural} catalog`],
                ['Would create', summary.create.toLocaleString()],
                ['Would update', summary.update.toLocaleString()],
                ['Would skip', summary.skip.toLocaleString()],
                ['Validation', summary.invalid === 0 ? 'All rows valid' : `${summary.invalid} invalid rows`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="truncate font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              <DisabledButton icon={Upload} label={`Confirm import of ${summary.create + summary.update} rows`} />
            </div>
          </Card>
        )}

        {step === 7 && summary && (
          <>
            <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-amber-900">Import not performed</span>
                <p className="text-xs leading-relaxed text-amber-900/80 text-pretty">
                  This is the results layout. No {config.entityPlural} were saved, so the saved count is zero. Real results will appear here only after an authorized backend has written the records.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Saved" value={0} />
              <Stat label="Ready (not saved)" value={summary.create + summary.update} tone="warn" />
              <Stat label="Failed validation" value={summary.invalid} tone="bad" />
              <Stat label="Rows in file" value={summary.total} />
            </div>
            <Card
              title="Row-level errors"
              aside={
                <span className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={invalidRows.length === 0}
                    onClick={() => downloadCsv(`${config.id}-import-errors.csv`, errorReportRows(invalidRows))}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 enabled:hover:bg-slate-50 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />
                    Download validation errors
                  </button>
                  <DisabledButton icon={FileDown} label="Server error report" />
                </span>
              }
            >
              {invalidRows.length === 0 ? <p className="text-xs text-slate-500">No validation errors.</p> : <RowsTable rows={invalidRows} showIssues />}
            </Card>
          </>
        )}
      </div>
    </AdminDrawer>
  );
};
