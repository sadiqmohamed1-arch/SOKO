import React, { useEffect, useRef, useState } from 'react';
import { Plus, FileSpreadsheet, FileDown, Download, Layers, History, ChevronDown, Lock, X } from 'lucide-react';
import { type ImportModuleConfig, downloadCsv, templateRows } from './importSystem';
import { UiOnlyTag } from './visitBadges';
import { LocalTag } from './adminDrawer';
import { EmptyState } from './catalogUi';

interface ManagementToolbarProps {
  config: ImportModuleConfig;
  onAddNew: () => void;
  onImport: () => void;
  /** Exports the currently filtered records. */
  onExport: () => void;
  exportCount: number;
  selectedCount: number;
  onExportSelected: () => void;
  onClearSelection: () => void;
}

const btn = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

const BulkActionsMenu: React.FC<{ config: ImportModuleConfig; selectedCount: number; onExportSelected: () => void }> = ({ config, selectedCount, onExportSelected }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`${btn} ${selectedCount > 0 ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
      >
        <Layers className="h-3.5 w-3.5" aria-hidden="true" />
        Bulk Actions
        {selectedCount > 0 && <span className="rounded-full bg-blue-700 px-1.5 font-mono text-[10px] text-white">{selectedCount}</span>}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 flex w-80 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <p className="px-2 pb-1 pt-0.5 text-[11px] leading-relaxed text-slate-500">
            {selectedCount === 0 ? `Select ${config.entityPlural} in the table to enable bulk actions.` : `${selectedCount} ${selectedCount === 1 ? config.entitySingular : config.entityPlural} selected.`}
          </p>
          <ul className="flex flex-col">
            {config.bulkActions.map((a) => {
              const works = a.kind === 'export';
              const disabled = !works || selectedCount === 0;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (works) {
                        onExportSelected();
                        setOpen(false);
                      }
                    }}
                    title={works ? undefined : 'UI only. Requires backend authorization.'}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left enabled:hover:bg-slate-50 enabled:cursor-pointer disabled:cursor-not-allowed"
                  >
                    {works ? <Download className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" /> : <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`flex flex-wrap items-center gap-1.5 text-xs font-semibold ${disabled ? 'text-slate-400' : a.tone === 'danger' ? 'text-rose-700' : 'text-slate-900'}`}>
                        {a.label}
                        {works ? <LocalTag /> : <UiOnlyTag />}
                      </span>
                      <span className="text-[11px] leading-relaxed text-slate-500">{a.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export const ManagementToolbar: React.FC<ManagementToolbarProps> = ({ config, onAddNew, onImport, onExport, exportCount, selectedCount, onExportSelected, onClearSelection }) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const singular = config.entitySingular.replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onAddNew} className={`${btn} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add New {singular}
          </button>
          <button type="button" onClick={onImport} className={`${btn} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
            Import Excel
          </button>
          <button type="button" onClick={() => downloadCsv(config.templateFileName, templateRows(config))} className={`${btn} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            Download Template
          </button>
          <button type="button" onClick={onExport} disabled={exportCount === 0} className={`${btn} border-slate-300 bg-white text-slate-700 enabled:hover:bg-slate-50`}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
            <span className="font-mono text-[10px] text-slate-500">{exportCount}</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkActionsMenu config={config} selectedCount={selectedCount} onExportSelected={onExportSelected} />
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-expanded={historyOpen}
            className={`${btn} ${historyOpen ? 'border-slate-900 bg-slate-100 text-slate-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Import History
          </button>
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <LocalTag /> Template, Export CSV and Export selected download files from the data already on screen.
        </span>
        <span className="flex items-center gap-1.5">
          <UiOnlyTag /> Saving, importing and bulk changes write nothing until a secure backend workflow exists.
        </span>
      </p>

      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <span>
            <strong className="font-semibold">{selectedCount}</strong> {selectedCount === 1 ? config.entitySingular : config.entityPlural} selected
          </span>
          <button type="button" onClick={onClearSelection} className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 cursor-pointer">
            <X className="h-3 w-3" aria-hidden="true" />
            Clear selection
          </button>
        </div>
      )}

      {historyOpen && (
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <h4 className="flex items-center gap-2 text-xs font-bold text-slate-900">
            {singular} import history <UiOnlyTag />
          </h4>
          <EmptyState
            icon={History}
            title="No imports recorded"
            body={`Import jobs are not stored yet. Once an authorized import function exists, each ${config.entitySingular} import will be listed here with its file, operator, row counts and error report.`}
            compact
          />
        </div>
      )}
    </div>
  );
};
