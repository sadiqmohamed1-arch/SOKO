import { useEffect, useRef, useState } from 'react';
import { Check, FlaskConical, X } from 'lucide-react';
import type { DemoAccount } from '../data/supplierTypes';

interface DemoAccountSwitcherProps {
  accounts: DemoAccount[];
  activeUserId: string;
  onSwitch: (account: DemoAccount) => void;
}

export function DemoAccountSwitcher({ accounts, activeUserId, onSwitch }: DemoAccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = accounts.find((a) => a.userId === activeUserId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2 font-sans">
      {open && (
        <div
          id="demo-accounts-panel"
          role="dialog"
          aria-label="Demo accounts"
          className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-300 bg-white p-2 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2 px-2 pt-1 pb-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Demo accounts</p>
              <p className="text-xs leading-relaxed text-slate-500">Development preview only. Not a real sign-in.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close demo accounts"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {accounts.map((account) => {
              const isActive = account.userId === activeUserId;
              return (
                <li key={account.id}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      if (!isActive) onSwitch(account);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <img src={account.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-slate-900">{account.name}</span>
                      <span className="truncate text-xs text-slate-500">
                        {account.company} · {account.description}
                      </span>
                    </span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="demo-accounts-panel"
        className="flex items-center gap-2 rounded-full border border-dashed border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-md hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <FlaskConical className="h-4 w-4" aria-hidden="true" />
        <span>Demo: {active ? active.name : 'Choose account'}</span>
      </button>
    </div>
  );
}
